use std::net::UdpSocket;
use std::time::SystemTime;
use serde::Serialize;

// ------------------------------------------------------------------------------------------------ //
// Serialization, for JSON

#[derive(Serialize)]
struct ServerInfo {
    ip: String,
    info: Vec<u8>,
    players: Vec<u8>,
    ping: String
}

// ------------------------------------------------------------------------------------------------ //
// tauri command handler

#[tauri::command]
#[allow(non_snake_case)]
pub async fn info(ip: String, send: String) -> String {

    let socket: UdpSocket = UdpSocket::bind("0.0.0.0:0").expect("couldn't bind to address");

    // duration for timeout, 1 second
    let duration = std::time::Duration::new(1, 0);
    let dur = std::option::Option::Some(duration);
    socket.set_read_timeout(dur).expect("failed to set timeout");

    // note time to calculate ping later on
    let start = SystemTime::now();
    let recv_info = get_server_info(&socket, ip.as_str().to_string(), &send).await;

    // calculate ping now
    let ping = SystemTime::now().duration_since(start).expect("Time went backwards");
    let recv_players = get_server_players(&socket, ip.as_str().to_string(), &send).await;

    // build our object
    let srv_info = ServerInfo {
        ip: ip,
        info: recv_info,
        players: recv_players,
        ping: ping.as_millis().to_string()
    };
      
    // and send it as JSON
    let j = serde_json::to_string(&srv_info).unwrap();
    j.into()
}

// ------------------------------------------------------------------------------------------------ //

async fn get_server_info(socket: &UdpSocket, ip: String, send_string: &String) -> Vec<u8> {

    // i: server info
    let new_send_string = send_string.to_owned() + "i";

    match socket.send_to(&new_send_string.as_bytes(), ip) {
        Ok(..) => {
            // continue
        },
        Err(..) => {
            return [0].to_vec()
        }
    };

    let mut buf = [0; 527];
    match socket.recv(&mut buf) {
        Ok(_received) => {
            return buf.to_vec()
        },
        Err(..) => [0].to_vec(),
    }
}

// ------------------------------------------------------------------------------------------------ //

async fn get_server_players(socket: &UdpSocket, ip: String, send_string: &String) -> Vec<u8> {

    // c: players
    let new_send_string = send_string.to_owned() + "c";

    match socket.send_to(&new_send_string.as_bytes(), ip) {
        Ok(..) => {
            // continue
        },
        Err(..) => {
            return [0].to_vec()
        }
    };
    
    // [u8] needs constant size so need to create a new function for this, meh
    let mut buf = [0; 3000];
    match socket.recv(&mut buf) {
        Ok(_received) => {
            return buf.to_vec()
        },
        Err(..) => [0].to_vec(),
    }
}