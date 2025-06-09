// Emergency Shutdown System for Critical Resource Conditions
// Implements graceful shutdown coordination when system resources reach critical levels

use crate::errors::{AgentError, Result};
use crate::resource_monitor::{ResourceAlert, AlertLevel, ResourceMetrics};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};
use tokio::sync::{broadcast, RwLock, Mutex};
use tokio::time::{interval, timeout};
use tracing::{info, warn, error, debug};
use serde::{Deserialize, Serialize};

/// Configuration for emergency shutdown behavior
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmergencyShutdownConfig {
    /// Enable emergency shutdown on critical conditions
    pub enabled: bool,
    
    /// Grace period before forceful shutdown (seconds)
    pub grace_period_seconds: u64,
    
    /// Number of consecutive critical alerts before shutdown
    pub critical_alert_threshold: u32,
    
    /// Time window for alert counting (seconds)
    pub alert_window_seconds: u64,
    
    /// Enable shutdown on memory exhaustion
    pub shutdown_on_memory_critical: bool,
    
    /// Enable shutdown on CPU overload
    pub shutdown_on_cpu_critical: bool,
    
    /// Enable shutdown on disk space critical
    pub shutdown_on_disk_critical: bool,
    
    /// Memory threshold percentage for emergency shutdown
    pub memory_emergency_percent: f32,
    
    /// CPU threshold percentage for emergency shutdown  
    pub cpu_emergency_percent: f32,
    
    /// Disk threshold percentage for emergency shutdown
    pub disk_emergency_percent: f32,
    
    /// Allow recovery if conditions improve
    pub allow_recovery: bool,
    
    /// Recovery threshold (percentage below emergency)
    pub recovery_margin_percent: f32,
}

impl Default for EmergencyShutdownConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            grace_period_seconds: 30,
            critical_alert_threshold: 3,
            alert_window_seconds: 60,
            shutdown_on_memory_critical: true,
            shutdown_on_cpu_critical: true,
            shutdown_on_disk_critical: true,
            memory_emergency_percent: 95.0,
            cpu_emergency_percent: 98.0,
            disk_emergency_percent: 98.0,
            allow_recovery: true,
            recovery_margin_percent: 10.0,
        }
    }
}

/// Emergency shutdown state
#[derive(Debug, Clone, Copy, PartialEq, Serialize)]
pub enum ShutdownState {
    Normal,
    Warning,
    Critical,
    ShuttingDown,
    Recovered,
}

/// Emergency shutdown event for monitoring
#[derive(Debug, Clone, Serialize)]
pub struct ShutdownEvent {
    pub timestamp: u64,
    pub event_type: ShutdownEventType,
    pub state: ShutdownState,
    pub reason: String,
    pub metrics: Option<ResourceMetrics>,
    pub alert_count: u32,
}

#[derive(Debug, Clone, Serialize)]
pub enum ShutdownEventType {
    StateChange,
    AlertReceived,
    ShutdownInitiated,
    GracefulShutdown,
    ForcefulShutdown,
    RecoveryDetected,
    ShutdownAborted,
}

/// Statistics for emergency shutdown system
#[derive(Debug, Clone, Default, Serialize)]
pub struct EmergencyShutdownStats {
    pub current_state: ShutdownState,
    pub critical_alerts_count: u32,
    pub total_alerts_received: u64,
    pub shutdown_initiated_count: u64,
    pub recovery_count: u64,
    pub last_critical_alert: Option<Instant>,
    pub consecutive_critical_count: u32,
    pub uptime_seconds: u64,
}

/// Alert tracking for shutdown decisions
#[derive(Debug)]
struct AlertTracker {
    alerts: Vec<(Instant, AlertLevel, String)>,
    window_duration: Duration,
}

impl AlertTracker {
    fn new(window_seconds: u64) -> Self {
        Self {
            alerts: Vec::new(),
            window_duration: Duration::from_secs(window_seconds),
        }
    }
    
    fn add_alert(&mut self, level: AlertLevel, reason: String) {
        let now = Instant::now();
        self.alerts.push((now, level, reason));
        self.cleanup_old_alerts(now);
    }
    
    fn cleanup_old_alerts(&mut self, now: Instant) {
        self.alerts.retain(|(time, _, _)| {
            now.duration_since(*time) <= self.window_duration
        });
    }
    
    fn count_critical_alerts(&self) -> u32 {
        self.alerts.iter()
            .filter(|(_, level, _)| matches!(level, AlertLevel::Emergency | AlertLevel::Critical))
            .count() as u32
    }
    
    fn get_recent_reasons(&self) -> Vec<String> {
        self.alerts.iter()
            .filter(|(_, level, _)| matches!(level, AlertLevel::Emergency | AlertLevel::Critical))
            .map(|(_, _, reason)| reason.clone())
            .collect()
    }
}

/// Emergency shutdown coordinator
pub struct EmergencyShutdownCoordinator {
    config: EmergencyShutdownConfig,
    state: Arc<RwLock<ShutdownState>>,
    stats: Arc<RwLock<EmergencyShutdownStats>>,
    alert_tracker: Arc<Mutex<AlertTracker>>,
    
    // Shutdown control
    shutdown_initiated: Arc<AtomicBool>,
    shutdown_sender: broadcast::Sender<()>,
    
    // Event broadcasting
    event_sender: broadcast::Sender<ShutdownEvent>,
    
    // Resource thresholds tracking
    last_metrics: Arc<RwLock<Option<ResourceMetrics>>>,
    
    start_time: Instant,
}

impl EmergencyShutdownCoordinator {
    /// Create a new emergency shutdown coordinator
    pub fn new(config: EmergencyShutdownConfig) -> Result<Self> {
        info!("🚨 Initializing emergency shutdown coordinator");
        
        let (shutdown_sender, _) = broadcast::channel(10);
        let (event_sender, _) = broadcast::channel(1000);
        
        let stats = EmergencyShutdownStats {
            current_state: ShutdownState::Normal,
            ..Default::default()
        };
        
        Ok(Self {
            config,
            state: Arc::new(RwLock::new(ShutdownState::Normal)),
            stats: Arc::new(RwLock::new(stats)),
            alert_tracker: Arc::new(Mutex::new(AlertTracker::new(config.alert_window_seconds))),
            shutdown_initiated: Arc::new(AtomicBool::new(false)),
            shutdown_sender,
            event_sender,
            last_metrics: Arc::new(RwLock::new(None)),
            start_time: Instant::now(),
        })
    }
    
    /// Start monitoring for emergency conditions
    pub async fn start_monitoring(
        &self,
        mut alert_receiver: broadcast::Receiver<ResourceAlert>,
        mut metrics_receiver: broadcast::Receiver<ResourceMetrics>,
        agent_shutdown_sender: broadcast::Sender<()>,
    ) -> Result<()> {
        if !self.config.enabled {
            info!("⚠️ Emergency shutdown is disabled");
            return Ok(());
        }
        
        info!("🚀 Starting emergency shutdown monitoring");
        
        // Start alert monitoring task
        self.start_alert_monitoring(alert_receiver, agent_shutdown_sender.clone()).await;
        
        // Start metrics monitoring task
        self.start_metrics_monitoring(metrics_receiver, agent_shutdown_sender.clone()).await;
        
        // Start state monitoring task
        self.start_state_monitoring(agent_shutdown_sender).await;
        
        Ok(())
    }
    
    /// Monitor resource alerts
    async fn start_alert_monitoring(
        &self,
        mut alert_receiver: broadcast::Receiver<ResourceAlert>,
        agent_shutdown_sender: broadcast::Sender<()>,
    ) {
        let config = self.config.clone();
        let state = self.state.clone();
        let stats = self.stats.clone();
        let alert_tracker = self.alert_tracker.clone();
        let event_sender = self.event_sender.clone();
        let shutdown_initiated = self.shutdown_initiated.clone();
        
        tokio::spawn(async move {
            while let Ok(alert) = alert_receiver.recv().await {
                // Update stats
                {
                    let mut stats = stats.write().await;
                    stats.total_alerts_received += 1;
                    
                    if matches!(alert.alert_level, AlertLevel::Emergency | AlertLevel::Critical) {
                        stats.last_critical_alert = Some(Instant::now());
                    }
                }
                
                // Track alert
                {
                    let mut tracker = alert_tracker.lock().await;
                    tracker.add_alert(alert.alert_level.clone(), alert.message.clone());
                    
                    let critical_count = tracker.count_critical_alerts();
                    
                    // Update consecutive count in stats
                    {
                        let mut stats = stats.write().await;
                        stats.critical_alerts_count = critical_count;
                        stats.consecutive_critical_count = critical_count;
                    }
                    
                    // Check if we should initiate shutdown
                    if critical_count >= config.critical_alert_threshold &&
                       !shutdown_initiated.load(Ordering::SeqCst) {
                        
                        let should_shutdown = match &alert.resource_type[..] {
                            "CPU" => config.shutdown_on_cpu_critical,
                            "Memory" => config.shutdown_on_memory_critical,
                            "Disk" => config.shutdown_on_disk_critical,
                            _ => false,
                        };
                        
                        if should_shutdown && alert.current_value >= Self::get_emergency_threshold(&config, &alert.resource_type) {
                            error!("🚨 EMERGENCY: Critical threshold reached for {} - initiating shutdown", 
                                   alert.resource_type);
                            
                            // Update state
                            *state.write().await = ShutdownState::Critical;
                            
                            // Get reasons for shutdown
                            let reasons = tracker.get_recent_reasons();
                            let reason = format!("Critical alerts: {}", reasons.join(", "));
                            
                            // Send shutdown event
                            let event = ShutdownEvent {
                                timestamp: Instant::now().elapsed().as_secs(),
                                event_type: ShutdownEventType::ShutdownInitiated,
                                state: ShutdownState::Critical,
                                reason: reason.clone(),
                                metrics: None,
                                alert_count: critical_count,
                            };
                            
                            let _ = event_sender.send(event);
                            
                            // Initiate shutdown
                            shutdown_initiated.store(true, Ordering::SeqCst);
                            
                            // Trigger agent shutdown
                            let _ = agent_shutdown_sender.send(());
                            
                            // Update stats
                            {
                                let mut stats = stats.write().await;
                                stats.shutdown_initiated_count += 1;
                                stats.current_state = ShutdownState::Critical;
                            }
                            
                            warn!("🚨 Emergency shutdown initiated: {}", reason);
                        }
                    }
                }
                
                // Send alert event
                let event = ShutdownEvent {
                    timestamp: alert.timestamp,
                    event_type: ShutdownEventType::AlertReceived,
                    state: *state.read().await,
                    reason: format!("{}: {}", alert.resource_type, alert.message),
                    metrics: None,
                    alert_count: stats.read().await.critical_alerts_count,
                };
                
                let _ = event_sender.send(event);
            }
        });
    }
    
    /// Monitor resource metrics for direct threshold checks
    async fn start_metrics_monitoring(
        &self,
        mut metrics_receiver: broadcast::Receiver<ResourceMetrics>,
        agent_shutdown_sender: broadcast::Sender<()>,
    ) {
        let config = self.config.clone();
        let state = self.state.clone();
        let stats = self.stats.clone();
        let event_sender = self.event_sender.clone();
        let shutdown_initiated = self.shutdown_initiated.clone();
        let last_metrics = self.last_metrics.clone();
        
        tokio::spawn(async move {
            let mut consecutive_emergency_count = 0u32;
            
            while let Ok(metrics) = metrics_receiver.recv().await {
                // Store latest metrics
                *last_metrics.write().await = Some(metrics.clone());
                
                // Check direct emergency thresholds
                let mut emergency_conditions = Vec::new();
                
                if config.shutdown_on_cpu_critical && metrics.cpu.usage_percent >= config.cpu_emergency_percent {
                    emergency_conditions.push(format!("CPU at {:.1}%", metrics.cpu.usage_percent));
                }
                
                if config.shutdown_on_memory_critical && metrics.memory.usage_percent >= config.memory_emergency_percent {
                    emergency_conditions.push(format!("Memory at {:.1}%", metrics.memory.usage_percent));
                }
                
                if config.shutdown_on_disk_critical {
                    for disk in &metrics.disk {
                        if disk.usage_percent >= config.disk_emergency_percent {
                            emergency_conditions.push(format!("Disk {} at {:.1}%", disk.mount_point, disk.usage_percent));
                        }
                    }
                }
                
                if !emergency_conditions.is_empty() {
                    consecutive_emergency_count += 1;
                    
                    if consecutive_emergency_count >= config.critical_alert_threshold &&
                       !shutdown_initiated.load(Ordering::SeqCst) {
                        
                        error!("🚨 EMERGENCY: Direct threshold monitoring detected critical conditions");
                        
                        // Update state
                        *state.write().await = ShutdownState::Critical;
                        
                        let reason = format!("Emergency thresholds exceeded: {}", emergency_conditions.join(", "));
                        
                        // Send shutdown event
                        let event = ShutdownEvent {
                            timestamp: metrics.timestamp,
                            event_type: ShutdownEventType::ShutdownInitiated,
                            state: ShutdownState::Critical,
                            reason: reason.clone(),
                            metrics: Some(metrics.clone()),
                            alert_count: consecutive_emergency_count,
                        };
                        
                        let _ = event_sender.send(event);
                        
                        // Initiate shutdown
                        shutdown_initiated.store(true, Ordering::SeqCst);
                        
                        // Trigger agent shutdown
                        let _ = agent_shutdown_sender.send(());
                        
                        // Update stats
                        {
                            let mut stats = stats.write().await;
                            stats.shutdown_initiated_count += 1;
                            stats.current_state = ShutdownState::Critical;
                        }
                        
                        error!("🚨 Emergency shutdown initiated: {}", reason);
                    }
                } else {
                    // Check for recovery
                    if config.allow_recovery && consecutive_emergency_count > 0 {
                        consecutive_emergency_count = 0;
                        
                        if shutdown_initiated.load(Ordering::SeqCst) {
                            // Check if we're below recovery thresholds
                            if Self::check_recovery_conditions(&config, &metrics) {
                                info!("✅ Recovery conditions met - aborting shutdown");
                                
                                *state.write().await = ShutdownState::Recovered;
                                shutdown_initiated.store(false, Ordering::SeqCst);
                                
                                let event = ShutdownEvent {
                                    timestamp: metrics.timestamp,
                                    event_type: ShutdownEventType::RecoveryDetected,
                                    state: ShutdownState::Recovered,
                                    reason: "Resource usage returned to safe levels".to_string(),
                                    metrics: Some(metrics),
                                    alert_count: 0,
                                };
                                
                                let _ = event_sender.send(event);
                                
                                {
                                    let mut stats = stats.write().await;
                                    stats.recovery_count += 1;
                                    stats.current_state = ShutdownState::Recovered;
                                }
                            }
                        }
                    }
                }
            }
        });
    }
    
    /// Monitor shutdown state and enforce grace period
    async fn start_state_monitoring(
        &self,
        agent_shutdown_sender: broadcast::Sender<()>,
    ) {
        let config = self.config.clone();
        let state = self.state.clone();
        let stats = self.stats.clone();
        let event_sender = self.event_sender.clone();
        let shutdown_initiated = self.shutdown_initiated.clone();
        let shutdown_sender = self.shutdown_sender.clone();
        let start_time = self.start_time;
        
        tokio::spawn(async move {
            let mut state_timer = interval(Duration::from_secs(1));
            let mut shutdown_start_time: Option<Instant> = None;
            
            loop {
                state_timer.tick().await;
                
                // Update uptime
                {
                    let mut stats = stats.write().await;
                    stats.uptime_seconds = start_time.elapsed().as_secs();
                }
                
                // Check shutdown state
                if shutdown_initiated.load(Ordering::SeqCst) {
                    if shutdown_start_time.is_none() {
                        shutdown_start_time = Some(Instant::now());
                        *state.write().await = ShutdownState::ShuttingDown;
                        
                        info!("⏰ Graceful shutdown period started ({} seconds)", config.grace_period_seconds);
                        
                        let event = ShutdownEvent {
                            timestamp: Instant::now().elapsed().as_secs(),
                            event_type: ShutdownEventType::GracefulShutdown,
                            state: ShutdownState::ShuttingDown,
                            reason: format!("Grace period of {} seconds started", config.grace_period_seconds),
                            metrics: None,
                            alert_count: 0,
                        };
                        
                        let _ = event_sender.send(event);
                    }
                    
                    if let Some(start_time) = shutdown_start_time {
                        let elapsed = start_time.elapsed();
                        
                        if elapsed >= Duration::from_secs(config.grace_period_seconds) {
                            error!("⚠️ Grace period expired - forcing shutdown");
                            
                            let event = ShutdownEvent {
                                timestamp: Instant::now().elapsed().as_secs(),
                                event_type: ShutdownEventType::ForcefulShutdown,
                                state: ShutdownState::ShuttingDown,
                                reason: "Grace period expired".to_string(),
                                metrics: None,
                                alert_count: 0,
                            };
                            
                            let _ = event_sender.send(event);
                            
                            // Send final shutdown signal
                            let _ = shutdown_sender.send(());
                            let _ = agent_shutdown_sender.send(());
                            
                            // Exit the monitoring loop
                            break;
                        } else {
                            let remaining = config.grace_period_seconds - elapsed.as_secs();
                            if remaining % 10 == 0 && remaining > 0 {
                                warn!("⏰ Shutdown in {} seconds...", remaining);
                            }
                        }
                    }
                } else if shutdown_start_time.is_some() {
                    // Shutdown was aborted
                    shutdown_start_time = None;
                    
                    let event = ShutdownEvent {
                        timestamp: Instant::now().elapsed().as_secs(),
                        event_type: ShutdownEventType::ShutdownAborted,
                        state: *state.read().await,
                        reason: "Shutdown aborted due to recovery".to_string(),
                        metrics: None,
                        alert_count: 0,
                    };
                    
                    let _ = event_sender.send(event);
                }
            }
        });
    }
    
    /// Get emergency threshold for resource type
    fn get_emergency_threshold(config: &EmergencyShutdownConfig, resource_type: &str) -> f32 {
        match resource_type {
            "CPU" => config.cpu_emergency_percent,
            "Memory" => config.memory_emergency_percent,
            "Disk" => config.disk_emergency_percent,
            _ => 100.0,
        }
    }
    
    /// Check if recovery conditions are met
    fn check_recovery_conditions(config: &EmergencyShutdownConfig, metrics: &ResourceMetrics) -> bool {
        let cpu_safe = metrics.cpu.usage_percent < (config.cpu_emergency_percent - config.recovery_margin_percent);
        let memory_safe = metrics.memory.usage_percent < (config.memory_emergency_percent - config.recovery_margin_percent);
        
        let disks_safe = metrics.disk.iter().all(|disk| {
            disk.usage_percent < (config.disk_emergency_percent - config.recovery_margin_percent)
        });
        
        cpu_safe && memory_safe && disks_safe
    }
    
    /// Request graceful shutdown
    pub async fn request_shutdown(&self, reason: String) -> Result<()> {
        if self.shutdown_initiated.swap(true, Ordering::SeqCst) {
            return Ok(()); // Already shutting down
        }
        
        error!("🚨 Emergency shutdown requested: {}", reason);
        
        *self.state.write().await = ShutdownState::Critical;
        
        let event = ShutdownEvent {
            timestamp: Instant::now().elapsed().as_secs(),
            event_type: ShutdownEventType::ShutdownInitiated,
            state: ShutdownState::Critical,
            reason,
            metrics: self.last_metrics.read().await.clone(),
            alert_count: self.stats.read().await.critical_alerts_count,
        };
        
        let _ = self.event_sender.send(event);
        
        Ok(())
    }
    
    /// Abort shutdown if conditions improve
    pub async fn abort_shutdown(&self) -> Result<()> {
        if !self.config.allow_recovery {
            return Err(AgentError::Configuration("Recovery not allowed in configuration".to_string()));
        }
        
        if !self.shutdown_initiated.load(Ordering::SeqCst) {
            return Ok(()); // Not shutting down
        }
        
        info!("✅ Aborting emergency shutdown");
        
        self.shutdown_initiated.store(false, Ordering::SeqCst);
        *self.state.write().await = ShutdownState::Recovered;
        
        {
            let mut stats = self.stats.write().await;
            stats.recovery_count += 1;
            stats.current_state = ShutdownState::Recovered;
        }
        
        Ok(())
    }
    
    /// Subscribe to shutdown events
    pub fn subscribe_to_events(&self) -> broadcast::Receiver<ShutdownEvent> {
        self.event_sender.subscribe()
    }
    
    /// Subscribe to shutdown signal
    pub fn subscribe_to_shutdown(&self) -> broadcast::Receiver<()> {
        self.shutdown_sender.subscribe()
    }
    
    /// Get current statistics
    pub async fn get_stats(&self) -> EmergencyShutdownStats {
        let mut stats = self.stats.read().await.clone();
        stats.current_state = *self.state.read().await;
        stats.uptime_seconds = self.start_time.elapsed().as_secs();
        stats
    }
    
    /// Get current state
    pub async fn get_state(&self) -> ShutdownState {
        *self.state.read().await
    }
    
    /// Update configuration
    pub async fn update_config(&mut self, new_config: EmergencyShutdownConfig) -> Result<()> {
        info!("🔄 Updating emergency shutdown configuration");
        self.config = new_config;
        Ok(())
    }
    
    /// Perform health check
    pub async fn health_check(&self) -> Result<()> {
        let state = self.get_state().await;
        
        match state {
            ShutdownState::Normal | ShutdownState::Recovered => Ok(()),
            ShutdownState::Warning => Err(AgentError::agent_unhealthy("System in warning state")),
            ShutdownState::Critical | ShutdownState::ShuttingDown => {
                Err(AgentError::agent_unhealthy("System in critical state - shutdown pending"))
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_default_config() {
        let config = EmergencyShutdownConfig::default();
        assert!(config.enabled);
        assert_eq!(config.grace_period_seconds, 30);
        assert_eq!(config.critical_alert_threshold, 3);
        assert!(config.allow_recovery);
    }
    
    #[tokio::test]
    async fn test_coordinator_creation() {
        let config = EmergencyShutdownConfig::default();
        let coordinator = EmergencyShutdownCoordinator::new(config).unwrap();
        
        assert_eq!(coordinator.get_state().await, ShutdownState::Normal);
        
        let stats = coordinator.get_stats().await;
        assert_eq!(stats.current_state, ShutdownState::Normal);
        assert_eq!(stats.critical_alerts_count, 0);
        assert_eq!(stats.shutdown_initiated_count, 0);
    }
    
    #[test]
    fn test_alert_tracker() {
        let mut tracker = AlertTracker::new(60);
        
        tracker.add_alert(AlertLevel::Warning, "Test warning".to_string());
        tracker.add_alert(AlertLevel::Critical, "Test critical".to_string());
        tracker.add_alert(AlertLevel::Emergency, "Test emergency".to_string());
        
        assert_eq!(tracker.count_critical_alerts(), 2);
        
        let reasons = tracker.get_recent_reasons();
        assert_eq!(reasons.len(), 2);
        assert!(reasons.contains(&"Test critical".to_string()));
        assert!(reasons.contains(&"Test emergency".to_string()));
    }
    
    #[test]
    fn test_emergency_thresholds() {
        let config = EmergencyShutdownConfig::default();
        
        assert_eq!(EmergencyShutdownCoordinator::get_emergency_threshold(&config, "CPU"), 98.0);
        assert_eq!(EmergencyShutdownCoordinator::get_emergency_threshold(&config, "Memory"), 95.0);
        assert_eq!(EmergencyShutdownCoordinator::get_emergency_threshold(&config, "Disk"), 98.0);
        assert_eq!(EmergencyShutdownCoordinator::get_emergency_threshold(&config, "Unknown"), 100.0);
    }
    
    #[test]
    fn test_recovery_conditions() {
        let config = EmergencyShutdownConfig::default();
        
        let metrics = ResourceMetrics {
            timestamp: 0,
            cpu: crate::resource_monitor::CpuMetrics {
                usage_percent: 85.0, // Below 98 - 10 = 88
                per_core_usage: vec![],
                core_count: 4,
                load_average: None,
            },
            memory: crate::resource_monitor::MemoryMetrics {
                total_bytes: 1000,
                used_bytes: 800,
                available_bytes: 200,
                usage_percent: 80.0, // Below 95 - 10 = 85
                swap_total_bytes: 0,
                swap_used_bytes: 0,
                swap_usage_percent: 0.0,
            },
            disk: vec![],
            network: vec![],
            processes: None,
            system: crate::resource_monitor::SystemMetrics {
                hostname: "test".to_string(),
                os_name: "test".to_string(),
                os_version: "1.0".to_string(),
                uptime_seconds: 0,
                boot_time: 0,
                temperature: None,
            },
        };
        
        assert!(EmergencyShutdownCoordinator::check_recovery_conditions(&config, &metrics));
    }
    
    #[tokio::test]
    async fn test_request_shutdown() {
        let config = EmergencyShutdownConfig::default();
        let coordinator = EmergencyShutdownCoordinator::new(config).unwrap();
        
        let mut event_receiver = coordinator.subscribe_to_events();
        
        coordinator.request_shutdown("Test shutdown".to_string()).await.unwrap();
        
        assert_eq!(coordinator.get_state().await, ShutdownState::Critical);
        
        // Should receive shutdown event
        let event = tokio::time::timeout(Duration::from_secs(1), event_receiver.recv())
            .await
            .unwrap()
            .unwrap();
        
        assert!(matches!(event.event_type, ShutdownEventType::ShutdownInitiated));
        assert_eq!(event.reason, "Test shutdown");
    }
    
    #[tokio::test]
    async fn test_abort_shutdown() {
        let config = EmergencyShutdownConfig {
            allow_recovery: true,
            ..Default::default()
        };
        let coordinator = EmergencyShutdownCoordinator::new(config).unwrap();
        
        // Request shutdown
        coordinator.request_shutdown("Test".to_string()).await.unwrap();
        assert_eq!(coordinator.get_state().await, ShutdownState::Critical);
        
        // Abort shutdown
        coordinator.abort_shutdown().await.unwrap();
        assert_eq!(coordinator.get_state().await, ShutdownState::Recovered);
        
        let stats = coordinator.get_stats().await;
        assert_eq!(stats.recovery_count, 1);
    }
    
    #[tokio::test]
    async fn test_health_check() {
        let config = EmergencyShutdownConfig::default();
        let coordinator = EmergencyShutdownCoordinator::new(config).unwrap();
        
        // Normal state should pass
        assert!(coordinator.health_check().await.is_ok());
        
        // Critical state should fail
        coordinator.request_shutdown("Test".to_string()).await.unwrap();
        assert!(coordinator.health_check().await.is_err());
    }
}