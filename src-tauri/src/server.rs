use std::net::UdpSocket;
use std::str;
use std::time::SystemTime;
use serde::Deserialize;
use serde::Serialize;

#[allow(dead_code)]
#[derive(Deserialize)]
struct Server {
    ip: String,
    port: i32,
    is_official: bool
}

#[derive(Deserialize)]
#[allow(dead_code)]
struct MasterList {
    servers: Vec<Server>,
    success: bool
}

#[derive(Serialize)]
struct ServerInfo {
    ip: String,
    info: String,
    players: String,
    ping: String
}

#[derive(Serialize)]
struct ServerInfoList {
    servers: Vec<ServerInfo>
}

#[tauri::command]
#[allow(non_snake_case)]
pub async fn info(sendString: String) -> String {

    let socket: UdpSocket = UdpSocket::bind("0.0.0.0:0").expect("couldn't bind to address");
    let duration = std::time::Duration::new(1, 0);
    let dur = std::option::Option::Some(duration);
    socket.set_read_timeout(dur).expect("failed to set timeout");

    let v: MasterList = serde_json::from_str(&sendString).unwrap();

    let mut info_list: Vec<ServerInfo> = Vec::new();
    
    for(_i, x) in v.servers.iter().enumerate() {

        let send_string = get_send_string(&x.ip, x.port);
        let actual_ip = x.ip.to_string() + ":" + &x.port.to_string();
        let actual_ip2 = x.ip.to_string() + ":" + &x.port.to_string();

        let start = SystemTime::now();
        let recv_info = get_server_info(&socket, &actual_ip, &send_string).await;
        let ping = SystemTime::now()
            .duration_since(start)
            .expect("Time went backwards");

        let srv_info = ServerInfo {
            ip: actual_ip,
            info: recv_info,
            players: get_server_players(&socket, &actual_ip2, &send_string).await,
            ping: ping.as_millis().to_string()
        };
        
        info_list.push(srv_info);
    };

    let final_list = ServerInfoList {
        servers: info_list
    };

    let j = serde_json::to_string(&final_list).unwrap();
    j.into()
}

fn get_send_string(ip: &String, port: i32) -> String {
    let send_string = "VCMP".to_owned() + &ip[0..4] + &port.to_string()[0..2];
    send_string
}

async fn get_server_info(socket: &UdpSocket, ip: &String, send_string: &String) -> String {

    let new_send_string = send_string.to_owned() + "i";

    match socket.send_to(&new_send_string.as_bytes(), ip) {
        Ok(..) => {},
        Err(..) => {
            return "INVALID".to_string()
        }
    };

    let mut buf = [0; 128];
    match socket.recv(&mut buf) {
        Ok(_received) => {

            let s = match str::from_utf8(&buf) {
                Ok(v) => v,
                Err(e) => panic!("Invalid UTF-8 sequence: {}", e),
            };

            let s = s.to_string();
            s
        },
        Err(..) => "INVALID".to_string(),
    }
}

async fn get_server_players(socket: &UdpSocket, ip: &String, send_string: &String) -> String {

    let new_send_string = send_string.to_owned() + "c";

    match socket.send_to(&new_send_string.as_bytes(), ip) {
        Ok(..) => {},
        Err(..) => {
            return "INVALID".to_string()
        }
    };

    let mut buf = [0; 2000];
    match socket.recv(&mut buf) {
        Ok(_received) => {

            let s = match str::from_utf8(&buf) {
                Ok(v) => v,
                Err(e) => panic!("Invalid UTF-8 sequence: {}", e),
            };

            let s = s.to_string();
            s
        },
        Err(..) => "INVALID".to_string(),
    }
}