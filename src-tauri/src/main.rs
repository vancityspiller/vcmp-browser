#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;
mod error;

#[cfg(windows)]
mod win;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::query::query_servers,
            commands::archive::extract7z,
            commands::launch::launch_game,
            commands::presence::discord_presence,
        ])
        .setup(|app| {
            let window = app
                .get_webview_window("main")
                .expect("the main window is declared in tauri.conf.json");

            // the window is undecorated, so it draws its own shadow. Tauri 2
            // provides this directly, replacing the window-shadows crate.
            let _ = window.set_shadow(true);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
