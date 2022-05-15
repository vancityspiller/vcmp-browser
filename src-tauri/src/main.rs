#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

mod server;
mod 7z;

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![server::info, 7z::extract7z])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
