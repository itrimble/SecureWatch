// File monitor collector implementation using Tokio and notify

use super::base::{Collector, CollectorError, CollectorStats};
use crate::config::FileMonitorConfig;
use crate::transport::LogEvent;

use async_trait::async_trait;
use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Instant, SystemTime, UNIX_EPOCH};
use tokio::fs;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::sync::{mpsc, RwLock};
use tracing::{debug, error, info, instrument, warn};

pub struct FileMonitorCollector {
    config: FileMonitorConfig,
    running: Arc<AtomicBool>,
    stats: Arc<RwLock<CollectorStats>>,
    shutdown_tx: Option<mpsc::Sender<()>>,
    start_time: Instant,
}

impl FileMonitorCollector {
    pub async fn new(config: FileMonitorConfig) -> Result<Self, CollectorError> {
        let stats = Arc::new(RwLock::new(CollectorStats {
            name: "file_monitor".to_string(),
            ..Default::default()
        }));

        Ok(Self {
            config,
            running: Arc::new(AtomicBool::new(false)),
            stats,
            shutdown_tx: None,
            start_time: Instant::now(),
        })
    }

    #[instrument(skip(self, event_tx))]
    async fn monitor_files(&self, event_tx: mpsc::Sender<LogEvent>) -> Result<(), CollectorError> {
        let (file_tx, mut file_rx) = mpsc::channel::<Event>(1000);
        let stats = Arc::clone(&self.stats);
        let running = Arc::clone(&self.running);

        // Set up file watcher
        let mut watcher = RecommendedWatcher::new(
            move |res: Result<Event, notify::Error>| {
                match res {
                    Ok(event) => {
                        if let Err(e) = file_tx.blocking_send(event) {
                            warn!("Failed to send file event: {}", e);
                        }
                    }
                    Err(e) => warn!("File watch error: {}", e),
                }
            },
            Config::default(),
        ).map_err(|e| CollectorError::System(format!("Failed to create file watcher: {}", e)))?;

        // Add paths to watcher
        for path_str in &self.config.paths {
            let path = Path::new(path_str);
            if path.exists() {
                let mode = if self.config.recursive {
                    RecursiveMode::Recursive
                } else {
                    RecursiveMode::NonRecursive
                };

                if let Err(e) = watcher.watch(path, mode) {
                    warn!("Failed to watch path {}: {}", path_str, e);
                } else {
                    info!("👀 Watching path: {} (recursive: {})", path_str, self.config.recursive);
                }
            } else {
                warn!("Path does not exist: {}", path_str);
            }
        }

        // Process file events
        while running.load(Ordering::Relaxed) {
            tokio::select! {
                Some(file_event) = file_rx.recv() => {
                    if let Err(e) = self.process_file_event(file_event, &event_tx, &stats).await {
                        warn!("Failed to process file event: {}", e);
                    }
                }
                _ = tokio::time::sleep(tokio::time::Duration::from_millis(100)) => {
                    // Continue loop to check running flag
                }
            }
        }

        info!("📁 File monitor stopped");
        Ok(())
    }

    async fn process_file_event(
        &self,
        file_event: Event,
        event_tx: &mpsc::Sender<LogEvent>,
        stats: &Arc<RwLock<CollectorStats>>,
    ) -> Result<(), CollectorError> {
        // Filter by event kind
        match file_event.kind {
            EventKind::Modify(_) | EventKind::Create(_) => {
                // Process modified or created files
                for path in &file_event.paths {
                    if self.should_process_file(path) {
                        self.process_file_change(path, event_tx, stats).await?;
                    }
                }
            }
            _ => {
                // Ignore other event types (delete, access, etc.)
                debug!("Ignoring file event: {:?}", file_event.kind);
            }
        }

        Ok(())
    }

    fn should_process_file(&self, path: &Path) -> bool {
        // Check if file matches any of the configured patterns
        if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
            for pattern in &self.config.patterns {
                if self.matches_pattern(file_name, pattern) {
                    return true;
                }
            }
        }
        false
    }

    fn matches_pattern(&self, file_name: &str, pattern: &str) -> bool {
        // Simple glob pattern matching
        if pattern == "*" {
            return true;
        }
        
        if pattern.starts_with("*.") {
            let extension = &pattern[2..];
            return file_name.ends_with(&format!(".{}", extension));
        }
        
        if pattern.contains('*') {
            // More complex pattern matching could be implemented here
            // For now, just do exact match if no simple wildcard
            return file_name == pattern.replace('*', "");
        }
        
        file_name == pattern
    }

    async fn process_file_change(
        &self,
        path: &Path,
        event_tx: &mpsc::Sender<LogEvent>,
        stats: &Arc<RwLock<CollectorStats>>,
    ) -> Result<(), CollectorError> {
        debug!("Processing file change: {:?}", path);

        // Read new lines from the file
        match self.read_new_lines(path).await {
            Ok(lines) => {
                for line in lines {
                    let event = self.create_log_event(path, &line).await;
                    
                    if let Err(e) = event_tx.send(event).await {
                        warn!("Failed to send file monitor event: {}", e);
                        let mut stats = stats.write().await;
                        stats.events_failed += 1;
                    } else {
                        let mut stats = stats.write().await;
                        stats.events_collected += 1;
                    }
                }
            }
            Err(e) => {
                warn!("Failed to read file {:?}: {}", path, e);
                let mut stats = stats.write().await;
                stats.events_failed += 1;
                stats.last_error = Some(e.to_string());
            }
        }

        Ok(())
    }

    async fn read_new_lines(&self, path: &Path) -> Result<Vec<String>, std::io::Error> {
        let file = fs::File::open(path).await?;
        let reader = BufReader::new(file);
        let mut lines = reader.lines();
        let mut result = Vec::new();

        // For simplicity, read all lines. In a production implementation,
        // you would want to track file position and only read new lines.
        while let Some(line) = lines.next_line().await? {
            if !line.trim().is_empty() {
                result.push(line);
            }
        }

        Ok(result)
    }

    async fn create_log_event(&self, path: &Path, line: &str) -> LogEvent {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        // Determine log level from content (basic heuristic)
        let level = if line.to_lowercase().contains("error") {
            "error"
        } else if line.to_lowercase().contains("warn") {
            "warning"
        } else if line.to_lowercase().contains("debug") {
            "debug"
        } else {
            "info"
        }.to_string();

        LogEvent {
            timestamp,
            level,
            message: line.to_string(),
            source: format!("file://{}", path.display()),
            metadata: serde_json::json!({
                "collector": "file_monitor",
                "file_path": path.to_string_lossy(),
                "file_name": path.file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("unknown"),
            }),
        }
    }
}

#[async_trait]
impl Collector for FileMonitorCollector {
    fn name(&self) -> &str {
        "file_monitor"
    }

    #[instrument(skip(self, event_tx))]
    async fn start(&mut self, event_tx: mpsc::Sender<LogEvent>) -> Result<(), CollectorError> {
        if self.running.load(Ordering::Relaxed) {
            return Err(CollectorError::AlreadyRunning);
        }

        if self.config.paths.is_empty() {
            return Err(CollectorError::Config("No paths configured for file monitoring".to_string()));
        }

        self.running.store(true, Ordering::Relaxed);
        self.start_time = Instant::now();

        let (shutdown_tx, mut shutdown_rx) = mpsc::channel::<()>(1);
        self.shutdown_tx = Some(shutdown_tx);

        let collector_clone = FileMonitorCollector {
            config: self.config.clone(),
            running: Arc::clone(&self.running),
            stats: Arc::clone(&self.stats),
            shutdown_tx: None,
            start_time: self.start_time,
        };

        // Run file monitor in background task
        tokio::spawn(async move {
            tokio::select! {
                result = collector_clone.monitor_files(event_tx) => {
                    if let Err(e) = result {
                        error!("File monitor error: {}", e);
                    }
                }
                _ = shutdown_rx.recv() => {
                    info!("File monitor shutdown signal received");
                }
            }
        });

        // Update stats
        {
            let mut stats = self.stats.write().await;
            stats.is_running = true;
        }

        info!("✅ File monitor started for {} paths", self.config.paths.len());
        Ok(())
    }

    async fn stop(&mut self) -> Result<(), CollectorError> {
        if !self.running.load(Ordering::Relaxed) {
            return Err(CollectorError::NotRunning);
        }

        info!("🛑 Stopping file monitor");

        self.running.store(false, Ordering::Relaxed);

        if let Some(shutdown_tx) = self.shutdown_tx.take() {
            let _ = shutdown_tx.send(()).await;
        }

        // Update stats
        {
            let mut stats = self.stats.write().await;
            stats.is_running = false;
        }

        info!("✅ File monitor stopped");
        Ok(())
    }

    fn is_running(&self) -> bool {
        self.running.load(Ordering::Relaxed)
    }

    async fn get_stats(&self) -> CollectorStats {
        let mut stats = self.stats.read().await.clone();
        stats.uptime_seconds = self.start_time.elapsed().as_secs();
        stats
    }
}