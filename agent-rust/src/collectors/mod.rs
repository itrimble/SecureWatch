// Collectors module - Event collection from various sources

pub mod base;
pub mod syslog;
pub mod windows_event;
pub mod file_monitor;

use crate::config::CollectorsConfig;
use crate::transport::LogEvent;
use base::Collector;
use tokio::sync::mpsc;
use tracing::{debug, error, info, warn};

pub use base::CollectorError;

pub struct CollectorManager {
    collectors: Vec<Box<dyn Collector>>,
}

impl CollectorManager {
    pub async fn new(config: &CollectorsConfig) -> Result<Self, CollectorError> {
        let mut collectors: Vec<Box<dyn Collector>> = Vec::new();

        // Initialize Syslog collector
        if let Some(syslog_config) = &config.syslog {
            if syslog_config.enabled {
                info!("📡 Initializing Syslog collector");
                let collector = syslog::SyslogCollector::new(syslog_config.clone()).await?;
                collectors.push(Box::new(collector));
            }
        }

        // Initialize Windows Event collector
        #[cfg(windows)]
        if let Some(windows_config) = &config.windows_event {
            if windows_config.enabled {
                info!("🪟 Initializing Windows Event collector");
                let collector = windows_event::WindowsEventCollector::new(windows_config.clone()).await?;
                collectors.push(Box::new(collector));
            }
        }

        // Initialize File Monitor collector
        if let Some(file_config) = &config.file_monitor {
            if file_config.enabled {
                info!("📁 Initializing File Monitor collector");
                let collector = file_monitor::FileMonitorCollector::new(file_config.clone()).await?;
                collectors.push(Box::new(collector));
            }
        }

        info!("✅ Initialized {} collectors", collectors.len());

        Ok(Self { collectors })
    }

    pub async fn start_all(&mut self, event_tx: mpsc::Sender<LogEvent>) -> Result<(), CollectorError> {
        info!("🚀 Starting all collectors");

        for (index, collector) in self.collectors.iter_mut().enumerate() {
            match collector.start(event_tx.clone()).await {
                Ok(_) => {
                    info!("✅ Started collector {}: {}", index, collector.name());
                }
                Err(e) => {
                    warn!("❌ Failed to start collector {}: {}", index, e);
                    return Err(e);
                }
            }
        }

        info!("✅ All collectors started successfully");
        Ok(())
    }

    pub async fn stop_all(&mut self) -> Result<(), CollectorError> {
        info!("🛑 Stopping all collectors");

        for (index, collector) in self.collectors.iter_mut().enumerate() {
            match collector.stop().await {
                Ok(_) => {
                    info!("✅ Stopped collector {}: {}", index, collector.name());
                }
                Err(e) => {
                    warn!("❌ Failed to stop collector {}: {}", index, e);
                }
            }
        }

        info!("✅ All collectors stopped");
        Ok(())
    }

    pub fn collector_count(&self) -> usize {
        self.collectors.len()
    }

    pub fn get_collector_names(&self) -> Vec<String> {
        self.collectors.iter().map(|c| c.name().to_string()).collect()
    }
}