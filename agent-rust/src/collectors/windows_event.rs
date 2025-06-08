// Windows Event Log collector implementation

#[cfg(windows)]
use super::base::{Collector, CollectorError, CollectorStats};
#[cfg(windows)]
use crate::config::WindowsEventCollectorConfig;
#[cfg(windows)]
use crate::transport::LogEvent;

#[cfg(windows)]
use async_trait::async_trait;
#[cfg(windows)]
use std::ffi::OsStr;
#[cfg(windows)]
use std::os::windows::ffi::OsStrExt;
#[cfg(windows)]
use std::ptr;
#[cfg(windows)]
use std::sync::atomic::{AtomicBool, Ordering};
#[cfg(windows)]
use std::sync::Arc;
#[cfg(windows)]
use std::time::{Instant, SystemTime, UNIX_EPOCH};
#[cfg(windows)]
use tokio::sync::{mpsc, RwLock};
#[cfg(windows)]
use tokio::task;
#[cfg(windows)]
use tracing::{debug, error, info, instrument, warn};
#[cfg(windows)]
use windows::core::PWSTR;
#[cfg(windows)]
use windows::Win32::Foundation::{HANDLE, INVALID_HANDLE_VALUE};
#[cfg(windows)]
use windows::Win32::System::EventLog::*;

#[cfg(windows)]
pub struct WindowsEventCollector {
    config: WindowsEventCollectorConfig,
    running: Arc<AtomicBool>,
    stats: Arc<RwLock<CollectorStats>>,
    shutdown_tx: Option<mpsc::Sender<()>>,
    start_time: Instant,
}

#[cfg(windows)]
impl WindowsEventCollector {
    pub async fn new(config: WindowsEventCollectorConfig) -> Result<Self, CollectorError> {
        let stats = Arc::new(RwLock::new(CollectorStats {
            name: "windows_event".to_string(),
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
    async fn collect_events(&self, event_tx: mpsc::Sender<LogEvent>) -> Result<(), CollectorError> {
        let stats = Arc::clone(&self.stats);
        let running = Arc::clone(&self.running);

        for channel in &self.config.channels {
            if !running.load(Ordering::Relaxed) {
                break;
            }

            info!("📊 Collecting events from Windows Event Log channel: {}", channel);

            let channel_events = self.read_event_log_channel(channel).await?;
            
            for event in channel_events {
                if !running.load(Ordering::Relaxed) {
                    break;
                }

                if let Err(e) = event_tx.send(event).await {
                    warn!("Failed to send Windows event: {}", e);
                    let mut stats = stats.write().await;
                    stats.events_failed += 1;
                } else {
                    let mut stats = stats.write().await;
                    stats.events_collected += 1;
                }
            }
        }

        Ok(())
    }

    async fn read_event_log_channel(&self, channel: &str) -> Result<Vec<LogEvent>, CollectorError> {
        let channel_name = Self::string_to_pwstr(channel);
        let mut events = Vec::new();

        // This runs in a blocking task since Windows APIs are synchronous
        let channel_clone = channel.to_string();
        let batch_size = self.config.batch_size;

        let channel_events = task::spawn_blocking(move || -> Result<Vec<LogEvent>, CollectorError> {
            let mut events = Vec::new();
            
            unsafe {
                // Open event log
                let h_event_log = EvtOpenLog(
                    HANDLE::default(),
                    PWSTR(channel_name.as_ptr() as *mut u16),
                    EvtOpenChannelPath,
                );

                if h_event_log == INVALID_HANDLE_VALUE {
                    return Err(CollectorError::WindowsApi(
                        format!("Failed to open event log channel: {}", channel_clone)
                    ));
                }

                // Query events
                let h_query = EvtQuery(
                    HANDLE::default(),
                    PWSTR(channel_name.as_ptr() as *mut u16),
                    PWSTR::null(), // No XPath query (get all events)
                    EvtQueryChannelPath | EvtQueryReverseDirection,
                );

                if h_query == INVALID_HANDLE_VALUE {
                    EvtClose(h_event_log);
                    return Err(CollectorError::WindowsApi(
                        "Failed to query event log".to_string()
                    ));
                }

                // Read events in batches
                let mut event_handles = vec![HANDLE::default(); batch_size];
                let mut returned = 0u32;

                let success = EvtNext(
                    h_query,
                    event_handles.len() as u32,
                    event_handles.as_mut_ptr(),
                    0, // No timeout
                    0,
                    &mut returned,
                );

                if success.as_bool() && returned > 0 {
                    for i in 0..returned as usize {
                        if let Ok(event) = Self::parse_event_handle(event_handles[i], &channel_clone) {
                            events.push(event);
                        }
                        EvtClose(event_handles[i]);
                    }
                }

                EvtClose(h_query);
                EvtClose(h_event_log);
            }

            Ok(events)
        }).await.map_err(|e| CollectorError::System(format!("Task join error: {}", e)))??;

        Ok(channel_events)
    }

    fn parse_event_handle(h_event: HANDLE, channel: &str) -> Result<LogEvent, CollectorError> {
        unsafe {
            // Get event as XML
            let mut buffer_size = 0u32;
            let mut buffer_used = 0u32;

            // First call to get required buffer size
            EvtRender(
                HANDLE::default(),
                h_event,
                EvtRenderEventXml,
                buffer_size,
                ptr::null_mut(),
                &mut buffer_used,
                &mut 0u32,
            );

            if buffer_used == 0 {
                return Err(CollectorError::WindowsApi("Failed to get event size".to_string()));
            }

            // Allocate buffer and get the actual event
            let mut buffer = vec![0u16; (buffer_used / 2) as usize];
            let success = EvtRender(
                HANDLE::default(),
                h_event,
                EvtRenderEventXml,
                buffer_used,
                buffer.as_mut_ptr() as *mut _,
                &mut buffer_used,
                &mut 0u32,
            );

            if !success.as_bool() {
                return Err(CollectorError::WindowsApi("Failed to render event".to_string()));
            }

            // Convert UTF-16 to String
            let xml_str = String::from_utf16_lossy(&buffer);
            let xml_str = xml_str.trim_end_matches('\0');

            // Parse basic event information
            let event_id = Self::extract_xml_value(&xml_str, "EventID").unwrap_or_else(|| "0".to_string());
            let level_value = Self::extract_xml_value(&xml_str, "Level").unwrap_or_else(|| "4".to_string());
            let task_value = Self::extract_xml_value(&xml_str, "Task").unwrap_or_else(|| "0".to_string());
            let provider_name = Self::extract_xml_value(&xml_str, "Provider")
                .and_then(|s| Self::extract_attribute(&s, "Name"))
                .unwrap_or_else(|| "Unknown".to_string());

            let level = match level_value.parse::<u8>() {
                Ok(1) => "critical",
                Ok(2) => "error", 
                Ok(3) => "warning",
                Ok(4) => "info",
                Ok(5) => "debug",
                _ => "info",
            }.to_string();

            let timestamp = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs();

            Ok(LogEvent {
                timestamp,
                level,
                message: format!("Windows Event ID {} from {}", event_id, provider_name),
                source: format!("windows_event://{}", channel),
                metadata: serde_json::json!({
                    "collector": "windows_event",
                    "channel": channel,
                    "event_id": event_id,
                    "provider_name": provider_name,
                    "task": task_value,
                    "raw_xml": xml_str,
                }),
            })
        }
    }

    fn extract_xml_value(xml: &str, tag: &str) -> Option<String> {
        let start_tag = format!("<{}>", tag);
        let end_tag = format!("</{}>", tag);
        
        if let Some(start) = xml.find(&start_tag) {
            let start_pos = start + start_tag.len();
            if let Some(end) = xml[start_pos..].find(&end_tag) {
                return Some(xml[start_pos..start_pos + end].to_string());
            }
        }
        None
    }

    fn extract_attribute(element: &str, attr: &str) -> Option<String> {
        let attr_pattern = format!("{}=\"", attr);
        if let Some(start) = element.find(&attr_pattern) {
            let start_pos = start + attr_pattern.len();
            if let Some(end) = element[start_pos..].find('"') {
                return Some(element[start_pos..start_pos + end].to_string());
            }
        }
        None
    }

    fn string_to_pwstr(s: &str) -> Vec<u16> {
        OsStr::new(s).encode_wide().chain(std::iter::once(0)).collect()
    }
}

#[cfg(windows)]
#[async_trait]
impl Collector for WindowsEventCollector {
    fn name(&self) -> &str {
        "windows_event"
    }

    #[instrument(skip(self, event_tx))]
    async fn start(&mut self, event_tx: mpsc::Sender<LogEvent>) -> Result<(), CollectorError> {
        if self.running.load(Ordering::Relaxed) {
            return Err(CollectorError::AlreadyRunning);
        }

        self.running.store(true, Ordering::Relaxed);
        self.start_time = Instant::now();

        let (shutdown_tx, mut shutdown_rx) = mpsc::channel::<()>(1);
        self.shutdown_tx = Some(shutdown_tx);

        let collector_clone = WindowsEventCollector {
            config: self.config.clone(),
            running: Arc::clone(&self.running),
            stats: Arc::clone(&self.stats),
            shutdown_tx: None,
            start_time: self.start_time,
        };

        // Run collector in background task
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(30));

            loop {
                tokio::select! {
                    _ = interval.tick() => {
                        if let Err(e) = collector_clone.collect_events(event_tx.clone()).await {
                            error!("Windows event collection error: {}", e);
                        }
                    }
                    _ = shutdown_rx.recv() => {
                        info!("Windows event collector shutdown signal received");
                        break;
                    }
                }
            }
        });

        // Update stats
        {
            let mut stats = self.stats.write().await;
            stats.is_running = true;
        }

        info!("✅ Windows Event collector started for channels: {:?}", self.config.channels);
        Ok(())
    }

    async fn stop(&mut self) -> Result<(), CollectorError> {
        if !self.running.load(Ordering::Relaxed) {
            return Err(CollectorError::NotRunning);
        }

        info!("🛑 Stopping Windows Event collector");

        self.running.store(false, Ordering::Relaxed);

        if let Some(shutdown_tx) = self.shutdown_tx.take() {
            let _ = shutdown_tx.send(()).await;
        }

        // Update stats
        {
            let mut stats = self.stats.write().await;
            stats.is_running = false;
        }

        info!("✅ Windows Event collector stopped");
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

// Non-Windows stub implementation
#[cfg(not(windows))]
pub struct WindowsEventCollector;

#[cfg(not(windows))]
impl WindowsEventCollector {
    pub async fn new(_config: crate::config::WindowsEventCollectorConfig) -> Result<Self, CollectorError> {
        Err(CollectorError::System("Windows Event collector not available on this platform".to_string()))
    }
}

#[cfg(not(windows))]
#[async_trait]
impl Collector for WindowsEventCollector {
    fn name(&self) -> &str {
        "windows_event"
    }

    async fn start(&mut self, _event_tx: mpsc::Sender<LogEvent>) -> Result<(), CollectorError> {
        Err(CollectorError::System("Windows Event collector not available on this platform".to_string()))
    }

    async fn stop(&mut self) -> Result<(), CollectorError> {
        Ok(())
    }

    fn is_running(&self) -> bool {
        false
    }

    async fn get_stats(&self) -> CollectorStats {
        CollectorStats::default()
    }
}