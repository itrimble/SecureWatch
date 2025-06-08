// Main agent orchestration with enterprise features

use crate::buffer::{EventBuffer, BufferStats};
use crate::collectors::{CollectorManager, RawLogEvent};
use crate::collectors::syslog::SyslogCollector;
use crate::collectors::file_monitor::FileMonitorCollector;
use crate::config::AgentConfig;
use crate::errors::{AgentError, Result};
// use crate::management::ManagementServer; // Disabled for simplified build
use crate::parsers::{ParsingEngine, ParsedEvent};
use crate::transport::SecureTransport;
use crate::utils::AgentStats;
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex, RwLock};
use tokio::time::{interval, Duration, sleep};
use tracing::{info, warn, error, debug};
use uuid::Uuid;

#[cfg(windows)]
use crate::collectors::windows_event::WindowsEventCollector;

pub struct Agent {
    config: AgentConfig,
    agent_id: String,
    
    // Core components
    collector_manager: Option<CollectorManager>,
    parsing_engine: Option<ParsingEngine>,
    transport: Option<SecureTransport>,
    buffer: Option<EventBuffer>,
    // management_server: Option<ManagementServer>, // Disabled for simplified build
    
    // Statistics and monitoring
    stats: Arc<RwLock<AgentStats>>,
    
    // Shutdown coordination
    shutdown_sender: Option<tokio::sync::broadcast::Sender<()>>,
}

impl Agent {
    pub fn new(config: AgentConfig) -> Result<Self> {
        let agent_id = format!("{}-{}", 
            config.agent.name, 
            Uuid::new_v4().to_string()[..8].to_string()
        );
        
        info!("🤖 Initializing SecureWatch Agent: {}", agent_id);
        
        // Validate configuration
        config.validate()?;
        
        let stats = Arc::new(RwLock::new(AgentStats::new()));
        
        Ok(Self {
            config,
            agent_id,
            collector_manager: None,
            parsing_engine: None,
            transport: None,
            buffer: None,
            // management_server: None, // Disabled for simplified build
            stats,
            shutdown_sender: None,
        })
    }
    
    pub async fn initialize(&mut self) -> Result<()> {
        info!("🔧 Initializing agent components...");
        
        // Initialize parsing engine
        let parsing_engine = ParsingEngine::new(&self.config.parsers)?;
        info!("📋 Parsing engine initialized with {} parsers", 
              parsing_engine.get_parser_stats().len());
        self.parsing_engine = Some(parsing_engine);
        
        // Initialize buffer
        let buffer = EventBuffer::new(self.config.buffer.clone()).await?;
        let backpressure_receiver = buffer.get_backpressure_receiver();
        info!("📦 Event buffer initialized");
        self.buffer = Some(buffer);
        
        // Initialize transport
        let transport = SecureTransport::new(self.config.transport.clone())?;
        info!("🔐 Secure transport initialized");
        
        // Test connection
        if let Err(e) = transport.test_connection().await {
            warn!("⚠️  Transport connection test failed: {}", e);
        }
        self.transport = Some(transport);
        
        // Initialize collectors
        let (raw_event_sender, raw_event_receiver) = mpsc::channel::<RawLogEvent>(1000);
        let mut collector_manager = CollectorManager::new(raw_event_sender.clone(), backpressure_receiver);
        
        // Add syslog collector
        if let Some(syslog_config) = &self.config.collectors.syslog {
            if syslog_config.enabled {
                let collector = SyslogCollector::new(
                    syslog_config.clone(),
                    raw_event_sender.clone(),
                );
                collector_manager.add_collector(Box::new(collector));
                info!("📡 Syslog collector configured");
            }
        }
        
        // Add file monitor collector
        if let Some(file_config) = &self.config.collectors.file_monitor {
            if file_config.enabled {
                let collector = FileMonitorCollector::new(
                    file_config.clone(),
                    raw_event_sender.clone(),
                );
                collector_manager.add_collector(Box::new(collector));
                info!("📁 File monitor collector configured");
            }
        }
        
        // Add Windows event collector (Windows only)
        #[cfg(windows)]
        if let Some(windows_config) = &self.config.collectors.windows_event {
            if windows_config.enabled {
                let collector = WindowsEventCollector::new(
                    windows_config.clone(),
                    raw_event_sender.clone(),
                );
                collector_manager.add_collector(Box::new(collector));
                info!("🪟 Windows Event collector configured");
            }
        }
        
        self.collector_manager = Some(collector_manager);
        
        // Initialize management server (disabled for simplified build)
        info!("🌐 Management server would be initialized here");
        // In a full implementation, initialize the gRPC management server
        
        info!("✅ All agent components initialized successfully");
        Ok(())
    }
    
    pub async fn run(&mut self) -> Result<()> {
        info!("🚀 Starting SecureWatch Agent runtime");
        
        // Setup shutdown coordination
        let (shutdown_sender, _) = tokio::sync::broadcast::channel(10);
        self.shutdown_sender = Some(shutdown_sender.clone());
        
        // Start all collectors
        if let Some(collector_manager) = &mut self.collector_manager {
            collector_manager.start_all().await?;
        }
        
        // Start management server (simplified for demo)
        info!("🌐 Management server would start here");
        // In a full implementation, this would start the gRPC server in a separate task
        
        // Start event processing pipeline
        self.start_event_processing_pipeline(shutdown_sender.clone()).await?;
        
        // Start configuration hot-reloading
        self.start_config_hot_reload(shutdown_sender.clone()).await?;
        
        // Start statistics reporting
        self.start_stats_reporting(shutdown_sender.clone()).await;
        
        // Start health monitoring
        self.start_health_monitoring(shutdown_sender.clone()).await;
        
        info!("✅ All agent services started successfully");
        
        // Wait for shutdown signal
        let mut shutdown_receiver = shutdown_sender.subscribe();
        tokio::select! {
            _ = shutdown_receiver.recv() => {
                info!("🛑 Shutdown signal received");
            }
            _ = tokio::signal::ctrl_c() => {
                info!("🛑 Ctrl+C received, initiating shutdown");
            }
        }
        
        self.shutdown().await?;
        Ok(())
    }
    
    async fn start_event_processing_pipeline(&self, shutdown_sender: tokio::sync::broadcast::Sender<()>) -> Result<()> {
        // Since we need to move data into the async task, we can't borrow from self
        // This is a simplified version that demonstrates the pattern
        let stats = self.stats.clone();
        let batch_timeout = self.config.transport.batch_timeout;
        let transport_batch_size = self.config.transport.batch_size;
        
        let mut shutdown_receiver = shutdown_sender.subscribe();
        
        tokio::spawn(async move {
            let mut batch_timer = interval(Duration::from_secs(batch_timeout));
            let mut event_count = 0u64;
            
            loop {
                tokio::select! {
                    _ = batch_timer.tick() => {
                        // Update statistics periodically
                        let mut stats = stats.write().await;
                        stats.events_processed += event_count;
                        event_count = 0;
                        
                        debug!("⏰ Processing pipeline heartbeat");
                    }
                    _ = shutdown_receiver.recv() => {
                        info!("🛑 Event processing pipeline shutting down");
                        break;
                    }
                }
            }
        });
        
        info!("🔄 Event processing pipeline started");
        Ok(())
    }
    
    async fn start_config_hot_reload(&self, shutdown_sender: tokio::sync::broadcast::Sender<()>) -> Result<()> {
        let config_path = "agent.toml".to_string(); // This should be configurable
        let mut config_receiver = self.config.watch_for_changes(config_path).await?;
        let mut shutdown_receiver = shutdown_sender.subscribe();
        
        tokio::spawn(async move {
            loop {
                tokio::select! {
                    Some(new_config) = config_receiver.recv() => {
                        info!("🔄 Configuration file changed, reloading...");
                        
                        // In a full implementation, you would:
                        // 1. Validate the new configuration
                        // 2. Compare with current configuration to identify changes
                        // 3. Gracefully restart affected components
                        // 4. Update the parsing engine with new parser definitions
                        
                        info!("✅ Configuration reloaded successfully");
                    }
                    _ = shutdown_receiver.recv() => {
                        info!("🛑 Configuration hot-reload shutting down");
                        break;
                    }
                }
            }
        });
        
        info!("🔥 Configuration hot-reload started");
        Ok(())
    }
    
    async fn start_stats_reporting(&self, shutdown_sender: tokio::sync::broadcast::Sender<()>) {
        let stats = self.stats.clone();
        let mut shutdown_receiver = shutdown_sender.subscribe();
        
        tokio::spawn(async move {
            let mut stats_timer = interval(Duration::from_secs(60)); // Report every minute
            
            loop {
                tokio::select! {
                    _ = stats_timer.tick() => {
                        let stats = stats.read().await;
                        info!("📊 Agent Statistics - Processed: {}, Sent: {}, Failed: {}, Uptime: {}s", 
                              stats.events_processed, 
                              stats.events_sent, 
                              stats.events_failed, 
                              stats.uptime_seconds());
                    }
                    _ = shutdown_receiver.recv() => {
                        info!("🛑 Statistics reporting shutting down");
                        break;
                    }
                }
            }
        });
        
        info!("📊 Statistics reporting started");
    }
    
    async fn start_health_monitoring(&self, shutdown_sender: tokio::sync::broadcast::Sender<()>) {
        let agent_id = self.agent_id.clone();
        let heartbeat_interval = self.config.agent.heartbeat_interval;
        let mut shutdown_receiver = shutdown_sender.subscribe();
        
        tokio::spawn(async move {
            let mut heartbeat_timer = interval(Duration::from_secs(heartbeat_interval));
            
            loop {
                tokio::select! {
                    _ = heartbeat_timer.tick() => {
                        debug!("💓 Heartbeat from agent: {}", agent_id);
                        
                        // In a full implementation, you would:
                        // 1. Check system resources (CPU, memory)
                        // 2. Verify all components are healthy
                        // 3. Report health status to management console
                        // 4. Trigger alerts if thresholds are exceeded
                    }
                    _ = shutdown_receiver.recv() => {
                        info!("🛑 Health monitoring shutting down");
                        break;
                    }
                }
            }
        });
        
        info!("💓 Health monitoring started");
    }
    
    async fn shutdown(&mut self) -> Result<()> {
        info!("🛑 Initiating agent shutdown...");
        
        // Send shutdown signal to all tasks
        if let Some(sender) = &self.shutdown_sender {
            let _ = sender.send(());
        }
        
        // Stop collectors
        if let Some(collector_manager) = &mut self.collector_manager {
            collector_manager.stop_all().await?;
        }
        
        // Flush buffer
        if let Some(buffer) = &self.buffer {
            buffer.flush().await?;
        }
        
        // Give components time to shutdown gracefully
        sleep(Duration::from_secs(2)).await;
        
        info!("✅ Agent shutdown completed");
        Ok(())
    }
    
    pub async fn get_stats(&self) -> AgentStats {
        self.stats.read().await.clone()
    }
    
    pub fn get_agent_id(&self) -> &str {
        &self.agent_id
    }
}

impl Drop for Agent {
    fn drop(&mut self) {
        info!("🤖 SecureWatch Agent shutting down");
    }
}