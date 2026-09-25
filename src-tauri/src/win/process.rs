use std::path::Path;

use windows::core::PCWSTR;
use windows::Win32::System::Threading::{
    CreateProcessW, ResumeThread, TerminateProcess, CREATE_SUSPENDED, PROCESS_INFORMATION,
    STARTUPINFOW,
};

use super::handle::OwnedHandle;
use super::wide;
use crate::error::{AppError, AppResult};

/// A process created suspended.
///
/// Dropping without calling `resume` kills the process, so any failure between
/// creation and resumption cannot leave a half-injected game running.
pub struct SuspendedProcess {
    process: OwnedHandle,
    thread: OwnedHandle,
    pid: u32,
    resumed: bool,
}

impl SuspendedProcess {
    /// Creates `exe` suspended, with `command_line` and `working_dir`.
    pub fn spawn(exe: &str, command_line: &str, working_dir: &str) -> AppResult<Self> {
        if !Path::new(exe).exists() {
            return Err(AppError::msg(format!("{exe} does not exist")));
        }

        let exe_w = wide(exe);
        let dir_w = wide(working_dir);
        // CreateProcessW may write to the command line buffer, so it is owned
        // and mutable rather than borrowed from the argument.
        let mut cmd_w = wide(command_line);

        let mut info = PROCESS_INFORMATION::default();
        let startup = STARTUPINFOW {
            cb: std::mem::size_of::<STARTUPINFOW>() as u32,
            ..Default::default()
        };

        unsafe {
            CreateProcessW(
                PCWSTR(exe_w.as_ptr()),
                Some(windows::core::PWSTR(cmd_w.as_mut_ptr())),
                None,
                None,
                false,
                CREATE_SUSPENDED,
                None,
                PCWSTR(dir_w.as_ptr()),
                &startup,
                &mut info,
            )
            .map_err(|e| AppError::msg(format!("could not start {exe}: {}", e.message())))?;

            Ok(SuspendedProcess {
                process: OwnedHandle::new(info.hProcess),
                thread: OwnedHandle::new(info.hThread),
                pid: info.dwProcessId,
                resumed: false,
            })
        }
    }

    pub fn handle(&self) -> windows::Win32::Foundation::HANDLE {
        self.process.raw()
    }

    /// Lets the process run. Consumes self so it cannot be resumed twice.
    pub fn resume(mut self) -> u32 {
        unsafe {
            ResumeThread(self.thread.raw());
        }

        self.resumed = true;
        self.pid
    }
}

impl Drop for SuspendedProcess {
    fn drop(&mut self) {
        if !self.resumed {
            unsafe {
                let _ = TerminateProcess(self.process.raw(), 1);
            }
        }
    }
}
