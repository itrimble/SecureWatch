// Configuration structures for SecureWatch Agent

use crate::errors::ConfigError;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use regex::Regex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    pub agent: AgentSettings,
    pub transport: TransportConfig,
    pub collectors: CollectorsConfig,
    pub buffer: BufferConfig,
    pub parsers: ParsersConfig,
    pub management: ManagementConfig,
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
    pub fn validate(&self) -> Result<(), ConfigError> {
        // Validate transport config
        if self.transport.server_url.is_empty() {
            return Err(ConfigError::Validation("Transport server URL cannot be empty".to_string()));
        }
        
        if self.transport.api_key.is_empty() || self.transport.api_key == "your-api-key" {
            return Err(ConfigError::Validation("Transport API key must be configured".to_string()));
        }

        // Validate parser regex patterns
        for parser in &self.parsers.parsers {
            if let Err(e) = Regex::new(&parser.regex_pattern) {
                return Err(ConfigError::Validation(format!("Invalid regex in parser '{}': {}", parser.name, e)));
            }
        }

        Ok(())
    }
    
    pub async fn watch_for_changes(&self, config_path: String) -> Result<tokio::sync::mpsc::Receiver<AgentConfig>, ConfigError> {
        use notify::{Watcher, RecommendedWatcher, RecursiveMode, Event, EventKind};
        use tokio::sync::mpsc;
        
        let (tx, rx) = mpsc::channel(10);
        let (notify_tx, mut notify_rx) = mpsc::channel(100);
        
        // Spawn file watcher task
        tokio::spawn(async move {
            let mut watcher: RecommendedWatcher = notify::Watcher::new(
                move |res: Result<Event, notify::Error>| {
                    if let Ok(event) = res {
                        if matches!(event.kind, EventKind::Modify(_)) {
                            let _ = notify_tx.try_send(());
                        }
                    }
                },
                notify::Config::default(),
            ).expect("Failed to create file watcher");
            
            if let Some(path) = std::path::Path::new(&config_path).parent() {
                let _ = watcher.watch(path, RecursiveMode::NonRecursive);
                
                while notify_rx.recv().await.is_some() {
                    // Small delay to ensure file write is complete
                    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                    
                    match AgentConfig::load_from_file(&config_path).await {
                        Ok(new_config) => {
                            if let Err(_) = tx.send(new_config).await {
                                break; // Receiver dropped
                            }
                        }
                        Err(e) => {
                            tracing::warn!("Failed to reload config: {}", e);
                        }
                    }
                }
            }
        });
        
        Ok(rx)
    }
}