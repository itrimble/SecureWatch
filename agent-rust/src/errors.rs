// Centralized error handling for SecureWatch Agent
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AgentError {
    #[error("Configuration error: {0}")]
    Config(#[from] ConfigError),
    
    #[error("Transport error: {0}")]
    Transport(#[from] TransportError),
    
    #[error("Collector error: {0}")]
    Collector(#[from] CollectorError),
    
    #[error("Buffer error: {0}")]
    Buffer(#[from] BufferError),
    
    #[error("Parser error: {0}")]
    Parser(#[from] ParserError),
    
    #[error("Management API error: {0}")]
    Management(#[from] ManagementError),
    
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("Task join error: {0}")]
    TaskJoin(#[from] tokio::task::JoinError),
    
    #[error("Channel send error")]
    ChannelSend,
    
    #[error("Shutdown timeout")]
    ShutdownTimeout,
}

#[derive(Error, Debug)]
pub enum ConfigError {
    #[error("IO error: {0}")]
    Io(String),
    
    #[error("Parse error: {0}")]
    Parse(String),
    
    #[error("Serialize error: {0}")]
    Serialize(String),
    
    #[error("Validation error: {0}")]
    Validation(String),
}

#[derive(Error, Debug)]
pub enum TransportError {
    #[error("Connection failed: {0}")]
    ConnectionFailed(String),
    
    #[error("Authentication failed: {0}")]
    AuthenticationFailed(String),
    
    #[error("Request failed: {0}")]
    RequestFailed(String),
    
    #[error("Server error: {status} - {message}")]
    ServerError { status: u16, message: String },
    
    #[error("Timeout")]
    Timeout,
    
    #[error("TLS error: {0}")]
    Tls(String),
    
    #[error("Compression error: {0}")]
    Compression(String),
    
    #[error("Serialization error: {0}")]
    Serialization(String),
}

#[derive(Error, Debug)]
pub enum CollectorError {
    #[error("Initialization failed: {0}")]
    InitializationFailed(String),
    
    #[error("Collection failed: {0}")]
    CollectionFailed(String),
    
    #[error("Network error: {0}")]
    Network(String),
    
    #[error("File system error: {0}")]
    FileSystem(String),
    
    #[error("Windows API error: {0}")]
    WindowsApi(String),
    
    #[error("Parser error: {0}")]
    Parser(String),
    
    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),
}

#[derive(Error, Debug)]
pub enum BufferError {
    #[error("Buffer full")]
    BufferFull,
    
    #[error("Persistence error: {0}")]
    Persistence(String),
    
    #[error("Serialization error: {0}")]
    Serialization(String),
    
    #[error("Database error: {0}")]
    Database(String),
    
    #[error("Corruption detected: {0}")]
    Corruption(String),
}

#[derive(Error, Debug)]
pub enum ParserError {
    #[error("Invalid regex: {0}")]
    InvalidRegex(String),
    
    #[error("Parse failed: {0}")]
    ParseFailed(String),
    
    #[error("No matching parser for source: {0}")]
    NoMatchingParser(String),
    
    #[error("Field extraction failed: {0}")]
    FieldExtractionFailed(String),
}

#[derive(Error, Debug)]
pub enum ManagementError {
    #[error("gRPC server error: {0}")]
    GrpcServer(String),
    
    #[error("Invalid request: {0}")]
    InvalidRequest(String),
    
    #[error("Service unavailable: {0}")]
    ServiceUnavailable(String),
    
    #[error("Authorization failed")]
    AuthorizationFailed,
}

// Convenience type alias
pub type Result<T> = std::result::Result<T, AgentError>;