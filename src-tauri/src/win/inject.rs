//! Two ways of getting our DLL into the game.

use windows::core::{PCSTR, PCWSTR};
use windows::Win32::Foundation::HANDLE;
use windows::Win32::System::Diagnostics::Debug::WriteProcessMemory;
use windows::Win32::System::LibraryLoader::{GetModuleHandleW, GetProcAddress};
use windows::Win32::System::Memory::{
    VirtualAllocEx, VirtualProtectEx, MEM_COMMIT, MEM_RESERVE, PAGE_EXECUTE_READWRITE,
    PAGE_PROTECTION_FLAGS, PAGE_READWRITE,
};
use windows::Win32::System::Threading::{
    CreateRemoteThread, WaitForSingleObject, LPTHREAD_START_ROUTINE,
};

use super::handle::OwnedHandle;
use super::wide;
use crate::error::{AppError, AppResult};

/// How long to wait for the injected LoadLibrary thread.
const INJECT_TIMEOUT_MS: u32 = 100_000;

/// Size of the entry-point stub, in bytes.
const STUB_LEN: usize = 19;

// ------------------------------------------------------------------------- //
// Steam testapp.exe patches.
//
// Addresses are fixed to the Steam build of testapp.exe and come from the
// launcher this replaces, which in turn took them from ysc3839/VCMPBrowser.

/// A `je` guarding the CRC check, flipped to an unconditional `jmp`.
const CRC_CHECK_ADDR: usize = 0x00A4_05A5;
const CRC_CHECK_JMP: u8 = 0xEB;

/// Six bytes at the entry point, replaced so our stub runs first. The bytes
/// that follow are already `jmp eax`.
const ENTRY_HOOK_ADDR: usize = 0x00A4_1298;

// ------------------------------------------------------------------------- //

/// Resolves a kernel32 export in *our* process.
///
/// This is only meaningful because the browser and the game are both 32-bit and
/// Windows maps kernel32 at the same base in every process for the life of a
/// boot, so the address is valid in the target too. It is also why the build
/// must stay i686 - a 64-bit host would hand back an address the game cannot use.
fn kernel32_export(name: PCSTR) -> AppResult<*const core::ffi::c_void> {
    unsafe {
        let module = GetModuleHandleW(PCWSTR(wide("kernel32.dll").as_ptr()))
            .map_err(|e| AppError::msg(format!("could not find kernel32: {}", e.message())))?;

        match GetProcAddress(module, name) {
            Some(addr) => Ok(addr as *const core::ffi::c_void),
            None => Err(AppError::msg("could not resolve a kernel32 export")),
        }
    }
}

// ------------------------------------------------------------------------- //

fn alloc_in(process: HANDLE, size: usize, protect: PAGE_PROTECTION_FLAGS) -> AppResult<*mut core::ffi::c_void> {
    let memory = unsafe { VirtualAllocEx(process, None, size, MEM_COMMIT | MEM_RESERVE, protect) };

    if memory.is_null() {
        return Err(AppError::msg("could not allocate memory in the game process"));
    }

    Ok(memory)
}

fn write_to(process: HANDLE, address: *mut core::ffi::c_void, bytes: &[u8]) -> AppResult<()> {
    let mut written = 0usize;

    unsafe {
        WriteProcessMemory(
            process,
            address,
            bytes.as_ptr() as *const core::ffi::c_void,
            bytes.len(),
            Some(&mut written),
        )
        .map_err(|e| AppError::msg(format!("could not write to the game process: {}", e.message())))?;
    }

    if written != bytes.len() {
        return Err(AppError::msg("wrote fewer bytes than expected to the game process"));
    }

    Ok(())
}

/// Writes over read-only code, restoring the original protection afterwards.
fn patch_code(process: HANDLE, address: usize, bytes: &[u8]) -> AppResult<()> {
    let target = address as *mut core::ffi::c_void;
    let mut previous = PAGE_PROTECTION_FLAGS(0);

    unsafe {
        VirtualProtectEx(process, target, bytes.len(), PAGE_EXECUTE_READWRITE, &mut previous)
            .map_err(|e| AppError::msg(format!("could not unprotect {address:#x}: {}", e.message())))?;
    }

    let result = write_to(process, target, bytes);

    unsafe {
        let mut restored = PAGE_PROTECTION_FLAGS(0);
        let _ = VirtualProtectEx(process, target, bytes.len(), previous, &mut restored);
    }

    result
}

// ------------------------------------------------------------------------- //

/// Injects by running `LoadLibraryA` on a remote thread.
///
/// Used for the non-Steam game, which has no CRC check to work around.
pub fn via_remote_thread(process: HANDLE, dll_path: &str) -> AppResult<()> {
    if !std::path::Path::new(dll_path).exists() {
        return Err(AppError::msg(format!("{dll_path} does not exist")));
    }

    let mut path_bytes = dll_path.as_bytes().to_vec();
    path_bytes.push(0);

    let remote_path = alloc_in(process, path_bytes.len(), PAGE_READWRITE)?;
    write_to(process, remote_path, &path_bytes)?;

    let load_library = kernel32_export(PCSTR(c"LoadLibraryA".as_ptr() as *const u8))?;

    unsafe {
        // LoadLibraryA takes one pointer and returns a handle, which matches
        // the shape of a thread start routine closely enough for this trick.
        let start: LPTHREAD_START_ROUTINE = Some(std::mem::transmute::<
            *const core::ffi::c_void,
            unsafe extern "system" fn(*mut core::ffi::c_void) -> u32,
        >(load_library));

        let thread = CreateRemoteThread(process, None, 0, start, Some(remote_path), 0, None)
            .map_err(|e| AppError::msg(format!("could not inject: {}", e.message())))?;

        let thread = OwnedHandle::new(thread);
        WaitForSingleObject(thread.raw(), INJECT_TIMEOUT_MS);
    }

    Ok(())
}

// ------------------------------------------------------------------------- //

/// Injects by hooking the entry point, and defeats the Steam CRC check.
///
/// The Steam build verifies its own code, so a remote thread calling
/// LoadLibrary is not enough: the check has to be neutered and the DLL loaded
/// before the original entry point runs. A small stub is written into the
/// process, the entry point is redirected to it, and the stub loads the DLL and
/// then jumps to where execution would have gone.
pub fn via_entry_point_stub(process: HANDLE, dll_path: &str) -> AppResult<()> {
    if !std::path::Path::new(dll_path).exists() {
        return Err(AppError::msg(format!("{dll_path} does not exist")));
    }

    let path_w = wide(dll_path);
    let path_bytes: &[u8] = unsafe {
        std::slice::from_raw_parts(path_w.as_ptr() as *const u8, path_w.len() * 2)
    };

    let load_library_w = kernel32_export(PCSTR(c"LoadLibraryW".as_ptr() as *const u8))?;

    // The stub, then the wide DLL path immediately after it.
    let mut stub = [0u8; STUB_LEN];
    let memory = alloc_in(process, STUB_LEN + path_bytes.len(), PAGE_EXECUTE_READWRITE)?;
    let base = memory as usize;

    // push <address of the path, which follows the stub>
    stub[0] = 0x68;
    stub[1..5].copy_from_slice(&((base + STUB_LEN) as u32).to_le_bytes());

    // call kernel32.LoadLibraryW, encoded relative to the end of this instruction
    stub[5] = 0xE8;
    let call_site = base + 10;
    let displacement = (load_library_w as usize).wrapping_sub(call_site) as u32;
    stub[6..10].copy_from_slice(&displacement.to_le_bytes());

    // restore the registers the entry-point hook pushed, recovering the
    // original entry point into eax
    stub[10] = 0x58; // pop eax
    stub[11] = 0x5D; // pop ebp
    stub[12] = 0x5F; // pop edi
    stub[13] = 0x5E; // pop esi
    stub[14] = 0x5A; // pop edx
    stub[15] = 0x59; // pop ecx
    stub[16] = 0x5B; // pop ebx

    // jmp eax, continuing into the game
    stub[17] = 0xFF;
    stub[18] = 0xE0;

    write_to(process, memory, &stub)?;
    write_to(process, (base + STUB_LEN) as *mut core::ffi::c_void, path_bytes)?;

    // ------------------------------------------------------------------- //

    patch_code(process, CRC_CHECK_ADDR, &[CRC_CHECK_JMP])?;

    // push eax to save the original entry point, then mov eax, <stub>
    let mut hook = [0u8; 6];
    hook[0] = 0x50;
    hook[1] = 0xB8;
    hook[2..6].copy_from_slice(&(base as u32).to_le_bytes());

    patch_code(process, ENTRY_HOOK_ADDR, &hook)?;

    Ok(())
}
