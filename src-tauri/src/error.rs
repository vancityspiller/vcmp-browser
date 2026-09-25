use serde::{Serialize, Serializer};

/// Anything a command can fail with.
///
/// Serializes to its message so the frontend receives a readable string rather
/// than a tagged object, which is what the UI puts straight into its error box.
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("{0}")]
    Message(String),

    #[error("io error: {0}")]
    Io(#[from] std::io::Error),

    #[error("could not extract archive: {0}")]
    Extract(#[from] sevenz_rust2::Error),
}

impl AppError {
    pub fn msg(text: impl Into<String>) -> Self {
        AppError::Message(text.into())
    }
}

impl Serialize for AppError {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}

#[cfg(windows)]
impl From<windows::core::Error> for AppError {
    fn from(err: windows::core::Error) -> Self {
        AppError::Message(err.message())
    }
}

pub type AppResult<T> = Result<T, AppError>;
