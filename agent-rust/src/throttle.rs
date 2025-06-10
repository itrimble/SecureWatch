// Adaptive throttling system for resource management
// Implements dynamic rate limiting based on CPU and memory usage

use crate::errors::{AgentError, Result};
use crate::resource_monitor::{ResourceMetrics, AlertLevel};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::{Semaphore, Mutex, RwLock, broadcast};
use tokio::time::{interval, sleep};
use tracing::{debug, info, warn, error};
use serde::{Deserialize, Serialize};

/// Configuration for adaptive throttling
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThrottleConfig {
    /// Base permits available when system is healthy
    pub base_permits: usize,
    /// Minimum permits to maintain (emergency level)
    pub min_permits: usize,
    /// Maximum permits allowed (when system is idle)
    pub max_permits: usize,
    
    /// CPU thresholds for throttling
    pub cpu_throttle_thresholds: ThrottleThresholds,
    /// Memory thresholds for throttling  
    pub memory_throttle_thresholds: ThrottleThresholds,
    
    /// How often to adjust throttling (seconds)
    pub adjustment_interval: u64,
    /// How aggressive to be with adjustments (0.1 = 10% changes)
    pub adjustment_factor: f32,
    
    /// Enable burst allowance during low usage
    pub enable_burst: bool,
    /// Maximum burst permits above base
    pub burst_permits: usize,
    /// How long burst permits last (seconds)
    pub burst_duration: u64,
    
    /// Enable emergency throttling
    pub enable_emergency_throttling: bool,
    /// Permits during emergency conditions
    pub emergency_permits: usize,
}

/// Thresholds for adaptive throttling
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThrottleThresholds {
    /// At this usage, start reducing permits (0-100)
    pub throttle_start: f32,
    /// At this usage, aggressive throttling (0-100)
    pub throttle_aggressive: f32,
    /// At this usage, emergency throttling (0-100)
    pub throttle_emergency: f32,
}

impl Default for ThrottleConfig {
    fn default() -> Self {
        Self {
            base_permits: 100,
            min_permits: 10,
            max_permits: 200,
            cpu_throttle_thresholds: ThrottleThresholds {
                throttle_start: 70.0,
                throttle_aggressive: 85.0,
                throttle_emergency: 95.0,
            },
            memory_throttle_thresholds: ThrottleThresholds {
                throttle_start: 75.0,
                throttle_aggressive: 85.0,
                throttle_emergency: 95.0,
            },
            adjustment_interval: 15, // 15 seconds
            adjustment_factor: 0.2,  // 20% adjustments
            enable_burst: true,
            burst_permits: 50,
            burst_duration: 60, // 1 minute
            enable_emergency_throttling: true,
            emergency_permits: 5,
        }
    }
}

/// Throttling level based on system resources
#[derive(Debug, Clone, Copy, PartialEq, Serialize)]
pub enum ThrottleLevel {
    Normal,      // Normal operation
    Light,       // Light throttling (reduce permits by 10-30%)
    Moderate,    // Moderate throttling (reduce permits by 30-60%)
    Aggressive,  // Aggressive throttling (reduce permits by 60-80%)
    Emergency,   // Emergency throttling (minimal permits)
}

/// Throttling statistics and metrics
#[derive(Debug, Clone, Serialize)]
pub struct ThrottleStats {
    pub current_permits: usize,
    pub permits_in_use: usize,
    pub total_acquisitions: u64,
    pub total_throttled: u64,
    pub current_throttle_level: ThrottleLevel,
    #[serde(skip)]
    pub last_adjustment: Option<Instant>,
    pub emergency_activations: u64,
    pub burst_activations: u64,
    pub average_cpu_usage: f32,
    pub average_memory_usage: f32,
}

/// Throttling decision event
#[derive(Debug, Clone, Serialize)]
pub struct ThrottleEvent {
    pub timestamp: u64,
    pub event_type: ThrottleEventType,
    pub old_permits: usize,
    pub new_permits: usize,
    pub throttle_level: ThrottleLevel,
    pub trigger_reason: String,
    pub cpu_usage: f32,
    pub memory_usage: f32,
}

#[derive(Debug, Clone, Serialize)]
pub enum ThrottleEventType {
    Increase,    // Permits increased
    Decrease,    // Permits decreased
    Emergency,   // Emergency throttling activated
    BurstStart,  // Burst mode activated
    BurstEnd,    // Burst mode deactivated
    Normal,      // Returned to normal operation
}

/// Adaptive throttling system
pub struct AdaptiveThrottle {
    config: ThrottleConfig,
    semaphore: Arc<Semaphore>,
    current_permits: Arc<RwLock<usize>>,
    stats: Arc<RwLock<ThrottleStats>>,
    
    // Burst management
    burst_active: Arc<RwLock<bool>>,
    burst_start_time: Arc<RwLock<Option<Instant>>>,
    
    // Event broadcasting
    event_sender: broadcast::Sender<ThrottleEvent>,
    
    // Resource tracking
    recent_cpu_readings: Arc<Mutex<Vec<(f32, Instant)>>>,
    recent_memory_readings: Arc<Mutex<Vec<(f32, Instant)>>>,
    
    start_time: Instant,
}

impl AdaptiveThrottle {
    /// Create a new adaptive throttling system
    pub fn new(config: ThrottleConfig) -> Result<Self> {
        info!("🚦 Initializing adaptive throttling with {} base permits", config.base_permits);
        
        let semaphore = Arc::new(Semaphore::new(config.base_permits));
        let (event_sender, _) = broadcast::channel(1000);
        
        let stats = ThrottleStats {
            current_permits: config.base_permits,
            permits_in_use: 0,
            total_acquisitions: 0,
            total_throttled: 0,
            current_throttle_level: ThrottleLevel::Normal,
            last_adjustment: None,
            emergency_activations: 0,
            burst_activations: 0,
            average_cpu_usage: 0.0,
            average_memory_usage: 0.0,
        };
        
        let base_permits = config.base_permits;
        
        Ok(Self {
            config,
            semaphore,
            current_permits: Arc::new(RwLock::new(base_permits)),
            stats: Arc::new(RwLock::new(stats)),
            burst_active: Arc::new(RwLock::new(false)),
            burst_start_time: Arc::new(RwLock::new(None)),
            event_sender,
            recent_cpu_readings: Arc::new(Mutex::new(Vec::new())),
            recent_memory_readings: Arc::new(Mutex::new(Vec::new())),
            start_time: Instant::now(),
        })
    }
    
    /// Start the adaptive throttling system
    pub async fn start_monitoring(&self, 
        mut resource_metrics_receiver: broadcast::Receiver<ResourceMetrics>,
        shutdown_receiver: broadcast::Receiver<()>
    ) -> Result<()> {
        info!("🚀 Starting adaptive throttling monitoring");
        
        // Start resource metrics processing
        self.start_resource_processing(resource_metrics_receiver).await;
        
        // Start throttling adjustment task
        self.start_adjustment_task(shutdown_receiver).await;
        
        Ok(())
    }
    
    /// Acquire a permit with throttling
    pub async fn acquire(&self) -> Result<ThrottlePermit> {
        let permit = self.semaphore.clone().acquire_owned().await
            .map_err(|_| AgentError::channel_error("semaphore_acquire", "throttle"))?;
        
        // Update statistics
        {
            let mut stats = self.stats.write().await;
            stats.total_acquisitions += 1;
            stats.permits_in_use = self.config.base_permits - self.semaphore.available_permits();
        }
        
        debug!("🎫 Throttle permit acquired ({} available)", self.semaphore.available_permits());
        
        Ok(ThrottlePermit {
            _permit: permit,
        })
    }
    
    /// Try to acquire a permit without waiting
    pub async fn try_acquire(&self) -> Result<Option<ThrottlePermit>> {
        match self.semaphore.clone().try_acquire_owned() {
            Ok(permit) => {
                // Update statistics
                {
                    let mut stats = self.stats.write().await;
                    stats.total_acquisitions += 1;
                    stats.permits_in_use = self.config.base_permits - self.semaphore.available_permits();
                }
                
                debug!("🎫 Throttle permit acquired immediately ({} available)", self.semaphore.available_permits());
                Ok(Some(ThrottlePermit { _permit: permit }))
            }
            Err(_) => {
                // Update throttled statistics
                {
                    let mut stats = self.stats.write().await;
                    stats.total_throttled += 1;
                }
                
                debug!("🚫 Throttle permit denied - no permits available");
                Ok(None)
            }
        }
    }
    
    /// Start processing resource metrics
    async fn start_resource_processing(&self, metrics_receiver: broadcast::Receiver<ResourceMetrics>) {
        let recent_cpu = self.recent_cpu_readings.clone();
        let recent_memory = self.recent_memory_readings.clone();
        
        tokio::spawn(async move {
            let mut metrics_receiver = metrics_receiver;
            while let Ok(metrics) = metrics_receiver.recv().await {
                let now = Instant::now();
                
                // Store recent CPU readings (keep last 5 minutes)
                {
                    let mut cpu_readings = recent_cpu.lock().await;
                    cpu_readings.push((metrics.cpu.usage_percent, now));
                    cpu_readings.retain(|(_, time)| now.duration_since(*time) < Duration::from_secs(300));
                }
                
                // Store recent memory readings (keep last 5 minutes)
                {
                    let mut memory_readings = recent_memory.lock().await;
                    memory_readings.push((metrics.memory.usage_percent, now));
                    memory_readings.retain(|(_, time)| now.duration_since(*time) < Duration::from_secs(300));
                }
                
                debug!("📊 Resource metrics updated: CPU={:.1}%, Memory={:.1}%", 
                       metrics.cpu.usage_percent, metrics.memory.usage_percent);
            }
        });
        
        info!("📊 Resource metrics processing started");
    }
    
    /// Start the throttling adjustment task
    async fn start_adjustment_task(&self, mut shutdown_receiver: broadcast::Receiver<()>) {
        let config = self.config.clone();
        let adjustment_interval = config.adjustment_interval;
        let semaphore = self.semaphore.clone();
        let current_permits = self.current_permits.clone();
        let stats = self.stats.clone();
        let burst_active = self.burst_active.clone();
        let burst_start_time = self.burst_start_time.clone();
        let event_sender = self.event_sender.clone();
        let recent_cpu = self.recent_cpu_readings.clone();
        let recent_memory = self.recent_memory_readings.clone();
        
        tokio::spawn(async move {
            let mut adjustment_timer = interval(Duration::from_secs(config.adjustment_interval));
            
            loop {
                tokio::select! {
                    _ = adjustment_timer.tick() => {
                        if let Err(e) = Self::perform_adjustment(
                            &config,
                            &semaphore,
                            &current_permits,
                            &stats,
                            &burst_active,
                            &burst_start_time,
                            &event_sender,
                            &recent_cpu,
                            &recent_memory,
                        ).await {
                            error!("❌ Throttling adjustment failed: {}", e);
                        }
                    }
                    _ = shutdown_receiver.recv() => {
                        info!("🛑 Throttling adjustment task shutting down");
                        break;
                    }
                }
            }
        });
        
        info!("⚙️ Throttling adjustment task started (interval: {}s)", adjustment_interval);
    }
    
    /// Perform throttling adjustment based on current metrics
    async fn perform_adjustment(
        config: &ThrottleConfig,
        semaphore: &Arc<Semaphore>,
        current_permits: &Arc<RwLock<usize>>,
        stats: &Arc<RwLock<ThrottleStats>>,
        burst_active: &Arc<RwLock<bool>>,
        burst_start_time: &Arc<RwLock<Option<Instant>>>,
        event_sender: &broadcast::Sender<ThrottleEvent>,
        recent_cpu: &Arc<Mutex<Vec<(f32, Instant)>>>,
        recent_memory: &Arc<Mutex<Vec<(f32, Instant)>>>,
    ) -> Result<()> {
        let now = Instant::now();
        
        // Calculate average CPU and memory usage over the last minute
        let avg_cpu = {
            let cpu_readings = recent_cpu.lock().await;
            if cpu_readings.is_empty() {
                0.0
            } else {
                let recent: Vec<f32> = cpu_readings.iter()
                    .filter(|(_, time)| now.duration_since(*time) < Duration::from_secs(60))
                    .map(|(usage, _)| *usage)
                    .collect();
                if recent.is_empty() { 0.0 } else { recent.iter().sum::<f32>() / recent.len() as f32 }
            }
        };
        
        let avg_memory = {
            let memory_readings = recent_memory.lock().await;
            if memory_readings.is_empty() {
                0.0
            } else {
                let recent: Vec<f32> = memory_readings.iter()
                    .filter(|(_, time)| now.duration_since(*time) < Duration::from_secs(60))
                    .map(|(usage, _)| *usage)
                    .collect();
                if recent.is_empty() { 0.0 } else { recent.iter().sum::<f32>() / recent.len() as f32 }
            }
        };
        
        // Determine throttle level based on both CPU and memory
        let cpu_level = Self::determine_throttle_level(avg_cpu, &config.cpu_throttle_thresholds);
        let memory_level = Self::determine_throttle_level(avg_memory, &config.memory_throttle_thresholds);
        
        // Use the more aggressive throttle level
        let throttle_level = if memory_level as u8 > cpu_level as u8 { memory_level } else { cpu_level };
        
        // Calculate target permits
        let current = *current_permits.read().await;
        let target_permits = Self::calculate_target_permits(config, throttle_level, avg_cpu, avg_memory);
        
        if target_permits != current {
            let old_permits = current;
            let change = target_permits as i32 - current as i32;
            
            // Update semaphore permits
            if change > 0 {
                semaphore.add_permits(change as usize);
            } else {
                // For reducing permits, we need to acquire and forget them
                // This is a simplified approach - in production you might want more sophisticated logic
                let permits_to_remove = (-change) as usize;
                for _ in 0..permits_to_remove {
                    if let Ok(permit) = semaphore.clone().try_acquire_owned() {
                        // Just let the permit drop to reduce available permits
                        drop(permit);
                    } else {
                        break; // No more permits available to remove
                    }
                }
            }
            
            // Update current permits
            *current_permits.write().await = target_permits;
            
            // Determine event type
            let event_type = match throttle_level {
                ThrottleLevel::Emergency => ThrottleEventType::Emergency,
                _ if change > 0 => ThrottleEventType::Increase,
                _ => ThrottleEventType::Decrease,
            };
            
            // Send throttling event
            let event = ThrottleEvent {
                timestamp: now.elapsed().as_secs(),
                event_type: event_type.clone(),
                old_permits,
                new_permits: target_permits,
                throttle_level,
                trigger_reason: format!("CPU: {:.1}%, Memory: {:.1}%", avg_cpu, avg_memory),
                cpu_usage: avg_cpu,
                memory_usage: avg_memory,
            };
            
            let _ = event_sender.send(event);
            
            // Log the adjustment
            match throttle_level {
                ThrottleLevel::Emergency => {
                    error!("🚨 EMERGENCY THROTTLING: Permits reduced to {} (CPU: {:.1}%, Memory: {:.1}%)", 
                           target_permits, avg_cpu, avg_memory);
                }
                ThrottleLevel::Aggressive => {
                    warn!("⚠️ Aggressive throttling: Permits {} -> {} (CPU: {:.1}%, Memory: {:.1}%)", 
                          old_permits, target_permits, avg_cpu, avg_memory);
                }
                _ => {
                    info!("📈 Throttling adjusted: Permits {} -> {} (CPU: {:.1}%, Memory: {:.1}%)", 
                          old_permits, target_permits, avg_cpu, avg_memory);
                }
            }
        }
        
        // Update statistics
        {
            let mut stats_guard = stats.write().await;
            stats_guard.current_throttle_level = throttle_level;
            stats_guard.last_adjustment = Some(now);
            stats_guard.average_cpu_usage = avg_cpu;
            stats_guard.average_memory_usage = avg_memory;
            stats_guard.permits_in_use = config.base_permits - semaphore.available_permits();
            
            if throttle_level == ThrottleLevel::Emergency {
                stats_guard.emergency_activations += 1;
            }
        }
        
        // Handle burst mode
        Self::handle_burst_mode(config, throttle_level, burst_active, burst_start_time, stats, now).await;
        
        debug!("🔄 Throttling adjustment completed: level={:?}, permits={}, CPU={:.1}%, Memory={:.1}%", 
               throttle_level, target_permits, avg_cpu, avg_memory);
        
        Ok(())
    }
    
    /// Determine throttle level based on usage and thresholds
    fn determine_throttle_level(usage: f32, thresholds: &ThrottleThresholds) -> ThrottleLevel {
        if usage >= thresholds.throttle_emergency {
            ThrottleLevel::Emergency
        } else if usage >= thresholds.throttle_aggressive {
            ThrottleLevel::Aggressive
        } else if usage >= thresholds.throttle_start {
            if usage >= thresholds.throttle_start + (thresholds.throttle_aggressive - thresholds.throttle_start) * 0.5 {
                ThrottleLevel::Moderate
            } else {
                ThrottleLevel::Light
            }
        } else {
            ThrottleLevel::Normal
        }
    }
    
    /// Calculate target permits based on throttle level
    fn calculate_target_permits(config: &ThrottleConfig, level: ThrottleLevel, cpu_usage: f32, memory_usage: f32) -> usize {
        match level {
            ThrottleLevel::Normal => {
                // Normal operation - use base permits or allow burst
                if config.enable_burst && cpu_usage < 30.0 && memory_usage < 40.0 {
                    (config.base_permits + config.burst_permits).min(config.max_permits)
                } else {
                    config.base_permits
                }
            }
            ThrottleLevel::Light => {
                // Light throttling - reduce by 10-30%
                let reduction_factor = 0.1 + (cpu_usage.max(memory_usage) - 60.0) * 0.004; // 0.1 to 0.3
                ((config.base_permits as f32) * (1.0 - reduction_factor)) as usize
            }
            ThrottleLevel::Moderate => {
                // Moderate throttling - reduce by 30-60%
                let reduction_factor = 0.3 + (cpu_usage.max(memory_usage) - 70.0) * 0.02; // 0.3 to 0.6
                ((config.base_permits as f32) * (1.0 - reduction_factor)) as usize
            }
            ThrottleLevel::Aggressive => {
                // Aggressive throttling - reduce by 60-80%
                let reduction_factor = 0.6 + (cpu_usage.max(memory_usage) - 80.0) * 0.01; // 0.6 to 0.8
                ((config.base_permits as f32) * (1.0 - reduction_factor))
                    .max(config.min_permits as f32) as usize
            }
            ThrottleLevel::Emergency => {
                // Emergency throttling - use minimal permits
                if config.enable_emergency_throttling {
                    config.emergency_permits
                } else {
                    config.min_permits
                }
            }
        }
    }
    
    /// Handle burst mode activation and deactivation
    async fn handle_burst_mode(
        config: &ThrottleConfig,
        throttle_level: ThrottleLevel,
        burst_active: &Arc<RwLock<bool>>,
        burst_start_time: &Arc<RwLock<Option<Instant>>>,
        stats: &Arc<RwLock<ThrottleStats>>,
        now: Instant,
    ) {
        if !config.enable_burst {
            return;
        }
        
        let is_burst_active = *burst_active.read().await;
        
        match throttle_level {
            ThrottleLevel::Normal => {
                if !is_burst_active {
                    // Activate burst mode
                    *burst_active.write().await = true;
                    *burst_start_time.write().await = Some(now);
                    stats.write().await.burst_activations += 1;
                    debug!("🚀 Burst mode activated");
                }
            }
            _ => {
                if is_burst_active {
                    // Deactivate burst mode
                    *burst_active.write().await = false;
                    *burst_start_time.write().await = None;
                    debug!("🛑 Burst mode deactivated");
                }
            }
        }
        
        // Check burst duration
        if is_burst_active {
            if let Some(start_time) = *burst_start_time.read().await {
                if now.duration_since(start_time) > Duration::from_secs(config.burst_duration) {
                    *burst_active.write().await = false;
                    *burst_start_time.write().await = None;
                    debug!("⏰ Burst mode expired after {}s", config.burst_duration);
                }
            }
        }
    }
    
    /// Subscribe to throttling events
    pub fn subscribe_to_events(&self) -> broadcast::Receiver<ThrottleEvent> {
        self.event_sender.subscribe()
    }
    
    /// Get current throttling statistics
    pub async fn get_stats(&self) -> ThrottleStats {
        let mut stats = self.stats.read().await.clone();
        stats.current_permits = *self.current_permits.read().await;
        stats.permits_in_use = stats.current_permits - self.semaphore.available_permits();
        stats
    }
    
    /// Update throttling configuration
    pub async fn update_config(&mut self, new_config: ThrottleConfig) -> Result<()> {
        info!("🔄 Updating throttling configuration");
        
        // Adjust semaphore if base permits changed
        let old_base = self.config.base_permits;
        let new_base = new_config.base_permits;
        
        if new_base != old_base {
            let change = new_base as i32 - old_base as i32;
            if change > 0 {
                self.semaphore.add_permits(change as usize);
            }
            *self.current_permits.write().await = new_base;
        }
        
        self.config = new_config;
        info!("✅ Throttling configuration updated");
        Ok(())
    }
}

/// A permit for throttled operations
pub struct ThrottlePermit {
    _permit: tokio::sync::OwnedSemaphorePermit,
}

impl ThrottlePermit {
    /// Get the number of available permits
    pub fn available_permits(&self) -> usize {
        // Note: This would require access to the semaphore, so we'll skip this method
        // or require passing the semaphore reference
        0
    }
}

// Permit is automatically dropped when it goes out of scope, releasing the semaphore

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::time::timeout;
    
    #[tokio::test]
    async fn test_throttle_creation() {
        let config = ThrottleConfig::default();
        let throttle = AdaptiveThrottle::new(config).unwrap();
        
        let stats = throttle.get_stats().await;
        assert_eq!(stats.current_permits, 100);
        assert_eq!(stats.current_throttle_level, ThrottleLevel::Normal);
    }
    
    #[tokio::test]
    async fn test_permit_acquisition() {
        let config = ThrottleConfig::default();
        let throttle = AdaptiveThrottle::new(config).unwrap();
        
        // Should be able to acquire permits
        let permit1 = throttle.acquire().await.unwrap();
        let permit2 = throttle.acquire().await.unwrap();
        
        // Check stats
        let stats = throttle.get_stats().await;
        assert_eq!(stats.total_acquisitions, 2);
        
        // Drop permits
        drop(permit1);
        drop(permit2);
    }
    
    #[tokio::test]
    async fn test_try_acquire() {
        let mut config = ThrottleConfig::default();
        config.base_permits = 2; // Very limited permits
        
        let throttle = AdaptiveThrottle::new(config).unwrap();
        
        // Acquire available permits
        let permit1 = throttle.try_acquire().await.unwrap();
        assert!(permit1.is_some());
        
        let permit2 = throttle.try_acquire().await.unwrap();
        assert!(permit2.is_some());
        
        // Should fail to acquire more
        let permit3 = throttle.try_acquire().await.unwrap();
        assert!(permit3.is_none());
        
        // Check that throttled count increased
        let stats = throttle.get_stats().await;
        assert_eq!(stats.total_throttled, 1);
    }
    
    #[test]
    fn test_throttle_level_determination() {
        let thresholds = ThrottleThresholds {
            throttle_start: 70.0,
            throttle_aggressive: 85.0,
            throttle_emergency: 95.0,
        };
        
        assert_eq!(AdaptiveThrottle::determine_throttle_level(50.0, &thresholds), ThrottleLevel::Normal);
        assert_eq!(AdaptiveThrottle::determine_throttle_level(75.0, &thresholds), ThrottleLevel::Light);
        assert_eq!(AdaptiveThrottle::determine_throttle_level(80.0, &thresholds), ThrottleLevel::Moderate);
        assert_eq!(AdaptiveThrottle::determine_throttle_level(90.0, &thresholds), ThrottleLevel::Aggressive);
        assert_eq!(AdaptiveThrottle::determine_throttle_level(98.0, &thresholds), ThrottleLevel::Emergency);
    }
    
    #[test]
    fn test_target_permits_calculation() {
        let config = ThrottleConfig::default();
        
        // Normal level should use base permits
        let permits = AdaptiveThrottle::calculate_target_permits(&config, ThrottleLevel::Normal, 30.0, 40.0);
        assert_eq!(permits, 150); // base + burst when low usage
        
        // Light throttling should reduce permits
        let permits = AdaptiveThrottle::calculate_target_permits(&config, ThrottleLevel::Light, 75.0, 70.0);
        assert!(permits < config.base_permits);
        assert!(permits > config.base_permits / 2);
        
        // Emergency should use minimal permits
        let permits = AdaptiveThrottle::calculate_target_permits(&config, ThrottleLevel::Emergency, 98.0, 95.0);
        assert_eq!(permits, config.emergency_permits);
    }
    
    #[tokio::test]
    async fn test_config_update() {
        let mut config = ThrottleConfig::default();
        let mut throttle = AdaptiveThrottle::new(config.clone()).unwrap();
        
        // Update configuration
        config.base_permits = 150;
        throttle.update_config(config).await.unwrap();
        
        let stats = throttle.get_stats().await;
        assert_eq!(stats.current_permits, 150);
    }
    
    #[tokio::test]
    async fn test_event_subscription() {
        let config = ThrottleConfig::default();
        let throttle = AdaptiveThrottle::new(config).unwrap();
        
        let mut event_receiver = throttle.subscribe_to_events();
        
        // Should be able to subscribe without blocking
        let result = timeout(Duration::from_millis(100), event_receiver.recv()).await;
        assert!(result.is_err()); // Should timeout as no events generated yet
    }
}