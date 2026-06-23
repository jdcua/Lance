use serde::Serialize;

#[derive(Debug, Serialize)]
pub enum LanceError {
    Database(String),
    FileSystem(String),
    Network(String),
    InvalidInput(String),
}

impl std::fmt::Display for LanceError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            LanceError::Database(msg) => write!(f, "Database error: {}", msg),
            LanceError::FileSystem(msg) => write!(f, "File system error: {}", msg),
            LanceError::Network(msg) => write!(f, "Network error: {}", msg),
            LanceError::InvalidInput(msg) => write!(f, "Invalid input: {}", msg),
        }
    }
}

impl std::error::Error for LanceError {}

impl From<rusqlite::Error> for LanceError {
    fn from(e: rusqlite::Error) -> Self {
        LanceError::Database(e.to_string())
    }
}

impl From<String> for LanceError {
    fn from(s: String) -> Self {
        LanceError::Database(s)
    }
}

impl From<&str> for LanceError {
    fn from(s: &str) -> Self {
        LanceError::Database(s.to_string())
    }
}
