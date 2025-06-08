// Base collector trait and common functionality

use crate::transport::LogEvent;
use async_trait::async_trait;
use tokio::sync::mpsc;

#[async_trait]
pub trait Collector: Send + Sync {
    /// Returns the name of this collector
    fn name(&self) -> &str;

    /// Start the collector and begin sending events to the provided channel
    async fn start(&mut self, event_tx: mpsc::Sender<LogEvent>) -> Result<(), CollectorError>;

    /// Stop the collector gracefully
    async fn stop(&mut self) -> Result<(), CollectorError>;

    /// Check if the collector is currently running
    fn is_running(&self) -> bool;

    /// Get collector-specific statistics
    async fn get_stats(&self) -> CollectorStats;
}

#[derive(Debug, Clone)]
pub struct CollectorStats {
    pub name: String,
    pub events_collected: u64,
    pub events_failed: u64,
    pub is_running: bool,
    pub uptime_seconds: u64,
    pub last_error: Option<String>,
}

impl Default for CollectorStats {
    fn default() -> Self {
        Self {
            name: String::new(),
            events_collected: 0,
            events_failed: 0,
            is_running: false,
            uptime_seconds: 0,
            last_error: None,
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum CollectorError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Configuration error: {0}")]
    Config(String),

    #[error("Network error: {0}")]
    Network(String),

    #[error("Permission denied: {0}")]
    Permission(String),

    #[error("Collector already running")]
    AlreadyRunning,

    #[error("Collector not running")]
    NotRunning,

    #[error("Parse error: {0}")]
    Parse(String),

    #[error("System error: {0}")]
    System(String),

    #[error("Windows API error: {0}")]
    WindowsApi(String),

    #[error("Other error: {0}")]
    Other(String),
}