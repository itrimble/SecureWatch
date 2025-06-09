// Collector management and base traits

use crate::errors::CollectorError;
use crate::parsers::ParsedEvent;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tokio::sync::mpsc;

pub mod syslog;
pub mod file_monitor;

#[cfg(all(windows, feature = "persistent-storage"))]
pub mod windows_event;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawLogEvent {
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub source: String,
    pub raw_data: String,
    pub metadata: HashMap<String, String>,
}

#[async_trait]
pub trait Collector: Send + Sync {
    async fn start(&mut self) -> Result<(), CollectorError>;
    async fn stop(&mut self) -> Result<(), CollectorError>;
    async fn collect(&mut self) -> Result<Vec<RawLogEvent>, CollectorError>;
    fn name(&self) -> &str;
    fn is_running(&self) -> bool;
}

pub struct CollectorManager {
    collectors: Vec<Box<dyn Collector>>,
    event_sender: mpsc::Sender<RawLogEvent>,
    backpressure_receiver: tokio::sync::watch::Receiver<bool>,
    shutdown_sender: tokio::sync::broadcast::Sender<()>,
}

impl CollectorManager {
    pub fn new(
        event_sender: mpsc::Sender<RawLogEvent>,
        backpressure_receiver: tokio::sync::watch::Receiver<bool>,
    ) -> Self {
        let (shutdown_sender, _) = tokio::sync::broadcast::channel(10);
        
        Self {
            collectors: Vec::new(),
            event_sender,
            backpressure_receiver,
            shutdown_sender,
        }
    }
    
    pub fn add_collector(&mut self, collector: Box<dyn Collector>) {
        self.collectors.push(collector);
    }
    
    pub async fn start_all(&mut self) -> Result<(), CollectorError> {
        tracing::info!("Starting {} collectors", self.collectors.len());
        
        for collector in &mut self.collectors {
            match collector.start().await {
                Ok(_) => tracing::info!("✅ Started collector: {}", collector.name()),
                Err(e) => {
                    tracing::error!("❌ Failed to start collector {}: {}", collector.name(), e);
                    return Err(e);
                }
            }
        }
        
        // Spawn collection tasks for each collector
        self.spawn_collection_tasks().await;
        
        Ok(())
    }
    
    async fn spawn_collection_tasks(&self) {
        for (index, _) in self.collectors.iter().enumerate() {
            let event_sender = self.event_sender.clone();
            let mut backpressure_receiver = self.backpressure_receiver.clone();
            let mut shutdown_receiver = self.shutdown_sender.subscribe();
            
            tokio::spawn(async move {
                let mut collection_interval = tokio::time::interval(tokio::time::Duration::from_millis(100));
                
                loop {
                    tokio::select! {
                        _ = collection_interval.tick() => {
                            // Check for backpressure
                            if *backpressure_receiver.borrow() {
                                tracing::debug!("Collector {} paused due to backpressure", index);
                                continue;
                            }
                            
                            // Collection logic would go here
                            // This is simplified for the current implementation
                        }
                        _ = shutdown_receiver.recv() => {
                            tracing::info!("Collector {} shutting down", index);
                            break;
                        }
                    }
                }
            });
        }
    }
    
    pub async fn stop_all(&mut self) -> Result<(), CollectorError> {
        tracing::info!("Stopping all collectors");
        
        // Send shutdown signal
        let _ = self.shutdown_sender.send(());
        
        // Stop each collector
        for collector in &mut self.collectors {
            if let Err(e) = collector.stop().await {
                tracing::error!("Error stopping collector {}: {}", collector.name(), e);
            }
        }
        
        Ok(())
    }
    
    pub fn get_status(&self) -> Vec<CollectorStatus> {
        self.collectors
            .iter()
            .map(|collector| CollectorStatus {
                name: collector.name().to_string(),
                running: collector.is_running(),
            })
            .collect()
    }
}

#[derive(Debug, Serialize)]
pub struct CollectorStatus {
    pub name: String,
    pub running: bool,
}