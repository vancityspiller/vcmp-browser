//! Win32 process creation and DLL injection.

pub mod handle;
pub mod inject;
pub mod process;
pub mod steam;

/// Builds a NUL-terminated UTF-16 buffer for the wide Win32 entry points.
pub fn wide(text: &str) -> Vec<u16> {
    text.encode_utf16().chain(std::iter::once(0)).collect()
}
