// File monitoring collector with pattern matching and recursive directory support

use crate::collectors::{Collector, RawLogEvent};
use crate::config::FileMonitorConfig;
use crate::errors::CollectorError;
use async_trait::async_trait;
use notify::{Watcher, RecommendedWatcher, RecursiveMode, Event, EventKind};
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use tokio::fs::File;
use tokio::io::{AsyncBufReadExt, AsyncSeekExt, BufReader, SeekFrom};
use tokio::sync::mpsc;
use tracing::{info, error, debug, warn};

pub struct FileMonitorCollector {
    config: FileMonitorConfig,
    event_sender: mpsc::Sender<RawLogEvent>,
    watcher: Option<RecommendedWatcher>,
    file_positions: HashMap<PathBuf, u64>,
    monitored_files: HashSet<PathBuf>,
    running: bool,
}

impl FileMonitorCollector {
    pub fn new(
        config: FileMonitorConfig,
        event_sender: mpsc::Sender<RawLogEvent>,
    ) -> Self {
        Self {
            config,
            event_sender,
            watcher: None,
            file_positions: HashMap::new(),
            monitored_files: HashSet::new(),
            running: false,
        }
    }
    
    async fn discover_files(&mut self) -> Result<Vec<PathBuf>, CollectorError> {
        let mut discovered_files = Vec::new();
        
        for path_pattern in &self.config.paths {
            if let Ok(expanded_paths) = ::glob::glob(path_pattern) {
                for path in expanded_paths.flatten() {
                    if path.is_file() && self.matches_patterns(&path) {
                        discovered_files.push(path);
                    } else if path.is_dir() && self.config.recursive {
                        self.discover_directory_files(&path, &mut discovered_files).await?;
                    }
                }
            }
        }
        
        Ok(discovered_files)
    }
    
    async fn discover_directory_files(
        &self,
        dir: &Path,
        discovered_files: &mut Vec<PathBuf>,
    ) -> Result<(), CollectorError> {
        let mut entries = tokio::fs::read_dir(dir).await
            .map_err(|e| CollectorError::FileSystem(format!("Failed to read directory {}: {}", dir.display(), e)))?;
            
        while let Some(entry) = entries.next_entry().await
            .map_err(|e| CollectorError::FileSystem(format!("Failed to read directory entry: {}", e)))? 
        {
            let path = entry.path();
            
            if path.is_file() && self.matches_patterns(&path) {
                discovered_files.push(path);
            } else if path.is_dir() && self.config.recursive {
                Box::pin(self.discover_directory_files(&path, discovered_files)).await?;
            }
        }
        
        Ok(())
    }
    
    fn matches_patterns(&self, path: &Path) -> bool {
        if self.config.patterns.is_empty() {
            return true;
        }
        
        let file_name = path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("");
            
        for pattern in &self.config.patterns {
            if let Ok(pattern_matcher) = ::glob::Pattern::new(pattern) {
                if pattern_matcher.matches(file_name) {
                    return true;
                }
            }
        }
        
        false
    }
    
    async fn read_file_tail(&mut self, file_path: &Path) -> Result<Vec<String>, CollectorError> {
        let mut file = File::open(file_path).await
            .map_err(|e| CollectorError::FileSystem(format!("Failed to open file {}: {}", file_path.display(), e)))?;
            
        let current_position = self.file_positions.get(file_path).copied().unwrap_or(0);
        
        // Get current file size
        let metadata = file.metadata().await
            .map_err(|e| CollectorError::FileSystem(format!("Failed to get file metadata: {}", e)))?;
        let file_size = metadata.len();
        
        // If file was truncated, start from beginning
        let start_position = if current_position > file_size {
            0
        } else {
            current_position
        };
        
        // Seek to our last known position
        file.seek(SeekFrom::Start(start_position)).await
            .map_err(|e| CollectorError::FileSystem(format!("Failed to seek in file: {}", e)))?;
            
        let mut reader = BufReader::new(file);
        let mut lines = Vec::new();
        let mut line = String::new();
        let mut bytes_read = start_position;
        
        loop {
            line.clear();
            match reader.read_line(&mut line).await {
                Ok(0) => break, // EOF
                Ok(n) => {
                    bytes_read += n as u64;
                    if !line.trim().is_empty() {
                        lines.push(line.trim().to_string());
                    }
                }
                Err(e) => {
                    return Err(CollectorError::FileSystem(format!("Failed to read line: {}", e)));
                }
            }
        }
        
        // Update our position
        self.file_positions.insert(file_path.to_path_buf(), bytes_read);
        
        Ok(lines)
    }
    
    async fn setup_file_watcher(&mut self) -> Result<(), CollectorError> {
        use std::sync::mpsc as std_mpsc;
        
        let (tx, rx) = std_mpsc::channel();
        let event_sender = self.event_sender.clone();
        
        let mut watcher: RecommendedWatcher = Watcher::new(
            move |res: Result<Event, notify::Error>| {
                if let Ok(event) = res {
                    let _ = tx.send(event);
                }
            },
            notify::Config::default(),
        ).map_err(|e| CollectorError::InitializationFailed(format!("Failed to create file watcher: {}", e)))?;
        
        // Watch all monitored files and their directories
        for file_path in &self.monitored_files.clone() {
            if let Some(parent) = file_path.parent() {
                let mode = if self.config.recursive {
                    RecursiveMode::Recursive
                } else {
                    RecursiveMode::NonRecursive
                };
                
                // Ignore watch errors for individual files (they might not exist yet)
                let _ = watcher.watch(parent, mode);
            }
        }
        
        self.watcher = Some(watcher);
        
        // Spawn task to handle file system events
        let mut monitored_files = self.monitored_files.clone();
        tokio::spawn(async move {
            while let Ok(event) = rx.recv() {
                if let EventKind::Modify(_) = event.kind {
                    for path in event.paths {
                        if monitored_files.contains(&path) {
                            debug!("📁 File modified: {}", path.display());
                            // Trigger file read - this would need to communicate back to the collector
                            // For now, we'll just log it
                        }
                    }
                }
            }
        });
        
        Ok(())
    }
}

#[async_trait]
impl Collector for FileMonitorCollector {
    async fn start(&mut self) -> Result<(), CollectorError> {
        if !self.config.enabled {
            info!("File monitor collector is disabled");
            return Ok(());
        }
        
        info!("🚀 Starting file monitor collector");
        
        // Discover initial files
        let discovered_files = self.discover_files().await?;
        self.monitored_files = discovered_files.into_iter().collect();
        
        info!("📁 Monitoring {} files", self.monitored_files.len());
        for file in &self.monitored_files {
            debug!("📄 Monitoring: {}", file.display());
        }
        
        // Setup file watcher
        self.setup_file_watcher().await?;
        
        // Read initial content from all files
        for file_path in self.monitored_files.clone() {
            match self.read_file_tail(&file_path).await {
                Ok(lines) => {
                    for line in lines {
                        let event = RawLogEvent {
                            timestamp: chrono::Utc::now(),
                            source: "file_monitor".to_string(),
                            raw_data: line,
                            metadata: HashMap::from([
                                ("file_path".to_string(), file_path.display().to_string()),
                            ]),
                        };
                        
                        if let Err(e) = self.event_sender.send(event).await {
                            error!("Failed to send file monitor event: {}", e);
                        }
                    }
                }
                Err(e) => {
                    warn!("Failed to read file {}: {}", file_path.display(), e);
                }
            }
        }
        
        self.running = true;
        Ok(())
    }
    
    async fn stop(&mut self) -> Result<(), CollectorError> {
        info!("🛑 Stopping file monitor collector");
        self.watcher = None;
        self.running = false;
        Ok(())
    }
    
    async fn collect(&mut self) -> Result<Vec<RawLogEvent>, CollectorError> {
        // For file monitor, collection happens via file system events
        // This method could be used for periodic polling if needed
        Ok(Vec::new())
    }
    
    fn name(&self) -> &str {
        "file_monitor"
    }
    
    fn is_running(&self) -> bool {
        self.running
    }
}