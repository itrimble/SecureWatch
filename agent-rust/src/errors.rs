// Enhanced error handling for SecureWatch Agent with comprehensive categorization
// Uses thiserror with structured error context and error categorization

use std::fmt;
use thiserror::Error;

#[cfg(feature = "persistent-storage")]
use rusqlite;

/// Main agent error type providing comprehensive error handling
#[derive(Error, Debug)]
pub enum AgentError {
    // High-level system errors with context
    #[error("Configuration error")]
    Config(#[from] ConfigError),
    
    #[error("Transport error")]
    Transport(#[from] TransportError),
    
    #[error("Collector error")]
    Collector(#[from] CollectorError),
    
    #[error("Buffer error")]
    Buffer(#[from] BufferError),
    
    #[error("Parser error")]
    Parser(#[from] ParserError),
    
    #[error("Management API error")]
    Management(#[from] ManagementError),
    
    #[error("Resource error")]
    Resource(#[from] ResourceError),
    
    #[error("Security error")]
    Security(#[from] SecurityError),
    
    // Low-level system errors
    #[error("IO operation failed")]
    Io(#[from] std::io::Error),
    
    #[error("Task execution failed")]
    TaskJoin(#[from] tokio::task::JoinError),
    
    #[error("JSON processing failed")]
    Json(#[from] serde_json::Error),
    
    #[error("URL parsing failed")]
    UrlParse(#[from] url::ParseError),
    
    // Agent-specific errors with context
    #[error("Channel communication failed: {reason}")]
    ChannelError {
        reason: String,
        component: String,
    },
    
    #[error("Shutdown operation timed out after {timeout_seconds}s")]
    ShutdownTimeout {
        timeout_seconds: u64,
        pending_tasks: Vec<String>,
    },
    
    #[error("Service initialization failed: {service}")]
    InitializationFailed {
        service: String,
        reason: String,
    },
    
    #[error("Critical system condition detected: {condition}")]
    CriticalError {
        condition: String,
        severity: ErrorSeverity,
        requires_shutdown: bool,
    },
}

/// Configuration-related errors with detailed context
#[derive(Error, Debug)]
pub enum ConfigError {
    #[error("Failed to read configuration file '{path}'")]
    FileRead {
        path: String,
        #[source]
        source: std::io::Error,
    },
    
    #[error("Configuration parsing failed in file '{path}' at line {line:?}")]
    ParseError {
        path: String,
        line: Option<usize>,
        column: Option<usize>,
        #[source]
        source: Box<dyn std::error::Error + Send + Sync>,
    },
    
    // Legacy compatibility variants for existing code
    #[error("IO error: {0}")]
    Io(String),
    
    #[error("Parse error: {0}")]
    Parse(String),
    
    #[error("Serialize error: {0}")]
    Serialize(String),
    
    #[error("Validation error: {0}")]
    Validation(String),
    
    #[error("Configuration validation failed")]
    ValidationError {
        field: String,
        value: String,
        expected: String,
        constraint: String,
    },
    
    #[error("Missing required configuration field '{field}'")]
    MissingField {
        field: String,
        section: String,
        suggestion: Option<String>,
    },
    
    #[error("Configuration serialization failed")]
    SerializationError {
        operation: String,
        #[source]
        source: Box<dyn std::error::Error + Send + Sync>,
    },
    
    #[error("Hot reload failed for configuration section '{section}'")]
    HotReloadFailed {
        section: String,
        reason: String,
        rollback_successful: bool,
    },
    
    #[error("Schema validation failed with {error_count} errors")]
    SchemaValidationFailed {
        error_count: usize,
        errors: Vec<String>,
    },
}

/// Transport and network-related errors with retry context
#[derive(Error, Debug)]
pub enum TransportError {
    #[error("Connection failed to {endpoint} after {attempts} attempts")]
    ConnectionFailed {
        endpoint: String,
        attempts: u32,
        last_error: String,
        retry_after: Option<std::time::Duration>,
    },
    
    #[error("Authentication failed: {method}")]
    AuthenticationFailed {
        method: String,
        reason: String,
        retry_allowed: bool,
    },
    
    #[error("Request failed: {method} {url}")]
    RequestFailed {
        method: String,
        url: String,
        status_code: Option<u16>,
        #[source]
        source: Box<dyn std::error::Error + Send + Sync>,
    },
    
    #[error("Server error {status}: {message}")]
    ServerError {
        status: u16,
        message: String,
        headers: Vec<(String, String)>,
        body: Option<String>,
        retryable: bool,
    },
    
    #[error("Operation timed out after {duration_ms}ms")]
    Timeout {
        operation: String,
        duration_ms: u64,
        retryable: bool,
    },
    
    #[error("TLS error: {operation}")]
    TlsError {
        operation: String,
        reason: String,
        certificate_issue: bool,
        #[source]
        source: Box<dyn std::error::Error + Send + Sync>,
    },
    
    #[error("Compression failed: {algorithm}")]
    CompressionError {
        algorithm: String,
        operation: String, // compress/decompress
        original_size: Option<usize>,
        #[source]
        source: Box<dyn std::error::Error + Send + Sync>,
    },
    
    #[error("Circuit breaker {name} is {state}")]
    CircuitBreakerOpen {
        name: String,
        state: String,
        failure_count: u32,
        next_attempt_at: Option<std::time::SystemTime>,
    },
    
    #[error("Rate limit exceeded: {limit} requests per {window_seconds}s")]
    RateLimitExceeded {
        limit: u32,
        window_seconds: u32,
        retry_after_seconds: Option<u32>,
    },
    
    // Legacy compatibility variants for existing code
    #[error("TLS error: {0}")]
    Tls(String),
    
    #[error("Compression error: {0}")]
    Compression(String),
}

/// Data collection errors with source-specific context
#[derive(Error, Debug)]
pub enum CollectorError {
    #[error("Collector '{name}' initialization failed")]
    InitializationFailed {
        name: String,
        collector_type: String,
        reason: String,
        configuration: String,
    },
    
    #[error("Data collection failed for source '{source}'")]
    CollectionFailed {
        source: String,
        operation: String,
        batch_size: Option<usize>,
        #[source]
        source_error: Box<dyn std::error::Error + Send + Sync>,
    },
    
    #[error("File system operation failed: {operation}")]
    FileSystemError {
        operation: String,
        path: String,
        permissions_issue: bool,
        #[source]
        source: std::io::Error,
    },
    
    #[error("Windows Event Log error: {operation}")]
    WindowsEventError {
        operation: String,
        channel: String,
        event_id: Option<u32>,
        error_code: Option<u32>,
    },
    
    #[error("Network collection error: {protocol}")]
    NetworkError {
        protocol: String,
        endpoint: String,
        #[source]
        source: Box<dyn std::error::Error + Send + Sync>,
    },
    
    #[error("Collector '{name}' health check failed")]
    HealthCheckFailed {
        name: String,
        last_successful: Option<std::time::SystemTime>,
        consecutive_failures: u32,
    },
    
    #[error("Data validation failed for collector '{collector}'")]
    DataValidationFailed {
        collector: String,
        field: String,
        expected_format: String,
        actual_value: String,
    },
    
    // Legacy compatibility variants for existing code
    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),
}

/// Buffer and persistence errors with recovery information
#[derive(Error, Debug)]
pub enum BufferError {
    #[error("Buffer capacity exceeded: {current}/{max} items")]
    CapacityExceeded {
        current: usize,
        max: usize,
        buffer_type: String, // memory/disk
        oldest_item_age: Option<std::time::Duration>,
    },
    
    #[error("Persistence layer error: {operation}")]
    PersistenceError {
        operation: String,
        database_path: String,
        recoverable: bool,
        #[source]
        source: Box<dyn std::error::Error + Send + Sync>,
    },
    
    #[error("Data corruption detected in {location}")]
    CorruptionError {
        location: String,
        corruption_type: String,
        affected_records: Option<usize>,
        recovery_possible: bool,
    },
    
    #[error("Serialization failed for {data_type}")]
    SerializationError {
        data_type: String,
        operation: String, // serialize/deserialize
        size_bytes: Option<usize>,
        #[source]
        source: Box<dyn std::error::Error + Send + Sync>,
    },
    
    
    #[error("Channel operation failed: {operation}")]
    ChannelError {
        operation: String,
        channel_name: String,
        buffer_size: Option<usize>,
        is_closed: bool,
    },
    
    #[error("Buffer recovery operation failed")]
    RecoveryFailed {
        strategy: String,
        attempts: u32,
        partial_success: bool,
        records_recovered: Option<usize>,
    },
    
    #[error("WAL (Write-Ahead Log) error: {operation}")]
    WalError {
        operation: String,
        wal_file: String,
        checkpoint_lag: Option<u64>,
        #[source]
        source: Box<dyn std::error::Error + Send + Sync>,
    },
    
    #[cfg(feature = "persistent-storage")]
    #[error("SQLite database error: {0}")]
    SqliteError(#[from] rusqlite::Error),
}

/// Parsing and data transformation errors
#[derive(Error, Debug)]
pub enum ParserError {
    #[error("Invalid regex pattern '{pattern}'")]
    InvalidRegex {
        pattern: String,
        position: Option<usize>,
        #[source]
        source: regex::Error,
    },
    
    #[error("Parsing failed for source '{source_type}' with parser '{parser}'")]
    ParseFailed {
        source_type: String,
        parser: String,
        input_sample: String,
        expected_format: Option<String>,
    },
    
    #[error("No parser available for source type '{source_type}'")]
    NoMatchingParser {
        source_type: String,
        available_parsers: Vec<String>,
        suggested_parser: Option<String>,
    },
    
    #[error("Field extraction failed: {field}")]
    FieldExtractionFailed {
        field: String,
        extractor_type: String,
        input_data: String,
        expected_type: String,
    },
    
    #[error("Schema validation failed for parsed data")]
    SchemaValidationFailed {
        parser: String,
        violations: Vec<String>,
        data_sample: String,
    },
    
}

/// Management API and control plane errors
#[derive(Error, Debug)]
pub enum ManagementError {
    #[error("gRPC service error: {service}")]
    GrpcError {
        service: String,
        method: String,
        #[source]
        source: Box<dyn std::error::Error + Send + Sync>,
    },
    
    #[error("Invalid API request: {endpoint}")]
    InvalidRequest {
        endpoint: String,
        method: String,
        validation_errors: Vec<String>,
    },
    
    #[error("Service '{service}' is unavailable")]
    ServiceUnavailable {
        service: String,
        reason: String,
        estimated_recovery: Option<std::time::Duration>,
    },
    
    #[error("Authorization failed for operation '{operation}'")]
    AuthorizationFailed {
        operation: String,
        required_permission: String,
        user_id: Option<String>,
    },
    
    #[error("Rate limiting active for client '{client_id}'")]
    RateLimited {
        client_id: String,
        limit_type: String,
        reset_time: std::time::SystemTime,
    },
}

/// Resource management and system health errors
#[derive(Error, Debug)]
pub enum ResourceError {
    #[error("Resource limit exceeded: {resource}")]
    LimitExceeded {
        resource: String,
        current: f64,
        limit: f64,
        unit: String,
    },
    
    #[error("Memory pressure detected: {level}")]
    MemoryPressure {
        level: String, // low/medium/high/critical
        current_usage_mb: f64,
        available_mb: f64,
        pressure_duration: std::time::Duration,
    },
    
    #[error("CPU throttling active: {level}")]
    CpuThrottling {
        level: f64, // 0.0-1.0
        current_usage: f64,
        target_usage: f64,
        affected_components: Vec<String>,
    },
    
    #[error("Disk space critically low: {path}")]
    DiskSpaceError {
        path: String,
        available_mb: f64,
        total_mb: f64,
        threshold_mb: f64,
    },
    
    #[error("System resource monitoring failed")]
    MonitoringFailed {
        subsystem: String,
        #[source]
        source: Box<dyn std::error::Error + Send + Sync>,
    },
}

/// Security-related errors
#[derive(Error, Debug)]
pub enum SecurityError {
    #[error("Certificate validation failed: {reason}")]
    CertificateError {
        reason: String,
        certificate_type: String,
        expires_at: Option<std::time::SystemTime>,
        issuer: Option<String>,
    },
    
    #[error("Input validation failed for field '{field}'")]
    InputValidation {
        field: String,
        input_type: String,
        validation_rule: String,
        sanitized_value: Option<String>,
    },
    
    #[error("Credential storage error: {operation}")]
    CredentialError {
        operation: String,
        credential_type: String,
        #[source]
        source: Box<dyn std::error::Error + Send + Sync>,
    },
    
    #[error("Security audit event: {event_type}")]
    AuditEvent {
        event_type: String,
        severity: ErrorSeverity,
        user_id: Option<String>,
        resource: String,
        details: Vec<(String, String)>,
    },
}

/// Error severity levels for prioritization and alerting
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ErrorSeverity {
    Low,
    Medium,
    High,
    Critical,
}

impl fmt::Display for ErrorSeverity {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ErrorSeverity::Low => write!(f, "LOW"),
            ErrorSeverity::Medium => write!(f, "MEDIUM"),
            ErrorSeverity::High => write!(f, "HIGH"),
            ErrorSeverity::Critical => write!(f, "CRITICAL"),
        }
    }
}

/// Error category for metrics and monitoring
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ErrorCategory {
    Configuration,
    Network,
    System,
    Data,
    Security,
    Resource,
    Runtime,
}

impl AgentError {
    /// Get the error category for metrics collection
    pub fn category(&self) -> ErrorCategory {
        match self {
            AgentError::Config(_) => ErrorCategory::Configuration,
            AgentError::Transport(_) => ErrorCategory::Network,
            AgentError::Collector(_) => ErrorCategory::Data,
            AgentError::Buffer(_) => ErrorCategory::Data,
            AgentError::Parser(_) => ErrorCategory::Data,
            AgentError::Management(_) => ErrorCategory::Network,
            AgentError::Resource(_) => ErrorCategory::Resource,
            AgentError::Security(_) => ErrorCategory::Security,
            AgentError::Io(_) => ErrorCategory::System,
            AgentError::TaskJoin(_) => ErrorCategory::Runtime,
            AgentError::Json(_) => ErrorCategory::Data,
            AgentError::UrlParse(_) => ErrorCategory::Configuration,
            AgentError::ChannelError { .. } => ErrorCategory::Runtime,
            AgentError::ShutdownTimeout { .. } => ErrorCategory::Runtime,
            AgentError::InitializationFailed { .. } => ErrorCategory::System,
            AgentError::CriticalError { .. } => ErrorCategory::System,
        }
    }
    
    /// Get error severity
    pub fn severity(&self) -> ErrorSeverity {
        match self {
            AgentError::CriticalError { severity, .. } => *severity,
            AgentError::ShutdownTimeout { .. } => ErrorSeverity::High,
            AgentError::InitializationFailed { .. } => ErrorSeverity::High,
            AgentError::Security(_) => ErrorSeverity::High,
            AgentError::Resource(_) => ErrorSeverity::Medium,
            AgentError::Transport(_) => ErrorSeverity::Medium,
            AgentError::Buffer(_) => ErrorSeverity::Medium,
            _ => ErrorSeverity::Low,
        }
    }
    
    /// Check if error is retryable
    pub fn is_retryable(&self) -> bool {
        match self {
            AgentError::Transport(source) => source.is_retryable(),
            AgentError::Collector(source) => source.is_retryable(),
            AgentError::Buffer(source) => source.is_retryable(),
            AgentError::Io(_) => true,
            AgentError::TaskJoin(_) => false,
            AgentError::ChannelError { .. } => true,
            _ => false,
        }
    }
    
    /// Create a channel error
    pub fn channel_error(reason: &str, component: &str) -> Self {
        AgentError::ChannelError {
            reason: reason.to_string(),
            component: component.to_string(),
        }
    }
    
    /// Create a critical error requiring shutdown
    pub fn critical(condition: &str, severity: ErrorSeverity) -> Self {
        AgentError::CriticalError {
            condition: condition.to_string(),
            severity,
            requires_shutdown: matches!(severity, ErrorSeverity::Critical),
        }
    }
}

impl TransportError {
    /// Check if transport error is retryable
    pub fn is_retryable(&self) -> bool {
        match self {
            TransportError::ConnectionFailed { .. } => true,
            TransportError::RequestFailed { .. } => true,
            TransportError::ServerError { retryable, .. } => *retryable,
            TransportError::Timeout { retryable, .. } => *retryable,
            TransportError::CompressionError { .. } => true,
            TransportError::AuthenticationFailed { retry_allowed, .. } => *retry_allowed,
            TransportError::TlsError { certificate_issue, .. } => !certificate_issue,
            TransportError::CircuitBreakerOpen { .. } => false,
            TransportError::RateLimitExceeded { .. } => true,
            TransportError::Tls(_) => false,
            TransportError::Compression(_) => true,
        }
    }
}

impl CollectorError {
    /// Check if collector error is retryable
    pub fn is_retryable(&self) -> bool {
        match self {
            CollectorError::InitializationFailed { .. } => false,
            CollectorError::CollectionFailed { .. } => true,
            CollectorError::FileSystemError { permissions_issue, .. } => !permissions_issue,
            CollectorError::WindowsEventError { .. } => true,
            CollectorError::NetworkError { .. } => true,
            CollectorError::HealthCheckFailed { .. } => true,
            CollectorError::DataValidationFailed { .. } => false,
            CollectorError::InvalidConfig(_) => false,
        }
    }
}

impl BufferError {
    /// Check if buffer error is retryable
    pub fn is_retryable(&self) -> bool {
        match self {
            BufferError::CapacityExceeded { .. } => true,
            BufferError::PersistenceError { recoverable, .. } => *recoverable,
            BufferError::CorruptionError { recovery_possible, .. } => *recovery_possible,
            BufferError::SerializationError { .. } => false,
            BufferError::ChannelError { is_closed, .. } => !is_closed,
            BufferError::RecoveryFailed { partial_success, .. } => *partial_success,
            BufferError::WalError { .. } => true,
            #[cfg(feature = "persistent-storage")]
            BufferError::SqliteError(_) => true,
        }
    }
}

// Convenience type aliases
pub type Result<T> = std::result::Result<T, AgentError>;
pub type ConfigResult<T> = std::result::Result<T, ConfigError>;
pub type TransportResult<T> = std::result::Result<T, TransportError>;
pub type CollectorResult<T> = std::result::Result<T, CollectorError>;
pub type BufferResult<T> = std::result::Result<T, BufferError>;
pub type ParserResult<T> = std::result::Result<T, ParserError>;

// Error context helpers for better error messages
pub trait ErrorContext<T> {
    fn with_context<F>(self, f: F) -> Result<T>
    where
        F: FnOnce() -> String;
}

impl<T, E> ErrorContext<T> for std::result::Result<T, E>
where
    E: Into<AgentError>,
{
    fn with_context<F>(self, f: F) -> Result<T>
    where
        F: FnOnce() -> String,
    {
        self.map_err(|e| {
            let base_error = e.into();
            // Add contextual information to the error
            match base_error {
                AgentError::Io(source) => {
                    AgentError::InitializationFailed {
                        service: f(),
                        reason: source.to_string(),
                    }
                }
                other => other,
            }
        })
    }
}

// Backward compatibility constructors for existing code
impl TransportError {
    /// Create a connection failed error (legacy compatibility)
    pub fn connection_failed(msg: &str) -> Self {
        TransportError::ConnectionFailed {
            endpoint: "unknown".to_string(),
            attempts: 1,
            last_error: msg.to_string(),
            retry_after: None,
        }
    }
    
    /// Create a serialization error (legacy compatibility)
    pub fn serialization_error(msg: &str) -> Self {
        TransportError::CompressionError {
            algorithm: "unknown".to_string(),
            operation: "serialize".to_string(),
            original_size: None,
            source: Box::new(std::io::Error::new(std::io::ErrorKind::InvalidData, msg)),
        }
    }
}

impl ParserError {
    /// Create an invalid regex error (legacy compatibility)
    pub fn invalid_regex(msg: &str) -> Self {
        ParserError::InvalidRegex {
            pattern: "unknown".to_string(),
            position: None,
            source: regex::Error::Syntax(msg.to_string()),
        }
    }
    
    /// Create a parse failed error (legacy compatibility)
    pub fn parse_failed(msg: &str) -> Self {
        ParserError::ParseFailed {
            source_type: "unknown".to_string(),
            parser: "unknown".to_string(),
            input_sample: msg.to_string(),
            expected_format: None,
        }
    }
}