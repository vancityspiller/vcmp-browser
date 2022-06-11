extern crate windows;
use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};

use std::net::UdpSocket;
use std::{thread, time};
use chrono;

// ------------------------------------------------------------------------------------------------ //

#[tauri::command]
#[allow(non_snake_case)]
pub async fn discord_presence(pid: u32, ip: String, sendString: String, serverName: String, minimal: bool, isR2: bool) {
    discord_presence_init(pid, ip, sendString, serverName, minimal, isR2);
}

#[allow(non_snake_case)]
fn discord_presence_init(pid: u32, ip: String, sendString: String, serverName: String, minimal: bool, isR2: bool) {

    // open our process
    let p_handle: windows::Win32::Foundation::HANDLE = unsafe {
        windows::Win32::System::Threading::OpenProcess(
            windows::Win32::System::Threading::PROCESS_QUERY_INFORMATION, 
            false, 
            pid
        ).unwrap()
    };

    // create a new discord client
    let mut client = DiscordIpcClient::new("977909248187052072").unwrap();

    match client.connect() {
        Ok(_) => (),
        Err(_) => return
    }

    // get timestamp at which we started the game
    let start_at = chrono::Utc::now().timestamp().try_into().unwrap();

    // set initial activity
    if !minimal {
        // get player information with UDP
        let plr_str = get_plr_str(ip.to_owned(), sendString.to_owned(), isR2);

        client.set_activity(
            activity::Activity::new()
            .state(&plr_str)
            .details(&serverName)
            .assets(activity::Assets::new()
                .large_image(if isR2 {"logor2"} else { "logo" }))
            .timestamps(activity::Timestamps::new()
                .start(start_at))
        ).unwrap();
    } else {

        // we don't want to display server name and players
        client.set_activity(
            activity::Activity::new()
            .assets(activity::Assets::new()
                .large_image(if isR2 {"logor2"} else { "logo" }))
            .timestamps(activity::Timestamps::new()
                .start(start_at))
        ).unwrap()
    }
    

    loop {
        unsafe {

            // loop to keep checking game status
            let mut exit_code = 100 as u32;
            let exit_code_ptr: *mut u32 = &mut exit_code as *mut u32;

            windows::Win32::System::Threading::GetExitCodeProcess(p_handle, exit_code_ptr);

            // if process is still running ; update activity
            if exit_code == 259 {

                if !minimal {
                    let plr_str = get_plr_str(ip.to_owned(), sendString.to_owned(), isR2);
                    client.set_activity(
                        activity::Activity::new()
                        .state(&plr_str)
                        .details(&serverName)
                        .assets(activity::Assets::new()
                            .large_image(if isR2 {"logor2"} else { "logo" }))
                        .timestamps(activity::Timestamps::new()
                            .start(start_at))
                    ).unwrap();
                } else {

                    client.set_activity(
                        activity::Activity::new()
                        .assets(activity::Assets::new()
                            .large_image(if isR2 {"logor2"} else { "logo" }))
                        .timestamps(activity::Timestamps::new()
                            .start(start_at))
                    ).unwrap();
                }
                
            // if process has exited ; close handle and clear activity
            } else if exit_code != 100  {
                client.close().unwrap();
                windows::Win32::Foundation::CloseHandle(p_handle);

                break;     
            }
        }

        // keep in mind discord rate limits (1 update per 15 seconds)
        thread::sleep(time::Duration::from_secs(15));
    }
    
}

// ------------------------------------------------------------------------------------------------ //
// function to query players in server

fn get_plr_str(ip: String, send_string: String, is_r2: bool) -> String {
    let socket: UdpSocket = UdpSocket::bind("0.0.0.0:0").expect("couldn't bind to address");

    // duration for timeout, 1 second
    let duration = std::time::Duration::new(1, 0);
    let dur = std::option::Option::Some(duration);
    socket.set_read_timeout(dur).expect("failed to set timeout");

    // query information 
    socket.send_to(send_string.as_bytes(), ip).expect("couldn't send");

    // store and process information
    let mut buf = [0; 527];
    match socket.recv(&mut buf) {
        Ok(_received) => {
            let info = buf.to_vec();
            let num = info[if is_r2 {12} else {24}] + info[if is_r2 {13} else {25}];
            let max = info[if is_r2 {14} else {26}] + info[if is_r2 {15} else {27}];

            return format!("Players: {}/{}", num, max);

        },
        Err(..) => "State Unknown".to_string(),
    }
}