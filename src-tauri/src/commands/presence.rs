//! Discord rich presence for the duration of a game session.

use crate::error::AppResult;

#[tauri::command]
#[allow(non_snake_case)]
pub async fn discord_presence(
    pid: u32,
    ip: String,
    serverName: String,
    minimal: bool,
    isR2: bool,
) -> AppResult<()> {
    run(pid, ip, serverName, minimal, isR2).await
}

// ------------------------------------------------------------------------- //

#[cfg(windows)]
async fn run(
    pid: u32,
    ip: String,
    server_name: String,
    minimal: bool,
    is_r2: bool,
) -> AppResult<()> {
    use std::net::SocketAddr;
    use std::time::Duration;

    use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
    use tokio::net::UdpSocket;
    use vcmp_protocol::{query_packet, Query, ServerInfo};

    use windows::Win32::Foundation::HANDLE;
    use windows::Win32::System::Threading::{
        GetExitCodeProcess, OpenProcess, PROCESS_QUERY_INFORMATION,
    };

    use crate::win::handle::OwnedHandle;

    const DISCORD_APP_ID: &str = "977909248187052072";
    /// Discord rate-limits presence updates to one per 15 seconds.
    const UPDATE_INTERVAL: Duration = Duration::from_secs(15);
    /// GetExitCodeProcess reports this while the process is still running.
    const STILL_ACTIVE: u32 = 259;

    // --------------------------------------------------------------------- //

    let process = unsafe {
        match OpenProcess(PROCESS_QUERY_INFORMATION, false, pid) {
            Ok(handle) => OwnedHandle::new(handle),
            // the game exited before we got here; nothing to report on
            Err(_) => return Ok(()),
        }
    };

    let mut client = DiscordIpcClient::new(DISCORD_APP_ID);

    if client.connect().is_err() {
        return Ok(()); // Discord isn't running, which is not an error
    }

    let started_at = chrono::Utc::now().timestamp();
    let large_image = if is_r2 { "logor2" } else { "logo" };

    // --------------------------------------------------------------------- //

    let address: Option<SocketAddr> = ip.parse().ok();

    loop {
        let state = if minimal {
            None
        } else {
            Some(player_count(address, &ip).await)
        };

        let mut presence = activity::Activity::new()
            .assets(activity::Assets::new().large_image(large_image))
            .timestamps(activity::Timestamps::new().start(started_at));

        if let Some(state) = state.as_deref() {
            presence = presence.state(state).details(&server_name);
        }

        let _ = client.set_activity(presence);

        tokio::time::sleep(UPDATE_INTERVAL).await;

        // has the game exited?
        let mut exit_code = STILL_ACTIVE;
        let running = unsafe {
            GetExitCodeProcess(process.raw() as HANDLE, &mut exit_code).is_ok()
                && exit_code == STILL_ACTIVE
        };

        if !running {
            let _ = client.close();
            return Ok(());
        }
    }

    // --------------------------------------------------------------------- //

    /// Asks the server how many players are on, for the presence line.
    async fn player_count(address: Option<SocketAddr>, ip: &str) -> String {
        const UNKNOWN: &str = "State Unknown";

        let Some(address) = address else {
            return UNKNOWN.to_string();
        };

        let Some((host, port)) = ip.rsplit_once(':') else {
            return UNKNOWN.to_string();
        };

        let Ok(port) = port.parse::<u16>() else {
            return UNKNOWN.to_string();
        };

        let Ok(socket) = UdpSocket::bind("0.0.0.0:0").await else {
            return UNKNOWN.to_string();
        };

        if socket
            .send_to(&query_packet(host, port, Query::Info), address)
            .await
            .is_err()
        {
            return UNKNOWN.to_string();
        }

        let mut buffer = [0u8; 1024];
        let received = tokio::time::timeout(
            std::time::Duration::from_secs(1),
            socket.recv_from(&mut buffer),
        )
        .await;

        let Ok(Ok((len, _))) = received else {
            return UNKNOWN.to_string();
        };

        match ServerInfo::parse(&buffer[..len]) {
            Ok(info) => format!("Players: {}/{}", info.num_players, info.max_players),
            Err(_) => UNKNOWN.to_string(),
        }
    }
}

// ------------------------------------------------------------------------- //

#[cfg(not(windows))]
async fn run(
    _pid: u32,
    _ip: String,
    _server_name: String,
    _minimal: bool,
    _is_r2: bool,
) -> AppResult<()> {
    Ok(())
}
