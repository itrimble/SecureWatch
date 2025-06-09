// Minimal memory-only buffer implementation for cross-compilation builds
// This avoids SQLite C compilation dependencies

use crate::config::BufferConfig;
use crate::errors::BufferError;
use crate::parsers::ParsedEvent;
use std::sync::Arc;
use tokio::sync::{mpsc, watch, Mutex};
use tokio::time::{interval, Duration};
use tracing::{info, warn, error, debug};

const HIGH_WATER_MARK: f32 = 0.8;
const LOW_WATER_MARK: f32 = 0.3;

pub struct EventBuffer {
    config: BufferConfig,
    memory_sender: mpsc::Sender<ParsedEvent>,
    memory_receiver: Arc<Mutex<mpsc::Receiver<ParsedEvent>>>,
    backpressure_sender: watch::Sender<bool>,
    backpressure_receiver: watch::Receiver<bool>,
    stats: Arc<Mutex<BufferStats>>,
}

#[derive(Debug, Clone)]
pub struct BufferStats {
    pub memory_events: usize,
    pub disk_events: usize,
    pub total_bytes: u64,
    pub backpressure_active: bool,
    pub events_processed: u64,
    pub events_dropped: u64,
}

impl EventBuffer {
    pub async fn new(config: BufferConfig) -> Result<Self, BufferError> {
        let (memory_sender, memory_receiver) = mpsc::channel(config.max_events);
        let (backpressure_sender, backpressure_receiver) = watch::channel(false);
        
        let stats = Arc::new(Mutex::new(BufferStats {
            memory_events: 0,
            disk_events: 0,
            total_bytes: 0,
            backpressure_active: false,
            events_processed: 0,
            events_dropped: 0,
        }));
        
        info!("📦 Minimal event buffer initialized with memory capacity: {}", config.max_events);
        
        let buffer = Self {
            config,
            memory_sender,
            memory_receiver: Arc::new(Mutex::new(memory_receiver)),
            backpressure_sender,
            backpressure_receiver,
            stats,
        };
        
        Ok(buffer)
    }
    
    pub async fn send(&self, event: ParsedEvent) -> Result<(), BufferError> {
        match self.memory_sender.try_send(event) {
            Ok(_) => {
                let mut stats = self.stats.lock().await;
                stats.memory_events += 1;
                stats.events_processed += 1;
                Ok(())
            }
            Err(mpsc::error::TrySendError::Full(_)) => {
                let mut stats = self.stats.lock().await;
                stats.events_dropped += 1;
                Err(BufferError::ChannelError {
                    operation: "send".to_string(),
                    channel_name: "memory_buffer".to_string(),
                    buffer_size: Some(self.config.max_events),
                    is_closed: false,
                })
            }
            Err(mpsc::error::TrySendError::Closed(_)) => {
                Err(BufferError::ChannelError {
                    operation: "send".to_string(),
                    channel_name: "memory_buffer".to_string(),
                    buffer_size: Some(self.config.max_events),
                    is_closed: true,
                })
            }
        }
    }
    
    pub async fn receive(&self) -> Result<Option<ParsedEvent>, BufferError> {
        let mut receiver = self.memory_receiver.lock().await;
        match receiver.try_recv() {
            Ok(event) => {
                let mut stats = self.stats.lock().await;
                stats.memory_events = stats.memory_events.saturating_sub(1);
                Ok(Some(event))
            }
            Err(mpsc::error::TryRecvError::Empty) => Ok(None),
            Err(mpsc::error::TryRecvError::Disconnected) => Err(BufferError::ChannelError {
                operation: "receive".to_string(),
                channel_name: "memory_buffer".to_string(),
                buffer_size: Some(self.config.max_events),
                is_closed: true,
            }),
        }
    }
    
    pub async fn stats(&self) -> BufferStats {
        self.stats.lock().await.clone()
    }
    
    pub fn backpressure_receiver(&self) -> watch::Receiver<bool> {
        self.backpressure_receiver.clone()
    }
    
    pub fn get_backpressure_receiver(&self) -> watch::Receiver<bool> {
        self.backpressure_receiver.clone()
    }
    
    pub async fn flush(&self) -> Result<(), BufferError> {
        // Minimal implementation - just return Ok since we're memory-only
        Ok(())
    }
}