// Advanced persistent buffering with SQLite WAL mode, checkpointing, and vacuum operations

use crate::config::{BufferConfig, SqliteSynchronousMode, SqliteAutoVacuum, SqliteTempStore, CleanupStrategy};
use crate::errors::BufferError;

#[cfg(test)]
mod tests;
use crate::parsers::ParsedEvent;
#[cfg(feature = "persistent-storage")]
use rusqlite::{Connection, OpenFlags, Result as SqliteResult};
use std::path::Path;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::sync::{mpsc, watch, Mutex};
use tokio::time::{interval, Duration, Instant};
use tracing::{info, warn, error, debug};

const HIGH_WATER_MARK: f32 = 0.8; // 80% capacity triggers disk buffering
const LOW_WATER_MARK: f32 = 0.3;  // 30% capacity clears backpressure

#[derive(Clone)]
pub struct EventBuffer {
    config: BufferConfig,
    
    // In-memory channel
    memory_sender: mpsc::Sender<ParsedEvent>,
    memory_receiver: Arc<Mutex<mpsc::Receiver<ParsedEvent>>>,
    
    // Persistent storage (conditional)
    #[cfg(feature = "persistent-storage")]
    db_connection: Arc<Mutex<Connection>>,
    
    // WAL mode management
    #[cfg(feature = "persistent-storage")]
    last_checkpoint: Arc<Mutex<Instant>>,
    #[cfg(feature = "persistent-storage")]
    last_vacuum: Arc<Mutex<SystemTime>>,
    
    // Backpressure signaling
    backpressure_sender: watch::Sender<bool>,
    backpressure_receiver: watch::Receiver<bool>,
    
    // Statistics
    stats: Arc<Mutex<BufferStats>>,
    
    // Cleanup management
    #[cfg(feature = "persistent-storage")]
    last_cleanup: Arc<Mutex<SystemTime>>,
}

#[derive(Debug, Clone)]
pub struct BufferStats {
    pub memory_events: usize,
    pub disk_events: i64,
    pub total_bytes: u64,
    pub backpressure_active: bool,
    pub events_processed: u64,
    pub events_dropped: u64,
    
    // WAL mode statistics
    pub wal_enabled: bool,
    pub wal_frames: i64,
    pub wal_size_kb: i64,
    pub last_checkpoint: Option<SystemTime>,
    pub last_vacuum: Option<SystemTime>,
    pub database_size_kb: i64,
    pub page_count: i64,
    pub auto_vacuum_enabled: bool,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct DatabaseSizeInfo {
    pub database_size_bytes: u64,
    pub used_space_bytes: u64,
    pub free_space_bytes: u64,
    pub wal_size_bytes: u64,
    pub page_count: u64,
    pub page_size: u64,
    pub freelist_count: u64,
}

impl DatabaseSizeInfo {
    pub fn database_size_mb(&self) -> f64 {
        self.database_size_bytes as f64 / (1024.0 * 1024.0)
    }
    
    pub fn used_space_mb(&self) -> f64 {
        self.used_space_bytes as f64 / (1024.0 * 1024.0)
    }
    
    pub fn free_space_mb(&self) -> f64 {
        self.free_space_bytes as f64 / (1024.0 * 1024.0)
    }
    
    pub fn wal_size_mb(&self) -> f64 {
        self.wal_size_bytes as f64 / (1024.0 * 1024.0)
    }
    
    pub fn utilization_percent(&self) -> f64 {
        if self.database_size_bytes == 0 {
            0.0
        } else {
            (self.used_space_bytes as f64 / self.database_size_bytes as f64) * 100.0
        }
    }
    
    pub fn exceeds_limit(&self, limit_mb: Option<usize>) -> bool {
        if let Some(limit) = limit_mb {
            self.database_size_mb() > limit as f64
        } else {
            false
        }
    }
    
    pub fn exceeds_threshold(&self, threshold_percent: f64, limit_mb: Option<usize>) -> bool {
        if let Some(limit) = limit_mb {
            let threshold_bytes = (limit as f64 * 1024.0 * 1024.0 * threshold_percent / 100.0) as u64;
            self.database_size_bytes > threshold_bytes
        } else {
            false
        }
    }
}

impl EventBuffer {
    pub async fn new(config: BufferConfig) -> Result<Self, BufferError> {
        // Create in-memory channel
        let (memory_sender, memory_receiver) = mpsc::channel(config.max_events);
        
        // Setup persistent storage (conditional)
        #[cfg(feature = "persistent-storage")]
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
            
            // WAL mode statistics
            wal_enabled: config.wal_mode,
            wal_frames: 0,
            wal_size_kb: 0,
            last_checkpoint: None,
            last_vacuum: None,
            database_size_kb: 0,
            page_count: 0,
            auto_vacuum_enabled: matches!(config.auto_vacuum, SqliteAutoVacuum::Full | SqliteAutoVacuum::Incremental),
        }));
        
        info!("📦 Event buffer initialized with memory capacity: {}, persistent: {}", 
              config.max_events, config.persistent);
        
        let buffer = Self {
            config: config.clone(),
            memory_sender,
            memory_receiver: Arc::new(Mutex::new(memory_receiver)),
            #[cfg(feature = "persistent-storage")]
            db_connection: Arc::new(Mutex::new(db_connection)),
            #[cfg(feature = "persistent-storage")]
            last_checkpoint: Arc::new(Mutex::new(Instant::now())),
            #[cfg(feature = "persistent-storage")]
            last_vacuum: Arc::new(Mutex::new(SystemTime::now())),
            #[cfg(feature = "persistent-storage")]
            last_cleanup: Arc::new(Mutex::new(SystemTime::now())),
            backpressure_sender,
            backpressure_receiver,
            stats,
        };
        
        // Start background tasks
        buffer.start_flush_task().await;
        buffer.start_monitoring_task().await;
        #[cfg(feature = "persistent-storage")]
        if config.wal_mode {
            buffer.start_wal_management_task().await;
        }
        
        #[cfg(feature = "persistent-storage")]
        if config.max_database_size_mb.is_some() {
            buffer.start_cleanup_management_task().await;
        }
        
        Ok(buffer)
    }
    
    async fn setup_database(config: &BufferConfig) -> Result<Connection, BufferError> {
        if !config.persistent {
            // Use in-memory database for non-persistent mode
            let conn = Connection::open_in_memory()
                .map_err(|e| BufferError::PersistenceError {
                    operation: "create_in_memory_database".to_string(),
                    database_path: ":memory:".to_string(),
                    recoverable: false,
                    source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
                })?;
            
            Self::configure_sqlite_settings(&conn, config)?;
            Self::create_schema(&conn)?;
            return Ok(conn);
        }
        
        // Create persistent storage directory
        let db_path = Path::new(&config.persistence_path).join("events.db");
        if let Some(parent) = db_path.parent() {
            tokio::fs::create_dir_all(parent).await
                .map_err(|e| BufferError::PersistenceError {
                    operation: "create_directory".to_string(),
                    database_path: parent.to_string_lossy().to_string(),
                    recoverable: true,
                    source: Box::new(e),
                })?;
        }
        
        let db_path_str = db_path.to_string_lossy().to_string();
        
        // Open SQLite database with advanced flags
        let mut open_flags = OpenFlags::SQLITE_OPEN_READ_WRITE | OpenFlags::SQLITE_OPEN_CREATE;
        
        // Add performance flags
        if config.mmap_size_mb > 0 {
            open_flags |= OpenFlags::SQLITE_OPEN_NO_MUTEX; // Better performance for single-threaded access
        }
        
        let conn = Connection::open_with_flags(&db_path, open_flags)
            .map_err(|e| BufferError::PersistenceError {
                operation: "open_database".to_string(),
                database_path: db_path_str.clone(),
                recoverable: true,
                source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
            })?;
        
        // Configure advanced SQLite settings
        Self::configure_sqlite_settings(&conn, config)?;
        
        // Perform vacuum on startup if requested
        if config.vacuum_on_startup {
            info!("🧹 Performing startup vacuum operation...");
            conn.execute("VACUUM", [])
                .map_err(|e| BufferError::PersistenceError {
                    operation: "startup_vacuum".to_string(),
                    database_path: db_path_str.clone(),
                    recoverable: true,
                    source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
                })?;
        }
        
        // Create schema
        Self::create_schema(&conn)?;
        
        info!("💾 Advanced SQLite buffer initialized at: {} (WAL: {}, Sync: {:?})", 
              db_path.display(), config.wal_mode, config.synchronous_mode);
        
        Ok(conn)
    }
    
    fn configure_sqlite_settings(conn: &Connection, config: &BufferConfig) -> Result<(), BufferError> {
        // Enable WAL mode if requested
        if config.wal_mode {
            conn.pragma_update(None, "journal_mode", "WAL")
                .map_err(|e| BufferError::WalError {
                    operation: "enable_wal_mode".to_string(),
                    wal_file: "unknown".to_string(),
                    checkpoint_lag: None,
                    source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
                })?;
            
            // Set WAL journal size limit
            let journal_size_bytes = config.journal_size_limit_mb * 1024 * 1024;
            conn.pragma_update(None, "journal_size_limit", journal_size_bytes)
                .map_err(|e| BufferError::WalError {
                    operation: "set_journal_size_limit".to_string(),
                    wal_file: "unknown".to_string(),
                    checkpoint_lag: None,
                    source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
                })?;
        }
        
        // Set synchronous mode
        let sync_value = match config.synchronous_mode {
            SqliteSynchronousMode::Off => 0,
            SqliteSynchronousMode::Normal => 1,
            SqliteSynchronousMode::Full => 2,
            SqliteSynchronousMode::Extra => 3,
        };
        conn.pragma_update(None, "synchronous", sync_value)
            .map_err(|e| BufferError::PersistenceError {
                operation: "set_synchronous_mode".to_string(),
                database_path: "unknown".to_string(),
                recoverable: false,
                source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
            })?;
        
        // Set cache size (negative value = KB, positive = pages)
        let cache_size = -(config.cache_size_kb as i32);
        conn.pragma_update(None, "cache_size", cache_size)
            .map_err(|e| BufferError::PersistenceError {
                operation: "set_cache_size".to_string(),
                database_path: "unknown".to_string(),
                recoverable: false,
                source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
            })?;
        
        // Set auto vacuum mode
        let auto_vacuum_value = match config.auto_vacuum {
            SqliteAutoVacuum::None => 0,
            SqliteAutoVacuum::Full => 1,
            SqliteAutoVacuum::Incremental => 2,
        };
        conn.pragma_update(None, "auto_vacuum", auto_vacuum_value)
            .map_err(|e| BufferError::PersistenceError {
                operation: "set_auto_vacuum".to_string(),
                database_path: "unknown".to_string(),
                recoverable: false,
                source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
            })?;
        
        // Set temp store mode
        let temp_store_value = match config.temp_store {
            SqliteTempStore::Default => 0,
            SqliteTempStore::File => 1,
            SqliteTempStore::Memory => 2,
        };
        conn.pragma_update(None, "temp_store", temp_store_value)
            .map_err(|e| BufferError::PersistenceError {
                operation: "set_temp_store".to_string(),
                database_path: "unknown".to_string(),
                recoverable: false,
                source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
            })?;
        
        // Set memory-mapped I/O size
        if config.mmap_size_mb > 0 {
            let mmap_size_bytes = config.mmap_size_mb * 1024 * 1024;
            conn.pragma_update(None, "mmap_size", mmap_size_bytes)
                .map_err(|e| BufferError::PersistenceError {
                    operation: "set_mmap_size".to_string(),
                    database_path: "unknown".to_string(),
                    recoverable: false,
                    source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
                })?;
        }
        
        // Set maximum page count if specified
        if let Some(max_pages) = config.max_page_count {
            conn.pragma_update(None, "max_page_count", max_pages)
                .map_err(|e| BufferError::PersistenceError {
                    operation: "set_max_page_count".to_string(),
                    database_path: "unknown".to_string(),
                    recoverable: false,
                    source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
                })?;
        }
        
        // Set secure delete mode
        conn.pragma_update(None, "secure_delete", config.secure_delete)
            .map_err(|e| BufferError::PersistenceError {
                operation: "set_secure_delete".to_string(),
                database_path: "unknown".to_string(),
                recoverable: false,
                source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
            })?;
        
        debug!("✅ SQLite settings configured: WAL={}, Sync={:?}, Cache={}KB", 
               config.wal_mode, config.synchronous_mode, config.cache_size_kb);
        
        Ok(())
    }
    
    fn create_schema(conn: &Connection) -> Result<(), BufferError> {
        // Create main events table with optimized schema
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
                created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
                size_bytes INTEGER NOT NULL DEFAULT 0
            )",
            [],
        ).map_err(|e| BufferError::PersistenceError {
            operation: "create_events_table".to_string(),
            database_path: "unknown".to_string(),
            recoverable: false,
            source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
        })?;
        
        // Create indexes for efficient queries
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at)",
            [],
        ).map_err(|e| BufferError::PersistenceError {
            operation: "create_created_at_index".to_string(),
            database_path: "unknown".to_string(),
            recoverable: false,
            source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
        })?;
        
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_events_source ON events(source)",
            [],
        ).map_err(|e| BufferError::PersistenceError {
            operation: "create_source_index".to_string(),
            database_path: "unknown".to_string(),
            recoverable: false,
            source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
        })?;
        
        // Create buffer metadata table for tracking statistics
        conn.execute(
            "CREATE TABLE IF NOT EXISTS buffer_metadata (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
            )",
            [],
        ).map_err(|e| BufferError::PersistenceError {
            operation: "create_metadata_table".to_string(),
            database_path: "unknown".to_string(),
            recoverable: false,
            source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
        })?;
        
        debug!("✅ Database schema created successfully");
        Ok(())
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
                    Err(BufferError::CapacityExceeded {
                        current: self.config.max_events,
                        max: self.config.max_events,
                        buffer_type: "memory".to_string(),
                        oldest_item_age: None,
                    })
                }
            }
            Err(mpsc::error::TrySendError::Closed(_)) => {
                error!("📦 Buffer channel closed");
                Err(BufferError::ChannelError {
                    operation: "try_send".to_string(),
                    channel_name: "memory_buffer".to_string(),
                    buffer_size: Some(self.config.max_events),
                    is_closed: true,
                })
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
                .map_err(|e| BufferError::SerializationError {
                    data_type: "event_fields".to_string(),
                    operation: "serialize".to_string(),
                    size_bytes: None,
                    source: Box::new(std::io::Error::new(std::io::ErrorKind::InvalidData, e.to_string())),
                })?;
            
            // Calculate event size for statistics
            let event_size = event_clone.raw_data.len() + fields_json.len() + 
                           event_clone.message.len() + event_clone.source.len() +
                           event_clone.parser_name.len();
            
            conn.execute(
                "INSERT INTO events (timestamp, source, level, message, fields, raw_data, parser_name, size_bytes)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                [
                    &event_clone.timestamp.to_rfc3339() as &dyn rusqlite::ToSql,
                    &event_clone.source,
                    &event_clone.level.unwrap_or_default(),
                    &event_clone.message,
                    &fields_json,
                    &event_clone.raw_data,
                    &event_clone.parser_name,
                    &(event_size as i64),
                ],
            ).map_err(|e| BufferError::PersistenceError {
                operation: "insert_event".to_string(),
                database_path: "unknown".to_string(),
                recoverable: true,
                source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
            })?;
            
            Ok::<(), BufferError>(())
        }).await
        .map_err(|e| BufferError::PersistenceError {
            operation: "database_task".to_string(),
            database_path: "unknown".to_string(),
            recoverable: true,
            source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
        })??;
        
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
            ).map_err(|e| BufferError::PersistenceError {
                operation: "prepare_statement".to_string(),
                database_path: "unknown".to_string(),
                recoverable: true,
                source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
            })?;
            
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
            }).map_err(|e| BufferError::PersistenceError {
                operation: "query_events".to_string(),
                database_path: "unknown".to_string(),
                recoverable: true,
                source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
            })?;
            
            if let Some(result) = rows.next() {
                let (id, event) = result.map_err(|e| BufferError::PersistenceError {
                    operation: "parse_row".to_string(),
                    database_path: "unknown".to_string(),
                    recoverable: false,
                    source: Box::new(std::io::Error::new(std::io::ErrorKind::InvalidData, e.to_string())),
                })?;
                
                // Delete the event from the database
                conn.execute("DELETE FROM events WHERE id = ?1", [id])
                    .map_err(|e| BufferError::PersistenceError {
                        operation: "delete_event".to_string(),
                        database_path: "unknown".to_string(),
                        recoverable: true,
                        source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
                    })?;
                
                debug!("💾 Event loaded from disk and removed");
                Ok(Some(event))
            } else {
                Ok(None)
            }
        }).await
        .map_err(|e| BufferError::PersistenceError {
            operation: "database_task".to_string(),
            database_path: "unknown".to_string(),
            recoverable: true,
            source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
        })?
    }
    
    /// Perform WAL checkpoint to sync data from WAL to main database
    #[cfg(feature = "persistent-storage")]
    async fn checkpoint_wal(&self) -> Result<(), BufferError> {
        if !self.config.wal_mode {
            return Ok(());
        }
        
        let db = self.db_connection.clone();
        let should_checkpoint = {
            let last_checkpoint = self.last_checkpoint.lock().await;
            last_checkpoint.elapsed() >= Duration::from_secs(self.config.checkpoint_interval_sec)
        };
        
        if !should_checkpoint {
            return Ok(());
        }
        
        debug!("🔄 Performing WAL checkpoint...");
        
        let result = tokio::task::spawn_blocking(move || {
            let conn = db.blocking_lock();
            
            // Perform PRAGMA wal_checkpoint(TRUNCATE) for maximum WAL cleanup
            let mut stmt = conn.prepare("PRAGMA wal_checkpoint(TRUNCATE)")?;
            let mut rows = stmt.query_map([], |row| {
                Ok((
                    row.get::<_, i32>(0)?, // 0=ok, 1=ok but no work, others=error
                    row.get::<_, i32>(1)?, // Total number of frames in WAL
                    row.get::<_, i32>(2)?, // Number of frames checkpointed
                ))
            })?;
            
            if let Some(result) = rows.next() {
                let (status, total_frames, checkpointed_frames) = result?;
                debug!("✅ WAL checkpoint completed: status={}, frames={}/{}", 
                       status, checkpointed_frames, total_frames);
                       
                if status != 0 && status != 1 {
                    return Err(BufferError::WalError {
                        operation: "wal_checkpoint".to_string(),
                        wal_file: "unknown".to_string(),
                        checkpoint_lag: Some((total_frames - checkpointed_frames) as u64),
                        source: Box::new(std::io::Error::new(
                            std::io::ErrorKind::Other, 
                            format!("Checkpoint failed with status: {}", status)
                        )),
                    });
                }
            }
            
            Ok::<(), BufferError>(())
        }).await
        .map_err(|e| BufferError::PersistenceError {
            operation: "checkpoint_task".to_string(),
            database_path: "unknown".to_string(),
            recoverable: true,
            source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
        })??;
        
        // Update last checkpoint time
        {
            let mut last_checkpoint = self.last_checkpoint.lock().await;
            *last_checkpoint = Instant::now();
        }
        
        // Update statistics
        self.update_wal_stats().await?;
        
        Ok(())
    }
    
    /// Perform incremental vacuum to reclaim disk space
    #[cfg(feature = "persistent-storage")]
    async fn incremental_vacuum(&self) -> Result<(), BufferError> {
        if !matches!(self.config.auto_vacuum, SqliteAutoVacuum::Incremental) {
            return Ok(());
        }
        
        // Only vacuum if it's been more than 24 hours since last vacuum
        let should_vacuum = {
            let last_vacuum = self.last_vacuum.lock().await;
            last_vacuum.elapsed().unwrap_or_default() >= Duration::from_secs(24 * 60 * 60)
        };
        
        if !should_vacuum {
            return Ok(());
        }
        
        let db = self.db_connection.clone();
        
        debug!("🧹 Performing incremental vacuum...");
        
        tokio::task::spawn_blocking(move || {
            let conn = db.blocking_lock();
            
            // Get current page count before vacuum
            let page_count_before: i64 = conn.pragma_query_value(None, "page_count", |row| {
                row.get(0)
            })?;
            
            // Perform incremental vacuum (reclaim up to 1000 pages at a time)
            conn.execute("PRAGMA incremental_vacuum(1000)", [])?;
            
            // Get page count after vacuum
            let page_count_after: i64 = conn.pragma_query_value(None, "page_count", |row| {
                row.get(0)
            })?;
            
            let pages_reclaimed = page_count_before - page_count_after;
            if pages_reclaimed > 0 {
                info!("🧹 Incremental vacuum reclaimed {} pages", pages_reclaimed);
            }
            
            Ok::<(), rusqlite::Error>(())
        }).await
        .map_err(|e| BufferError::PersistenceError {
            operation: "vacuum_task".to_string(),
            database_path: "unknown".to_string(),
            recoverable: true,
            source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
        })?
        .map_err(|e| BufferError::PersistenceError {
            operation: "incremental_vacuum".to_string(),
            database_path: "unknown".to_string(),
            recoverable: true,
            source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
        })?;
        
        // Update last vacuum time
        {
            let mut last_vacuum = self.last_vacuum.lock().await;
            *last_vacuum = SystemTime::now();
        }
        
        Ok(())
    }
    
    /// Update WAL-related statistics
    #[cfg(feature = "persistent-storage")]
    async fn update_wal_stats(&self) -> Result<(), BufferError> {
        let db = self.db_connection.clone();
        
        let wal_stats = tokio::task::spawn_blocking(move || {
            let conn = db.blocking_lock();
            
            // Get WAL status
            let journal_mode: String = conn.pragma_query_value(None, "journal_mode", |row| {
                row.get(0)
            })?;
            
            let wal_enabled = journal_mode.to_lowercase() == "wal";
            
            // Get WAL size and frame count if WAL is enabled
            let (wal_frames, wal_size_kb) = if wal_enabled {
                let wal_autocheckpoint: i64 = conn.pragma_query_value(None, "wal_autocheckpoint", |row| {
                    row.get(0)
                }).unwrap_or(1000);
                
                // Estimate WAL size (this is approximate)
                let page_size: i64 = conn.pragma_query_value(None, "page_size", |row| {
                    row.get(0)
                })?;
                
                (wal_autocheckpoint, (wal_autocheckpoint * page_size) / 1024)
            } else {
                (0, 0)
            };
            
            // Get database size
            let page_count: i64 = conn.pragma_query_value(None, "page_count", |row| {
                row.get(0)
            })?;
            
            let page_size: i64 = conn.pragma_query_value(None, "page_size", |row| {
                row.get(0)
            })?;
            
            let database_size_kb = (page_count * page_size) / 1024;
            
            Ok::<(bool, i64, i64, i64, i64), rusqlite::Error>((
                wal_enabled,
                wal_frames,
                wal_size_kb,
                database_size_kb,
                page_count,
            ))
        }).await
        .map_err(|e| BufferError::PersistenceError {
            operation: "wal_stats_task".to_string(),
            database_path: "unknown".to_string(),
            recoverable: true,
            source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
        })?
        .map_err(|e| BufferError::PersistenceError {
            operation: "get_wal_stats".to_string(),
            database_path: "unknown".to_string(),
            recoverable: true,
            source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
        })?;
        
        // Update statistics
        let mut stats = self.stats.lock().await;
        stats.wal_enabled = wal_stats.0;
        stats.wal_frames = wal_stats.1;
        stats.wal_size_kb = wal_stats.2;
        stats.database_size_kb = wal_stats.3;
        stats.page_count = wal_stats.4;
        
        Ok(())
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
                
                debug!("📊 Buffer stats - Memory: {}, Disk: {}, Processed: {}, Dropped: {}, WAL: {}KB", 
                       stats_snapshot.memory_events, 
                       stats_snapshot.disk_events,
                       stats_snapshot.events_processed, 
                       stats_snapshot.events_dropped,
                       stats_snapshot.wal_size_kb);
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
    
    #[cfg(feature = "persistent-storage")]
    async fn start_wal_management_task(&self) {
        let db_connection = self.db_connection.clone();
        let last_checkpoint = self.last_checkpoint.clone();
        let last_vacuum = self.last_vacuum.clone();
        let stats = self.stats.clone();
        let config = self.config.clone();
        
        tokio::spawn(async move {
            let mut wal_timer = interval(Duration::from_secs(30)); // Check every 30 seconds
            
            loop {
                wal_timer.tick().await;
                
                // Perform checkpoint if needed
                if config.wal_mode {
                    let should_checkpoint = {
                        let last_checkpoint_time = last_checkpoint.lock().await;
                        last_checkpoint_time.elapsed() >= Duration::from_secs(config.checkpoint_interval_sec)
                    };
                    
                    if should_checkpoint {
                        debug!("🔄 Performing scheduled WAL checkpoint...");
                        
                        if let Err(e) = Self::perform_checkpoint(&db_connection).await {
                            warn!("⚠️  WAL checkpoint failed: {}", e);
                        } else {
                            let mut last_checkpoint_time = last_checkpoint.lock().await;
                            *last_checkpoint_time = Instant::now();
                        }
                    }
                }
                
                // Perform incremental vacuum if needed (once per day)
                if matches!(config.auto_vacuum, SqliteAutoVacuum::Incremental) {
                    let should_vacuum = {
                        let last_vacuum_time = last_vacuum.lock().await;
                        last_vacuum_time.elapsed().unwrap_or_default() >= Duration::from_secs(24 * 60 * 60)
                    };
                    
                    if should_vacuum {
                        debug!("🧹 Performing scheduled incremental vacuum...");
                        
                        if let Err(e) = Self::perform_incremental_vacuum(&db_connection).await {
                            warn!("⚠️  Incremental vacuum failed: {}", e);
                        } else {
                            let mut last_vacuum_time = last_vacuum.lock().await;
                            *last_vacuum_time = SystemTime::now();
                        }
                    }
                }
            }
        });
        
        debug!("🔄 WAL management task started (checkpoint interval: {}s)", config.checkpoint_interval_sec);
    }
    
    #[cfg(feature = "persistent-storage")]
    async fn perform_checkpoint(db_connection: &Arc<Mutex<Connection>>) -> Result<(), BufferError> {
        let db = db_connection.clone();
        
        tokio::task::spawn_blocking(move || {
            let conn = db.blocking_lock();
            
            // Perform PRAGMA wal_checkpoint(TRUNCATE) for maximum WAL cleanup
            let mut stmt = conn.prepare("PRAGMA wal_checkpoint(TRUNCATE)")?;
            let mut rows = stmt.query_map([], |row| {
                Ok((
                    row.get::<_, i32>(0)?, // 0=ok, 1=ok but no work, others=error
                    row.get::<_, i32>(1)?, // Total number of frames in WAL
                    row.get::<_, i32>(2)?, // Number of frames checkpointed
                ))
            })?;
            
            if let Some(result) = rows.next() {
                let (status, total_frames, checkpointed_frames) = result?;
                debug!("✅ WAL checkpoint completed: status={}, frames={}/{}", 
                       status, checkpointed_frames, total_frames);
                       
                if status != 0 && status != 1 {
                    return Err(BufferError::WalError {
                        operation: "wal_checkpoint".to_string(),
                        wal_file: "unknown".to_string(),
                        checkpoint_lag: Some((total_frames - checkpointed_frames) as u64),
                        source: Box::new(std::io::Error::new(
                            std::io::ErrorKind::Other, 
                            format!("Checkpoint failed with status: {}", status)
                        )),
                    });
                }
            }
            
            Ok::<(), BufferError>(())
        }).await
        .map_err(|e| BufferError::PersistenceError {
            operation: "checkpoint_task".to_string(),
            database_path: "unknown".to_string(),
            recoverable: true,
            source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
        })?
    }
    
    #[cfg(feature = "persistent-storage")]
    async fn perform_incremental_vacuum(db_connection: &Arc<Mutex<Connection>>) -> Result<(), BufferError> {
        let db = db_connection.clone();
        
        tokio::task::spawn_blocking(move || {
            let conn = db.blocking_lock();
            
            // Get current page count before vacuum
            let page_count_before: i64 = conn.pragma_query_value(None, "page_count", |row| {
                row.get(0)
            })?;
            
            // Perform incremental vacuum (reclaim up to 1000 pages at a time)
            conn.execute("PRAGMA incremental_vacuum(1000)", [])?;
            
            // Get page count after vacuum
            let page_count_after: i64 = conn.pragma_query_value(None, "page_count", |row| {
                row.get(0)
            })?;
            
            let pages_reclaimed = page_count_before - page_count_after;
            if pages_reclaimed > 0 {
                info!("🧹 Incremental vacuum reclaimed {} pages", pages_reclaimed);
            }
            
            Ok::<(), rusqlite::Error>(())
        }).await
        .map_err(|e| BufferError::PersistenceError {
            operation: "vacuum_task".to_string(),
            database_path: "unknown".to_string(),
            recoverable: true,
            source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
        })?
        .map_err(|e| BufferError::PersistenceError {
            operation: "incremental_vacuum".to_string(),
            database_path: "unknown".to_string(),
            recoverable: true,
            source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
        })
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
    
    /// Get comprehensive buffer statistics including real-time WAL metrics
    #[cfg(feature = "persistent-storage")]
    pub async fn get_comprehensive_stats(&self) -> Result<BufferStats, BufferError> {
        // Update WAL stats first
        self.update_wal_stats().await?;
        
        // Return updated stats
        Ok(self.stats.lock().await.clone())
    }
    
    /// Force a WAL checkpoint (useful for testing or manual maintenance)
    #[cfg(feature = "persistent-storage")]
    pub async fn force_checkpoint(&self) -> Result<(), BufferError> {
        if !self.config.wal_mode {
            return Err(BufferError::WalError {
                operation: "force_checkpoint".to_string(),
                wal_file: "unknown".to_string(),
                checkpoint_lag: None,
                source: Box::new(std::io::Error::new(
                    std::io::ErrorKind::InvalidInput,
                    "WAL mode is not enabled"
                )),
            });
        }
        
        info!("🔄 Forcing WAL checkpoint...");
        
        Self::perform_checkpoint(&self.db_connection).await?;
        
        // Update checkpoint time
        {
            let mut last_checkpoint = self.last_checkpoint.lock().await;
            *last_checkpoint = Instant::now();
        }
        
        // Update statistics
        self.update_wal_stats().await?;
        
        info!("✅ Forced WAL checkpoint completed");
        Ok(())
    }
    
    /// Get database file size information
    #[cfg(feature = "persistent-storage")]
    pub async fn get_database_size_info(&self) -> Result<DatabaseSizeInfo, BufferError> {
        let db = self.db_connection.clone();
        
        tokio::task::spawn_blocking(move || {
            let conn = db.blocking_lock();
            
            let page_count: i64 = conn.pragma_query_value(None, "page_count", |row| row.get(0))?;
            let page_size: i64 = conn.pragma_query_value(None, "page_size", |row| row.get(0))?;
            let freelist_count: i64 = conn.pragma_query_value(None, "freelist_count", |row| row.get(0))?;
            
            let database_size_bytes = page_count * page_size;
            let free_space_bytes = freelist_count * page_size;
            let used_space_bytes = database_size_bytes - free_space_bytes;
            
            // Get WAL size if available
            let journal_mode: String = conn.pragma_query_value(None, "journal_mode", |row| row.get(0))?;
            let wal_size_bytes = if journal_mode.to_lowercase() == "wal" {
                // This is an approximation - actual WAL size would require filesystem access
                let wal_autocheckpoint: i64 = conn.pragma_query_value(None, "wal_autocheckpoint", |row| {
                    row.get(0)
                }).unwrap_or(1000);
                wal_autocheckpoint * page_size
            } else {
                0
            };
            
            Ok(DatabaseSizeInfo {
                database_size_bytes: database_size_bytes as u64,
                used_space_bytes: used_space_bytes as u64,
                free_space_bytes: free_space_bytes as u64,
                wal_size_bytes: wal_size_bytes as u64,
                page_count: page_count as u64,
                page_size: page_size as u64,
                freelist_count: freelist_count as u64,
            })
        }).await
        .map_err(|e| BufferError::PersistenceError {
            operation: "get_db_size_info".to_string(),
            database_path: "unknown".to_string(),
            recoverable: true,
            source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
        })?
        .map_err(|e: rusqlite::Error| BufferError::PersistenceError {
            operation: "get_db_size_info".to_string(),
            database_path: "unknown".to_string(),
            recoverable: true,
            source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
        })
    }
    
    /// Automatic cleanup management task
    #[cfg(feature = "persistent-storage")]
    async fn start_cleanup_management_task(&self) {
        let db_connection = self.db_connection.clone();
        let last_cleanup = self.last_cleanup.clone();
        let config = self.config.clone();
        let cleanup_interval_sec = config.cleanup_interval_sec;
        
        tokio::spawn(async move {
            let mut cleanup_timer = interval(Duration::from_secs(config.cleanup_interval_sec));
            
            loop {
                cleanup_timer.tick().await;
                
                // Check if cleanup is needed
                let should_cleanup = {
                    let last_cleanup_time = last_cleanup.lock().await;
                    last_cleanup_time.elapsed().unwrap_or_default() >= Duration::from_secs(config.cleanup_interval_sec)
                };
                
                if should_cleanup {
                    if let Err(e) = Self::perform_automatic_cleanup(&db_connection, &config).await {
                        warn!("⚠️  Automatic cleanup failed: {}", e);
                    } else {
                        let mut last_cleanup_time = last_cleanup.lock().await;
                        *last_cleanup_time = SystemTime::now();
                    }
                }
            }
        });
        
        debug!("🧹 Cleanup management task started (interval: {}s)", cleanup_interval_sec);
    }
    
    /// Perform automatic cleanup based on database size and configuration
    #[cfg(feature = "persistent-storage")]
    async fn perform_automatic_cleanup(db_connection: &Arc<Mutex<Connection>>, config: &BufferConfig) -> Result<usize, BufferError> {
        let db = db_connection.clone();
        let config_clone = config.clone();
        
        let cleanup_result = tokio::task::spawn_blocking(move || {
            let conn = db.blocking_lock();
            
            // Get current database size
            let size_info = Self::get_database_size_info_sync(&conn)?;
            
            // Check if cleanup is needed
            if !size_info.exceeds_threshold(config_clone.cleanup_trigger_percent, config_clone.max_database_size_mb) {
                debug!("🧹 Database size OK: {:.2}MB (threshold not reached)", size_info.database_size_mb());
                return Ok(0);
            }
            
            info!("🧹 Database cleanup triggered: {:.2}MB exceeds threshold of {:.1}%", 
                  size_info.database_size_mb(), config_clone.cleanup_trigger_percent);
            
            // Calculate target size
            let target_size_bytes = if let Some(max_size_mb) = config_clone.max_database_size_mb {
                (max_size_mb as f64 * 1024.0 * 1024.0 * config_clone.cleanup_target_percent / 100.0) as u64
            } else {
                return Ok(0); // No limit set
            };
            
            let bytes_to_remove = size_info.database_size_bytes.saturating_sub(target_size_bytes);
            
            if bytes_to_remove == 0 {
                debug!("🧹 No cleanup needed after recalculation");
                return Ok(0);
            }
            
            // Perform cleanup based on strategy
            Self::cleanup_events_by_strategy(&conn, &config_clone, bytes_to_remove)
        }).await
        .map_err(|e| BufferError::PersistenceError {
            operation: "cleanup_task".to_string(),
            database_path: "unknown".to_string(),
            recoverable: true,
            source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
        })??;
        
        if cleanup_result > 0 {
            info!("✅ Cleanup completed: removed {} events", cleanup_result);
        }
        
        Ok(cleanup_result)
    }
    
    /// Clean up events based on the configured strategy with enhanced retention policies
    #[cfg(feature = "persistent-storage")]
    fn cleanup_events_by_strategy(conn: &Connection, config: &BufferConfig, target_bytes: u64) -> Result<usize, BufferError> {
        let min_retention_seconds = config.min_retention_hours * 3600;
        let max_events = config.max_events_per_cleanup;
        
        // First, calculate how many events we need to remove based on size
        let current_size_info = Self::get_database_size_info_sync(conn)
            .map_err(|e| BufferError::PersistenceError {
                operation: "get_size_for_cleanup".to_string(),
                database_path: "unknown".to_string(),
                recoverable: true,
                source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
            })?;
        
        // If we don't need to remove any data, return early
        if current_size_info.database_size_bytes <= target_bytes {
            debug!("🧹 No cleanup needed: current size {:.2}MB <= target {:.2}MB", 
                   current_size_info.database_size_mb(), target_bytes as f64 / (1024.0 * 1024.0));
            return Ok(0);
        }
        
        let bytes_to_remove = current_size_info.database_size_bytes - target_bytes;
        debug!("🧹 Need to remove {:.2}MB ({} bytes)", 
               bytes_to_remove as f64 / (1024.0 * 1024.0), bytes_to_remove);
        
        // Enhanced cleanup strategy with size-aware deletion
        let (cleanup_query, estimated_events_to_remove) = match config.cleanup_strategy {
            CleanupStrategy::Fifo => {
                // Calculate approximate events to remove based on average event size
                let avg_size_query = "SELECT AVG(size_bytes) FROM events WHERE size_bytes > 0";
                let avg_event_size: f64 = conn.query_row(avg_size_query, [], |row| {
                    row.get::<_, Option<f64>>(0).map(|v| v.unwrap_or(1024.0))
                }).unwrap_or(1024.0);
                
                let estimated_events = std::cmp::min(
                    (bytes_to_remove as f64 / avg_event_size).ceil() as usize,
                    max_events
                );
                
                let query = format!(
                    "DELETE FROM events WHERE id IN (
                        SELECT id FROM events 
                        WHERE created_at < strftime('%s', 'now', '-{} seconds')
                        ORDER BY created_at ASC 
                        LIMIT {}
                    )",
                    min_retention_seconds, estimated_events
                );
                (query, estimated_events)
            }
            CleanupStrategy::Lru => {
                // Enhanced LRU: track by access patterns and size
                let avg_size_query = "SELECT AVG(size_bytes) FROM events WHERE size_bytes > 0";
                let avg_event_size: f64 = conn.query_row(avg_size_query, [], |row| {
                    row.get::<_, Option<f64>>(0).map(|v| v.unwrap_or(1024.0))
                }).unwrap_or(1024.0);
                
                let estimated_events = std::cmp::min(
                    (bytes_to_remove as f64 / avg_event_size).ceil() as usize,
                    max_events
                );
                
                // Prefer removing larger, older events first
                let query = format!(
                    "DELETE FROM events WHERE id IN (
                        SELECT id FROM events 
                        WHERE created_at < strftime('%s', 'now', '-{} seconds')
                        ORDER BY size_bytes DESC, created_at ASC 
                        LIMIT {}
                    )",
                    min_retention_seconds, estimated_events
                );
                (query, estimated_events)
            }
            CleanupStrategy::Priority => {
                // Priority-based cleanup with size consideration
                let query = format!(
                    "DELETE FROM events WHERE id IN (
                        SELECT id FROM events 
                        WHERE created_at < strftime('%s', 'now', '-{} seconds')
                        AND (level IS NULL OR level NOT IN ('ERROR', 'CRITICAL', 'FATAL'))
                        ORDER BY 
                            -- First prioritize by level (lower priority removed first)
                            CASE level 
                                WHEN 'CRITICAL' THEN 1
                                WHEN 'FATAL' THEN 2
                                WHEN 'ERROR' THEN 3
                                WHEN 'WARN' THEN 4
                                WHEN 'INFO' THEN 5
                                ELSE 6
                            END DESC,
                            -- Then by size (larger events removed first)
                            size_bytes DESC,
                            -- Finally by age (older events removed first)
                            created_at ASC
                        LIMIT {}
                    )",
                    min_retention_seconds, max_events
                );
                (query, max_events)
            }
            CleanupStrategy::Intelligent => {
                // Intelligent strategy: adaptive cleanup based on multiple factors
                let total_events_query = "SELECT COUNT(*) FROM events";
                let total_events: i64 = conn.query_row(total_events_query, [], |row| row.get(0)).unwrap_or(0);
                
                // Adaptive cleanup: more aggressive for very large databases
                let retention_multiplier = if total_events > 100000 { 1.5 } else { 2.0 };
                let extended_retention = (min_retention_seconds as f64 * retention_multiplier) as u64;
                
                let query = format!(
                    "DELETE FROM events WHERE id IN (
                        SELECT id FROM events 
                        WHERE (
                            -- Remove very old events regardless of priority (extended retention for critical)
                            created_at < strftime('%s', 'now', '-{} seconds')
                            OR (
                                -- Remove old low-priority events (standard retention)
                                created_at < strftime('%s', 'now', '-{} seconds')
                                AND (level IS NULL OR level IN ('DEBUG', 'TRACE', 'INFO'))
                            )
                            OR (
                                -- Remove large events if space is critically low
                                size_bytes > (SELECT AVG(size_bytes) * 3 FROM events WHERE size_bytes > 0)
                                AND created_at < strftime('%s', 'now', '-{} seconds')
                            )
                        )
                        ORDER BY 
                            -- Multi-factor prioritization
                            CASE 
                                -- Critical events have highest retention
                                WHEN level IN ('CRITICAL', 'FATAL') THEN 1
                                WHEN level = 'ERROR' THEN 2
                                WHEN level = 'WARN' THEN 3
                                WHEN level = 'INFO' THEN 4
                                ELSE 5
                            END ASC,
                            -- Larger events are removed first within same priority
                            size_bytes DESC,
                            -- Older events are removed first
                            created_at ASC
                        LIMIT {}
                    )",
                    extended_retention,       // Keep critical events longer
                    min_retention_seconds,    // Standard retention for normal events
                    min_retention_seconds / 2, // Shorter retention for oversized events
                    max_events
                );
                (query, max_events)
            }
        };
        
        debug!("🧹 Executing enhanced cleanup query (estimated events: {}): {}", 
               estimated_events_to_remove, cleanup_query);
        
        let deleted_count = conn.execute(&cleanup_query, [])
            .map_err(|e| BufferError::PersistenceError {
                operation: "cleanup_events".to_string(),
                database_path: "unknown".to_string(),
                recoverable: true,
                source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
            })?;
        
        // Enhanced post-cleanup operations
        if deleted_count > 0 {
            // Calculate space reclaimed
            let new_size_info = Self::get_database_size_info_sync(conn)
                .map_err(|e| BufferError::PersistenceError {
                    operation: "get_size_after_cleanup".to_string(),
                    database_path: "unknown".to_string(),
                    recoverable: true,
                    source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
                })?;
            
            let space_reclaimed = current_size_info.database_size_bytes.saturating_sub(new_size_info.database_size_bytes);
            info!("🧹 Removed {} events, reclaimed {:.2}MB (database: {:.2}MB -> {:.2}MB)", 
                  deleted_count, 
                  space_reclaimed as f64 / (1024.0 * 1024.0),
                  current_size_info.database_size_mb(),
                  new_size_info.database_size_mb());
            
            // Adaptive VACUUM: only vacuum if significant space was freed or many events removed
            let should_vacuum = deleted_count > 1000 || 
                               space_reclaimed > 10 * 1024 * 1024 || // > 10MB freed
                               new_size_info.freelist_count > new_size_info.page_count / 4; // > 25% free pages
            
            if should_vacuum {
                debug!("🧹 Performing VACUUM to reclaim space (free pages: {}, total pages: {})", 
                       new_size_info.freelist_count, new_size_info.page_count);
                
                let vacuum_start = std::time::Instant::now();
                conn.execute("VACUUM", [])
                    .map_err(|e| BufferError::PersistenceError {
                        operation: "post_cleanup_vacuum".to_string(),
                        database_path: "unknown".to_string(),
                        recoverable: true,
                        source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
                    })?;
                
                let vacuum_duration = vacuum_start.elapsed();
                info!("🧹 VACUUM completed in {:.2}s", vacuum_duration.as_secs_f64());
                
                // Log final size after vacuum
                let final_size_info = Self::get_database_size_info_sync(conn)
                    .map_err(|e| BufferError::PersistenceError {
                        operation: "get_size_after_vacuum".to_string(),
                        database_path: "unknown".to_string(),
                        recoverable: true,
                        source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
                    })?;
                
                let total_space_reclaimed = current_size_info.database_size_bytes.saturating_sub(final_size_info.database_size_bytes);
                info!("✅ Total space reclaimed: {:.2}MB (final database size: {:.2}MB)", 
                      total_space_reclaimed as f64 / (1024.0 * 1024.0),
                      final_size_info.database_size_mb());
            }
        }
        
        Ok(deleted_count)
    }
    
    /// Get database size information synchronously (for use in blocking tasks)
    #[cfg(feature = "persistent-storage")]
    fn get_database_size_info_sync(conn: &Connection) -> Result<DatabaseSizeInfo, rusqlite::Error> {
        let page_count: i64 = conn.pragma_query_value(None, "page_count", |row| row.get(0))?;
        let page_size: i64 = conn.pragma_query_value(None, "page_size", |row| row.get(0))?;
        let freelist_count: i64 = conn.pragma_query_value(None, "freelist_count", |row| row.get(0))?;
        
        let database_size_bytes = page_count * page_size;
        let free_space_bytes = freelist_count * page_size;
        let used_space_bytes = database_size_bytes - free_space_bytes;
        
        // Get WAL size if available
        let journal_mode: String = conn.pragma_query_value(None, "journal_mode", |row| row.get(0))?;
        let wal_size_bytes = if journal_mode.to_lowercase() == "wal" {
            let wal_autocheckpoint: i64 = conn.pragma_query_value(None, "wal_autocheckpoint", |row| {
                row.get(0)
            }).unwrap_or(1000);
            wal_autocheckpoint * page_size
        } else {
            0
        };
        
        Ok(DatabaseSizeInfo {
            database_size_bytes: database_size_bytes as u64,
            used_space_bytes: used_space_bytes as u64,
            free_space_bytes: free_space_bytes as u64,
            wal_size_bytes: wal_size_bytes as u64,
            page_count: page_count as u64,
            page_size: page_size as u64,
            freelist_count: freelist_count as u64,
        })
    }
    
    /// Force cleanup operation (useful for testing or manual maintenance)
    #[cfg(feature = "persistent-storage")]
    pub async fn force_cleanup(&self) -> Result<usize, BufferError> {
        if self.config.max_database_size_mb.is_none() {
            return Err(BufferError::PersistenceError {
                operation: "force_cleanup".to_string(),
                database_path: "unknown".to_string(),
                recoverable: false,
                source: Box::new(std::io::Error::new(
                    std::io::ErrorKind::InvalidInput,
                    "No database size limit configured"
                )),
            });
        }
        
        info!("🧹 Forcing database cleanup...");
        
        let result = Self::perform_automatic_cleanup(&self.db_connection, &self.config).await?;
        
        // Update cleanup time
        {
            let mut last_cleanup = self.last_cleanup.lock().await;
            *last_cleanup = SystemTime::now();
        }
        
        info!("✅ Forced cleanup completed");
        Ok(result)
    }
    
    /// Apply retention policies for time-based cleanup
    #[cfg(feature = "persistent-storage")]
    pub async fn apply_retention_policies(&self) -> Result<usize, BufferError> {
        let db = self.db_connection.clone();
        let config = self.config.clone();
        
        tokio::task::spawn_blocking(move || {
            let conn = db.blocking_lock();
            
            let min_retention_seconds = config.min_retention_hours * 3600;
            info!("🗓️ Applying retention policies: minimum retention {} hours ({} seconds)", 
                  config.min_retention_hours, min_retention_seconds);
            
            // Count events older than retention period
            let count_query = "SELECT COUNT(*) FROM events WHERE created_at < strftime('%s', 'now', '-{} seconds')";
            let formatted_count_query = count_query.replace("{}", &min_retention_seconds.to_string());
            
            let events_to_expire: i64 = conn.query_row(&formatted_count_query, [], |row| row.get(0))
                .map_err(|e| BufferError::PersistenceError {
                    operation: "count_expired_events".to_string(),
                    database_path: "unknown".to_string(),
                    recoverable: true,
                    source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
                })?;
            
            if events_to_expire == 0 {
                debug!("✅ No events exceed retention policy");
                return Ok(0);
            }
            
            info!("⏰ Found {} events exceeding retention policy of {} hours", 
                  events_to_expire, config.min_retention_hours);
            
            // Delete expired events based on retention policy
            let delete_query = format!(
                "DELETE FROM events WHERE created_at < strftime('%s', 'now', '-{} seconds')",
                min_retention_seconds
            );
            
            let deleted_count = conn.execute(&delete_query, [])
                .map_err(|e| BufferError::PersistenceError {
                    operation: "delete_expired_events".to_string(),
                    database_path: "unknown".to_string(),
                    recoverable: true,
                    source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
                })?;
            
            if deleted_count > 0 {
                info!("🗑️ Removed {} expired events based on retention policy", deleted_count);
                
                // Update metadata
                let metadata_query = "INSERT OR REPLACE INTO buffer_metadata (key, value) VALUES ('last_retention_cleanup', strftime('%s', 'now'))";
                let _ = conn.execute(metadata_query, []);
            }
            
            Ok(deleted_count)
        }).await
        .map_err(|e| BufferError::PersistenceError {
            operation: "retention_cleanup_task".to_string(),
            database_path: "unknown".to_string(),
            recoverable: true,
            source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
        })?
    }
    
    /// Perform full VACUUM operation if needed based on database fragmentation
    #[cfg(feature = "persistent-storage")]
    pub async fn perform_full_vacuum_if_needed(&self) -> Result<bool, BufferError> {
        let db = self.db_connection.clone();
        
        let vacuum_performed = tokio::task::spawn_blocking(move || {
            let conn = db.blocking_lock();
            
            // Get database fragmentation information
            let size_info = Self::get_database_size_info_sync(&conn)
                .map_err(|e| BufferError::PersistenceError {
                    operation: "get_size_for_vacuum".to_string(),
                    database_path: "unknown".to_string(),
                    recoverable: true,
                    source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
                })?;
            
            // Calculate fragmentation ratio
            let fragmentation_ratio = if size_info.page_count > 0 {
                size_info.freelist_count as f64 / size_info.page_count as f64
            } else {
                0.0
            };
            
            // Only vacuum if fragmentation is significant (>15% free pages) or database is large with moderate fragmentation (>5%)
            let should_vacuum = (fragmentation_ratio > 0.15) || 
                               (size_info.database_size_mb() > 100.0 && fragmentation_ratio > 0.05);
            
            if !should_vacuum {
                debug!("📊 Database fragmentation acceptable: {:.1}% free pages ({:.2}MB total)", 
                       fragmentation_ratio * 100.0, size_info.database_size_mb());
                return Ok(false);
            }
            
            info!("🧹 Starting full VACUUM operation: {:.1}% fragmentation ({} free pages, {:.2}MB total)", 
                  fragmentation_ratio * 100.0, size_info.freelist_count, size_info.database_size_mb());
            
            let vacuum_start = std::time::Instant::now();
            
            // Perform full VACUUM
            conn.execute("VACUUM", [])
                .map_err(|e| BufferError::PersistenceError {
                    operation: "full_vacuum".to_string(),
                    database_path: "unknown".to_string(),
                    recoverable: true,
                    source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
                })?;
            
            let vacuum_duration = vacuum_start.elapsed();
            
            // Get size information after VACUUM
            let final_size_info = Self::get_database_size_info_sync(&conn)
                .map_err(|e| BufferError::PersistenceError {
                    operation: "get_size_after_full_vacuum".to_string(),
                    database_path: "unknown".to_string(),
                    recoverable: true,
                    source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
                })?;
            
            let space_reclaimed = size_info.database_size_bytes.saturating_sub(final_size_info.database_size_bytes);
            let space_reclaimed_mb = space_reclaimed as f64 / (1024.0 * 1024.0);
            
            info!("✅ Full VACUUM completed in {:.2}s: reclaimed {:.2}MB ({:.2}MB -> {:.2}MB)", 
                  vacuum_duration.as_secs_f64(),
                  space_reclaimed_mb,
                  size_info.database_size_mb(),
                  final_size_info.database_size_mb());
            
            // Update metadata
            let metadata_query = "INSERT OR REPLACE INTO buffer_metadata (key, value) VALUES ('last_full_vacuum', strftime('%s', 'now'))";
            let _ = conn.execute(metadata_query, []);
            
            Ok(true)
        }).await
        .map_err(|e| BufferError::PersistenceError {
            operation: "full_vacuum_task".to_string(),
            database_path: "unknown".to_string(),
            recoverable: true,
            source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
        })??;
        
        Ok(vacuum_performed)
    }
    
    /// Analyze database and provide optimization recommendations
    #[cfg(feature = "persistent-storage")]
    pub async fn analyze_database_optimization(&self) -> Result<DatabaseOptimizationReport, BufferError> {
        let db = self.db_connection.clone();
        
        tokio::task::spawn_blocking(move || {
            let conn = db.blocking_lock();
            
            // Run ANALYZE to update statistics
            conn.execute("ANALYZE", [])
                .map_err(|e| BufferError::PersistenceError {
                    operation: "analyze_database".to_string(),
                    database_path: "unknown".to_string(),
                    recoverable: true,
                    source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
                })?;
            
            // Get comprehensive database information
            let size_info = Self::get_database_size_info_sync(&conn)
                .map_err(|e| BufferError::PersistenceError {
                    operation: "get_size_for_optimization".to_string(),
                    database_path: "unknown".to_string(),
                    recoverable: true,
                    source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
                })?;
            
            // Calculate metrics
            let fragmentation_ratio = if size_info.page_count > 0 {
                size_info.freelist_count as f64 / size_info.page_count as f64
            } else {
                0.0
            };
            
            // Count total events
            let total_events: i64 = conn.query_row("SELECT COUNT(*) FROM events", [], |row| row.get(0))
                .unwrap_or(0);
            
            // Get oldest event age
            let oldest_event_age: Option<i64> = conn.query_row(
                "SELECT strftime('%s', 'now') - MIN(created_at) FROM events",
                [],
                |row| row.get(0)
            ).ok();
            
            // Calculate average event size
            let avg_event_size: f64 = if total_events > 0 {
                conn.query_row("SELECT AVG(size_bytes) FROM events WHERE size_bytes > 0", [], |row| {
                    row.get::<_, Option<f64>>(0).map(|v| v.unwrap_or(1024.0))
                }).unwrap_or(1024.0)
            } else {
                0.0
            };
            
            // Generate recommendations
            let mut recommendations = Vec::new();
            
            if fragmentation_ratio > 0.20 {
                recommendations.push("Consider running VACUUM - high fragmentation detected".to_string());
            } else if fragmentation_ratio > 0.10 {
                recommendations.push("Monitor fragmentation - approaching high levels".to_string());
            }
            
            if size_info.database_size_mb() > 500.0 && total_events > 100000 {
                recommendations.push("Consider implementing data archival for older events".to_string());
            }
            
            if avg_event_size > 5000.0 {
                recommendations.push("Large average event size - consider event compression".to_string());
            }
            
            if let Some(age_seconds) = oldest_event_age {
                let age_days = age_seconds / (24 * 3600);
                if age_days > 90 {
                    recommendations.push(format!("Oldest events are {} days old - consider retention cleanup", age_days));
                }
            }
            
            if recommendations.is_empty() {
                recommendations.push("Database is well optimized - no immediate action needed".to_string());
            }
            
            Ok(DatabaseOptimizationReport {
                database_size_info: size_info,
                total_events: total_events as u64,
                fragmentation_ratio,
                avg_event_size_bytes: avg_event_size,
                oldest_event_age_seconds: oldest_event_age.map(|age| age as u64),
                recommendations,
                analysis_timestamp: SystemTime::now(),
            })
        }).await
        .map_err(|e| BufferError::PersistenceError {
            operation: "optimization_analysis_task".to_string(),
            database_path: "unknown".to_string(),
            recoverable: true,
            source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
        })?
    }
    
    /// Get current cleanup statistics
    #[cfg(feature = "persistent-storage")]
    pub async fn get_cleanup_stats(&self) -> Result<CleanupStats, BufferError> {
        let db = self.db_connection.clone();
        
        let stats = tokio::task::spawn_blocking(move || {
            let conn = db.blocking_lock();
            
            // Get total event count
            let total_events: i64 = conn.query_row(
                "SELECT COUNT(*) FROM events",
                [],
                |row| row.get(0)
            )?;
            
            // Get oldest event age
            let oldest_event_age: Option<i64> = conn.query_row(
                "SELECT strftime('%s', 'now') - MIN(created_at) FROM events",
                [],
                |row| row.get(0)
            ).ok();
            
            // Get database size info
            let size_info = Self::get_database_size_info_sync(&conn)?;
            
            Ok::<CleanupStats, rusqlite::Error>(CleanupStats {
                total_events: total_events as u64,
                oldest_event_age_seconds: oldest_event_age.map(|age| age as u64),
                database_size_info: size_info,
            })
        }).await
        .map_err(|e| BufferError::PersistenceError {
            operation: "get_cleanup_stats".to_string(),
            database_path: "unknown".to_string(),
            recoverable: true,
            source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
        })?
        .map_err(|e| BufferError::PersistenceError {
            operation: "get_cleanup_stats".to_string(),
            database_path: "unknown".to_string(),
            recoverable: true,
            source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
        })?;
        
        Ok(stats)
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

/// Database optimization report with analysis and recommendations
#[derive(Debug, Clone, serde::Serialize)]
pub struct DatabaseOptimizationReport {
    pub database_size_info: DatabaseSizeInfo,
    pub total_events: u64,
    pub fragmentation_ratio: f64,
    pub avg_event_size_bytes: f64,
    pub oldest_event_age_seconds: Option<u64>,
    pub recommendations: Vec<String>,
    pub analysis_timestamp: SystemTime,
}

impl DatabaseOptimizationReport {
    pub fn fragmentation_percentage(&self) -> f64 {
        self.fragmentation_ratio * 100.0
    }
    
    pub fn is_fragmented(&self) -> bool {
        self.fragmentation_ratio > 0.15
    }
    
    pub fn is_heavily_fragmented(&self) -> bool {
        self.fragmentation_ratio > 0.25
    }
    
    pub fn avg_event_size_kb(&self) -> f64 {
        self.avg_event_size_bytes / 1024.0
    }
    
    pub fn oldest_event_age_days(&self) -> Option<f64> {
        self.oldest_event_age_seconds.map(|seconds| seconds as f64 / (24.0 * 3600.0))
    }
    
    pub fn optimization_priority(&self) -> OptimizationPriority {
        if self.is_heavily_fragmented() || self.database_size_info.database_size_mb() > 1000.0 {
            OptimizationPriority::High
        } else if self.is_fragmented() || self.total_events > 100000 {
            OptimizationPriority::Medium
        } else {
            OptimizationPriority::Low
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
pub enum OptimizationPriority {
    Low,
    Medium,
    High,
}

/// Cleanup statistics for monitoring and debugging
#[derive(Debug, Clone, serde::Serialize)]
pub struct CleanupStats {
    pub total_events: u64,
    pub oldest_event_age_seconds: Option<u64>,
    pub database_size_info: DatabaseSizeInfo,
}

impl CleanupStats {
    pub fn oldest_event_age_hours(&self) -> Option<f64> {
        self.oldest_event_age_seconds.map(|seconds| seconds as f64 / 3600.0)
    }
    
    pub fn cleanup_urgency(&self, max_size_mb: Option<usize>, trigger_percent: f64) -> CleanupUrgency {
        if let Some(max_size) = max_size_mb {
            let current_size_mb = self.database_size_info.database_size_mb();
            let trigger_size_mb = max_size as f64 * trigger_percent / 100.0;
            
            if current_size_mb >= max_size as f64 {
                CleanupUrgency::Critical
            } else if current_size_mb >= trigger_size_mb {
                CleanupUrgency::High
            } else if current_size_mb >= trigger_size_mb * 0.8 {
                CleanupUrgency::Medium
            } else {
                CleanupUrgency::Low
            }
        } else {
            CleanupUrgency::None
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
pub enum CleanupUrgency {
    None,     // No size limit configured
    Low,      // Well below threshold
    Medium,   // Approaching threshold
    High,     // At or above threshold
    Critical, // At or above maximum size
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
            
            // Add required cleanup fields for test
            wal_mode: false,
            synchronous_mode: crate::config::SqliteSynchronousMode::Normal,
            journal_size_limit_mb: 64,
            checkpoint_interval_sec: 300,
            cache_size_kb: 8192,
            vacuum_on_startup: false,
            auto_vacuum: crate::config::SqliteAutoVacuum::None,
            temp_store: crate::config::SqliteTempStore::Memory,
            mmap_size_mb: 0,
            max_page_count: None,
            secure_delete: false,
            max_database_size_mb: None,
            cleanup_trigger_percent: 80.0,
            cleanup_target_percent: 60.0,
            cleanup_strategy: crate::config::CleanupStrategy::Fifo,
            cleanup_interval_sec: 300,
            min_retention_hours: 1,
            max_events_per_cleanup: 1000,
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
            
            // Add required cleanup fields for test
            wal_mode: false,
            synchronous_mode: crate::config::SqliteSynchronousMode::Normal,
            journal_size_limit_mb: 64,
            checkpoint_interval_sec: 300,
            cache_size_kb: 8192,
            vacuum_on_startup: false,
            auto_vacuum: crate::config::SqliteAutoVacuum::None,
            temp_store: crate::config::SqliteTempStore::Memory,
            mmap_size_mb: 0,
            max_page_count: None,
            secure_delete: false,
            max_database_size_mb: None,
            cleanup_trigger_percent: 80.0,
            cleanup_target_percent: 60.0,
            cleanup_strategy: crate::config::CleanupStrategy::Fifo,
            cleanup_interval_sec: 300,
            min_retention_hours: 1,
            max_events_per_cleanup: 1000,
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