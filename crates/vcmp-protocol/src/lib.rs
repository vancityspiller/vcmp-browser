//! Parser for the VC:MP server query protocol.
//!
//! A query is a short token datagram; the reply opens with an 11-byte header
//! carrying a magic, the token echoed back, and the opcode. The magic selects
//! the protocol generation — `MP04` for 0.4, `VCMP` for 0.3z R2.
//!
//! Text fields are decoded leniently. Around 9% of live servers send Latin-1
//! rather than UTF-8, and dropping those servers would be worse than showing a
//! replacement character.

mod cursor;
mod info;
mod packet;
mod players;

pub use info::ServerInfo;
pub use packet::{query_packet, Generation, Query, ReplyHeader};
pub use players::PlayerList;

use std::fmt;

/// Magic (4) + echoed token (6) + opcode (1).
pub(crate) const HEADER_LEN: usize = 11;

#[derive(Debug, PartialEq, Eq)]
pub enum ParseError {
    /// The packet ended before a field could be read.
    TooShort { need: usize, got: usize },
    /// The reply magic matched no known protocol generation.
    UnknownMagic([u8; 4]),
}

impl fmt::Display for ParseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ParseError::TooShort { need, got } => {
                write!(f, "packet too short: need {need} bytes, got {got}")
            }
            ParseError::UnknownMagic(m) => {
                write!(f, "unrecognised reply magic {:?}", String::from_utf8_lossy(m))
            }
        }
    }
}

impl std::error::Error for ParseError {}
