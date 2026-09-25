use crate::ParseError;

/// Sequential reader over a reply body. Every read is bounds-checked, so a
/// truncated or hostile packet yields an error rather than a panic.
pub(crate) struct Cursor<'a> {
    bytes: &'a [u8],
    pos: usize,
}

impl<'a> Cursor<'a> {
    pub(crate) fn new(bytes: &'a [u8], pos: usize) -> Self {
        Cursor { bytes, pos }
    }

    pub(crate) fn take(&mut self, n: usize) -> Result<&'a [u8], ParseError> {
        let end = self.pos.saturating_add(n);
        let slice = self.bytes.get(self.pos..end).ok_or(ParseError::TooShort {
            need: end,
            got: self.bytes.len(),
        })?;
        self.pos = end;
        Ok(slice)
    }

    pub(crate) fn u8(&mut self) -> Result<u8, ParseError> {
        Ok(self.take(1)?[0])
    }

    pub(crate) fn u16_le(&mut self) -> Result<u16, ParseError> {
        let b = self.take(2)?;
        Ok(u16::from_le_bytes([b[0], b[1]]))
    }

    pub(crate) fn u32_le(&mut self) -> Result<u32, ParseError> {
        let b = self.take(4)?;
        Ok(u32::from_le_bytes([b[0], b[1], b[2], b[3]]))
    }

    /// A u32 little-endian length followed by that many bytes of text.
    pub(crate) fn length_prefixed_str(&mut self) -> Result<String, ParseError> {
        let len = self.u32_le()? as usize;
        Ok(String::from_utf8_lossy(self.take(len)?).into_owned())
    }

    /// A u8 length followed by that many bytes of text.
    pub(crate) fn short_str(&mut self) -> Result<String, ParseError> {
        let len = self.u8()? as usize;
        Ok(String::from_utf8_lossy(self.take(len)?).into_owned())
    }

    /// A fixed-width NUL-padded field: everything up to the first NUL.
    pub(crate) fn nul_padded_str(&mut self, n: usize) -> Result<String, ParseError> {
        let raw = self.take(n)?;
        let raw = raw.split(|&b| b == 0).next().unwrap_or(raw);
        Ok(String::from_utf8_lossy(raw).into_owned())
    }

    /// Remaining unread bytes.
    pub(crate) fn remaining(&self) -> usize {
        self.bytes.len().saturating_sub(self.pos)
    }
}
