use windows::Win32::System::Diagnostics::ToolHelp::{
    CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS,
};

use super::handle::OwnedHandle;
use crate::error::{AppError, AppResult};

/// Whether steam.exe is running.
///
/// The Steam build of the game misbehaves if Steam itself is not already up,
/// so this is checked before launching rather than letting the game fail oddly.
pub fn is_steam_running() -> AppResult<bool> {
    unsafe {
        let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)
            .map_err(|e| AppError::msg(format!("could not list processes: {}", e.message())))?;
        let snapshot = OwnedHandle::new(snapshot);

        let mut entry = PROCESSENTRY32W {
            dwSize: std::mem::size_of::<PROCESSENTRY32W>() as u32,
            ..Default::default()
        };

        if Process32FirstW(snapshot.raw(), &mut entry).is_err() {
            return Ok(false);
        }

        loop {
            if process_name(&entry).eq_ignore_ascii_case("steam.exe") {
                return Ok(true);
            }

            if Process32NextW(snapshot.raw(), &mut entry).is_err() {
                return Ok(false);
            }
        }
    }
}

/// Reads the NUL-terminated name out of a process entry.
fn process_name(entry: &PROCESSENTRY32W) -> String {
    let name = &entry.szExeFile;
    let len = name.iter().position(|&c| c == 0).unwrap_or(name.len());

    String::from_utf16_lossy(&name[..len])
}
