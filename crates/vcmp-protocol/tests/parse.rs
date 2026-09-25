use vcmp_protocol::ServerInfo;

/// The bug this crate exists to fix: the version field is 12 bytes, NUL-padded.
/// Reading a fixed 8-byte slice yields "0.4.7.1\0", which matches no directory
/// on disk and no version on the updater.
#[test]
fn parses_seven_character_version_without_trailing_nul() {
    let info = ServerInfo::parse(include_bytes!("fixtures/info_v0471.bin")).unwrap();
    assert_eq!(info.version, "0.4.7.1");
}

#[test]
fn parses_a_complete_zero_four_info_reply() {
    let info = ServerInfo::parse(include_bytes!("fixtures/info_v0471.bin")).unwrap();

    assert_eq!(info.version, "0.4.7.1");
    assert!(!info.password);
    assert_eq!(info.num_players, 8);
    assert_eq!(info.max_players, 100);
    assert_eq!(
        info.server_name,
        "[HUN/ENG]Szondikapitany FUN :) Szervere 2.0 |http://szondi.ninja"
    );
    assert_eq!(info.game_mode, "Kapuvari_Buzibar_v2026.07.19");
    assert_eq!(info.map_name, "Vice City");
}

#[test]
fn parses_a_populated_player_list() {
    let players = vcmp_protocol::PlayerList::parse(include_bytes!("fixtures/players_41.bin")).unwrap();

    assert_eq!(players.len(), 41);
    assert_eq!(players[0], "jewZINR");
    assert_eq!(players[1], "g56VM");
    assert_eq!(players[2], "vzaaelbV4");
}

#[test]
fn parses_an_empty_player_list() {
    let players = vcmp_protocol::PlayerList::parse(include_bytes!("fixtures/players_empty.bin")).unwrap();
    assert!(players.is_empty());
}

// ---- query construction -------------------------------------------------

use vcmp_protocol::{query_packet, Query};

#[test]
fn builds_query_from_first_four_ip_and_first_two_port_characters() {
    assert_eq!(query_packet("193.39.15.204", 8192, Query::Info), b"VCMP193.81i");
    assert_eq!(query_packet("193.39.15.204", 8192, Query::Players), b"VCMP193.81c");
}

#[test]
fn builds_query_for_a_short_ip() {
    // "18.197.181.42" -> "18.1", 8192 -> "81"; matches the token echoed back
    // by that server in the captured traffic.
    assert_eq!(query_packet("18.197.181.42", 8192, Query::Info), b"VCMP18.181i");
}

#[test]
fn builds_query_for_a_port_shorter_than_two_digits() {
    assert_eq!(query_packet("127.0.0.1", 7, Query::Info), b"VCMP127.7i");
}

// ---- reply header -------------------------------------------------------

use vcmp_protocol::{Generation, ParseError, ReplyHeader};

#[test]
fn reads_generation_token_and_opcode_from_a_real_reply() {
    let h = ReplyHeader::parse(include_bytes!("fixtures/info_v0471.bin")).unwrap();

    assert_eq!(h.generation, Generation::V04);
    assert_eq!(&h.token, b"193.81");
    assert_eq!(h.opcode, b'i');
}

#[test]
fn identifies_r2_replies_by_their_magic() {
    let mut reply = Vec::from(*b"VCMP127.80i");
    reply.resize(64, 0);
    assert_eq!(ReplyHeader::parse(&reply).unwrap().generation, Generation::R2);
}

#[test]
fn rejects_a_reply_with_unrecognised_magic() {
    let reply = b"XXXX127.80i";
    assert_eq!(
        ReplyHeader::parse(reply),
        Err(ParseError::UnknownMagic(*b"XXXX"))
    );
}

#[test]
fn rejects_a_reply_shorter_than_the_header() {
    assert_eq!(
        ReplyHeader::parse(b"MP04"),
        Err(ParseError::TooShort { need: 11, got: 4 })
    );
}

// ---- 0.3z R2 ------------------------------------------------------------
//
// No R2 server was present on the masterlist when this crate was written, so
// these fixtures are synthesised from the derived layout rather than captured.
// R2 is the 0.4 packet minus the 12-byte version field: every offset after the
// header sits 12 bytes earlier. See the design spec, section 6.

fn r2_info_reply(password: u8, num: u16, max: u16, name: &str, game_mode: &str) -> Vec<u8> {
    let mut p = Vec::new();
    p.extend_from_slice(b"VCMP");          // magic
    p.extend_from_slice(b"127.80");        // echoed token
    p.push(b'i');                          // opcode
    p.push(password);                      // 11
    p.extend_from_slice(&num.to_le_bytes());   // 12..14
    p.extend_from_slice(&max.to_le_bytes());   // 14..16
    p.extend_from_slice(&(name.len() as u32).to_le_bytes());
    p.extend_from_slice(name.as_bytes());
    p.extend_from_slice(&(game_mode.len() as u32).to_le_bytes());
    p.extend_from_slice(game_mode.as_bytes());
    p
}

#[test]
fn parses_an_r2_info_reply_using_the_shifted_layout() {
    let raw = r2_info_reply(1, 7, 50, "Test R2 Server", "DeathmatchVice-City");
    let info = ServerInfo::parse(&raw).unwrap();

    assert_eq!(info.version, "03zR2");
    assert!(info.password);
    assert_eq!(info.num_players, 7);
    assert_eq!(info.max_players, 50);
    assert_eq!(info.server_name, "Test R2 Server");
    // R2 appends the map to the gamemode; it is split back out.
    assert_eq!(info.game_mode, "Deathmatch");
    assert_eq!(info.map_name, "Vice City");
}

#[test]
fn parses_r2_player_names_skipping_the_score_byte() {
    let mut p = Vec::from(*b"VCMP127.80c");
    p.extend_from_slice(&2u16.to_le_bytes());
    for (name, score) in [("Alpha", 3u8), ("Beta", 9u8)] {
        p.push(name.len() as u8);
        p.extend_from_slice(name.as_bytes());
        p.push(score);
    }
    assert_eq!(vcmp_protocol::PlayerList::parse(&p).unwrap(), ["Alpha", "Beta"]);
}

// ---- lenient text decoding ----------------------------------------------

/// Roughly 9% of live servers send Latin-1 rather than UTF-8. Rejecting them
/// would drop those servers from the browser entirely, which is worse than
/// rendering a replacement character — and worse than the behaviour being
/// replaced, which was garbled but never dropped anything.
#[test]
fn decodes_non_utf8_text_lossily_instead_of_failing() {
    let info = ServerInfo::parse(include_bytes!("fixtures/info_latin1.bin")).unwrap();

    assert_eq!(info.game_mode, "T\u{FFFD}rkiye");
    assert_eq!(
        info.server_name,
        "[TR] MARMARA ROL SUNUCUSU discord.gg/83G3hJmRQT 2017'DEN BERi"
    );
    assert_eq!(info.map_name, "Vice City");
}

// ---- version-length regression guards -----------------------------------
//
// The replaced implementation took a fixed 8-byte slice. 8-character names
// survived that by coincidence; 7- and 9-character ones did not.

#[test]
fn parses_an_eight_character_version() {
    let info = ServerInfo::parse(include_bytes!("fixtures/info_v04rel006.bin")).unwrap();
    assert_eq!(info.version, "04rel006");

    let info = ServerInfo::parse(include_bytes!("fixtures/info_v04rel003.bin")).unwrap();
    assert_eq!(info.version, "04rel003");
}

#[test]
fn parses_a_nine_character_version_without_truncating() {
    let info = ServerInfo::parse(include_bytes!("fixtures/info_vantiddos.bin")).unwrap();
    assert_eq!(info.version, "anti-ddos"); // was truncated to "anti-ddo"
}

// ---- numeric width ------------------------------------------------------

#[test]
fn reads_player_counts_above_255() {
    // Counts are u16 little-endian. The replaced implementation read a single
    // byte, silently capping both values at 255.
    let mut p = Vec::from(*b"MP04127.80i");
    p.extend_from_slice(b"0.4.7.1\0\0\0\0\0");
    p.push(0);
    p.extend_from_slice(&300u16.to_le_bytes());
    p.extend_from_slice(&500u16.to_le_bytes());
    for s in ["Big", "Mode", "Vice City"] {
        p.extend_from_slice(&(s.len() as u32).to_le_bytes());
        p.extend_from_slice(s.as_bytes());
    }

    let info = ServerInfo::parse(&p).unwrap();
    assert_eq!(info.num_players, 300);
    assert_eq!(info.max_players, 500);
}

// ---- malformed input ----------------------------------------------------

#[test]
fn every_truncation_of_a_real_reply_errors_rather_than_panics() {
    let full = include_bytes!("fixtures/info_v0471.bin");
    for n in 0..full.len() {
        // Must not panic; a short packet is an error, not a crash.
        let _ = ServerInfo::parse(&full[..n]);
    }
    assert!(ServerInfo::parse(&full[..full.len() - 1]).is_err());
}

#[test]
fn every_truncation_of_a_real_player_reply_errors_rather_than_panics() {
    let full = include_bytes!("fixtures/players_41.bin");
    for n in 0..full.len() {
        let _ = vcmp_protocol::PlayerList::parse(&full[..n]);
    }
    assert!(vcmp_protocol::PlayerList::parse(&full[..full.len() - 1]).is_err());
}

#[test]
fn a_player_count_larger_than_the_packet_errors_without_allocating_wildly() {
    let mut p = Vec::from(*b"MP04127.80c");
    p.extend_from_slice(&u16::MAX.to_le_bytes()); // claims 65535 players
    p.extend_from_slice(&[3, b'a', b'b', b'c']); // supplies one

    assert!(matches!(
        vcmp_protocol::PlayerList::parse(&p),
        Err(ParseError::TooShort { .. })
    ));
}

#[test]
fn a_string_length_larger_than_the_packet_errors() {
    let mut p = Vec::from(*b"MP04127.80i");
    p.extend_from_slice(b"0.4.7.1\0\0\0\0\0");
    p.push(0);
    p.extend_from_slice(&1u16.to_le_bytes());
    p.extend_from_slice(&10u16.to_le_bytes());
    p.extend_from_slice(&9999u32.to_le_bytes()); // name claims 9999 bytes
    p.extend_from_slice(b"short");

    assert!(matches!(
        ServerInfo::parse(&p),
        Err(ParseError::TooShort { .. })
    ));
}
