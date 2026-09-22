use crate::cursor::Cursor;
use crate::packet::{Generation, ReplyHeader};
use crate::{ParseError, HEADER_LEN};

/// Smallest possible entry: a one-byte length plus an empty name.
const MIN_ENTRY_LEN: usize = 1;

/// Player names from a `c` reply.
pub struct PlayerList;

impl PlayerList {
    pub fn parse(bytes: &[u8]) -> Result<Vec<String>, ParseError> {
        let header = ReplyHeader::parse(bytes)?;
        let mut c = Cursor::new(bytes, HEADER_LEN);

        let count = c.u16_le()? as usize;

        // The count is attacker-controlled, so it only sizes the allocation up
        // to what the remaining bytes could possibly hold.
        let mut players = Vec::with_capacity(count.min(c.remaining() / MIN_ENTRY_LEN));

        for _ in 0..count {
            players.push(c.short_str()?);

            // R2 sends a score byte after each name.
            if header.generation == Generation::R2 {
                c.u8()?;
            }
        }

        Ok(players)
    }
}
