// Persistent buffering with backpressure and SQLite storage

use crate::config::BufferConfig;
use crate::errors::BufferError;
use crate::parsers::ParsedEvent;
use rusqlite::{Connection, OpenFlags, Result as SqliteResult};
use std::path::Path;
use std::sync::Arc;
use tokio::sync::{mpsc, watch, Mutex};
use tokio::time::{interval, Duration};
use tracing::{info, warn, error, debug};

const HIGH_WATER_MARK: f32 = 0.8; // 80% capacity triggers disk buffering
const LOW_WATER_MARK: f32 = 0.3;  // 30% capacity clears backpressure

pub struct EventBuffer {
    config: BufferConfig,
    
    // In-memory channel
    memory_sender: mpsc::Sender<ParsedEvent>,
    memory_receiver: Arc<Mutex<mpsc::Receiver<ParsedEvent>>>,
    
    // Persistent storage
    db_connection: Arc<Mutex<Connection>>,
    
    // Backpressure signaling
    backpressure_sender: watch::Sender<bool>,
    backpressure_receiver: watch::Receiver<bool>,
    
    // Statistics
    stats: Arc<Mutex<BufferStats>>,
}

#[derive(Debug, Clone)]
pub struct BufferStats {
    pub memory_events: usize,
    pub disk_events: i64,
    pub total_bytes: u64,
    pub backpressure_active: bool,
    pub events_processed: u64,
    pub events_dropped: u64,
}

impl EventBuffer {
    pub async fn new(config: BufferConfig) -> Result<Self, BufferError> {
        // Create in-memory channel
        let (memory_sender, memory_receiver) = mpsc::channel(config.max_events);
        
        // Setup persistent storage
        let db_connection = Self::setup_database(&config).await?;
        
        // Setup backpressure signaling
        let (backpressure_sender, backpressure_receiver) = watch::channel(false);
        
        let stats = Arc::new(Mutex::new(BufferStats {
            memory_events: 0,
            disk_events: 0,
            total_bytes: 0,
            backpressure_active: false,
            events_processed: 0,
            events_dropped: 0,
        }));
        
        info!("📦 Event buffer initialized with memory capacity: {}, persistent: {}", 
              config.max_events, config.persistent);
        
        let buffer = Self {
            config,
            memory_sender,
            memory_receiver: Arc::new(Mutex::new(memory_receiver)),
            db_connection: Arc::new(Mutex::new(db_connection)),
            backpressure_sender,
            backpressure_receiver,
            stats,
        };
        
        // Start background tasks
        buffer.start_flush_task().await;
        buffer.start_monitoring_task().await;
        
        Ok(buffer)
    }
    
    async fn setup_database(config: &BufferConfig) -> Result<Connection, BufferError> {
        if !config.persistent {
            // Use in-memory database for non-persistent mode
            return Connection::open_in_memory()
                .map_err(|e| BufferError::Database(format!("Failed to create in-memory database: {}", e)));
        }
        
        // Create persistent storage directory
        let db_path = Path::new(&config.persistence_path).join("events.db");
        if let Some(parent) = db_path.parent() {
            tokio::fs::create_dir_all(parent).await
                .map_err(|e| BufferError::Persistence(format!("Failed to create buffer directory: {}", e)))?;
        }
        
        // Open SQLite database
        let conn = Connection::open_with_flags(
            &db_path,
            OpenFlags::SQLITE_OPEN_READ_WRITE | OpenFlags::SQLITE_OPEN_CREATE
        ).map_err(|e| BufferError::Database(format!("Failed to open database: {}", e)))?;
        
        // Create tables
        conn.execute(
            "CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                source TEXT NOT NULL,
                level TEXT,
                message TEXT NOT NULL,
                fields TEXT NOT NULL,
                raw_data TEXT NOT NULL,
                parser_name TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        ).map_err(|e| BufferError::Database(format!("Failed to create events table: {}", e)))?;
        
        // Create index for efficient retrieval
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at)",
            [],
        ).map_err(|e| BufferError::Database(format!("Failed to create index: {}", e)))?;
        
        info!("💾 Persistent buffer database initialized at: {}", db_path.display());
        Ok(conn)
    }
    
    pub async fn send(&self, event: ParsedEvent) -> Result<(), BufferError> {
        // Try to send to memory buffer first
        match self.memory_sender.try_send(event.clone()) {
            Ok(_) => {
                debug!("📥 Event sent to memory buffer");
                self.update_stats(|stats| stats.events_processed += 1).await;
                Ok(())
            }
            Err(mpsc::error::TrySendError::Full(_)) => {
                // Memory buffer is full, try persistent storage
                if self.config.persistent {
                    debug!("💾 Memory buffer full, storing to disk");
                    self.store_to_disk(event).await?;
                    self.check_backpressure().await;
                    Ok(())
                } else {
                    warn!("📦 Buffer full and persistence disabled, dropping event");
                    self.update_stats(|stats| stats.events_dropped += 1).await;
                    Err(BufferError::BufferFull)
                }
            }
            Err(mpsc::error::TrySendError::Closed(_)) => {
                error!("📦 Buffer channel closed");
                Err(BufferError::Persistence("Buffer channel closed".to_string()))
            }
        }
    }
    
    async fn store_to_disk(&self, event: ParsedEvent) -> Result<(), BufferError> {
        let db = self.db_connection.clone();
        let event_clone = event.clone();
        
        // Use blocking task for database operations
        tokio::task::spawn_blocking(move || {
            let conn = db.blocking_lock();
            
            let fields_json = serde_json::to_string(&event_clone.fields)
                .map_err(|e| BufferError::Serialization(format!("Failed to serialize fields: {}", e)))?;
            
            conn.execute(
                "INSERT INTO events (timestamp, source, level, message, fields, raw_data, parser_name)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                [
                    event_clone.timestamp.to_rfc3339(),
                    event_clone.source,
                    event_clone.level.unwrap_or_default(),
                    event_clone.message,
                    fields_json,
                    event_clone.raw_data,
                    event_clone.parser_name,
                ],
            ).map_err(|e| BufferError::Database(format!("Failed to insert event: {}", e)))?;
            
            Ok::<(), BufferError>(())
        }).await
        .map_err(|e| BufferError::Database(format!("Database task failed: {}", e)))??;
        
        self.update_stats(|stats| {
            stats.disk_events += 1;
            stats.events_processed += 1;
        }).await;
        
        Ok(())
    }
    
    pub async fn receive(&self) -> Option<ParsedEvent> {
        // First try to get from memory buffer
        if let Ok(mut receiver) = self.memory_receiver.try_lock() {
            if let Ok(event) = receiver.try_recv() {
                debug!("📤 Event retrieved from memory buffer");
                return Some(event);
            }
        }
        
        // If memory buffer is empty, try to load from disk
        if self.config.persistent {
            self.load_from_disk().await.unwrap_or(None)
        } else {
            None
        }
    }
    
    async fn load_from_disk(&self) -> Result<Option<ParsedEvent>, BufferError> {
        let db = self.db_connection.clone();
        
        tokio::task::spawn_blocking(move || {
            let conn = db.blocking_lock();
            
            let mut stmt = conn.prepare(
                "SELECT id, timestamp, source, level, message, fields, raw_data, parser_name 
                 FROM events ORDER BY created_at LIMIT 1"
            ).map_err(|e| BufferError::Database(format!("Failed to prepare statement: {}", e)))?;
            
            let mut rows = stmt.query_map([], |row| {
                let id: i64 = row.get(0)?;
                let timestamp_str: String = row.get(1)?;
                let fields_json: String = row.get(5)?;
                
                let timestamp = chrono::DateTime::parse_from_rfc3339(&timestamp_str)
                    .map_err(|e| rusqlite::Error::InvalidColumnType(
                        1, "timestamp".to_string(), rusqlite::types::Type::Text
                    ))?
                    .with_timezone(&chrono::Utc);
                
                let fields: std::collections::HashMap<String, serde_json::Value> = 
                    serde_json::from_str(&fields_json)
                        .map_err(|e| rusqlite::Error::InvalidColumnType(
                            5, "fields".to_string(), rusqlite::types::Type::Text
                        ))?;
                
                Ok((id, ParsedEvent {
                    timestamp,
                    source: row.get(2)?,
                    level: {
                        let level: String = row.get(3)?;
                        if level.is_empty() { None } else { Some(level) }
                    },
                    message: row.get(4)?,
                    fields,
                    raw_data: row.get(6)?,
                    parser_name: row.get(7)?,
                }))
            }).map_err(|e| BufferError::Database(format!("Failed to query events: {}", e)))?;
            
            if let Some(result) = rows.next() {
                let (id, event) = result.map_err(|e| BufferError::Database(format!("Failed to parse row: {}", e)))?;
                
                // Delete the event from the database
                conn.execute("DELETE FROM events WHERE id = ?1", [id])
                    .map_err(|e| BufferError::Database(format!("Failed to delete event: {}", e)))?;
                
                debug!("💾 Event loaded from disk and removed");
                Ok(Some(event))
            } else {
                Ok(None)
            }
        }).await
        .map_err(|e| BufferError::Database(format!("Database task failed: {}", e)))?
    }
    
    async fn check_backpressure(&self) {
        let stats = self.stats.lock().await;
        let memory_usage = stats.memory_events as f32 / self.config.max_events as f32;
        let disk_events = stats.disk_events;
        
        let should_activate_backpressure = memory_usage > HIGH_WATER_MARK || 
                                          disk_events > self.config.max_size_mb as i64 * 1000;
        
        let should_clear_backpressure = memory_usage < LOW_WATER_MARK && 
                                       disk_events < (self.config.max_size_mb as i64 * 1000) / 2;
        
        if should_activate_backpressure && !stats.backpressure_active {
            warn!("🚨 Activating backpressure - memory: {:.1}%, disk events: {}", 
                  memory_usage * 100.0, disk_events);
            let _ = self.backpressure_sender.send(true);
        } else if should_clear_backpressure && stats.backpressure_active {
            info!("✅ Clearing backpressure - memory: {:.1}%, disk events: {}", 
                  memory_usage * 100.0, disk_events);
            let _ = self.backpressure_sender.send(false);
        }
    }
    
    async fn start_flush_task(&self) {
        let stats = self.stats.clone();
        let flush_interval = self.config.flush_interval;
        
        tokio::spawn(async move {
            let mut flush_timer = interval(Duration::from_secs(flush_interval));
            
            loop {
                flush_timer.tick().await;
                
                let stats_snapshot = {
                    let stats = stats.lock().await;
                    stats.clone()
                };
                
                debug!("📊 Buffer stats - Memory: {}, Disk: {}, Processed: {}, Dropped: {}", 
                       stats_snapshot.memory_events, 
                       stats_snapshot.disk_events,
                       stats_snapshot.events_processed, 
                       stats_snapshot.events_dropped);
            }
        });
    }
    
    async fn start_monitoring_task(&self) {
        let memory_receiver = self.memory_receiver.clone();
        let stats = self.stats.clone();
        let max_events = self.config.max_events;
        
        tokio::spawn(async move {
            let mut monitor_timer = interval(Duration::from_secs(1));
            
            loop {
                monitor_timer.tick().await;
                
                // Update memory event count
                let memory_events = if let Ok(receiver) = memory_receiver.try_lock() {
                    max_events - receiver.capacity()
                } else {
                    0
                };
                
                let mut stats = stats.lock().await;
                stats.memory_events = memory_events;
            }
        });
    }
    
    async fn update_stats<F>(&self, update_fn: F) 
    where
        F: FnOnce(&mut BufferStats),
    {
        let mut stats = self.stats.lock().await;
        update_fn(&mut stats);
    }
    
    pub fn get_backpressure_receiver(&self) -> watch::Receiver<bool> {
        self.backpressure_receiver.clone()
    }
    
    pub async fn get_stats(&self) -> BufferStats {
        self.stats.lock().await.clone()
    }
    
    pub async fn flush(&self) -> Result<(), BufferError> {
        info!("🔄 Flushing buffer...");
        
        // Drain memory buffer
        let mut drained_count = 0;
        while let Some(_) = self.receive().await {
            drained_count += 1;
        }
        
        info!("✅ Buffer flushed, processed {} events", drained_count);
        Ok(())
    }
}

impl Drop for EventBuffer {
    fn drop(&mut self) {
        info!("📦 Event buffer shutting down");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parsers::ParsedEvent;
    use std::collections::HashMap;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_buffer_creation() {
        let temp_dir = TempDir::new().unwrap();
        let config = BufferConfig {
            max_events: 100,
            max_size_mb: 10,
            flush_interval: 5,
            compression: false,
            persistent: true,
            persistence_path: temp_dir.path().to_string_lossy().to_string(),
        };
        
        let buffer = EventBuffer::new(config).await;
        assert!(buffer.is_ok());
    }
    
    #[tokio::test]
    async fn test_event_send_receive() {
        let temp_dir = TempDir::new().unwrap();
        let config = BufferConfig {
            max_events: 100,
            max_size_mb: 10,
            flush_interval: 5,
            compression: false,
            persistent: false, // Use in-memory for faster tests
            persistence_path: temp_dir.path().to_string_lossy().to_string(),
        };
        
        let buffer = EventBuffer::new(config).await.unwrap();
        
        let event = ParsedEvent {
            timestamp: chrono::Utc::now(),
            source: "test".to_string(),
            level: Some("INFO".to_string()),
            message: "Test message".to_string(),
            fields: HashMap::new(),
            raw_data: "raw test data".to_string(),
            parser_name: "test_parser".to_string(),
        };
        
        // Send event
        let result = buffer.send(event).await;
        assert!(result.is_ok());
        
        // Receive event
        let received = buffer.receive().await;
        assert!(received.is_some());
        assert_eq!(received.unwrap().message, "Test message");
    }
}