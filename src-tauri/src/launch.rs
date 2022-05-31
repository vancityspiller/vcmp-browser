extern crate windows;
use widestring::WideCString;
use std::process::Command;

// ------------------------------------------------------------------------------------------------ //

#[tauri::command]
#[allow(non_snake_case)]
pub async fn launch_game(dllPath: String, gameDir: String, commandLine: String, isSteam: bool) -> Result<String, String>
{
    // build path to gta-vc.exe
    let mut game_exe: String = format!("{}\\gta-vc.exe", gameDir);

    // need to spawn external exe for steam vcmp
    if isSteam {

        // check if steam is running
        // steam needs to be running before launching ; otherwise, the game exhibits unoridinary behaviour
        let mut steam_running = false;

        unsafe 
        {
            // snapshot including processes
            let snap_shot = windows::Win32::System::Diagnostics::ToolHelp::CreateToolhelp32Snapshot(windows::Win32::System::Diagnostics::ToolHelp::TH32CS_SNAPPROCESS, 0).unwrap();

            // to hold our process details
            let process_entry = &mut windows::Win32::System::Diagnostics::ToolHelp::PROCESSENTRY32W::default();
            process_entry.dwSize = std::mem::size_of::<windows::Win32::System::Diagnostics::ToolHelp::PROCESSENTRY32W>() as u32;

            // loop until found
            while windows::Win32::System::Diagnostics::ToolHelp::Process32NextW(snap_shot, process_entry).as_bool() == true {

                let mut exe_name = std::string::String::from_utf16(&process_entry.szExeFile).unwrap();
                let offset = exe_name.find('\0');

                if &exe_name[0..offset.unwrap()] == "steam.exe" {
                    steam_running = true;
                    break;
                }
            }

            if steam_running == false {
                return Err("Steam is not running, please run steam first!".into());
            }
        }

        // ------------------------------------------------------------------------------------------------ //

        game_exe = format!("{}\\testapp.exe", gameDir);

        let output = Command::new("./launcher.steam.exe")
        .args([&commandLine, &game_exe, &dllPath])
        .current_dir("./")
        .output()
        .unwrap();

        if output.status.success() {

            // return process id if succeeded
            let pid = std::str::from_utf8(&output.stdout).unwrap();
            return Ok(pid.into());
            
        } else {

            // failed to launch the game
            return Err("Failed to launch steam game".into());
        }
    }

    // ------------------------------------------------------------------------------------------------ //

    // store our process information
    let pi = &mut windows::Win32::System::Threading::PROCESS_INFORMATION::default();

    unsafe 
    {
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

    // ------------------------------------------------------------------------------------------------ //

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

        // close handles
        windows::Win32::Foundation::CloseHandle(inject_thread);
        windows::Win32::Foundation::CloseHandle(pi.hProcess);
    }

    // all done
    return Ok(pi.dwProcessId.to_string().into());
}

// ------------------------------------------------------------------------------------------------ //