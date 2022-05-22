#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

mod server;
mod extract;
mod launch;
mod rpc;

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![server::info, extract::extract7z, launch::launch_game, rpc::discord_presence])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
