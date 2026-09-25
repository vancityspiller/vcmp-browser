//! Starts the game with our DLL loaded.

use crate::error::AppResult;

#[cfg(windows)]
use crate::error::AppError;

// ------------------------------------------------------------------------- //

/// Launches the game and returns the new process id.
///
/// The Steam path used to shell out to a prebuilt launcher.steam.exe; it is
/// native now, so nothing extra is bundled.
#[tauri::command]
#[allow(non_snake_case)]
pub async fn launch_game(
    dllPath: String,
    gameDir: String,
    commandLine: String,
    isSteam: bool,
    isR2: bool,
) -> AppResult<String> {
    launch(dllPath, gameDir, commandLine, isSteam, isR2).await
}

// ------------------------------------------------------------------------- //

#[cfg(windows)]
async fn launch(
    dll_path: String,
    game_dir: String,
    command_line: String,
    is_steam: bool,
    is_r2: bool,
) -> AppResult<String> {
    use crate::win::{inject, process::SuspendedProcess, steam};

    tauri::async_runtime::spawn_blocking(move || {
        if is_steam && is_r2 {
            return Err(AppError::msg(
                "Launching 0.3z R2 with the Steam version is not supported!",
            ));
        }

        if is_steam && !steam::is_steam_running()? {
            return Err(AppError::msg("Steam is not running, please run steam first!"));
        }

        // the Steam build runs through testapp.exe
        let exe = if is_steam {
            format!("{game_dir}\\testapp.exe")
        } else {
            format!("{game_dir}\\gta-vc.exe")
        };

        let game = SuspendedProcess::spawn(&exe, &command_line, &game_dir)?;

        // R2 loads itself, so there is nothing to inject - but it has to
        // actually be installed, and failing here terminates the process
        // through SuspendedProcess's drop rather than leaking it.
        if is_r2 {
            let flt = format!("{game_dir}\\mss\\vc-mp.flt");

            if !std::path::Path::new(&flt).exists() {
                return Err(AppError::msg(
                    "VC:MP R2 is not installed in the game directory!",
                ));
            }
        } else if is_steam {
            inject::via_entry_point_stub(game.handle(), &dll_path)?;
        } else {
            inject::via_remote_thread(game.handle(), &dll_path)?;
        }

        Ok(game.resume().to_string())
    })
    .await
    .map_err(|e| AppError::msg(format!("launch task failed: {e}")))?
}

// ------------------------------------------------------------------------- //

#[cfg(not(windows))]
async fn launch(
    _dll_path: String,
    _game_dir: String,
    _command_line: String,
    _is_steam: bool,
    _is_r2: bool,
) -> AppResult<String> {
    Err(crate::error::AppError::msg(
        "Launching the game is only supported on Windows",
    ))
}
