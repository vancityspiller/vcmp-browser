use crate::{ParseError, HEADER_LEN};

/// Which reply a query asks for.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Query {
    /// `i` — server info.
    Info,
    /// `c` — connected player names.
    Players,
}

impl Query {
    pub fn opcode(self) -> u8 {
        match self {
            Query::Info => b'i',
            Query::Players => b'c',
        }
    }
}

/// Builds a query datagram.
///
/// The token is the literal `VCMP`, the first four characters of the IP string
/// and the first two of the decimal port. Servers echo those six bytes back,
/// which is what lets a single socket serve many servers concurrently.
pub fn query_packet(ip: &str, port: u16, query: Query) -> Vec<u8> {
    let port = port.to_string();

    let mut packet = Vec::with_capacity(HEADER_LEN);
    packet.extend_from_slice(b"VCMP");
    packet.extend_from_slice(&ip.as_bytes()[..ip.len().min(4)]);
    packet.extend_from_slice(&port.as_bytes()[..port.len().min(2)]);
    packet.push(query.opcode());
    packet
}

/// Which generation of the protocol a reply speaks.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Generation {
    /// 0.4 servers. Reply magic `MP04`; carries a 12-byte version field.
    V04,
    /// 0.3z R2 servers. Reply magic `VCMP`; no version field, so every
    /// subsequent offset sits 12 bytes earlier than in 0.4.
    R2,
}

/// The fixed 11-byte preamble on every reply.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ReplyHeader {
    pub generation: Generation,
    /// The six token bytes echoed back from the query. Checking these against
    /// what was sent guards against a stray or spoofed datagram.
    pub token: [u8; 6],
    /// `i` or `c` — which reply this is.
    pub opcode: u8,
}

impl ReplyHeader {
    pub fn parse(bytes: &[u8]) -> Result<Self, ParseError> {
        let head = bytes.get(..HEADER_LEN).ok_or(ParseError::TooShort {
            need: HEADER_LEN,
            got: bytes.len(),
        })?;

        let magic: [u8; 4] = head[..4].try_into().expect("slice is 4 bytes");
        let generation = match &magic {
            b"MP04" => Generation::V04,
            b"VCMP" => Generation::R2,
            _ => return Err(ParseError::UnknownMagic(magic)),
        };

        Ok(ReplyHeader {
            generation,
            token: head[4..10].try_into().expect("slice is 6 bytes"),
            opcode: head[10],
        })
    }
}
