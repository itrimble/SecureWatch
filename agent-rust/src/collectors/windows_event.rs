// Advanced Windows Event Log collector with XML parsing, bookmark management, and structured data extraction
// Uses modern Windows Event Log APIs (Vista+) for optimal performance and features

#[cfg(windows)]
use crate::collectors::{Collector, RawLogEvent};
#[cfg(windows)]
use crate::config::WindowsEventCollectorConfig;
#[cfg(windows)]
use crate::errors::CollectorError;
#[cfg(windows)]
use async_trait::async_trait;
#[cfg(windows)]
use std::collections::HashMap;
#[cfg(windows)]
use std::ffi::c_void;
#[cfg(windows)]
use std::path::Path;
#[cfg(windows)]
use tokio::sync::mpsc;
#[cfg(windows)]
use tokio::time::{sleep, Duration, interval};
#[cfg(windows)]
use tracing::{info, error, debug, warn};
#[cfg(windows)]
use quick_xml::Reader;
#[cfg(windows)]
use quick_xml::events::Event;
#[cfg(windows)]
use serde::{Deserialize, Serialize};

#[cfg(windows)]
use windows::{
    core::*,
    Win32::Foundation::*,
    Win32::System::EventLog::*,
};

/// Event filter for controlling which events to collect
#[cfg(windows)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventFilter {
    pub event_ids: Option<Vec<u32>>,
    pub levels: Option<Vec<u32>>, // 1=Critical, 2=Error, 3=Warning, 4=Information, 5=Verbose
    pub keywords: Option<Vec<u64>>,
    pub providers: Option<Vec<String>>,
    pub custom_xpath: Option<String>,
}

/// Bookmark for incremental event collection
#[cfg(windows)]
#[derive(Debug, Clone)]
pub struct EventBookmark {
    pub xml_data: String,
    pub last_event_record_id: u64,
    pub last_updated: chrono::DateTime<chrono::Utc>,
}

/// Parsed Windows Event data structure
#[cfg(windows)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowsEventData {
    pub event_id: u32,
    pub event_record_id: u64,
    pub level: u32,
    pub level_name: String,
    pub keywords: u64,
    pub opcode: u32,
    pub task: u32,
    pub provider_name: String,
    pub provider_guid: Option<String>,
    pub channel: String,
    pub computer: String,
    pub security_user_id: Option<String>,
    pub time_created: chrono::DateTime<chrono::Utc>,
    pub event_data: HashMap<String, String>,
    pub user_data: Option<String>,
    pub message: Option<String>,
    pub raw_xml: String,
}

/// Advanced Windows Event Log collector with modern APIs
#[cfg(windows)]
pub struct WindowsEventCollector {
    config: WindowsEventCollectorConfig,
    event_sender: mpsc::Sender<RawLogEvent>,
    query_handles: HashMap<String, isize>,
    bookmarks: HashMap<String, EventBookmark>,
    filters: HashMap<String, EventFilter>,
    running: bool,
    shutdown_sender: Option<tokio::sync::oneshot::Sender<()>>,
    bookmark_persistence_path: String,
    mock_mode: bool, // For testing on non-Windows platforms
}

#[cfg(windows)]
impl WindowsEventCollector {
    pub fn new(
        config: WindowsEventCollectorConfig,
        event_sender: mpsc::Sender<RawLogEvent>,
    ) -> Self {
        let bookmark_path = format!("./{}_bookmarks.json", "windows_event_collector");
        
        Self {
            config,
            event_sender,
            query_handles: HashMap::new(),
            bookmarks: HashMap::new(),
            filters: HashMap::new(),
            running: false,
            shutdown_sender: None,
            bookmark_persistence_path: bookmark_path,
            mock_mode: false,
        }
    }
    
    /// Create a new collector in mock mode for testing on non-Windows platforms
    pub fn new_mock(
        config: WindowsEventCollectorConfig,
        event_sender: mpsc::Sender<RawLogEvent>,
    ) -> Self {
        let mut collector = Self::new(config, event_sender);
        collector.mock_mode = true;
        collector
    }
    
    /// Create an XPath query for event filtering
    fn build_xpath_query(&self, channel: &str, filter: &EventFilter) -> String {
        if let Some(ref custom_xpath) = filter.custom_xpath {
            return custom_xpath.clone();
        }
        
        let mut conditions = Vec::new();
        
        // Filter by event IDs
        if let Some(ref event_ids) = filter.event_ids {
            if !event_ids.is_empty() {
                let id_conditions: Vec<String> = event_ids
                    .iter()
                    .map(|id| format!("EventID={}", id))
                    .collect();
                conditions.push(format!("({})", id_conditions.join(" or ")));
            }
        }
        
        // Filter by levels
        if let Some(ref levels) = filter.levels {
            if !levels.is_empty() {
                let level_conditions: Vec<String> = levels
                    .iter()
                    .map(|level| format!("Level={}", level))
                    .collect();
                conditions.push(format!("({})", level_conditions.join(" or ")));
            }
        }
        
        // Filter by keywords
        if let Some(ref keywords) = filter.keywords {
            if !keywords.is_empty() {
                let keyword_conditions: Vec<String> = keywords
                    .iter()
                    .map(|keyword| format!("Keywords[band(.,{})]", keyword))
                    .collect();
                conditions.push(format!("({})", keyword_conditions.join(" or ")));
            }
        }
        
        // Build final query
        if conditions.is_empty() {
            "*".to_string()
        } else {
            format!("*[System[{}]]", conditions.join(" and "))
        }
    }
    
    /// Create an event query handle for a channel
    fn create_event_query(&mut self, channel: &str) -> Result<isize, CollectorError> {
        if self.mock_mode {
            // Return a mock handle for testing
            return Ok(12345);
        }
        
        unsafe {
            let channel_wide: Vec<u16> = channel.encode_utf16().chain(std::iter::once(0)).collect();
            let channel_pcwstr = PCWSTR(channel_wide.as_ptr());
            
            // Get filter for this channel or use default
            let filter = self.filters.get(channel).cloned().unwrap_or_else(|| EventFilter {
                event_ids: None,
                levels: None,
                keywords: None,
                providers: None,
                custom_xpath: None,
            });
            
            let xpath_query = self.build_xpath_query(channel, &filter);
            let query_wide: Vec<u16> = xpath_query.encode_utf16().chain(std::iter::once(0)).collect();
            let query_pcwstr = PCWSTR(query_wide.as_ptr());
            
            debug!("📋 Creating event query for channel '{}' with XPath: {}", channel, xpath_query);
            
            let query_handle = EvtQuery(
                None,
                channel_pcwstr,
                query_pcwstr,
                EvtQueryChannelPath.0
            );
            
            if query_handle.is_err() {
                return Err(CollectorError::WindowsEventError {
                    operation: "EvtQuery".to_string(),
                    channel: channel.to_string(),
                    event_id: None,
                    error_code: None,
                });
            }
            
            let handle = query_handle.unwrap().0;
            
            // Seek to bookmark if available
            if let Some(bookmark) = self.bookmarks.get(channel) {
                self.seek_to_bookmark(handle, bookmark)?;
            }
            
            Ok(handle)
        }
    }
    
    /// Create or update bookmark from saved XML
    fn create_bookmark_from_xml(&self, xml_data: &str) -> Result<isize, CollectorError> {
        if self.mock_mode {
            return Ok(54321);
        }
        
        unsafe {
            let xml_wide: Vec<u16> = xml_data.encode_utf16().chain(std::iter::once(0)).collect();
            let xml_pcwstr = PCWSTR(xml_wide.as_ptr());
            
            let bookmark_handle = EvtCreateBookmark(xml_pcwstr);
            
            if bookmark_handle.is_err() {
                return Err(CollectorError::WindowsEventError {
                    operation: "EvtCreateBookmark".to_string(),
                    channel: "unknown".to_string(),
                    event_id: None,
                    error_code: None,
                });
            }
            
            Ok(bookmark_handle.unwrap().0)
        }
    }
    
    /// Seek query to bookmark position
    fn seek_to_bookmark(&self, query_handle: isize, bookmark: &EventBookmark) -> Result<(), CollectorError> {
        if self.mock_mode {
            return Ok(());
        }
        
        let bookmark_handle = self.create_bookmark_from_xml(&bookmark.xml_data)?;
        
        unsafe {
            let result = EvtSeek(
                query_handle,
                0,
                bookmark_handle,
                0,
                EvtSeekRelativeToBookmark.0
            );
            
            EvtClose(bookmark_handle)?;
            
            if result.is_err() {
                return Err(CollectorError::WindowsEventError {
                    operation: "EvtSeek".to_string(),
                    channel: "unknown".to_string(),
                    event_id: None,
                    error_code: None,
                });
            }
        }
        
        debug!("📖 Resumed from bookmark at record ID: {}", bookmark.last_event_record_id);
        Ok(())
    }
    
    /// Read and parse events from a query handle
    async fn read_events_from_query(&mut self, channel: &str, query_handle: isize) -> Result<Vec<RawLogEvent>, CollectorError> {
        if self.mock_mode {
            return self.generate_mock_events(channel).await;
        }
        
        let mut events = Vec::new();
        let batch_size = self.config.batch_size.min(100); // Cap at 100 events per batch
        
        unsafe {
            let mut event_handles: Vec<isize> = vec![0; batch_size];
            let mut returned = 0u32;
            
            // Retrieve batch of event handles
            let result = EvtNext(
                query_handle,
                &mut event_handles,
                1000, // 1 second timeout
                0,
                &mut returned
            );
            
            if result.is_err() || returned == 0 {
                return Ok(events); // No more events
            }
            
            // Process each event
            for i in 0..returned as usize {
                let event_handle = event_handles[i];
                
                match self.render_event_as_xml(event_handle).await {
                    Ok(xml_data) => {
                        match self.parse_windows_event_xml(&xml_data, channel).await {
                            Ok(parsed_event) => {
                                let raw_event = RawLogEvent {
                                    timestamp: parsed_event.time_created,
                                    source: "windows_event".to_string(),
                                    raw_data: xml_data,
                                    metadata: HashMap::from([
                                        ("channel".to_string(), channel.to_string()),
                                        ("event_id".to_string(), parsed_event.event_id.to_string()),
                                        ("level".to_string(), parsed_event.level_name.clone()),
                                        ("provider".to_string(), parsed_event.provider_name.clone()),
                                        ("computer".to_string(), parsed_event.computer.clone()),
                                        ("record_id".to_string(), parsed_event.event_record_id.to_string()),
                                        ("format".to_string(), "xml".to_string()),
                                    ]),
                                };
                                
                                events.push(raw_event);
                                
                                // Update bookmark for this channel
                                self.update_bookmark_for_event(channel, event_handle, &parsed_event).await?;
                            }
                            Err(e) => {
                                warn!("⚠️  Failed to parse event XML: {}", e);
                            }
                        }
                    }
                    Err(e) => {
                        warn!("⚠️  Failed to render event as XML: {}", e);
                    }
                }
                
                // Close the event handle
                EvtClose(event_handle)?;
            }
        }
        
        if !events.is_empty() {
            debug!("📥 Collected {} events from channel '{}'", events.len(), channel);
        }
        
        Ok(events)
    }
    
    /// Render event as XML string
    async fn render_event_as_xml(&self, event_handle: isize) -> Result<String, CollectorError> {
        unsafe {
            let buffer_size = 65000u32;
            let mut buffer: Vec<u16> = vec![0; buffer_size as usize];
            let mut buffer_used = 0u32;
            let mut property_count = 0u32;
            
            let result = EvtRender(
                None,
                event_handle,
                EvtRenderEventXml.0,
                buffer_size,
                Some(buffer.as_mut_ptr() as *mut c_void),
                &mut buffer_used,
                &mut property_count
            );
            
            if result.is_err() {
                return Err(CollectorError::WindowsEventError {
                    operation: "EvtRender".to_string(),
                    channel: "unknown".to_string(),
                    event_id: None,
                    error_code: None,
                });
            }
            
            // Convert UTF-16 buffer to String
            let xml_string = String::from_utf16_lossy(
                &buffer[..(buffer_used as usize / 2)]
            );
            
            Ok(xml_string)
        }
    }
    
    /// Parse Windows Event XML into structured data
    async fn parse_windows_event_xml(&self, xml_data: &str, channel: &str) -> Result<WindowsEventData, CollectorError> {
        let mut reader = Reader::from_str(xml_data);
        reader.trim_text(true);
        
        let mut event_data = WindowsEventData {
            event_id: 0,
            event_record_id: 0,
            level: 0,
            level_name: "Unknown".to_string(),
            keywords: 0,
            opcode: 0,
            task: 0,
            provider_name: String::new(),
            provider_guid: None,
            channel: channel.to_string(),
            computer: String::new(),
            security_user_id: None,
            time_created: chrono::Utc::now(),
            event_data: HashMap::new(),
            user_data: None,
            message: None,
            raw_xml: xml_data.to_string(),
        };
        
        let mut buf = Vec::new();
        let mut current_path = Vec::new();
        let mut current_text = String::new();
        
        loop {
            match reader.read_event_into(&mut buf) {
                Ok(event) => match event {
                Event::Start(ref e) => {
                    let name = String::from_utf8_lossy(e.name().as_ref());
                    current_path.push(name.to_string());
                    current_text.clear();
                    
                    // Extract attributes
                    for attr in e.attributes() {
                        let attr = attr.map_err(|e| CollectorError::DataValidationFailed {
                            collector: "windows_event".to_string(),
                            field: "xml_attribute".to_string(),
                            expected_format: "valid XML attribute".to_string(),
                            actual_value: format!("XML parse error: {}", e),
                        })?;
                        let attr_name = String::from_utf8_lossy(attr.key.as_ref());
                        let attr_value = String::from_utf8_lossy(&attr.value);
                        
                        match current_path.join("/").as_str() {
                            "Event/System/Provider" if attr_name == "Name" => {
                                event_data.provider_name = attr_value.to_string();
                            }
                            "Event/System/Provider" if attr_name == "Guid" => {
                                event_data.provider_guid = Some(attr_value.to_string());
                            }
                            "Event/System/TimeCreated" if attr_name == "SystemTime" => {
                                if let Ok(parsed_time) = chrono::DateTime::parse_from_rfc3339(&attr_value) {
                                    event_data.time_created = parsed_time.with_timezone(&chrono::Utc);
                                }
                            }
                            _ => {}
                        }
                    }
                }
                Event::Text(e) => {
                    current_text = String::from_utf8_lossy(&e).to_string();
                }
                Event::End(ref e) => {
                    let path = current_path.join("/");
                    
                    // Extract system data
                    match path.as_str() {
                        "Event/System/EventID" => {
                            event_data.event_id = current_text.parse().unwrap_or(0);
                        }
                        "Event/System/EventRecordID" => {
                            event_data.event_record_id = current_text.parse().unwrap_or(0);
                        }
                        "Event/System/Level" => {
                            event_data.level = current_text.parse().unwrap_or(0);
                            event_data.level_name = self.level_to_name(event_data.level);
                        }
                        "Event/System/Keywords" => {
                            // Parse hex keywords
                            if current_text.starts_with("0x") {
                                event_data.keywords = u64::from_str_radix(&current_text[2..], 16).unwrap_or(0);
                            } else {
                                event_data.keywords = current_text.parse().unwrap_or(0);
                            }
                        }
                        "Event/System/Opcode" => {
                            event_data.opcode = current_text.parse().unwrap_or(0);
                        }
                        "Event/System/Task" => {
                            event_data.task = current_text.parse().unwrap_or(0);
                        }
                        "Event/System/Computer" => {
                            event_data.computer = current_text.clone();
                        }
                        "Event/System/Security" => {
                            event_data.security_user_id = if current_text.is_empty() { None } else { Some(current_text.clone()) };
                        }
                        _ => {
                            // Extract event data fields
                            if path.starts_with("Event/EventData/Data") {
                                // Use path as key for now, could be improved with Name attribute parsing
                                let key = path.split('/').last().unwrap_or("unknown").to_string();
                                event_data.event_data.insert(key, current_text.clone());
                            }
                        }
                    }
                    
                    current_path.pop();
                    current_text.clear();
                }
                    Event::Eof => break,
                    _ => {}
                }
                Err(e) => {
                    return Err(CollectorError::DataValidationFailed {
                        collector: "windows_event".to_string(),
                        field: "xml_parsing".to_string(),
                        expected_format: "valid XML".to_string(),
                        actual_value: format!("XML parse error: {}", e),
                    });
                }
            }
        }
        
        Ok(event_data)
    }
    
    /// Convert numeric level to level name
    fn level_to_name(&self, level: u32) -> String {
        match level {
            1 => "Critical".to_string(),
            2 => "Error".to_string(),
            3 => "Warning".to_string(),
            4 => "Information".to_string(),
            5 => "Verbose".to_string(),
            _ => format!("Unknown({})", level),
        }
    }
    
    /// Update bookmark after processing an event
    async fn update_bookmark_for_event(&mut self, channel: &str, event_handle: isize, event_data: &WindowsEventData) -> Result<(), CollectorError> {
        if self.mock_mode {
            return Ok(());
        }
        
        unsafe {
            // Create bookmark from current event
            let bookmark_handle = EvtCreateBookmark(PCWSTR::null())?;
            
            // Update bookmark to current event position
            let result = EvtUpdateBookmark(bookmark_handle, event_handle);
            if result.is_err() {
                EvtClose(bookmark_handle)?;
                return Err(CollectorError::WindowsEventError {
                    operation: "EvtUpdateBookmark".to_string(),
                    channel: channel.to_string(),
                    event_id: Some(event_data.event_id),
                    error_code: None,
                });
            }
            
            // Render bookmark as XML
            let buffer_size = 8192u32;
            let mut buffer: Vec<u16> = vec![0; buffer_size as usize];
            let mut buffer_used = 0u32;
            let mut property_count = 0u32;
            
            let result = EvtRender(
                None,
                bookmark_handle,
                EvtRenderBookmark.0,
                buffer_size,
                Some(buffer.as_mut_ptr() as *mut c_void),
                &mut buffer_used,
                &mut property_count
            );
            
            EvtClose(bookmark_handle)?;
            
            if result.is_ok() {
                let bookmark_xml = String::from_utf16_lossy(
                    &buffer[..(buffer_used as usize / 2)]
                );
                
                // Update bookmark in memory
                let bookmark = EventBookmark {
                    xml_data: bookmark_xml,
                    last_event_record_id: event_data.event_record_id,
                    last_updated: chrono::Utc::now(),
                };
                
                self.bookmarks.insert(channel.to_string(), bookmark);
            }
        }
        
        Ok(())
    }
    
    /// Generate mock events for testing on non-Windows platforms
    async fn generate_mock_events(&self, channel: &str) -> Result<Vec<RawLogEvent>, CollectorError> {
        let mock_events = vec![
            RawLogEvent {
                timestamp: chrono::Utc::now(),
                source: "windows_event".to_string(),
                raw_data: format!(
                    r#"<Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
                      <System>
                        <Provider Name="MockProvider" Guid="{{12345678-1234-1234-1234-123456789012}}"/>
                        <EventID>4624</EventID>
                        <EventRecordID>12345</EventRecordID>
                        <Level>4</Level>
                        <Keywords>0x8020000000000000</Keywords>
                        <Computer>MockComputer</Computer>
                        <TimeCreated SystemTime="{}"/>
                        <Channel>{}</Channel>
                      </System>
                      <EventData>
                        <Data Name="SubjectUserSid">S-1-5-18</Data>
                        <Data Name="SubjectUserName">SYSTEM</Data>
                        <Data Name="LogonType">5</Data>
                      </EventData>
                    </Event>"#,
                    chrono::Utc::now().to_rfc3339(),
                    channel
                ),
                metadata: HashMap::from([
                    ("channel".to_string(), channel.to_string()),
                    ("event_id".to_string(), "4624".to_string()),
                    ("level".to_string(), "Information".to_string()),
                    ("provider".to_string(), "MockProvider".to_string()),
                    ("computer".to_string(), "MockComputer".to_string()),
                    ("record_id".to_string(), "12345".to_string()),
                    ("format".to_string(), "xml".to_string()),
                    ("mock".to_string(), "true".to_string()),
                ]),
            }
        ];
        
        Ok(mock_events)
    }
    
    /// Load bookmarks from persistence file
    async fn load_bookmarks(&mut self) -> Result<(), CollectorError> {
        if !Path::new(&self.bookmark_persistence_path).exists() {
            debug!("📖 No bookmark file found, starting fresh collection");
            return Ok(());
        }
        
        match tokio::fs::read_to_string(&self.bookmark_persistence_path).await {
            Ok(content) => {
                match serde_json::from_str::<HashMap<String, EventBookmark>>(&content) {
                    Ok(bookmarks) => {
                        self.bookmarks = bookmarks;
                        info!("📖 Loaded {} bookmarks from {}", self.bookmarks.len(), self.bookmark_persistence_path);
                    }
                    Err(e) => {
                        warn!("⚠️  Failed to parse bookmarks file: {}", e);
                    }
                }
            }
            Err(e) => {
                warn!("⚠️  Failed to read bookmarks file: {}", e);
            }
        }
        
        Ok(())
    }
    
    /// Save bookmarks to persistence file
    async fn save_bookmarks(&self) -> Result<(), CollectorError> {
        if self.bookmarks.is_empty() {
            return Ok(());
        }
        
        match serde_json::to_string_pretty(&self.bookmarks) {
            Ok(content) => {
                if let Err(e) = tokio::fs::write(&self.bookmark_persistence_path, content).await {
                    warn!("⚠️  Failed to save bookmarks: {}", e);
                }
            }
            Err(e) => {
                warn!("⚠️  Failed to serialize bookmarks: {}", e);
            }
        }
        
        Ok(())
    }
    
    /// Set event filter for a specific channel
    pub fn set_channel_filter(&mut self, channel: &str, filter: EventFilter) {
        self.filters.insert(channel.to_string(), filter);
    }
    
    /// Set filter to collect only security events (common use case)
    pub fn filter_security_events(&mut self, channel: &str) {
        let security_filter = EventFilter {
            event_ids: Some(vec![
                4624, 4625, 4634, 4647, 4648, // Logon/Logoff events
                4720, 4722, 4723, 4724, 4725, 4726, // Account management
                4728, 4729, 4732, 4733, 4756, 4757, // Group membership
                4776, 4777, 4778, 4779, // NTLM authentication
                4768, 4769, 4771, 4772, // Kerberos authentication
            ]),
            levels: Some(vec![2, 3, 4]), // Error, Warning, Information
            keywords: None,
            providers: None,
            custom_xpath: None,
        };
        self.set_channel_filter(channel, security_filter);
    }
    
    /// Set filter to collect only error and critical events
    pub fn filter_errors_only(&mut self, channel: &str) {
        let error_filter = EventFilter {
            event_ids: None,
            levels: Some(vec![1, 2]), // Critical, Error
            keywords: None,
            providers: None,
            custom_xpath: None,
        };
        self.set_channel_filter(channel, error_filter);
    }
    
    /// Set filter using custom XPath query
    pub fn filter_custom_xpath(&mut self, channel: &str, xpath: &str) {
        let custom_filter = EventFilter {
            event_ids: None,
            levels: None,
            keywords: None,
            providers: None,
            custom_xpath: Some(xpath.to_string()),
        };
        self.set_channel_filter(channel, custom_filter);
    }
    
    /// Get current bookmark information for a channel
    pub fn get_channel_bookmark(&self, channel: &str) -> Option<&EventBookmark> {
        self.bookmarks.get(channel)
    }
    
    /// Set bookmark persistence path (useful for testing)
    pub fn set_bookmark_path(&mut self, path: &str) {
        self.bookmark_persistence_path = path.to_string();
    }
    
    /// Start the continuous event collection task
    async fn start_collection_task(&mut self) {
        let event_sender = self.event_sender.clone();
        let channels = self.config.channels.clone();
        let query_handles = self.query_handles.clone();
        let (shutdown_sender, mut shutdown_receiver) = tokio::sync::oneshot::channel();
        self.shutdown_sender = Some(shutdown_sender);
        
        let mut collector = self.clone(); // We'll need to make this cloneable
        
        tokio::spawn(async move {
            let mut collection_interval = interval(Duration::from_secs(1));
            
            loop {
                tokio::select! {
                    _ = collection_interval.tick() => {
                        // Collect events from all channels
                        for channel in &channels {
                            if let Some(&query_handle) = query_handles.get(channel) {
                                match collector.read_events_from_query(channel, query_handle).await {
                                    Ok(events) => {
                                        for event in events {
                                            if let Err(e) = event_sender.send(event).await {
                                                error!("❌ Failed to send Windows event: {}", e);
                                                return;
                                            }
                                        }
                                    }
                                    Err(e) => {
                                        error!("❌ Failed to collect events from channel '{}': {}", channel, e);
                                    }
                                }
                            }
                        }
                        
                        // Periodically save bookmarks
                        if let Err(e) = collector.save_bookmarks().await {
                            warn!("⚠️  Failed to save bookmarks: {}", e);
                        }
                    }
                    _ = &mut shutdown_receiver => {
                        info!("🛑 Windows Event collection task shutting down");
                        break;
                    }
                }
            }
        });
        
        debug!("🚀 Windows Event collection task started for {} channels", channels.len());
    }
}

// Implement Clone for WindowsEventCollector to enable task spawning
#[cfg(windows)]
impl Clone for WindowsEventCollector {
    fn clone(&self) -> Self {
        Self {
            config: self.config.clone(),
            event_sender: self.event_sender.clone(),
            query_handles: self.query_handles.clone(),
            bookmarks: self.bookmarks.clone(),
            filters: self.filters.clone(),
            running: self.running,
            shutdown_sender: None, // Don't clone shutdown sender
            bookmark_persistence_path: self.bookmark_persistence_path.clone(),
            mock_mode: self.mock_mode,
        }
    }
}

#[cfg(windows)]
#[async_trait]
impl Collector for WindowsEventCollector {
    async fn start(&mut self) -> std::result::Result<(), CollectorError> {
        if !self.config.enabled {
            info!("🔇 Windows Event collector is disabled");
            return Ok(());
        }
        
        info!("🚀 Starting advanced Windows Event collector with {} channels", self.config.channels.len());
        
        // Load saved bookmarks for incremental collection
        self.load_bookmarks().await?;
        
        // Set up default filters if none specified
        for channel in &self.config.channels {
            if !self.filters.contains_key(channel) {
                // Default filter: collect Error, Warning, and Critical events
                let default_filter = EventFilter {
                    event_ids: None,
                    levels: Some(vec![1, 2, 3]), // Critical, Error, Warning
                    keywords: None,
                    providers: None,
                    custom_xpath: None,
                };
                self.set_channel_filter(channel, default_filter);
            }
        }
        
        // Create event query handles for each configured channel
        for channel in &self.config.channels {
            match self.create_event_query(channel) {
                Ok(handle) => {
                    info!("📋 Created event query for channel: {}", channel);
                    self.query_handles.insert(channel.clone(), handle);
                }
                Err(e) => {
                    error!("❌ Failed to create query for channel '{}': {}", channel, e);
                    return Err(e);
                }
            }
        }
        
        // Start the collection task
        self.start_collection_task().await;
        
        self.running = true;
        info!("✅ Windows Event collector started successfully");
        Ok(())
    }
    
    async fn stop(&mut self) -> std::result::Result<(), CollectorError> {
        info!("🛑 Stopping Windows Event collector");
        
        // Signal shutdown to collection task
        if let Some(sender) = self.shutdown_sender.take() {
            let _ = sender.send(());
        }
        
        // Save final bookmarks
        if let Err(e) = self.save_bookmarks().await {
            warn!("⚠️  Failed to save final bookmarks: {}", e);
        }
        
        // Close query handles
        if !self.mock_mode {
            unsafe {
                for (channel, &handle) in &self.query_handles {
                    if let Err(e) = EvtClose(handle) {
                        warn!("⚠️  Failed to close query handle for channel '{}': {}", channel, e);
                    }
                }
            }
        }
        self.query_handles.clear();
        
        self.running = false;
        info!("✅ Windows Event collector stopped successfully");
        Ok(())
    }
    
    async fn collect(&mut self) -> std::result::Result<Vec<RawLogEvent>, CollectorError> {
        // Collection happens asynchronously via the collection task
        // This method can be used for synchronous one-time collection if needed
        let mut all_events = Vec::new();
        
        for (channel, &query_handle) in &self.query_handles {
            match self.read_events_from_query(channel, query_handle).await {
                Ok(mut events) => {
                    all_events.append(&mut events);
                }
                Err(e) => {
                    warn!("⚠️  Failed to collect events from channel '{}': {}", channel, e);
                }
            }
        }
        
        Ok(all_events)
    }
    
    fn name(&self) -> &str {
        "windows_event"
    }
    
    fn is_running(&self) -> bool {
        self.running
    }
}

// Stub implementation for non-Windows platforms
#[cfg(not(windows))]
pub struct WindowsEventCollector;

#[cfg(not(windows))]
impl WindowsEventCollector {
    pub fn new(
        _config: crate::config::WindowsEventCollectorConfig,
        _event_sender: tokio::sync::mpsc::Sender<RawLogEvent>,
    ) -> Self {
        Self
    }
}

#[cfg(not(windows))]
#[async_trait::async_trait]
impl Collector for WindowsEventCollector {
    async fn start(&mut self) -> std::result::Result<(), CollectorError> {
        Err(CollectorError::InitializationFailed {
            name: "windows_event".to_string(),
            collector_type: "windows_event_log".to_string(),
            reason: "Windows Event collector is not supported on this platform".to_string(),
            configuration: "non-windows platform".to_string(),
        })
    }
    
    async fn stop(&mut self) -> std::result::Result<(), CollectorError> {
        Ok(())
    }
    
    async fn collect(&mut self) -> std::result::Result<Vec<RawLogEvent>, CollectorError> {
        Ok(Vec::new())
    }
    
    fn name(&self) -> &str {
        "windows_event"
    }
    
    fn is_running(&self) -> bool {
        false
    }
}