// Configuration structures for SecureWatch Agent

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    pub agent: AgentSettings,
    pub transport: TransportConfig,
    pub collectors: CollectorsConfig,
    pub buffer: BufferConfig,
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
            },
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

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("IO error: {0}")]
    Io(String),
    #[error("Parse error: {0}")]
    Parse(String),
    #[error("Serialize error: {0}")]
    Serialize(String),
}