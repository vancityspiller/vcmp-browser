//! Queries every server at once over a single UDP socket.
//!
//! The previous implementation bound a fresh socket per server and used
//! blocking reads inside an async command, so each query held a runtime worker
//! for its full timeout and a masterlist refresh took the better part of a
//! minute. Here one socket serves every server: all queries go out together and
//! replies are matched back by source address as they arrive.

use std::collections::HashMap;
use std::net::SocketAddr;
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use tauri::ipc::Channel;
use tokio::net::UdpSocket;

use vcmp_protocol::{query_packet, PlayerList, Query, ReplyHeader, ServerInfo};

use crate::error::{AppError, AppResult};

// ------------------------------------------------------------------------- //

/// How long to wait before giving up on a server entirely.
const DEADLINE: Duration = Duration::from_millis(2000);
/// When to re-send to servers that have not answered yet.
const RETRY_AFTER: Duration = Duration::from_millis(700);
/// Datagrams sent before yielding, so a large masterlist does not overrun the
/// socket's send buffer.
const SEND_BATCH: usize = 64;
/// Large enough for a full player list; replies over this are malformed.
const RECV_BUFFER: usize = 8192;

// ------------------------------------------------------------------------- //

#[derive(Debug, Deserialize)]
pub struct ServerAddr {
    pub ip: String,
    pub port: u16,
}

/// One server's result, shaped as the UI consumes it.
///
/// `ping` is null when the server never answered; the UI uses that to show the
/// waiting placeholder.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerResult {
    pub ip: String,
    pub ping: Option<u64>,
    pub version: String,
    pub password: bool,
    pub num_players: u16,
    pub max_players: u16,
    pub server_name: String,
    pub game_mode: String,
    pub map_name: String,
    pub players: Vec<String>,
}

impl ServerResult {
    fn unreachable(ip: String) -> Self {
        ServerResult {
            ip,
            ping: None,
            version: String::new(),
            password: false,
            num_players: 0,
            max_players: 0,
            server_name: String::new(),
            game_mode: String::new(),
            map_name: String::new(),
            players: Vec::new(),
        }
    }
}

// ------------------------------------------------------------------------- //

/// What we know about one server while the query is in flight.
struct Pending {
    ip: String,
    token: [u8; 6],
    info_query: Vec<u8>,
    players_query: Vec<u8>,
    sent_at: Instant,
    info: Option<ServerInfo>,
    players: Option<Vec<String>>,
    emitted: bool,
}

impl Pending {
    /// Both replies are in, so the entry can be reported.
    fn complete(&self) -> bool {
        self.info.is_some() && self.players.is_some()
    }

    fn into_result(self, ping: Option<u64>) -> ServerResult {
        match self.info {
            Some(info) => ServerResult {
                ip: self.ip,
                ping,
                version: info.version,
                password: info.password,
                num_players: info.num_players,
                max_players: info.max_players,
                server_name: info.server_name,
                game_mode: info.game_mode,
                map_name: info.map_name,
                players: self.players.unwrap_or_default(),
            },
            None => ServerResult::unreachable(self.ip),
        }
    }
}

// ------------------------------------------------------------------------- //

/// Queries every given server, streaming each result back as it arrives.
#[tauri::command]
pub async fn query_servers(
    servers: Vec<ServerAddr>,
    on_result: Channel<ServerResult>,
) -> AppResult<()> {
    if servers.is_empty() {
        return Ok(());
    }

    let socket = UdpSocket::bind("0.0.0.0:0")
        .await
        .map_err(|e| AppError::msg(format!("could not open a UDP socket: {e}")))?;

    // ------------------------------------------------------------------- //
    // Replies carry no identity beyond their source address, so that is the key.

    let mut pending: HashMap<SocketAddr, Pending> = HashMap::new();

    for server in &servers {
        let Ok(addr) = format!("{}:{}", server.ip, server.port).parse::<SocketAddr>() else {
            // not a literal address; the UI resolves hostnames before calling us
            on_result
                .send(ServerResult::unreachable(format!("{}:{}", server.ip, server.port)))
                .ok();
            continue;
        };

        let info_query = query_packet(&server.ip, server.port, Query::Info);
        let players_query = query_packet(&server.ip, server.port, Query::Players);

        let mut token = [0u8; 6];
        token.copy_from_slice(&info_query[4..10]);

        pending.insert(
            addr,
            Pending {
                ip: format!("{}:{}", server.ip, server.port),
                token,
                info_query,
                players_query,
                sent_at: Instant::now(),
                info: None,
                players: None,
                emitted: false,
            },
        );
    }

    // ------------------------------------------------------------------- //

    let started = Instant::now();
    let deadline = started + DEADLINE;
    let retry_at = started + RETRY_AFTER;
    let mut retried = false;

    send_round(&socket, &mut pending, |_| true).await;

    let mut buffer = vec![0u8; RECV_BUFFER];

    while Instant::now() < deadline {
        if !retried && Instant::now() >= retry_at {
            // only chase the servers still missing something
            send_round(&socket, &mut pending, |p| !p.complete()).await;
            retried = true;
        }

        let next_wake = if retried { deadline } else { deadline.min(retry_at) };
        let Some(wait) = next_wake.checked_duration_since(Instant::now()) else {
            continue;
        };

        let received = tokio::time::timeout(wait, socket.recv_from(&mut buffer)).await;

        let Ok(Ok((len, from))) = received else {
            // timed out waiting, or the socket reported an error for one
            // datagram; either way keep going until the deadline
            continue;
        };

        let Some(entry) = pending.get_mut(&from) else {
            continue; // nothing was sent to this address
        };

        apply_reply(entry, &buffer[..len]);

        if entry.complete() && !entry.emitted {
            entry.emitted = true;
            let ping = entry.sent_at.elapsed().as_millis() as u64;

            if let Some(done) = pending.remove(&from) {
                on_result.send(done.into_result(Some(ping))).ok();
            }
        }
    }

    // ------------------------------------------------------------------- //
    // Whatever is left either never answered or answered only partly.

    for (_, entry) in pending.into_iter() {
        if entry.emitted {
            continue;
        }

        let ping = entry
            .info
            .is_some()
            .then(|| entry.sent_at.elapsed().as_millis() as u64);

        on_result.send(entry.into_result(ping)).ok();
    }

    Ok(())
}

// ------------------------------------------------------------------------- //

/// Sends both queries to every server matching `should_send`, in batches.
async fn send_round<F>(socket: &UdpSocket, pending: &mut HashMap<SocketAddr, Pending>, should_send: F)
where
    F: Fn(&Pending) -> bool,
{
    let mut sent = 0usize;

    for (addr, entry) in pending.iter_mut() {
        if !should_send(entry) {
            continue;
        }

        entry.sent_at = Instant::now();
        socket.send_to(&entry.info_query, addr).await.ok();
        socket.send_to(&entry.players_query, addr).await.ok();

        sent += 1;
        if sent % SEND_BATCH == 0 {
            tokio::task::yield_now().await;
        }
    }
}

// ------------------------------------------------------------------------- //

/// Files a datagram against the server it came from.
///
/// The echoed token is checked so a stray datagram from the right address, or
/// one crafted by something else on the host, cannot be parsed as a reply.
fn apply_reply(entry: &mut Pending, datagram: &[u8]) {
    let Ok(header) = ReplyHeader::parse(datagram) else {
        return;
    };

    if header.token != entry.token {
        return;
    }

    match header.opcode {
        b'i' if entry.info.is_none() => {
            if let Ok(info) = ServerInfo::parse(datagram) {
                entry.info = Some(info);
            }
        }
        b'c' if entry.players.is_none() => {
            if let Ok(players) = PlayerList::parse(datagram) {
                entry.players = Some(players);
            }
        }
        _ => {}
    }
}
