extern crate windows;
use widestring::WideCString;

// ------------------------------------------------------------------------------------------------ //

#[tauri::command]
#[allow(non_snake_case)]
pub async fn launch_game(dllPath: String, gameDir: String, commandLine: String, isSteam: bool) -> Result<String, String>
{
    // store our process information
    let pi = &mut windows::Win32::System::Threading::PROCESS_INFORMATION::default();

    unsafe 
    {
        // build path to gta-vc.exe
        let mut game_exe: String = format!("{}\\gta-vc.exe", gameDir);
        if isSteam {
            game_exe = format!("{}\\testapp.exe", gameDir);
        }

        // spawn a suspended state game instance
        if windows::Win32::System::Threading::CreateProcessW(
            game_exe,
            windows::core::PWSTR(WideCString::from_str(&commandLine).unwrap().as_mut_ptr()), 
            &windows::Win32::Security::SECURITY_ATTRIBUTES::default(), 
            &windows::Win32::Security::SECURITY_ATTRIBUTES::default(), 
            windows::Win32::Foundation::BOOL(0), 
            windows::Win32::System::Threading::CREATE_SUSPENDED, 
            std::ptr::null_mut(), 
            gameDir, 
            &windows::Win32::System::Threading::STARTUPINFOW::default(), 
            pi
        ).as_bool() == false 
        {
            // if failed to spawn, return an Error
            return Err("Failed to launch game".into());
        }
    }

    // ------------------------------------------------------------------------------------------------ //
    
    // build DLL path
    let dll_file_path = std::path::Path::new(&dllPath);

    // is the path valid?
    if dll_file_path.exists() == false {
        return Err("vcmp-game.dll doesn't exist".into());
    }

    let dll_path = std::ffi::CString::new(dllPath.to_owned()).unwrap();
    let dll_path_size = dll_path.as_bytes_with_nul().len();

    // store allocated memory address
    let lp_mem: *mut core::ffi::c_void;
    
    unsafe 
    {
        // allocate memory equal to dll path's size
        lp_mem =
        windows::Win32::System::Memory::VirtualAllocEx(
            pi.hProcess, 
            std::ptr::null_mut(), 
            dll_path_size, 
            windows::Win32::System::Memory::MEM_COMMIT | windows::Win32::System::Memory::MEM_RESERVE, 
            windows::Win32::System::Memory::PAGE_READWRITE
        );
    }

    // store bytes written
    let mut bytes_written: usize = 0;
    let bytes_written_ptr: *mut usize = &mut bytes_written as *mut _ as *mut usize;
    let dll_path_cstr = std::ffi::CString::new(dll_path).unwrap();

    unsafe 
    {
        if windows::Win32::System::Diagnostics::Debug::WriteProcessMemory(
            pi.hProcess, 
            lp_mem, 
            dll_path_cstr.as_ptr() as *const std::ffi::c_void, 
            dll_path_size, 
            bytes_written_ptr
        ).as_bool() == false 
        {
            // throw error if failed to write
            return Err("Failed to write memory".to_string());
        }
    }

    if bytes_written != dll_path_size 
    {
        // check if we have what we need
        return Err("Failed to write memory".to_string());
    }
    
    // ------------------------------------------------------------------------------------------------ //

    unsafe 
    {
        let h_kernel: windows::Win32::Foundation::HINSTANCE = windows::Win32::System::LibraryLoader::GetModuleHandleA("kernel32.dll").unwrap();

        let load_lib_addr: windows::Win32::Foundation::FARPROC = windows::Win32::System::LibraryLoader::GetProcAddress(h_kernel, "LoadLibraryA");

        let thread_id = 0 as u32;
        let thread_id_ptr = thread_id as *mut u32;

        let inject_thread: windows::Win32::Foundation::HANDLE = windows::Win32::System::Threading::CreateRemoteThread(
            pi.hProcess, 
            &windows::Win32::Security::SECURITY_ATTRIBUTES::default(), 
            0, 
            Some(std::mem::transmute(load_lib_addr)), 
            lp_mem, 
            0,
            thread_id_ptr
        ).unwrap();
 
        if windows::Win32::System::Threading::WaitForSingleObject(inject_thread, 100000) == windows::Win32::System::Threading::WAIT_OBJECT_0 {
            windows::Win32::System::Threading::ResumeThread(pi.hThread); 
        }
    }

    // all done
    return Ok(pi.dwProcessId.to_string().into());
}

// ------------------------------------------------------------------------------------------------ //