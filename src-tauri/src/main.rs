#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

mod server;
mod extract;

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![server::info, extract::extract7z])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
