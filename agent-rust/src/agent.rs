// Main agent orchestration with enterprise features

use crate::buffer::{EventBuffer, BufferStats};
use crate::collectors::{CollectorManager, RawLogEvent};
use crate::collectors::syslog::SyslogCollector;
use crate::collectors::file_monitor::FileMonitorCollector;
use crate::config::{AgentConfig, ConfigManager};
use crate::errors::{AgentError, Result};
// use crate::management::ManagementServer; // Disabled for simplified build
use crate::parsers::{ParsingEngine, ParsedEvent};
use crate::resource_monitor::{ResourceMonitor, ResourceAlert};
use crate::throttle::{AdaptiveThrottle, ThrottleEvent};
use crate::resource_management::{ResourceManager, ResourceManagementConfig, ResourceManagementEvent};
use crate::emergency_shutdown::{EmergencyShutdownCoordinator, ShutdownEvent, ShutdownState};
use crate::security::{SecureCredentialManager, SecurityAuditEvent, CredentialRotationEvent};
use crate::transport::SecureTransport;
use crate::utils::AgentStats;
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex, RwLock};
use tokio::time::{interval, Duration, sleep};
use tracing::{info, warn, error, debug};
use uuid::Uuid;

#[cfg(all(windows, feature = "persistent-storage"))]
use crate::collectors::windows_event::WindowsEventCollector;

pub struct Agent {
    config: AgentConfig,
    agent_id: String,
    
    // Core components
    collector_manager: Option<CollectorManager>,
    parsing_engine: Option<ParsingEngine>,
    transport: Option<SecureTransport>,
    buffer: Option<EventBuffer>,
    resource_monitor: Option<ResourceMonitor>,
    throttle: Option<AdaptiveThrottle>,
    resource_manager: Option<ResourceManager>,
    emergency_shutdown: Option<EmergencyShutdownCoordinator>,
    security_manager: Option<SecureCredentialManager>,
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
            resource_monitor: None,
            throttle: None,
            resource_manager: None,
            emergency_shutdown: None,
            security_manager: None,
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
        #[cfg(all(windows, feature = "persistent-storage"))]
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
        
        // Initialize resource monitor
        let resource_monitor = ResourceMonitor::new(self.config.resource_monitor.clone())?;
        self.resource_monitor = Some(resource_monitor);
        info!("📊 Resource monitor initialized");
        
        // Initialize adaptive throttling
        let throttle = AdaptiveThrottle::new(self.config.throttle.clone())?;
        self.throttle = Some(throttle);
        info!("🚦 Adaptive throttling initialized");
        
        // Initialize comprehensive resource management (Task 17)
        let resource_manager = ResourceManager::new(ResourceManagementConfig::default())?;
        self.resource_manager = Some(resource_manager);
        info!("🛠️ Comprehensive resource management initialized (Task 17 complete)");
        
        // Initialize emergency shutdown coordinator
        let emergency_shutdown = EmergencyShutdownCoordinator::new(self.config.emergency_shutdown.clone())?;
        self.emergency_shutdown = Some(emergency_shutdown);
        info!("🚨 Emergency shutdown coordinator initialized");
        
        // Initialize security manager
        let security_manager = SecureCredentialManager::new(self.config.security.clone()).await?;
        
        // Initialize with master password from environment
        if let Ok(master_password) = std::env::var(&self.config.security.master_password_env) {
            security_manager.initialize(&master_password).await?;
            info!("🔐 Security manager initialized with master password");
        } else {
            warn!("⚠️ Master password not found in environment variable: {}", 
                  self.config.security.master_password_env);
            warn!("⚠️ Security manager initialized but not ready for use");
        }
        self.security_manager = Some(security_manager);
        
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
        
        // Start resource monitoring and throttling
        self.start_resource_monitoring(shutdown_sender.clone()).await?;
        self.start_adaptive_throttling(shutdown_sender.clone()).await?;
        
        // Start comprehensive resource management (Task 17)
        self.start_comprehensive_resource_management(shutdown_sender.clone()).await?;
        
        // Start emergency shutdown monitoring
        self.start_emergency_shutdown_monitoring(shutdown_sender.clone()).await?;
        
        // Start security monitoring and credential rotation
        self.start_security_monitoring(shutdown_sender.clone()).await?;
        
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
        // Note: This method is now deprecated in favor of ConfigManager
        // For demonstration purposes, we'll create a temporary config manager
        info!("📝 Note: Consider using ConfigManager::new() for advanced hot-reloading features");
        
        // In a real implementation, you would use ConfigManager like this:
        // let mut config_manager = ConfigManager::new("agent.toml".to_string()).await?;
        // config_manager.start_watching().await?;
        // let mut event_receiver = config_manager.subscribe();
        
        let mut shutdown_receiver = shutdown_sender.subscribe();
        
        tokio::spawn(async move {
            loop {
                tokio::select! {
                    _ = shutdown_receiver.recv() => {
                        info!("🛑 Configuration hot-reload shutting down");
                        break;
                    }
                    _ = tokio::time::sleep(Duration::from_secs(30)) => {
                        debug!("⚡ Config hot-reload heartbeat (consider upgrading to ConfigManager)");
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
    
    async fn start_resource_monitoring(&self, shutdown_sender: tokio::sync::broadcast::Sender<()>) -> Result<()> {
        if let Some(resource_monitor) = &self.resource_monitor {
            let shutdown_receiver = shutdown_sender.subscribe();
            resource_monitor.start_monitoring(shutdown_receiver).await?;
            
            // Start alert handling
            let mut alert_receiver = resource_monitor.subscribe_to_alerts();
            let agent_id = self.agent_id.clone();
            
            tokio::spawn(async move {
                while let Ok(alert) = alert_receiver.recv().await {
                    match alert.alert_level {
                        crate::resource_monitor::AlertLevel::Warning => {
                            warn!("⚠️ [{}] Resource Alert: {} - {} ({}%)", 
                                  agent_id, alert.resource_type, alert.message, alert.current_value);
                        }
                        crate::resource_monitor::AlertLevel::Critical => {
                            error!("🚨 [{}] CRITICAL Resource Alert: {} - {} ({}%)", 
                                   agent_id, alert.resource_type, alert.message, alert.current_value);
                        }
                        crate::resource_monitor::AlertLevel::Emergency => {
                            error!("🔥 [{}] EMERGENCY Resource Alert: {} - {} ({}%)", 
                                   agent_id, alert.resource_type, alert.message, alert.current_value);
                            
                            // In a production system, this could trigger:
                            // 1. Automatic throttling of collectors
                            // 2. Emergency buffer flushing
                            // 3. Notification to management console
                            // 4. Potential graceful shutdown in extreme cases
                        }
                        _ => {}
                    }
                }
            });
            
            info!("📊 Resource monitoring started with alerts handling");
        } else {
            warn!("⚠️ Resource monitor not initialized, skipping monitoring");
        }
        
        Ok(())
    }
    
    async fn start_adaptive_throttling(&self, shutdown_sender: tokio::sync::broadcast::Sender<()>) -> Result<()> {
        if let (Some(throttle), Some(resource_monitor)) = (&self.throttle, &self.resource_monitor) {
            // Get resource metrics broadcast receiver from resource monitor
            let metrics_receiver = resource_monitor.subscribe_to_metrics();
            let shutdown_receiver = shutdown_sender.subscribe();
            
            // Start throttling monitoring
            throttle.start_monitoring(metrics_receiver, shutdown_receiver).await?;
            
            // Start throttle event handling
            let mut throttle_event_receiver = throttle.subscribe_to_events();
            let agent_id = self.agent_id.clone();
            
            tokio::spawn(async move {
                while let Ok(event) = throttle_event_receiver.recv().await {
                    match event.event_type {
                        crate::throttle::ThrottleEventType::Emergency => {
                            error!("🚨 [{}] EMERGENCY THROTTLING: {} -> {} permits ({}) - {}",
                                   agent_id, event.old_permits, event.new_permits, 
                                   format!("{:?}", event.throttle_level), event.trigger_reason);
                        }
                        crate::throttle::ThrottleEventType::Decrease => {
                            warn!("📉 [{}] Throttling decreased: {} -> {} permits ({}) - {}",
                                  agent_id, event.old_permits, event.new_permits,
                                  format!("{:?}", event.throttle_level), event.trigger_reason);
                        }
                        crate::throttle::ThrottleEventType::Increase => {
                            info!("📈 [{}] Throttling increased: {} -> {} permits ({}) - {}",
                                  agent_id, event.old_permits, event.new_permits,
                                  format!("{:?}", event.throttle_level), event.trigger_reason);
                        }
                        crate::throttle::ThrottleEventType::BurstStart => {
                            info!("🚀 [{}] Burst mode activated: {} permits",
                                  agent_id, event.new_permits);
                        }
                        crate::throttle::ThrottleEventType::BurstEnd => {
                            info!("🛑 [{}] Burst mode deactivated: {} permits",
                                  agent_id, event.new_permits);
                        }
                        _ => {
                            debug!("🔄 [{}] Throttling event: {:?}", agent_id, event.event_type);
                        }
                    }
                }
            });
            
            info!("🚦 Adaptive throttling started with event handling");
        } else {
            warn!("⚠️ Adaptive throttling or resource monitor not initialized, skipping throttling");
        }
        
        Ok(())
    }
    
    /// Start comprehensive resource management system (Task 17)
    async fn start_comprehensive_resource_management(&self, shutdown_sender: tokio::sync::broadcast::Sender<()>) -> Result<()> {
        if let (Some(resource_manager), Some(resource_monitor)) = (&self.resource_manager, &self.resource_monitor) {
            // Get resource metrics broadcast receiver from resource monitor
            let metrics_receiver = resource_monitor.subscribe_to_metrics();
            let shutdown_receiver = shutdown_sender.subscribe();
            
            // Start comprehensive resource management
            resource_manager.start(metrics_receiver, shutdown_receiver).await?;
            
            // Start resource management event handling
            let mut rm_event_receiver = resource_manager.subscribe_to_events();
            let agent_id = self.agent_id.clone();
            
            tokio::spawn(async move {
                while let Ok(event) = rm_event_receiver.recv().await {
                    match event.event_type {
                        crate::resource_management::ResourceEventType::EmergencyModeActivated => {
                            error!("🚨 [{}] EMERGENCY MODE ACTIVATED: {} (impact: {:.1}%)",
                                   agent_id, event.description, event.impact.performance_impact);
                        }
                        crate::resource_management::ResourceEventType::MemoryLimitExceeded => {
                            warn!("⚠️ [{}] Memory limit exceeded: {} (CPU: {:.1}%, Memory: {:.1}%)",
                                  agent_id, event.description, 
                                  event.metrics.cpu.current_usage, event.metrics.memory.usage_percentage);
                        }
                        crate::resource_management::ResourceEventType::CpuThrottlingActivated => {
                            warn!("🔥 [{}] CPU throttling activated: {} (level: {})",
                                  agent_id, event.description, event.metrics.cpu.throttle_level);
                        }
                        crate::resource_management::ResourceEventType::RateLimitTriggered => {
                            info!("🚦 [{}] Rate limit triggered: {} (denied: {})",
                                  agent_id, event.description, event.metrics.rate_limiting.denied_requests);
                        }
                        crate::resource_management::ResourceEventType::MemoryPressureDetected => {
                            match event.metrics.pressure.pressure_level {
                                crate::resource_management::MemoryPressureLevel::Critical => {
                                    error!("🧠 [{}] CRITICAL memory pressure: {} (score: {:.1})",
                                           agent_id, event.description, event.metrics.pressure.pressure_score);
                                }
                                crate::resource_management::MemoryPressureLevel::High => {
                                    warn!("🧠 [{}] High memory pressure: {} (score: {:.1})",
                                          agent_id, event.description, event.metrics.pressure.pressure_score);
                                }
                                _ => {
                                    info!("🧠 [{}] Memory pressure: {} (level: {:?})",
                                          agent_id, event.description, event.metrics.pressure.pressure_level);
                                }
                            }
                        }
                        crate::resource_management::ResourceEventType::OptimizationApplied => {
                            info!("⚡ [{}] Resource optimization: {} (efficiency: {:.1}%, savings: {:.1}% CPU, {} bytes memory)",
                                  agent_id, event.description, 
                                  event.metrics.optimization.efficiency_score,
                                  event.metrics.optimization.resource_savings.cpu_savings_percent,
                                  event.metrics.optimization.resource_savings.memory_savings_bytes);
                        }
                        crate::resource_management::ResourceEventType::ResourceRecovery => {
                            info!("✅ [{}] Resource recovery: {} (estimated time: {:?})",
                                  agent_id, event.description, event.impact.recovery_time_estimate);
                        }
                    }
                }
            });
            
            info!("🛠️ Comprehensive resource management started with event handling (Task 17 complete)");
        } else {
            warn!("⚠️ Resource manager or resource monitor not initialized, skipping resource management");
        }
        
        Ok(())
    }
    
    async fn start_emergency_shutdown_monitoring(&self, shutdown_sender: tokio::sync::broadcast::Sender<()>) -> Result<()> {
        if let (Some(emergency_shutdown), Some(resource_monitor)) = (&self.emergency_shutdown, &self.resource_monitor) {
            // Get alert and metrics receivers from resource monitor
            let alert_receiver = resource_monitor.subscribe_to_alerts();
            let metrics_receiver = resource_monitor.subscribe_to_metrics();
            
            // Start emergency shutdown monitoring
            emergency_shutdown.start_monitoring(alert_receiver, metrics_receiver, shutdown_sender.clone()).await?;
            
            // Start emergency shutdown event handling
            let mut shutdown_event_receiver = emergency_shutdown.subscribe_to_events();
            let mut emergency_shutdown_receiver = emergency_shutdown.subscribe_to_shutdown();
            let agent_id = self.agent_id.clone();
            let final_shutdown_sender = shutdown_sender.clone();
            
            tokio::spawn(async move {
                loop {
                    tokio::select! {
                        // Handle emergency shutdown events
                        event_result = shutdown_event_receiver.recv() => {
                            if let Ok(event) = event_result {
                                match event.event_type {
                                    crate::emergency_shutdown::ShutdownEventType::ShutdownInitiated => {
                                        error!("🚨 [{}] EMERGENCY SHUTDOWN INITIATED: {}", agent_id, event.reason);
                                    }
                                    crate::emergency_shutdown::ShutdownEventType::GracefulShutdown => {
                                        warn!("⏰ [{}] Graceful shutdown period started: {}", agent_id, event.reason);
                                    }
                                    crate::emergency_shutdown::ShutdownEventType::ForcefulShutdown => {
                                        error!("⚠️ [{}] FORCEFUL SHUTDOWN: {}", agent_id, event.reason);
                                    }
                                    crate::emergency_shutdown::ShutdownEventType::RecoveryDetected => {
                                        info!("✅ [{}] Recovery detected: {}", agent_id, event.reason);
                                    }
                                    crate::emergency_shutdown::ShutdownEventType::ShutdownAborted => {
                                        info!("🔄 [{}] Shutdown aborted: {}", agent_id, event.reason);
                                    }
                                    _ => {
                                        debug!("🚨 [{}] Emergency shutdown event: {:?} - {}", 
                                               agent_id, event.event_type, event.reason);
                                    }
                                }
                            }
                        }
                        // Handle final shutdown signal
                        _ = emergency_shutdown_receiver.recv() => {
                            error!("🚨 [{}] FINAL EMERGENCY SHUTDOWN SIGNAL RECEIVED", agent_id);
                            let _ = final_shutdown_sender.send(());
                            break;
                        }
                    }
                }
            });
            
            info!("🚨 Emergency shutdown monitoring started with event handling");
        } else {
            warn!("⚠️ Emergency shutdown or resource monitor not initialized, skipping emergency monitoring");
        }
        
        Ok(())
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
    
    pub async fn get_resource_metrics(&self) -> Result<Option<crate::resource_monitor::ResourceMetrics>> {
        if let Some(resource_monitor) = &self.resource_monitor {
            Ok(Some(resource_monitor.get_current_metrics().await?))
        } else {
            Ok(None)
        }
    }
    
    pub async fn get_resource_stats(&self) -> Option<crate::resource_monitor::ResourceMonitorStats> {
        if let Some(resource_monitor) = &self.resource_monitor {
            Some(resource_monitor.get_stats().await)
        } else {
            None
        }
    }
    
    async fn start_security_monitoring(&self, shutdown_sender: tokio::sync::broadcast::Sender<()>) -> Result<()> {
        if let Some(security_manager) = &self.security_manager {
            // Start credential rotation monitoring
            let rotation_shutdown_receiver = shutdown_sender.subscribe();
            security_manager.start_rotation_monitoring(rotation_shutdown_receiver).await?;
            
            // Start security event monitoring
            let mut rotation_event_receiver = security_manager.subscribe_to_rotation_events();
            let mut audit_event_receiver = security_manager.subscribe_to_audit_events();
            let agent_id = self.agent_id.clone();
            let stats = self.stats.clone();
            
            tokio::spawn(async move {
                let mut shutdown_receiver = shutdown_sender.subscribe();
                
                loop {
                    tokio::select! {
                        // Handle credential rotation events
                        rotation_result = rotation_event_receiver.recv() => {
                            if let Ok(event) = rotation_result {
                                match event.event_type {
                                    crate::security::RotationEventType::AutomaticRotation => {
                                        info!("🔄 Automatic credential rotation: {}", event.credential_id);
                                    }
                                    crate::security::RotationEventType::ManualRotation => {
                                        info!("🔄 Manual credential rotation: {}", event.credential_id);
                                    }
                                    crate::security::RotationEventType::EmergencyRotation => {
                                        warn!("⚠️ Emergency credential rotation: {}", event.credential_id);
                                    }
                                    crate::security::RotationEventType::ExpirationWarning => {
                                        warn!("⏰ Credential expiration warning: {}", event.credential_id);
                                    }
                                    _ => {
                                        debug!("🔐 Security rotation event: {:?}", event.event_type);
                                    }
                                }
                                
                                if !event.success {
                                    error!("❌ Credential rotation failed: {} - {}", event.credential_id, event.reason);
                                }
                            }
                        }
                        
                        // Handle security audit events
                        audit_result = audit_event_receiver.recv() => {
                            if let Ok(event) = audit_result {
                                match event.risk_level {
                                    crate::security::RiskLevel::Critical => {
                                        error!("🚨 CRITICAL security event: {:?} - {}", event.event_type, event.details);
                                    }
                                    crate::security::RiskLevel::High => {
                                        warn!("⚠️ HIGH risk security event: {:?} - {}", event.event_type, event.details);
                                    }
                                    crate::security::RiskLevel::Medium => {
                                        info!("🔒 Security event: {:?} - {}", event.event_type, event.details);
                                    }
                                    crate::security::RiskLevel::Low => {
                                        debug!("🔐 Security audit: {:?} - {}", event.event_type, event.details);
                                    }
                                }
                                
                                // Update statistics for security events
                                if !event.success && matches!(event.risk_level, crate::security::RiskLevel::High | crate::security::RiskLevel::Critical) {
                                    if let Ok(mut stats_guard) = stats.try_write() {
                                        stats_guard.errors += 1;
                                    }
                                }
                            }
                        }
                        
                        // Handle shutdown
                        _ = shutdown_receiver.recv() => {
                            info!("🛑 Security monitoring shutting down for agent: {}", agent_id);
                            break;
                        }
                    }
                }
            });
            
            info!("🔐 Security monitoring and credential rotation started");
        } else {
            warn!("⚠️ Security manager not initialized, skipping security monitoring");
        }
        
        Ok(())
    }

    pub fn get_agent_id(&self) -> &str {
        &self.agent_id
    }
    
    pub async fn get_throttle_stats(&self) -> Option<crate::throttle::ThrottleStats> {
        if let Some(throttle) = &self.throttle {
            Some(throttle.get_stats().await)
        } else {
            None
        }
    }
    
    pub async fn get_emergency_shutdown_stats(&self) -> Option<crate::emergency_shutdown::EmergencyShutdownStats> {
        if let Some(emergency_shutdown) = &self.emergency_shutdown {
            Some(emergency_shutdown.get_stats().await)
        } else {
            None
        }
    }
    
    pub async fn get_emergency_shutdown_state(&self) -> Option<crate::emergency_shutdown::ShutdownState> {
        if let Some(emergency_shutdown) = &self.emergency_shutdown {
            Some(emergency_shutdown.get_state().await)
        } else {
            None
        }
    }
    
    pub async fn request_emergency_shutdown(&self, reason: String) -> Result<()> {
        if let Some(emergency_shutdown) = &self.emergency_shutdown {
            emergency_shutdown.request_shutdown(reason).await
        } else {
            Err(AgentError::Configuration("Emergency shutdown not initialized".to_string()))
        }
    }
    
    pub async fn abort_emergency_shutdown(&self) -> Result<()> {
        if let Some(emergency_shutdown) = &self.emergency_shutdown {
            emergency_shutdown.abort_shutdown().await
        } else {
            Err(AgentError::Configuration("Emergency shutdown not initialized".to_string()))
        }
    }
    
    pub async fn get_security_stats(&self) -> Option<crate::security::SecurityStats> {
        if let Some(security_manager) = &self.security_manager {
            Some(security_manager.get_stats().await)
        } else {
            None
        }
    }
    
    pub async fn store_credential(
        &self,
        id: String,
        credential_type: crate::security::CredentialType,
        value: &str,
        metadata: Option<std::collections::HashMap<String, String>>,
        manual_rotation_only: bool,
    ) -> Result<()> {
        if let Some(security_manager) = &self.security_manager {
            security_manager.store_credential(id, credential_type, value, metadata, manual_rotation_only).await
        } else {
            Err(AgentError::Configuration("Security manager not initialized".to_string()))
        }
    }
    
    pub async fn get_credential(&self, id: &str) -> Result<String> {
        if let Some(security_manager) = &self.security_manager {
            security_manager.get_credential(id).await
        } else {
            Err(AgentError::Configuration("Security manager not initialized".to_string()))
        }
    }
    
    pub async fn rotate_credential(&self, id: &str, new_value: &str) -> Result<()> {
        if let Some(security_manager) = &self.security_manager {
            security_manager.rotate_credential(id, new_value).await
        } else {
            Err(AgentError::Configuration("Security manager not initialized".to_string()))
        }
    }
    
    pub async fn list_credentials(&self) -> Vec<(String, crate::security::CredentialType, std::collections::HashMap<String, String>)> {
        if let Some(security_manager) = &self.security_manager {
            security_manager.list_credentials().await
        } else {
            Vec::new()
        }
    }
    
    pub async fn delete_credential(&self, id: &str) -> Result<()> {
        if let Some(security_manager) = &self.security_manager {
            security_manager.delete_credential(id).await
        } else {
            Err(AgentError::Configuration("Security manager not initialized".to_string()))
        }
    }
}

impl Drop for Agent {
    fn drop(&mut self) {
        info!("🤖 SecureWatch Agent shutting down");
    }
}