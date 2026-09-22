use serde::Serialize;

use crate::cursor::Cursor;
use crate::packet::{Generation, ReplyHeader};
use crate::{ParseError, HEADER_LEN};

/// 0.4 carries a 12-byte NUL-padded version field; R2 carries none.
const VERSION_LEN: usize = 12;
/// Synthesised, since R2 replies do not report a version.
const R2_VERSION: &str = "03zR2";
/// R2 has no map field; it appends this marker to the gamemode instead.
const R2_MAP_MARKER: &str = "Vice-City";
const R2_MAP_NAME: &str = "Vice City";

/// A parsed `i` reply.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerInfo {
    pub version: String,
    pub password: bool,
    pub num_players: u16,
    pub max_players: u16,
    pub server_name: String,
    pub game_mode: String,
    pub map_name: String,
}

impl ServerInfo {
    pub fn parse(bytes: &[u8]) -> Result<Self, ParseError> {
        let header = ReplyHeader::parse(bytes)?;
        let mut c = Cursor::new(bytes, HEADER_LEN);

        let version = match header.generation {
            Generation::V04 => c.nul_padded_str(VERSION_LEN)?,
            Generation::R2 => R2_VERSION.to_owned(),
        };

        let password = c.u8()? != 0;
        let num_players = c.u16_le()?;
        let max_players = c.u16_le()?;
        let server_name = c.length_prefixed_str()?;
        let mut game_mode = c.length_prefixed_str()?;

        let map_name = match header.generation {
            Generation::V04 => c.length_prefixed_str()?,
            Generation::R2 => {
                if let Some((mode, _)) = game_mode.split_once(R2_MAP_MARKER) {
                    game_mode = mode.to_owned();
                }
                R2_MAP_NAME.to_owned()
            }
        };

        Ok(ServerInfo {
            version,
            password,
            num_players,
            max_players,
            server_name,
            game_mode,
            map_name,
        })
    }
}
