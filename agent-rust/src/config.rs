// Configuration management for SecureWatch Agent

use serde::{Deserialize, Serialize};
use std::path::Path;
use std::time::Duration;
use tokio::fs;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    pub agent: AgentSettings,
    pub transport: TransportConfig,
    pub collectors: CollectorsConfig,
    pub buffer: BufferConfig,
    pub security: SecurityConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentSettings {
    pub name: String,
    pub tags: Vec<String>,
    pub heartbeat_interval: u64, // seconds
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
    pub batch_timeout: u64, // seconds
    pub retry_attempts: usize,
    pub retry_delay: u64, // seconds
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
    pub protocol: String, // "udp" or "tcp"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowsEventCollectorConfig {
    pub enabled: bool,
    pub channels: Vec<String>,
    pub query: Option<String>,
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
    pub flush_interval: u64, // seconds
    pub compression: bool,
    pub persistent: bool,
    pub persistence_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityConfig {
    pub encryption_key: Option<String>,
    pub certificate_path: Option<String>,
    pub private_key_path: Option<String>,
    pub ca_certificates: Vec<String>,
}

impl Default for AgentConfig {
    fn default() -> Self {
        Self {
            agent: AgentSettings {
                name: format!("securewatch-agent-{}", hostname::get().unwrap_or_default().to_string_lossy()),
                tags: vec![],
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
            },
            collectors: CollectorsConfig {
                syslog: Some(SyslogCollectorConfig {
                    enabled: true,
                    bind_address: "0.0.0.0".to_string(),
                    port: 514,
                    protocol: "udp".to_string(),
                }),
                windows_event: Some(WindowsEventCollectorConfig {
                    enabled: cfg!(windows),
                    channels: vec![
                        "System".to_string(),
                        "Security".to_string(),
                        "Application".to_string(),
                    ],
                    query: None,
                    batch_size: 50,
                }),
                file_monitor: Some(FileMonitorConfig {
                    enabled: false,
                    paths: vec![],
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
            },
            security: SecurityConfig {
                encryption_key: None,
                certificate_path: None,
                private_key_path: None,
                ca_certificates: vec![],
            },
        }
    }
}

impl AgentConfig {
    pub async fn load<P: AsRef<Path>>(path: P) -> Result<Self, ConfigError> {
        let path = path.as_ref();
        
        if !path.exists() {
            // Create default config file
            let default_config = Self::default();
            default_config.save(path).await?;
            return Ok(default_config);
        }

        let content = fs::read_to_string(path).await?;
        let config: AgentConfig = toml::from_str(&content)?;
        
        // Validate configuration
        config.validate()?;
        
        Ok(config)
    }

    pub async fn save<P: AsRef<Path>>(&self, path: P) -> Result<(), ConfigError> {
        let content = toml::to_string_pretty(self)?;
        fs::write(path, content).await?;
        Ok(())
    }

    pub fn validate(&self) -> Result<(), ConfigError> {
        // Validate URL
        if self.transport.server_url.is_empty() {
            return Err(ConfigError::InvalidConfig("server_url cannot be empty".to_string()));
        }

        // Validate API key
        if self.transport.api_key.is_empty() || self.transport.api_key == "your-api-key" {
            return Err(ConfigError::InvalidConfig("api_key must be set".to_string()));
        }

        // Validate buffer settings
        if self.buffer.max_events == 0 {
            return Err(ConfigError::InvalidConfig("buffer.max_events must be > 0".to_string()));
        }

        // Validate heartbeat interval
        if self.agent.heartbeat_interval == 0 {
            return Err(ConfigError::InvalidConfig("heartbeat_interval must be > 0".to_string()));
        }

        Ok(())
    }

    pub fn heartbeat_duration(&self) -> Duration {
        Duration::from_secs(self.agent.heartbeat_interval)
    }

    pub fn batch_timeout_duration(&self) -> Duration {
        Duration::from_secs(self.transport.batch_timeout)
    }

    pub fn flush_interval_duration(&self) -> Duration {
        Duration::from_secs(self.buffer.flush_interval)
    }

    pub fn retry_delay_duration(&self) -> Duration {
        Duration::from_secs(self.transport.retry_delay)
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("TOML parsing error: {0}")]
    Toml(#[from] toml::de::Error),

    #[error("TOML serialization error: {0}")]
    TomlSer(#[from] toml::ser::Error),

    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),
}