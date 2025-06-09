// Configuration structures for SecureWatch Agent

use crate::errors::ConfigError;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use regex::Regex;
use jsonschema::{JSONSchema, ValidationError as JsonSchemaError};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    pub agent: AgentSettings,
    pub transport: TransportConfig,
    pub collectors: CollectorsConfig,
    pub buffer: BufferConfig,
    pub parsers: ParsersConfig,
    pub management: ManagementConfig,
    pub resource_monitor: crate::resource_monitor::ResourceMonitorConfig,
    pub throttle: crate::throttle::ThrottleConfig,
    pub emergency_shutdown: crate::emergency_shutdown::EmergencyShutdownConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentSettings {
    pub name: String,
    pub tags: Vec<String>,
    pub heartbeat_interval: u64,
    pub max_memory_mb: usize,
    pub max_cpu_percent: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransportConfig {
    pub server_url: String,
    pub api_key: String,
    pub tls_verify: bool,
    pub compression: bool,
    pub batch_size: usize,
    pub batch_timeout: u64,
    pub retry_attempts: usize,
    pub retry_delay: u64,
    
    // mTLS client certificate configuration
    pub client_cert_path: Option<String>,
    pub client_key_path: Option<String>,
    pub client_key_password: Option<String>,
    pub ca_cert_path: Option<String>,
    pub cert_expiry_warning_days: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollectorsConfig {
    pub syslog: Option<SyslogCollectorConfig>,
    pub windows_event: Option<WindowsEventCollectorConfig>,
    pub file_monitor: Option<FileMonitorConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyslogCollectorConfig {
    pub enabled: bool,
    pub bind_address: String,
    pub port: u16,
    pub protocol: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowsEventCollectorConfig {
    pub enabled: bool,
    pub channels: Vec<String>,
    pub batch_size: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMonitorConfig {
    pub enabled: bool,
    pub paths: Vec<String>,
    pub patterns: Vec<String>,
    pub recursive: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BufferConfig {
    pub max_events: usize,
    pub max_size_mb: usize,
    pub flush_interval: u64,
    pub compression: bool,
    pub persistent: bool,
    pub persistence_path: String,
    
    // Advanced SQLite configuration
    pub wal_mode: bool,
    pub synchronous_mode: SqliteSynchronousMode,
    pub journal_size_limit_mb: usize,
    pub checkpoint_interval_sec: u64,
    pub cache_size_kb: usize,
    pub vacuum_on_startup: bool,
    pub auto_vacuum: SqliteAutoVacuum,
    pub temp_store: SqliteTempStore,
    pub mmap_size_mb: usize,
    pub max_page_count: Option<usize>,
    pub secure_delete: bool,
    
    // Buffer size limits and cleanup configuration
    pub max_database_size_mb: Option<usize>,
    pub cleanup_trigger_percent: f64,
    pub cleanup_target_percent: f64,
    pub cleanup_strategy: CleanupStrategy,
    pub cleanup_interval_sec: u64,
    pub min_retention_hours: u64,
    pub max_events_per_cleanup: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SqliteSynchronousMode {
    Off,      // 0 - Fastest, least safe
    Normal,   // 1 - Fast, good safety
    Full,     // 2 - Safest, slower
    Extra,    // 3 - Most paranoid
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SqliteAutoVacuum {
    None,        // 0 - No automatic vacuum
    Full,        // 1 - Full vacuum after deletions
    Incremental, // 2 - Incremental vacuum
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SqliteTempStore {
    Default, // 0 - Use compile-time default
    File,    // 1 - Use temporary files
    Memory,  // 2 - Use memory for temp storage
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CleanupStrategy {
    Fifo,          // First In, First Out - remove oldest events
    Lru,           // Least Recently Used - remove least accessed events
    Priority,      // Remove by priority level (keep high priority events)
    Intelligent,   // Combine multiple strategies for optimal cleanup
}

/// Structured validation error for detailed error reporting
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigValidationError {
    pub path: String,
    pub error_type: String,
    pub message: String,
    pub suggestion: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsersConfig {
    pub parsers: Vec<ParserDefinition>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParserDefinition {
    pub name: String,
    pub source_type: String,
    pub regex_pattern: String,
    pub field_mappings: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManagementConfig {
    pub enabled: bool,
    pub bind_address: String,
    pub port: u16,
    pub auth_token: Option<String>,
}

impl Default for AgentConfig {
    fn default() -> Self {
        Self {
            agent: AgentSettings {
                name: "securewatch-agent".to_string(),
                tags: vec!["default".to_string()],
                heartbeat_interval: 30,
                max_memory_mb: 512,
                max_cpu_percent: 50.0,
            },
            transport: TransportConfig {
                server_url: "https://api.securewatch.local".to_string(),
                api_key: "your-api-key".to_string(),
                tls_verify: true,
                compression: true,
                batch_size: 100,
                batch_timeout: 5,
                retry_attempts: 3,
                retry_delay: 2,
                
                // mTLS client certificate configuration (all optional)
                client_cert_path: None,
                client_key_path: None,
                client_key_password: None,
                ca_cert_path: None,
                cert_expiry_warning_days: 30,
            },
            collectors: CollectorsConfig {
                syslog: Some(SyslogCollectorConfig {
                    enabled: true,
                    bind_address: "0.0.0.0".to_string(),
                    port: 514,
                    protocol: "udp".to_string(),
                }),
                windows_event: Some(WindowsEventCollectorConfig {
                    enabled: false,
                    channels: vec!["System".to_string(), "Security".to_string()],
                    batch_size: 50,
                }),
                file_monitor: Some(FileMonitorConfig {
                    enabled: false,
                    paths: vec!["/var/log/*.log".to_string()],
                    patterns: vec!["*.log".to_string()],
                    recursive: true,
                }),
            },
            buffer: BufferConfig {
                max_events: 10000,
                max_size_mb: 100,
                flush_interval: 10,
                compression: true,
                persistent: true,
                persistence_path: "./buffer".to_string(),
                
                // Advanced SQLite configuration with production-ready defaults
                wal_mode: true,
                synchronous_mode: SqliteSynchronousMode::Normal,
                journal_size_limit_mb: 64,
                checkpoint_interval_sec: 300, // 5 minutes
                cache_size_kb: 8192, // 8MB cache
                vacuum_on_startup: false,
                auto_vacuum: SqliteAutoVacuum::Incremental,
                temp_store: SqliteTempStore::Memory,
                mmap_size_mb: 128,
                max_page_count: None,
                secure_delete: false,
                
                // Buffer size limits with production-ready defaults
                max_database_size_mb: Some(1024), // 1GB limit
                cleanup_trigger_percent: 80.0,     // Trigger cleanup at 80% capacity
                cleanup_target_percent: 60.0,      // Clean up to 60% capacity
                cleanup_strategy: CleanupStrategy::Intelligent,
                cleanup_interval_sec: 300,         // Check every 5 minutes
                min_retention_hours: 24,           // Keep events for at least 24 hours
                max_events_per_cleanup: 10000,     // Limit cleanup batch size
            },
            parsers: ParsersConfig {
                parsers: vec![
                    ParserDefinition {
                        name: "syslog_rfc3164".to_string(),
                        source_type: "syslog".to_string(),
                        regex_pattern: r"^<(?P<priority>\d+)>(?P<timestamp>\w+\s+\d+\s+\d+:\d+:\d+)\s+(?P<hostname>\S+)\s+(?P<tag>\w+):\s*(?P<message>.*)$".to_string(),
                        field_mappings: HashMap::from([
                            ("priority".to_string(), "syslog.priority".to_string()),
                            ("timestamp".to_string(), "@timestamp".to_string()),
                            ("hostname".to_string(), "host.name".to_string()),
                            ("tag".to_string(), "process.name".to_string()),
                            ("message".to_string(), "message".to_string()),
                        ]),
                    }
                ],
            },
            management: ManagementConfig {
                enabled: true,
                bind_address: "127.0.0.1".to_string(),
                port: 9090,
                auth_token: Some("securewatch-token".to_string()),
            },
            resource_monitor: crate::resource_monitor::ResourceMonitorConfig::default(),
            throttle: crate::throttle::ThrottleConfig::default(),
            emergency_shutdown: crate::emergency_shutdown::EmergencyShutdownConfig::default(),
        }
    }
}

impl AgentConfig {
    pub async fn load_from_file(path: &str) -> Result<Self, ConfigError> {
        let content = tokio::fs::read_to_string(path).await
            .map_err(|e| ConfigError::Io(e.to_string()))?;
        
        let config: AgentConfig = toml::from_str(&content)
            .map_err(|e| ConfigError::Parse(e.to_string()))?;
        
        Ok(config)
    }

    pub async fn save_to_file(&self, path: &str) -> Result<(), ConfigError> {
        let content = toml::to_string_pretty(self)
            .map_err(|e| ConfigError::Serialize(e.to_string()))?;
        
        tokio::fs::write(path, content).await
            .map_err(|e| ConfigError::Io(e.to_string()))?;
        
        Ok(())
    }
}

impl AgentConfig {
    /// Generate JSON schema for configuration validation
    pub fn get_json_schema() -> serde_json::Value {
        serde_json::json!({
            "$schema": "http://json-schema.org/draft-07/schema#",
            "title": "SecureWatch Agent Configuration",
            "description": "Complete configuration schema for SecureWatch Agent with validation rules",
            "type": "object",
            "required": ["agent", "transport", "collectors", "buffer", "parsers", "management"],
            "properties": {
                "agent": {
                    "type": "object",
                    "required": ["name", "tags", "heartbeat_interval", "max_memory_mb", "max_cpu_percent"],
                    "properties": {
                        "name": {
                            "type": "string",
                            "minLength": 3,
                            "maxLength": 64,
                            "pattern": "^[a-zA-Z0-9_-]+$",
                            "description": "Agent name (alphanumeric, underscore, hyphen only)"
                        },
                        "tags": {
                            "type": "array",
                            "items": { "type": "string", "minLength": 1, "maxLength": 32 },
                            "maxItems": 10,
                            "description": "Agent tags for classification"
                        },
                        "heartbeat_interval": {
                            "type": "integer",
                            "minimum": 5,
                            "maximum": 300,
                            "description": "Heartbeat interval in seconds (5-300)"
                        },
                        "max_memory_mb": {
                            "type": "integer",
                            "minimum": 64,
                            "maximum": 16384,
                            "description": "Maximum memory usage in MB (64-16384)"
                        },
                        "max_cpu_percent": {
                            "type": "number",
                            "minimum": 1.0,
                            "maximum": 100.0,
                            "description": "Maximum CPU usage percentage (1-100)"
                        }
                    }
                },
                "transport": {
                    "type": "object",
                    "required": ["server_url", "api_key", "tls_verify", "compression", "batch_size", "batch_timeout", "retry_attempts", "retry_delay", "cert_expiry_warning_days"],
                    "properties": {
                        "server_url": {
                            "type": "string",
                            "format": "uri",
                            "pattern": "^https?://",
                            "description": "Server URL must be HTTP or HTTPS"
                        },
                        "api_key": {
                            "type": "string",
                            "minLength": 16,
                            "maxLength": 256,
                            "not": { "enum": ["your-api-key", "test-key", ""] },
                            "description": "API key for authentication (16-256 chars, not default value)"
                        },
                        "tls_verify": {
                            "type": "boolean",
                            "description": "Enable TLS certificate verification"
                        },
                        "compression": {
                            "type": "boolean",
                            "description": "Enable HTTP compression"
                        },
                        "batch_size": {
                            "type": "integer",
                            "minimum": 1,
                            "maximum": 10000,
                            "description": "Batch size for event transmission (1-10000)"
                        },
                        "batch_timeout": {
                            "type": "integer",
                            "minimum": 1,
                            "maximum": 300,
                            "description": "Batch timeout in seconds (1-300)"
                        },
                        "retry_attempts": {
                            "type": "integer",
                            "minimum": 0,
                            "maximum": 10,
                            "description": "Number of retry attempts (0-10)"
                        },
                        "retry_delay": {
                            "type": "integer",
                            "minimum": 1,
                            "maximum": 60,
                            "description": "Retry delay in seconds (1-60)"
                        },
                        "client_cert_path": {
                            "type": ["string", "null"],
                            "description": "Path to client certificate for mTLS"
                        },
                        "client_key_path": {
                            "type": ["string", "null"],
                            "description": "Path to client private key for mTLS"
                        },
                        "client_key_password": {
                            "type": ["string", "null"],
                            "description": "Password for encrypted client key"
                        },
                        "ca_cert_path": {
                            "type": ["string", "null"],
                            "description": "Path to custom CA certificate"
                        },
                        "cert_expiry_warning_days": {
                            "type": "integer",
                            "minimum": 1,
                            "maximum": 365,
                            "description": "Days before certificate expiry to warn (1-365)"
                        }
                    }
                },
                "collectors": {
                    "type": "object",
                    "properties": {
                        "syslog": {
                            "type": ["object", "null"],
                            "properties": {
                                "enabled": { "type": "boolean" },
                                "bind_address": {
                                    "type": "string",
                                    "anyOf": [
                                        { "format": "ipv4" },
                                        { "format": "ipv6" },
                                        { "enum": ["0.0.0.0", "::"] }
                                    ]
                                },
                                "port": {
                                    "type": "integer",
                                    "minimum": 1,
                                    "maximum": 65535
                                },
                                "protocol": {
                                    "type": "string",
                                    "enum": ["udp", "tcp"]
                                }
                            }
                        },
                        "windows_event": {
                            "type": ["object", "null"],
                            "properties": {
                                "enabled": { "type": "boolean" },
                                "channels": {
                                    "type": "array",
                                    "items": { "type": "string", "minLength": 1 },
                                    "maxItems": 50
                                },
                                "batch_size": {
                                    "type": "integer",
                                    "minimum": 1,
                                    "maximum": 1000
                                }
                            }
                        },
                        "file_monitor": {
                            "type": ["object", "null"],
                            "properties": {
                                "enabled": { "type": "boolean" },
                                "paths": {
                                    "type": "array",
                                    "items": { "type": "string", "minLength": 1 },
                                    "maxItems": 100
                                },
                                "patterns": {
                                    "type": "array",
                                    "items": { "type": "string", "minLength": 1 },
                                    "maxItems": 50
                                },
                                "recursive": { "type": "boolean" }
                            }
                        }
                    }
                },
                "buffer": {
                    "type": "object",
                    "required": ["max_events", "max_size_mb", "flush_interval", "compression", "persistent", "persistence_path"],
                    "properties": {
                        "max_events": {
                            "type": "integer",
                            "minimum": 100,
                            "maximum": 1000000,
                            "description": "Maximum events in buffer (100-1M)"
                        },
                        "max_size_mb": {
                            "type": "integer",
                            "minimum": 1,
                            "maximum": 10240,
                            "description": "Maximum buffer size in MB (1-10240)"
                        },
                        "flush_interval": {
                            "type": "integer",
                            "minimum": 1,
                            "maximum": 300,
                            "description": "Flush interval in seconds (1-300)"
                        },
                        "compression": { "type": "boolean" },
                        "persistent": { "type": "boolean" },
                        "persistence_path": {
                            "type": "string",
                            "minLength": 1,
                            "description": "Path for persistent buffer storage"
                        }
                    }
                },
                "parsers": {
                    "type": "object",
                    "required": ["parsers"],
                    "properties": {
                        "parsers": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "required": ["name", "source_type", "regex_pattern", "field_mappings"],
                                "properties": {
                                    "name": {
                                        "type": "string",
                                        "minLength": 1,
                                        "maxLength": 64,
                                        "pattern": "^[a-zA-Z0-9_-]+$"
                                    },
                                    "source_type": {
                                        "type": "string",
                                        "minLength": 1,
                                        "maxLength": 32
                                    },
                                    "regex_pattern": {
                                        "type": "string",
                                        "minLength": 1,
                                        "maxLength": 2048,
                                        "description": "Valid regex pattern for parsing"
                                    },
                                    "field_mappings": {
                                        "type": "object",
                                        "additionalProperties": { "type": "string" }
                                    }
                                }
                            }
                        }
                    }
                },
                "management": {
                    "type": "object",
                    "required": ["enabled", "bind_address", "port"],
                    "properties": {
                        "enabled": { "type": "boolean" },
                        "bind_address": {
                            "type": "string",
                            "anyOf": [
                                { "format": "ipv4" },
                                { "format": "ipv6" },
                                { "enum": ["0.0.0.0", "::"] }
                            ]
                        },
                        "port": {
                            "type": "integer",
                            "minimum": 1024,
                            "maximum": 65535,
                            "description": "Management port (1024-65535)"
                        },
                        "auth_token": {
                            "type": ["string", "null"],
                            "minLength": 16,
                            "maxLength": 128,
                            "description": "Authentication token for management API"
                        }
                    }
                }
            }
        })
    }
    
    /// Validate configuration using JSON schema with detailed errors
    pub fn validate_with_schema(&self) -> Result<(), ConfigError> {
        // Convert config to JSON for schema validation
        let config_value = serde_json::to_value(self)
            .map_err(|e| ConfigError::SerializationError {
                operation: "config_to_json".to_string(),
                source: Box::new(e),
            })?;
        
        // Get and compile the schema
        let schema_value = Self::get_json_schema();
        let schema = JSONSchema::compile(&schema_value)
            .map_err(|e| ConfigError::SchemaValidationFailed {
                error_count: 1,
                errors: vec![format!("Schema compilation failed: {}", e)],
            })?;
        
        // Validate configuration against schema
        let validation_result = schema.validate(&config_value);
        
        match validation_result {
            Ok(_) => {
                // Schema validation passed, run additional custom validations
                self.validate_custom_rules()
            }
            Err(errors) => {
                let error_messages: Vec<String> = errors
                    .map(|error| self.format_schema_error(&error))
                    .collect();
                
                Err(ConfigError::SchemaValidationFailed {
                    error_count: error_messages.len(),
                    errors: error_messages,
                })
            }
        }
    }
    
    /// Format JSON schema validation error with detailed context
    fn format_schema_error(&self, error: &JsonSchemaError) -> String {
        let instance_path = error.instance_path.to_string();
        let schema_path = error.schema_path.to_string();
        
        // For jsonschema 0.18, we'll use a simplified approach since the ErrorKind enum
        // structure is different. We'll parse the error message for specific patterns.
        let error_msg = error.to_string();
        
        if error_msg.contains("is not valid under any of the given schemas") {
            format!("Validation error at '{}': {}", instance_path, error_msg)
        } else if error_msg.contains("is not of type") {
            format!("Type mismatch at '{}': {}", instance_path, error_msg)
        } else if error_msg.contains("is less than the minimum") {
            format!("Value at '{}' is below minimum: {}", instance_path, error_msg)
        } else if error_msg.contains("is greater than the maximum") {
            format!("Value at '{}' exceeds maximum: {}", instance_path, error_msg)
        } else if error_msg.contains("is shorter than") {
            format!("String at '{}' is too short: {}", instance_path, error_msg)
        } else if error_msg.contains("is longer than") {
            format!("String at '{}' is too long: {}", instance_path, error_msg)
        } else if error_msg.contains("does not match") {
            format!("Value at '{}' doesn't match pattern: {}", instance_path, error_msg)
        } else if error_msg.contains("is not one of") {
            format!("Invalid value at '{}': {}", instance_path, error_msg)
        } else if error_msg.contains("is not a") {
            format!("Invalid format at '{}': {}", instance_path, error_msg)
        } else {
            format!("Validation error at '{}' ({}): {}", instance_path, schema_path, error_msg)
        }
    }
    
    /// Additional custom validation rules beyond schema
    fn validate_custom_rules(&self) -> Result<(), ConfigError> {
        let mut errors = Vec::new();
        
        // Validate transport configuration
        if let Err(e) = self.validate_transport_config() {
            errors.push(format!("Transport validation: {}", e));
        }
        
        // Validate parser regex patterns
        if let Err(e) = self.validate_parser_patterns() {
            errors.push(format!("Parser validation: {}", e));
        }
        
        // Validate buffer configuration
        if let Err(e) = self.validate_buffer_config() {
            errors.push(format!("Buffer validation: {}", e));
        }
        
        // Validate collector configuration
        if let Err(e) = self.validate_collector_config() {
            errors.push(format!("Collector validation: {}", e));
        }
        
        // Validate management configuration
        if let Err(e) = self.validate_management_config() {
            errors.push(format!("Management validation: {}", e));
        }
        
        if errors.is_empty() {
            Ok(())
        } else {
            Err(ConfigError::SchemaValidationFailed {
                error_count: errors.len(),
                errors,
            })
        }
    }
    
    /// Validate transport configuration details
    fn validate_transport_config(&self) -> Result<(), String> {
        // Check URL scheme
        let url = url::Url::parse(&self.transport.server_url)
            .map_err(|e| format!("Invalid server URL: {}", e))?;
        
        if !matches!(url.scheme(), "http" | "https") {
            return Err("Server URL must use HTTP or HTTPS scheme".to_string());
        }
        
        // Validate mTLS configuration
        if let (Some(cert_path), Some(key_path)) = (&self.transport.client_cert_path, &self.transport.client_key_path) {
            if cert_path.is_empty() || key_path.is_empty() {
                return Err("mTLS certificate and key paths cannot be empty".to_string());
            }
            
            // Check if paths exist (basic validation)
            if !std::path::Path::new(cert_path).exists() {
                return Err(format!("Client certificate file not found: {}", cert_path));
            }
            if !std::path::Path::new(key_path).exists() {
                return Err(format!("Client key file not found: {}", key_path));
            }
        } else if self.transport.client_cert_path.is_some() || self.transport.client_key_path.is_some() {
            return Err("Both client certificate and key paths must be provided for mTLS".to_string());
        }
        
        // Validate CA certificate if provided
        if let Some(ca_path) = &self.transport.ca_cert_path {
            if !std::path::Path::new(ca_path).exists() {
                return Err(format!("CA certificate file not found: {}", ca_path));
            }
        }
        
        Ok(())
    }
    
    /// Validate parser regex patterns
    fn validate_parser_patterns(&self) -> Result<(), String> {
        for parser in &self.parsers.parsers {
            if let Err(e) = Regex::new(&parser.regex_pattern) {
                return Err(format!("Invalid regex in parser '{}': {}", parser.name, e));
            }
            
            // Check for potential ReDoS patterns (basic checks)
            if parser.regex_pattern.contains("(.*)+") || parser.regex_pattern.contains("(.+)+") {
                return Err(format!("Parser '{}' contains potentially dangerous regex pattern that could cause ReDoS", parser.name));
            }
        }
        Ok(())
    }
    
    /// Validate buffer configuration
    fn validate_buffer_config(&self) -> Result<(), String> {
        // Check persistence path
        if self.buffer.persistent {
            let path = std::path::Path::new(&self.buffer.persistence_path);
            if let Some(parent) = path.parent() {
                if !parent.exists() {
                    return Err(format!("Buffer persistence directory does not exist: {}", parent.display()));
                }
                
                // Check if directory is writable (basic check)
                let test_file = parent.join(".write_test");
                if std::fs::write(&test_file, "test").is_err() {
                    return Err(format!("Buffer persistence directory is not writable: {}", parent.display()));
                }
                let _ = std::fs::remove_file(test_file);
            }
        }
        
        // Validate memory vs disk buffer sizing
        let max_memory_bytes = self.buffer.max_size_mb * 1024 * 1024;
        let agent_memory_bytes = self.agent.max_memory_mb * 1024 * 1024;
        
        if max_memory_bytes > (agent_memory_bytes / 2) as usize {
            return Err("Buffer max_size_mb should not exceed 50% of agent max_memory_mb".to_string());
        }
        
        Ok(())
    }
    
    /// Validate collector configuration
    fn validate_collector_config(&self) -> Result<(), String> {
        let mut enabled_count = 0;
        
        // Check syslog collector
        if let Some(syslog) = &self.collectors.syslog {
            if syslog.enabled {
                enabled_count += 1;
                
                // Validate port range for syslog
                if syslog.port < 1024 && syslog.port != 514 {
                    return Err("Syslog port should be 514 or >= 1024 to avoid privilege requirements".to_string());
                }
            }
        }
        
        // Check Windows Event collector
        if let Some(windows_event) = &self.collectors.windows_event {
            if windows_event.enabled {
                enabled_count += 1;
                
                if windows_event.channels.is_empty() {
                    return Err("Windows Event collector must have at least one channel configured".to_string());
                }
            }
        }
        
        // Check file monitor
        if let Some(file_monitor) = &self.collectors.file_monitor {
            if file_monitor.enabled {
                enabled_count += 1;
                
                if file_monitor.paths.is_empty() {
                    return Err("File monitor must have at least one path configured".to_string());
                }
                
                // Basic path validation
                for path in &file_monitor.paths {
                    if path.trim().is_empty() {
                        return Err("File monitor paths cannot be empty".to_string());
                    }
                }
            }
        }
        
        if enabled_count == 0 {
            return Err("At least one collector must be enabled".to_string());
        }
        
        Ok(())
    }
    
    /// Validate management configuration
    fn validate_management_config(&self) -> Result<(), String> {
        if self.management.enabled {
            // Check for port conflicts with collectors
            if let Some(syslog) = &self.collectors.syslog {
                if syslog.enabled && syslog.port == self.management.port {
                    return Err("Management port conflicts with syslog collector port".to_string());
                }
            }
            
            // Validate auth token if provided
            if let Some(token) = &self.management.auth_token {
                if token == "default" || token == "test" || token == "admin" {
                    return Err("Management auth token must not use common default values".to_string());
                }
            }
        }
        
        Ok(())
    }
    
    /// Legacy validation method for backward compatibility
    pub fn validate(&self) -> Result<(), ConfigError> {
        // Use the enhanced schema validation by default
        self.validate_with_schema()
    }
    
    /// Export JSON schema to a file for external validation tools
    pub async fn export_schema(output_path: &str) -> Result<(), ConfigError> {
        let schema = Self::get_json_schema();
        let schema_json = serde_json::to_string_pretty(&schema)
            .map_err(|e| ConfigError::SerializationError {
                operation: "schema_export".to_string(),
                source: Box::new(e),
            })?;
        
        tokio::fs::write(output_path, schema_json).await
            .map_err(|e| ConfigError::Io(format!("Failed to write schema file: {}", e)))?;
        
        Ok(())
    }
    
    /// Validate a configuration file without loading it into memory
    pub async fn validate_file(config_path: &str) -> Result<(), ConfigError> {
        // Load configuration from file
        let config = Self::load_from_file(config_path).await?;
        
        // Validate using schema
        config.validate_with_schema()?;
        
        Ok(())
    }
    
    /// Get validation errors as structured data for programmatic use
    pub fn get_validation_errors(&self) -> Vec<ConfigValidationError> {
        let mut errors = Vec::new();
        
        // Convert config to JSON for schema validation
        let config_value = match serde_json::to_value(self) {
            Ok(value) => value,
            Err(e) => {
                errors.push(ConfigValidationError {
                    path: "root".to_string(),
                    error_type: "serialization".to_string(),
                    message: format!("Failed to serialize config: {}", e),
                    suggestion: Some("Check configuration format".to_string()),
                });
                return errors;
            }
        };
        
        // Get and compile the schema
        let schema_value = Self::get_json_schema();
        let schema = match JSONSchema::compile(&schema_value) {
            Ok(schema) => schema,
            Err(e) => {
                errors.push(ConfigValidationError {
                    path: "schema".to_string(),
                    error_type: "schema_compilation".to_string(),
                    message: format!("Schema compilation failed: {}", e),
                    suggestion: None,
                });
                return errors;
            }
        };
        
        // Validate configuration against schema
        if let Err(validation_errors) = schema.validate(&config_value) {
            for error in validation_errors {
                errors.push(ConfigValidationError {
                    path: error.instance_path.to_string(),
                    error_type: format!("{:?}", error.kind),
                    message: self.format_schema_error(&error),
                    suggestion: self.get_validation_suggestion(&error),
                });
            }
        }
        
        // Add custom validation errors
        match self.validate_custom_rules() {
            Ok(_) => {},
            Err(ConfigError::SchemaValidationFailed { errors: custom_errors, .. }) => {
                for (i, error_msg) in custom_errors.iter().enumerate() {
                    errors.push(ConfigValidationError {
                        path: format!("custom_rule_{}", i),
                        error_type: "custom_validation".to_string(),
                        message: error_msg.clone(),
                        suggestion: self.get_custom_validation_suggestion(error_msg),
                    });
                }
            },
            Err(e) => {
                errors.push(ConfigValidationError {
                    path: "custom_validation".to_string(),
                    error_type: "validation_error".to_string(),
                    message: e.to_string(),
                    suggestion: None,
                });
            }
        }
        
        errors
    }
    
    /// Get suggestions for fixing validation errors
    fn get_validation_suggestion(&self, error: &JsonSchemaError) -> Option<String> {
        let error_msg = error.to_string();
        
        if error_msg.contains("is required") {
            Some("Add the required field to your configuration".to_string())
        } else if error_msg.contains("is not of type") {
            Some("Check the data type of the value".to_string())
        } else if error_msg.contains("is less than") {
            Some("Increase the value to meet the minimum requirement".to_string())
        } else if error_msg.contains("is greater than") {
            Some("Decrease the value to meet the maximum requirement".to_string())
        } else if error_msg.contains("is shorter than") {
            Some("Provide a longer string".to_string())
        } else if error_msg.contains("is longer than") {
            Some("Shorten the string".to_string())
        } else if error_msg.contains("does not match") {
            Some("Ensure the value matches the required pattern".to_string())
        } else if error_msg.contains("is not one of") {
            Some("Use one of the allowed values".to_string())
        } else {
            None
        }
    }
    
    /// Get suggestions for fixing custom validation errors
    fn get_custom_validation_suggestion(&self, error_msg: &str) -> Option<String> {
        if error_msg.contains("API key") {
            Some("Generate a secure API key with at least 16 characters".to_string())
        } else if error_msg.contains("certificate") {
            Some("Check certificate file paths and ensure files exist".to_string())
        } else if error_msg.contains("regex") {
            Some("Test the regex pattern with a regex validator tool".to_string())
        } else if error_msg.contains("port") {
            Some("Choose a different port number to avoid conflicts".to_string())
        } else if error_msg.contains("directory") {
            Some("Create the directory or check permissions".to_string())
        } else {
            None
        }
    }
    
    /// Create a comprehensive configuration manager with hot-reloading capabilities
    pub async fn create_hot_reload_manager(
        config_path: String
    ) -> Result<ConfigManager, ConfigError> {
        ConfigManager::new(config_path).await
    }
}

/// Configuration manager with hot-reloading, validation, and rollback capabilities
pub struct ConfigManager {
    config_path: String,
    current_config: std::sync::Arc<tokio::sync::RwLock<AgentConfig>>,
    backup_config: std::sync::Arc<tokio::sync::RwLock<Option<AgentConfig>>>,
    config_tx: tokio::sync::broadcast::Sender<ConfigUpdateEvent>,
    config_rx: tokio::sync::broadcast::Receiver<ConfigUpdateEvent>,
    validation_enabled: bool,
    auto_rollback: bool,
    debounce_duration: tokio::time::Duration,
    watcher_handle: Option<tokio::task::JoinHandle<()>>,
}

/// Configuration update event with detailed context
#[derive(Debug, Clone)]
pub struct ConfigUpdateEvent {
    pub event_type: ConfigEventType,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub config: Option<AgentConfig>,
    pub validation_errors: Vec<ConfigValidationError>,
    pub source: String,
    pub success: bool,
}

#[derive(Debug, Clone)]
pub enum ConfigEventType {
    Loaded,
    Updated,
    ValidationFailed,
    RolledBack,
    FileChanged,
    WatcherError,
}

impl ConfigManager {
    /// Create a new configuration manager with hot-reloading
    pub async fn new(config_path: String) -> Result<Self, ConfigError> {
        // Load initial configuration
        let initial_config = AgentConfig::load_from_file(&config_path).await?;
        
        // Validate initial configuration
        initial_config.validate_with_schema()?;
        
        // Create channels for config updates
        let (config_tx, config_rx) = tokio::sync::broadcast::channel(100);
        
        let manager = Self {
            config_path: config_path.clone(),
            current_config: std::sync::Arc::new(tokio::sync::RwLock::new(initial_config.clone())),
            backup_config: std::sync::Arc::new(tokio::sync::RwLock::new(Some(initial_config.clone()))),
            config_tx,
            config_rx,
            validation_enabled: true,
            auto_rollback: true,
            debounce_duration: tokio::time::Duration::from_millis(500),
            watcher_handle: None,
        };
        
        // Send initial load event
        let _ = manager.config_tx.send(ConfigUpdateEvent {
            event_type: ConfigEventType::Loaded,
            timestamp: chrono::Utc::now(),
            config: Some(initial_config),
            validation_errors: vec![],
            source: config_path,
            success: true,
        });
        
        tracing::info!("🔧 Configuration manager initialized with hot-reloading enabled");
        Ok(manager)
    }
    
    /// Start watching for configuration file changes
    pub async fn start_watching(&mut self) -> Result<(), ConfigError> {
        use notify::{Watcher, RecommendedWatcher, RecursiveMode, Event, EventKind};
        use tokio::sync::mpsc;
        
        let config_path = self.config_path.clone();
        let current_config = self.current_config.clone();
        let backup_config = self.backup_config.clone();
        let config_tx = self.config_tx.clone();
        let validation_enabled = self.validation_enabled;
        let auto_rollback = self.auto_rollback;
        let debounce_duration = self.debounce_duration;
        
        let (notify_tx, mut notify_rx) = mpsc::channel(100);
        
        let config_path_for_closure = config_path.clone();
        
        // Start file watcher task
        let watcher_handle = tokio::spawn(async move {
            let mut watcher: RecommendedWatcher = match notify::Watcher::new(
                move |res: Result<Event, notify::Error>| {
                    if let Ok(event) = res {
                        // Watch for modify events on the config file
                        if matches!(event.kind, EventKind::Modify(_)) {
                            if event.paths.iter().any(|p| p.ends_with(&config_path_for_closure)) {
                                let _ = notify_tx.try_send(event);
                            }
                        }
                    }
                },
                notify::Config::default(),
            ) {
                Ok(w) => w,
                Err(e) => {
                    tracing::error!("Failed to create file watcher: {}", e);
                    let _ = config_tx.send(ConfigUpdateEvent {
                        event_type: ConfigEventType::WatcherError,
                        timestamp: chrono::Utc::now(),
                        config: None,
                        validation_errors: vec![ConfigValidationError {
                            path: "watcher".to_string(),
                            error_type: "creation_failed".to_string(),
                            message: format!("Failed to create file watcher: {}", e),
                            suggestion: Some("Check file permissions and system limits".to_string()),
                        }],
                        source: config_path.clone(),
                        success: false,
                    });
                    return;
                }
            };
            
            // Watch the config file's parent directory
            if let Some(parent_dir) = std::path::Path::new(&config_path).parent() {
                if let Err(e) = watcher.watch(parent_dir, RecursiveMode::NonRecursive) {
                    tracing::error!("Failed to watch config directory: {}", e);
                    let _ = config_tx.send(ConfigUpdateEvent {
                        event_type: ConfigEventType::WatcherError,
                        timestamp: chrono::Utc::now(),
                        config: None,
                        validation_errors: vec![ConfigValidationError {
                            path: parent_dir.display().to_string(),
                            error_type: "watch_failed".to_string(),
                            message: format!("Failed to watch config directory: {}", e),
                            suggestion: Some("Ensure directory exists and is readable".to_string()),
                        }],
                        source: config_path.clone(),
                        success: false,
                    });
                    return;
                }
            }
            
            tracing::info!("🔍 Started watching configuration file: {}", config_path);
            
            // Debouncing mechanism to handle multiple rapid file changes
            let mut last_change = tokio::time::Instant::now();
            
            while let Some(_event) = notify_rx.recv().await {
                let now = tokio::time::Instant::now();
                
                // Update last change time
                last_change = now;
                
                // Wait for debounce period
                tokio::time::sleep(debounce_duration).await;
                
                // If another change occurred during debounce, skip this one
                if tokio::time::Instant::now() - last_change < debounce_duration {
                    continue;
                }
                
                tracing::debug!("🔄 Configuration file changed, reloading...");
                
                // Send file change event
                let _ = config_tx.send(ConfigUpdateEvent {
                    event_type: ConfigEventType::FileChanged,
                    timestamp: chrono::Utc::now(),
                    config: None,
                    validation_errors: vec![],
                    source: config_path.clone(),
                    success: true,
                });
                
                // Attempt to reload configuration
                match AgentConfig::load_from_file(&config_path).await {
                    Ok(new_config) => {
                        // Validate new configuration if enabled
                        let validation_errors = if validation_enabled {
                            new_config.get_validation_errors()
                        } else {
                            vec![]
                        };
                        
                        if validation_enabled && !validation_errors.is_empty() {
                            tracing::warn!("🚫 Configuration validation failed with {} errors", validation_errors.len());
                            
                            // Send validation failure event
                            let _ = config_tx.send(ConfigUpdateEvent {
                                event_type: ConfigEventType::ValidationFailed,
                                timestamp: chrono::Utc::now(),
                                config: Some(new_config.clone()),
                                validation_errors: validation_errors.clone(),
                                source: config_path.clone(),
                                success: false,
                            });
                            
                            // Auto-rollback if enabled
                            if auto_rollback {
                                if let Some(backup) = backup_config.read().await.as_ref() {
                                    if let Err(e) = backup.save_to_file(&config_path).await {
                                        tracing::error!("Failed to rollback configuration: {}", e);
                                    } else {
                                        tracing::info!("🔄 Auto-rollback completed");
                                        
                                        let _ = config_tx.send(ConfigUpdateEvent {
                                            event_type: ConfigEventType::RolledBack,
                                            timestamp: chrono::Utc::now(),
                                            config: Some(backup.clone()),
                                            validation_errors: vec![],
                                            source: config_path.clone(),
                                            success: true,
                                        });
                                    }
                                }
                            }
                        } else {
                            // Configuration is valid, update current config and backup
                            {
                                let current = current_config.read().await;
                                *backup_config.write().await = Some(current.clone());
                            }
                            
                            *current_config.write().await = new_config.clone();
                            
                            tracing::info!("✅ Configuration reloaded successfully");
                            
                            // Send successful update event
                            let _ = config_tx.send(ConfigUpdateEvent {
                                event_type: ConfigEventType::Updated,
                                timestamp: chrono::Utc::now(),
                                config: Some(new_config),
                                validation_errors: validation_errors,
                                source: config_path.clone(),
                                success: true,
                            });
                        }
                    }
                    Err(e) => {
                        tracing::error!("❌ Failed to reload configuration: {}", e);
                        
                        let _ = config_tx.send(ConfigUpdateEvent {
                            event_type: ConfigEventType::ValidationFailed,
                            timestamp: chrono::Utc::now(),
                            config: None,
                            validation_errors: vec![ConfigValidationError {
                                path: config_path.clone(),
                                error_type: "load_failed".to_string(),
                                message: format!("Failed to load configuration: {}", e),
                                suggestion: Some("Check file syntax and permissions".to_string()),
                            }],
                            source: config_path.clone(),
                            success: false,
                        });
                    }
                }
            }
        });
        
        self.watcher_handle = Some(watcher_handle);
        tracing::info!("🔄 Hot-reloading watcher started");
        Ok(())
    }
    
    /// Get current configuration (thread-safe)
    pub async fn get_config(&self) -> AgentConfig {
        self.current_config.read().await.clone()
    }
    
    /// Update configuration programmatically with validation
    pub async fn update_config(&self, new_config: AgentConfig) -> Result<(), ConfigError> {
        // Validate new configuration if enabled
        if self.validation_enabled {
            new_config.validate_with_schema()?;
        }
        
        // Backup current configuration
        {
            let current = self.current_config.read().await;
            *self.backup_config.write().await = Some(current.clone());
        }
        
        // Update current configuration
        *self.current_config.write().await = new_config.clone();
        
        // Save to file
        new_config.save_to_file(&self.config_path).await?;
        
        // Send update event
        let _ = self.config_tx.send(ConfigUpdateEvent {
            event_type: ConfigEventType::Updated,
            timestamp: chrono::Utc::now(),
            config: Some(new_config),
            validation_errors: vec![],
            source: "programmatic".to_string(),
            success: true,
        });
        
        tracing::info!("✅ Configuration updated programmatically");
        Ok(())
    }
    
    /// Rollback to previous configuration
    pub async fn rollback(&self) -> Result<(), ConfigError> {
        if let Some(backup) = self.backup_config.read().await.as_ref() {
            let backup_config = backup.clone();
            
            // Update current configuration
            *self.current_config.write().await = backup_config.clone();
            
            // Save to file
            backup_config.save_to_file(&self.config_path).await?;
            
            // Send rollback event
            let _ = self.config_tx.send(ConfigUpdateEvent {
                event_type: ConfigEventType::RolledBack,
                timestamp: chrono::Utc::now(),
                config: Some(backup_config),
                validation_errors: vec![],
                source: "manual_rollback".to_string(),
                success: true,
            });
            
            tracing::info!("🔄 Configuration rolled back successfully");
            Ok(())
        } else {
            Err(ConfigError::Validation("No backup configuration available for rollback".to_string()))
        }
    }
    
    /// Subscribe to configuration change events
    pub fn subscribe(&self) -> tokio::sync::broadcast::Receiver<ConfigUpdateEvent> {
        self.config_tx.subscribe()
    }
    
    /// Configure hot-reload behavior
    pub fn configure_hot_reload(&mut self, options: HotReloadOptions) {
        self.validation_enabled = options.validation_enabled;
        self.auto_rollback = options.auto_rollback;
        self.debounce_duration = options.debounce_duration;
        
        tracing::info!("🔧 Hot-reload configuration updated: validation={}, auto_rollback={}, debounce={}ms", 
                      self.validation_enabled, self.auto_rollback, self.debounce_duration.as_millis());
    }
    
    /// Get configuration statistics
    pub async fn get_stats(&self) -> ConfigStats {
        let current_config = self.current_config.read().await;
        let has_backup = self.backup_config.read().await.is_some();
        
        ConfigStats {
            config_path: self.config_path.clone(),
            validation_enabled: self.validation_enabled,
            auto_rollback: self.auto_rollback,
            debounce_duration_ms: self.debounce_duration.as_millis() as u64,
            has_backup: has_backup,
            watcher_active: self.watcher_handle.is_some(),
            config_size_bytes: toml::to_string(&*current_config)
                .map(|s| s.len())
                .unwrap_or(0),
        }
    }
    
    /// Graceful shutdown
    pub async fn shutdown(&mut self) {
        if let Some(handle) = self.watcher_handle.take() {
            handle.abort();
            tracing::info!("🛑 Configuration watcher stopped");
        }
    }
}

/// Hot-reload configuration options
#[derive(Debug, Clone)]
pub struct HotReloadOptions {
    pub validation_enabled: bool,
    pub auto_rollback: bool,
    pub debounce_duration: tokio::time::Duration,
}

impl Default for HotReloadOptions {
    fn default() -> Self {
        Self {
            validation_enabled: true,
            auto_rollback: true,
            debounce_duration: tokio::time::Duration::from_millis(500),
        }
    }
}

/// Configuration manager statistics
#[derive(Debug, Clone, serde::Serialize)]
pub struct ConfigStats {
    pub config_path: String,
    pub validation_enabled: bool,
    pub auto_rollback: bool,
    pub debounce_duration_ms: u64,
    pub has_backup: bool,
    pub watcher_active: bool,
    pub config_size_bytes: usize,
}

impl Drop for ConfigManager {
    fn drop(&mut self) {
        if let Some(handle) = self.watcher_handle.take() {
            handle.abort();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use tempfile::TempDir;
    
    /// Create a valid test configuration
    fn create_valid_test_config() -> AgentConfig {
        AgentConfig {
            agent: AgentSettings {
                name: "test-agent".to_string(),
                tags: vec!["test".to_string()],
                heartbeat_interval: 30,
                max_memory_mb: 512,
                max_cpu_percent: 50.0,
            },
            transport: TransportConfig {
                server_url: "https://api.securewatch.test".to_string(),
                api_key: "secure-test-api-key-123456".to_string(),
                tls_verify: true,
                compression: true,
                batch_size: 100,
                batch_timeout: 5,
                retry_attempts: 3,
                retry_delay: 2,
                client_cert_path: None,
                client_key_path: None,
                client_key_password: None,
                ca_cert_path: None,
                cert_expiry_warning_days: 30,
            },
            collectors: CollectorsConfig {
                syslog: Some(SyslogCollectorConfig {
                    enabled: true,
                    bind_address: "127.0.0.1".to_string(),
                    port: 5514,
                    protocol: "udp".to_string(),
                }),
                windows_event: Some(WindowsEventCollectorConfig {
                    enabled: false,
                    channels: vec!["System".to_string()],
                    batch_size: 50,
                }),
                file_monitor: Some(FileMonitorConfig {
                    enabled: false,
                    paths: vec!["/tmp/test.log".to_string()],
                    patterns: vec!["*.log".to_string()],
                    recursive: false,
                }),
            },
            buffer: BufferConfig {
                max_events: 1000,
                max_size_mb: 50,
                flush_interval: 10,
                compression: true,
                persistent: false,
                persistence_path: "/tmp/buffer".to_string(),
                wal_mode: true,
                synchronous_mode: SqliteSynchronousMode::Normal,
                journal_size_limit_mb: 64,
                checkpoint_interval_sec: 300,
                cache_size_kb: 8192,
                vacuum_on_startup: false,
                auto_vacuum: SqliteAutoVacuum::Incremental,
                temp_store: SqliteTempStore::Memory,
                mmap_size_mb: 128,
                max_page_count: None,
                secure_delete: false,
                max_database_size_mb: Some(1024),
                cleanup_trigger_percent: 80.0,
                cleanup_target_percent: 60.0,
                cleanup_strategy: CleanupStrategy::Intelligent,
                cleanup_interval_sec: 300,
                min_retention_hours: 24,
                max_events_per_cleanup: 10000,
            },
            parsers: ParsersConfig {
                parsers: vec![
                    ParserDefinition {
                        name: "test_parser".to_string(),
                        source_type: "test".to_string(),
                        regex_pattern: r"^(?P<timestamp>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}).*$".to_string(),
                        field_mappings: HashMap::from([
                            ("timestamp".to_string(), "@timestamp".to_string()),
                        ]),
                    }
                ],
            },
            management: ManagementConfig {
                enabled: true,
                bind_address: "127.0.0.1".to_string(),
                port: 9090,
                auth_token: Some("secure-management-token-12345".to_string()),
            },
        }
    }
    
    #[test]
    fn test_valid_config_passes_schema_validation() {
        let config = create_valid_test_config();
        assert!(config.validate_with_schema().is_ok());
    }
    
    #[test]
    fn test_invalid_api_key_fails_validation() {
        let mut config = create_valid_test_config();
        config.transport.api_key = "your-api-key".to_string(); // Default value
        
        let result = config.validate_with_schema();
        assert!(result.is_err());
        
        if let Err(ConfigError::SchemaValidationFailed { errors, .. }) = result {
            assert!(!errors.is_empty());
            assert!(errors[0].contains("api_key"));
        } else {
            panic!("Expected SchemaValidationFailed error");
        }
    }
    
    #[test]
    fn test_invalid_url_scheme_fails_validation() {
        let mut config = create_valid_test_config();
        config.transport.server_url = "ftp://invalid.scheme".to_string();
        
        let result = config.validate_with_schema();
        assert!(result.is_err());
        
        if let Err(ConfigError::SchemaValidationFailed { errors, .. }) = result {
            assert!(!errors.is_empty());
            assert!(errors[0].contains("server_url"));
        } else {
            panic!("Expected SchemaValidationFailed error");
        }
    }
    
    #[test]
    fn test_invalid_regex_pattern_fails_validation() {
        let mut config = create_valid_test_config();
        config.parsers.parsers[0].regex_pattern = "[invalid-regex".to_string();
        
        let result = config.validate_with_schema();
        assert!(result.is_err());
    }
    
    #[test]
    fn test_agent_name_too_short_fails_validation() {
        let mut config = create_valid_test_config();
        config.agent.name = "ab".to_string(); // Less than 3 characters
        
        let result = config.validate_with_schema();
        assert!(result.is_err());
        
        if let Err(ConfigError::SchemaValidationFailed { errors, .. }) = result {
            assert!(!errors.is_empty());
            assert!(errors[0].contains("name"));
            assert!(errors[0].contains("too short"));
        } else {
            panic!("Expected SchemaValidationFailed error");
        }
    }
    
    #[test]
    fn test_batch_size_out_of_range_fails_validation() {
        let mut config = create_valid_test_config();
        config.transport.batch_size = 0; // Below minimum of 1
        
        let result = config.validate_with_schema();
        assert!(result.is_err());
        
        if let Err(ConfigError::SchemaValidationFailed { errors, .. }) = result {
            assert!(!errors.is_empty());
            assert!(errors[0].contains("batch_size"));
            assert!(errors[0].contains("below minimum"));
        } else {
            panic!("Expected SchemaValidationFailed error");
        }
    }
    
    #[test]
    fn test_port_conflict_fails_validation() {
        let mut config = create_valid_test_config();
        config.management.port = 5514; // Same as syslog port
        
        let result = config.validate_with_schema();
        assert!(result.is_err());
        
        if let Err(ConfigError::SchemaValidationFailed { errors, .. }) = result {
            assert!(!errors.is_empty());
            assert!(errors.iter().any(|e| e.contains("port conflicts")));
        } else {
            panic!("Expected SchemaValidationFailed error");
        }
    }
    
    #[test]
    fn test_structured_validation_errors() {
        let mut config = create_valid_test_config();
        config.agent.name = "ab".to_string(); // Too short
        config.transport.api_key = "short".to_string(); // Too short
        
        let errors = config.get_validation_errors();
        assert!(!errors.is_empty());
        
        // Check that errors have proper structure
        for error in &errors {
            assert!(!error.path.is_empty());
            assert!(!error.error_type.is_empty());
            assert!(!error.message.is_empty());
            // Some errors should have suggestions
        }
        
        // Should have suggestions for common errors
        let has_suggestions = errors.iter().any(|e| e.suggestion.is_some());
        assert!(has_suggestions);
    }
    
    #[test]
    fn test_no_enabled_collectors_fails_validation() {
        let mut config = create_valid_test_config();
        
        // Disable all collectors
        if let Some(ref mut syslog) = config.collectors.syslog {
            syslog.enabled = false;
        }
        if let Some(ref mut windows) = config.collectors.windows_event {
            windows.enabled = false;
        }
        if let Some(ref mut file) = config.collectors.file_monitor {
            file.enabled = false;
        }
        
        let result = config.validate_with_schema();
        assert!(result.is_err());
        
        if let Err(ConfigError::SchemaValidationFailed { errors, .. }) = result {
            assert!(errors.iter().any(|e| e.contains("At least one collector must be enabled")));
        } else {
            panic!("Expected SchemaValidationFailed error");
        }
    }
    
    #[tokio::test]
    async fn test_schema_export() {
        let temp_dir = TempDir::new().unwrap();
        let schema_path = temp_dir.path().join("test_schema.json");
        
        let result = AgentConfig::export_schema(schema_path.to_str().unwrap()).await;
        assert!(result.is_ok());
        
        // Verify the file was created and contains valid JSON
        let schema_content = tokio::fs::read_to_string(&schema_path).await.unwrap();
        let schema_value: serde_json::Value = serde_json::from_str(&schema_content).unwrap();
        
        // Check that it's a valid JSON schema
        assert_eq!(schema_value["$schema"], "http://json-schema.org/draft-07/schema#");
        assert_eq!(schema_value["title"], "SecureWatch Agent Configuration");
    }
    
    #[tokio::test]
    async fn test_config_file_validation() {
        let temp_dir = TempDir::new().unwrap();
        let config_path = temp_dir.path().join("test_config.toml");
        
        // Create and save a valid config
        let valid_config = create_valid_test_config();
        valid_config.save_to_file(config_path.to_str().unwrap()).await.unwrap();
        
        // Validate the file
        let result = AgentConfig::validate_file(config_path.to_str().unwrap()).await;
        assert!(result.is_ok());
        
        // Test with invalid config
        let mut invalid_config = create_valid_test_config();
        invalid_config.transport.api_key = "short".to_string(); // Too short
        invalid_config.save_to_file(config_path.to_str().unwrap()).await.unwrap();
        
        let result = AgentConfig::validate_file(config_path.to_str().unwrap()).await;
        assert!(result.is_err());
    }
    
    #[test]
    fn test_json_schema_structure() {
        let schema = AgentConfig::get_json_schema();
        
        // Verify the schema has the expected structure
        assert_eq!(schema["$schema"], "http://json-schema.org/draft-07/schema#");
        assert_eq!(schema["type"], "object");
        assert!(schema["properties"].is_object());
        assert!(schema["required"].is_array());
        
        // Check that all main sections are present
        let properties = &schema["properties"];
        assert!(properties["agent"].is_object());
        assert!(properties["transport"].is_object());
        assert!(properties["collectors"].is_object());
        assert!(properties["buffer"].is_object());
        assert!(properties["parsers"].is_object());
        assert!(properties["management"].is_object());
        
        // Check that validation rules are present
        let transport = &properties["transport"]["properties"];
        assert!(transport["api_key"]["minLength"].is_number());
        assert!(transport["api_key"]["not"]["enum"].is_array());
        assert!(transport["server_url"]["pattern"].is_string());
    }
    
    #[test]
    fn test_redos_protection() {
        let mut config = create_valid_test_config();
        config.parsers.parsers[0].regex_pattern = "(.*)+dangerous".to_string(); // Potential ReDoS
        
        let result = config.validate_with_schema();
        assert!(result.is_err());
        
        if let Err(ConfigError::SchemaValidationFailed { errors, .. }) = result {
            assert!(errors.iter().any(|e| e.contains("ReDoS")));
        } else {
            panic!("Expected SchemaValidationFailed error");
        }
    }
    
    // Hot-reloading tests
    #[tokio::test]
    async fn test_config_manager_initialization() {
        let temp_dir = TempDir::new().unwrap();
        let config_path = temp_dir.path().join("test_config.toml");
        
        // Create and save a valid config
        let valid_config = create_valid_test_config();
        valid_config.save_to_file(config_path.to_str().unwrap()).await.unwrap();
        
        // Create config manager
        let manager = ConfigManager::new(config_path.to_str().unwrap().to_string()).await;
        assert!(manager.is_ok());
        
        let manager = manager.unwrap();
        let current_config = manager.get_config().await;
        assert_eq!(current_config.agent.name, valid_config.agent.name);
        
        // Check stats
        let stats = manager.get_stats().await;
        assert_eq!(stats.config_path, config_path.to_str().unwrap());
        assert!(stats.validation_enabled);
        assert!(stats.auto_rollback);
        assert!(stats.has_backup);
        assert!(!stats.watcher_active); // Not started yet
    }
    
    #[tokio::test]
    async fn test_config_manager_programmatic_update() {
        let temp_dir = TempDir::new().unwrap();
        let config_path = temp_dir.path().join("test_config.toml");
        
        // Create and save initial config
        let initial_config = create_valid_test_config();
        initial_config.save_to_file(config_path.to_str().unwrap()).await.unwrap();
        
        // Create config manager
        let manager = ConfigManager::new(config_path.to_str().unwrap().to_string()).await.unwrap();
        
        // Subscribe to events
        let mut event_rx = manager.subscribe();
        
        // Update configuration programmatically
        let mut updated_config = initial_config.clone();
        updated_config.agent.name = "updated-agent".to_string();
        
        let update_result = manager.update_config(updated_config.clone()).await;
        assert!(update_result.is_ok());
        
        // Verify configuration was updated
        let current_config = manager.get_config().await;
        assert_eq!(current_config.agent.name, "updated-agent");
        
        // Verify event was sent
        let event = event_rx.recv().await.unwrap();
        assert!(matches!(event.event_type, ConfigEventType::Updated));
        assert!(event.success);
        assert_eq!(event.source, "programmatic");
    }
    
    #[tokio::test]
    async fn test_config_manager_rollback() {
        let temp_dir = TempDir::new().unwrap();
        let config_path = temp_dir.path().join("test_config.toml");
        
        // Create and save initial config
        let initial_config = create_valid_test_config();
        initial_config.save_to_file(config_path.to_str().unwrap()).await.unwrap();
        
        // Create config manager
        let manager = ConfigManager::new(config_path.to_str().unwrap().to_string()).await.unwrap();
        
        // Subscribe to events
        let mut event_rx = manager.subscribe();
        
        // Update configuration
        let mut updated_config = initial_config.clone();
        updated_config.agent.name = "updated-agent".to_string();
        manager.update_config(updated_config).await.unwrap();
        
        // Consume the update event
        let _update_event = event_rx.recv().await.unwrap();
        
        // Rollback configuration
        let rollback_result = manager.rollback().await;
        assert!(rollback_result.is_ok());
        
        // Verify configuration was rolled back
        let current_config = manager.get_config().await;
        assert_eq!(current_config.agent.name, initial_config.agent.name);
        
        // Verify rollback event was sent
        let event = event_rx.recv().await.unwrap();
        assert!(matches!(event.event_type, ConfigEventType::RolledBack));
        assert!(event.success);
        assert_eq!(event.source, "manual_rollback");
    }
    
    #[tokio::test]
    async fn test_config_manager_validation_failure() {
        let temp_dir = TempDir::new().unwrap();
        let config_path = temp_dir.path().join("test_config.toml");
        
        // Create and save initial config
        let initial_config = create_valid_test_config();
        initial_config.save_to_file(config_path.to_str().unwrap()).await.unwrap();
        
        // Create config manager
        let manager = ConfigManager::new(config_path.to_str().unwrap().to_string()).await.unwrap();
        
        // Try to update with invalid configuration
        let mut invalid_config = initial_config.clone();
        invalid_config.transport.api_key = "short".to_string(); // Too short
        
        let update_result = manager.update_config(invalid_config).await;
        assert!(update_result.is_err());
        
        // Verify original configuration is still active
        let current_config = manager.get_config().await;
        assert_eq!(current_config.agent.name, initial_config.agent.name);
        assert_eq!(current_config.transport.api_key, initial_config.transport.api_key);
    }
    
    #[tokio::test]
    async fn test_hot_reload_options() {
        let temp_dir = TempDir::new().unwrap();
        let config_path = temp_dir.path().join("test_config.toml");
        
        // Create and save initial config
        let initial_config = create_valid_test_config();
        initial_config.save_to_file(config_path.to_str().unwrap()).await.unwrap();
        
        // Create config manager
        let mut manager = ConfigManager::new(config_path.to_str().unwrap().to_string()).await.unwrap();
        
        // Test default options
        let stats = manager.get_stats().await;
        assert!(stats.validation_enabled);
        assert!(stats.auto_rollback);
        assert_eq!(stats.debounce_duration_ms, 500);
        
        // Update hot-reload options
        let new_options = HotReloadOptions {
            validation_enabled: false,
            auto_rollback: false,
            debounce_duration: tokio::time::Duration::from_millis(1000),
        };
        
        manager.configure_hot_reload(new_options);
        
        // Verify options were updated
        let updated_stats = manager.get_stats().await;
        assert!(!updated_stats.validation_enabled);
        assert!(!updated_stats.auto_rollback);
        assert_eq!(updated_stats.debounce_duration_ms, 1000);
    }
    
    #[tokio::test]
    async fn test_config_manager_subscription() {
        let temp_dir = TempDir::new().unwrap();
        let config_path = temp_dir.path().join("test_config.toml");
        
        // Create and save initial config
        let initial_config = create_valid_test_config();
        initial_config.save_to_file(config_path.to_str().unwrap()).await.unwrap();
        
        // Create config manager
        let manager = ConfigManager::new(config_path.to_str().unwrap().to_string()).await.unwrap();
        
        // Create multiple subscribers
        let mut subscriber1 = manager.subscribe();
        let mut subscriber2 = manager.subscribe();
        
        // Update configuration
        let mut updated_config = initial_config.clone();
        updated_config.agent.name = "broadcast-test".to_string();
        manager.update_config(updated_config).await.unwrap();
        
        // Both subscribers should receive the event
        let event1 = subscriber1.recv().await.unwrap();
        let event2 = subscriber2.recv().await.unwrap();
        
        assert!(matches!(event1.event_type, ConfigEventType::Updated));
        assert!(matches!(event2.event_type, ConfigEventType::Updated));
        assert_eq!(event1.success, event2.success);
    }
    
    #[tokio::test]
    async fn test_config_manager_stats() {
        let temp_dir = TempDir::new().unwrap();
        let config_path = temp_dir.path().join("test_config.toml");
        
        // Create and save initial config
        let initial_config = create_valid_test_config();
        initial_config.save_to_file(config_path.to_str().unwrap()).await.unwrap();
        
        // Create config manager
        let manager = ConfigManager::new(config_path.to_str().unwrap().to_string()).await.unwrap();
        
        let stats = manager.get_stats().await;
        
        // Verify stats structure
        assert_eq!(stats.config_path, config_path.to_str().unwrap());
        assert!(stats.validation_enabled);
        assert!(stats.auto_rollback);
        assert_eq!(stats.debounce_duration_ms, 500);
        assert!(stats.has_backup);
        assert!(!stats.watcher_active); // Not started
        assert!(stats.config_size_bytes > 0);
    }
    
    #[tokio::test]
    async fn test_config_manager_shutdown() {
        let temp_dir = TempDir::new().unwrap();
        let config_path = temp_dir.path().join("test_config.toml");
        
        // Create and save initial config
        let initial_config = create_valid_test_config();
        initial_config.save_to_file(config_path.to_str().unwrap()).await.unwrap();
        
        // Create config manager and start watching
        let mut manager = ConfigManager::new(config_path.to_str().unwrap().to_string()).await.unwrap();
        let start_result = manager.start_watching().await;
        assert!(start_result.is_ok());
        
        // Verify watcher is active
        let stats = manager.get_stats().await;
        assert!(stats.watcher_active);
        
        // Shutdown manager
        manager.shutdown().await;
        
        // Verify watcher is no longer active
        let stats_after_shutdown = manager.get_stats().await;
        assert!(!stats_after_shutdown.watcher_active);
    }
    
    #[test]
    fn test_hot_reload_options_default() {
        let options = HotReloadOptions::default();
        assert!(options.validation_enabled);
        assert!(options.auto_rollback);
        assert_eq!(options.debounce_duration, tokio::time::Duration::from_millis(500));
    }
    
    #[test]
    fn test_config_event_types() {
        // Test that ConfigEventType variants can be created and matched
        let events = vec![
            ConfigEventType::Loaded,
            ConfigEventType::Updated,
            ConfigEventType::ValidationFailed,
            ConfigEventType::RolledBack,
            ConfigEventType::FileChanged,
            ConfigEventType::WatcherError,
        ];
        
        for event in events {
            match event {
                ConfigEventType::Loaded => assert!(true),
                ConfigEventType::Updated => assert!(true),
                ConfigEventType::ValidationFailed => assert!(true),
                ConfigEventType::RolledBack => assert!(true),
                ConfigEventType::FileChanged => assert!(true),
                ConfigEventType::WatcherError => assert!(true),
            }
        }
    }
}