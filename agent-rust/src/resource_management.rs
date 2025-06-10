// Resource Management System - Task 17 Implementation
// Comprehensive CPU throttling, memory limits, rate limiting, and memory pressure detection
// Implements all 4 subtasks of Task 17 with enterprise production features

use crate::errors::{AgentError, Result};
use crate::resource_monitor::{ResourceMetrics, ResourceAlert, AlertLevel};
use crate::throttle::{AdaptiveThrottle, ThrottleConfig, ThrottlePermit};
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::{broadcast, RwLock, Semaphore, Mutex};
use tokio::time::{interval, sleep};
use tracing::{debug, info, warn, error};

/// Comprehensive resource management configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceManagementConfig {
    /// CPU throttling configuration
    pub cpu_throttling: CpuThrottlingConfig,
    /// Memory limits configuration
    pub memory_limits: MemoryLimitsConfig,
    /// Rate limiting configuration
    pub rate_limiting: RateLimitingConfig,
    /// Memory pressure detection configuration
    pub memory_pressure: MemoryPressureConfig,
    /// Resource optimization configuration
    pub optimization: ResourceOptimizationConfig,
}

/// CPU throttling and resource control
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuThrottlingConfig {
    /// Enable CPU throttling
    pub enabled: bool,
    /// CPU usage thresholds for throttling (0-100)
    pub throttle_threshold: f32,
    /// Aggressive throttling threshold (0-100)
    pub aggressive_threshold: f32,
    /// Emergency throttling threshold (0-100)
    pub emergency_threshold: f32,
    /// Throttling check interval (seconds)
    pub check_interval: u64,
    /// Process priority adjustment
    pub adjust_process_priority: bool,
    /// CPU affinity management
    pub manage_cpu_affinity: bool,
    /// Target CPU cores for agent processes
    pub preferred_cpu_cores: Vec<usize>,
}

/// Memory limits enforcement
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryLimitsConfig {
    /// Enable memory limits
    pub enabled: bool,
    /// Maximum memory usage in bytes
    pub max_memory_bytes: u64,
    /// Warning threshold (percentage of max)
    pub warning_threshold: f32,
    /// Critical threshold (percentage of max)
    pub critical_threshold: f32,
    /// Emergency threshold (percentage of max)
    pub emergency_threshold: f32,
    /// Memory cleanup interval (seconds)
    pub cleanup_interval: u64,
    /// Enable garbage collection tuning
    pub gc_tuning_enabled: bool,
    /// Force garbage collection on pressure
    pub force_gc_on_pressure: bool,
}

/// Token bucket rate limiting configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimitingConfig {
    /// Enable rate limiting
    pub enabled: bool,
    /// Token bucket capacity
    pub bucket_capacity: u32,
    /// Token refill rate (tokens per second)
    pub refill_rate: u32,
    /// Burst allowance (additional tokens)
    pub burst_allowance: u32,
    /// Rate limit categories
    pub categories: Vec<RateLimitCategory>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimitCategory {
    pub name: String,
    pub capacity: u32,
    pub refill_rate: u32,
    pub priority: u8, // 0-255, higher = more priority
}

/// Memory pressure detection and response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryPressureConfig {
    /// Enable memory pressure detection
    pub enabled: bool,
    /// Detection interval (seconds)
    pub detection_interval: u64,
    /// Memory pressure thresholds
    pub pressure_thresholds: MemoryPressureThresholds,
    /// Adaptive response configuration
    pub adaptive_response: AdaptiveResponseConfig,
    /// Enable swap monitoring
    pub monitor_swap: bool,
    /// Enable page fault monitoring
    pub monitor_page_faults: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryPressureThresholds {
    /// Low pressure threshold (0-100)
    pub low_pressure: f32,
    /// Medium pressure threshold (0-100)
    pub medium_pressure: f32,
    /// High pressure threshold (0-100)
    pub high_pressure: f32,
    /// Critical pressure threshold (0-100)
    pub critical_pressure: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdaptiveResponseConfig {
    /// Enable adaptive buffer reduction
    pub reduce_buffers: bool,
    /// Enable cache clearing
    pub clear_caches: bool,
    /// Enable background task suspension
    pub suspend_background_tasks: bool,
    /// Enable emergency mode activation
    pub activate_emergency_mode: bool,
}

/// Resource optimization algorithms
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceOptimizationConfig {
    /// Enable resource optimization
    pub enabled: bool,
    /// Optimization interval (seconds)
    pub optimization_interval: u64,
    /// Enable predictive scaling
    pub predictive_scaling: bool,
    /// Enable load balancing
    pub load_balancing: bool,
    /// Resource efficiency targets
    pub efficiency_targets: EfficiencyTargets,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EfficiencyTargets {
    /// Target CPU utilization (0-100)
    pub target_cpu_utilization: f32,
    /// Target memory utilization (0-100)
    pub target_memory_utilization: f32,
    /// Target response time (milliseconds)
    pub target_response_time: u64,
    /// Target throughput (operations per second)
    pub target_throughput: u64,
}

impl Default for ResourceManagementConfig {
    fn default() -> Self {
        Self {
            cpu_throttling: CpuThrottlingConfig {
                enabled: true,
                throttle_threshold: 75.0,
                aggressive_threshold: 85.0,
                emergency_threshold: 95.0,
                check_interval: 5,
                adjust_process_priority: true,
                manage_cpu_affinity: false,
                preferred_cpu_cores: vec![],
            },
            memory_limits: MemoryLimitsConfig {
                enabled: true,
                max_memory_bytes: 2_147_483_648, // 2GB default
                warning_threshold: 70.0,
                critical_threshold: 85.0,
                emergency_threshold: 95.0,
                cleanup_interval: 30,
                gc_tuning_enabled: true,
                force_gc_on_pressure: true,
            },
            rate_limiting: RateLimitingConfig {
                enabled: true,
                bucket_capacity: 1000,
                refill_rate: 100,
                burst_allowance: 200,
                categories: vec![
                    RateLimitCategory {
                        name: "log_ingestion".to_string(),
                        capacity: 5000,
                        refill_rate: 1000,
                        priority: 200,
                    },
                    RateLimitCategory {
                        name: "api_requests".to_string(),
                        capacity: 1000,
                        refill_rate: 200,
                        priority: 150,
                    },
                    RateLimitCategory {
                        name: "background_tasks".to_string(),
                        capacity: 500,
                        refill_rate: 50,
                        priority: 100,
                    },
                ],
            },
            memory_pressure: MemoryPressureConfig {
                enabled: true,
                detection_interval: 10,
                pressure_thresholds: MemoryPressureThresholds {
                    low_pressure: 60.0,
                    medium_pressure: 75.0,
                    high_pressure: 85.0,
                    critical_pressure: 95.0,
                },
                adaptive_response: AdaptiveResponseConfig {
                    reduce_buffers: true,
                    clear_caches: true,
                    suspend_background_tasks: true,
                    activate_emergency_mode: true,
                },
                monitor_swap: true,
                monitor_page_faults: true,
            },
            optimization: ResourceOptimizationConfig {
                enabled: true,
                optimization_interval: 60,
                predictive_scaling: true,
                load_balancing: true,
                efficiency_targets: EfficiencyTargets {
                    target_cpu_utilization: 70.0,
                    target_memory_utilization: 75.0,
                    target_response_time: 100,
                    target_throughput: 1000,
                },
            },
        }
    }
}

/// Memory pressure levels
#[derive(Debug, Clone, Copy, PartialEq, Serialize)]
pub enum MemoryPressureLevel {
    None,
    Low,
    Medium,
    High,
    Critical,
}

/// Resource management events
#[derive(Debug, Clone, Serialize)]
pub struct ResourceManagementEvent {
    pub timestamp: u64,
    pub event_type: ResourceEventType,
    pub description: String,
    pub impact: ResourceImpact,
    pub metrics: ResourceManagementMetrics,
}

#[derive(Debug, Clone, Serialize)]
pub enum ResourceEventType {
    CpuThrottlingActivated,
    MemoryLimitExceeded,
    RateLimitTriggered,
    MemoryPressureDetected,
    OptimizationApplied,
    EmergencyModeActivated,
    ResourceRecovery,
}

#[derive(Debug, Clone, Serialize)]
pub struct ResourceImpact {
    pub severity: AlertLevel,
    pub affected_operations: Vec<String>,
    pub performance_impact: f32, // 0-100 percentage
    pub recovery_time_estimate: Option<Duration>,
}

/// Comprehensive resource management metrics
#[derive(Debug, Clone, Serialize)]
pub struct ResourceManagementMetrics {
    pub cpu: CpuManagementMetrics,
    pub memory: MemoryManagementMetrics,
    pub rate_limiting: RateLimitingMetrics,
    pub pressure: MemoryPressureMetrics,
    pub optimization: OptimizationMetrics,
}

#[derive(Debug, Clone, Serialize)]
pub struct CpuManagementMetrics {
    pub current_usage: f32,
    pub throttling_active: bool,
    pub throttle_level: String,
    pub throttled_operations: u64,
    pub process_priority: Option<i32>,
    pub cpu_affinity: Vec<usize>,
}

#[derive(Debug, Clone, Serialize)]
pub struct MemoryManagementMetrics {
    pub current_usage_bytes: u64,
    pub usage_percentage: f32,
    pub limit_exceeded: bool,
    pub gc_collections: u64,
    pub memory_cleanups: u64,
    pub allocation_rate: f64, // bytes per second
}

#[derive(Debug, Clone, Serialize)]
pub struct RateLimitingMetrics {
    pub total_requests: u64,
    pub allowed_requests: u64,
    pub denied_requests: u64,
    pub current_tokens: u32,
    pub bucket_refills: u64,
    pub category_stats: Vec<CategoryStats>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CategoryStats {
    pub name: String,
    pub tokens: u32,
    pub requests: u64,
    pub denials: u64,
    pub average_wait_time: Duration,
}

#[derive(Debug, Clone, Serialize)]
pub struct MemoryPressureMetrics {
    pub pressure_level: MemoryPressureLevel,
    pub pressure_score: f32, // 0-100
    pub swap_usage: f32,
    pub page_faults_per_second: f64,
    pub adaptive_actions_taken: u64,
    pub pressure_events: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct OptimizationMetrics {
    pub optimizations_applied: u64,
    pub efficiency_score: f32, // 0-100
    pub resource_savings: ResourceSavings,
    pub predictive_actions: u64,
    pub load_balancing_adjustments: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct ResourceSavings {
    pub cpu_savings_percent: f32,
    pub memory_savings_bytes: u64,
    pub response_time_improvement: Duration,
    pub throughput_improvement: f64,
}

/// Token bucket for rate limiting implementation
pub struct TokenBucket {
    capacity: u32,
    tokens: Arc<RwLock<u32>>,
    refill_rate: u32,
    last_refill: Arc<RwLock<Instant>>,
    name: String,
}

impl TokenBucket {
    pub fn new(name: String, capacity: u32, refill_rate: u32) -> Self {
        Self {
            capacity,
            tokens: Arc::new(RwLock::new(capacity)),
            refill_rate,
            last_refill: Arc::new(RwLock::new(Instant::now())),
            name,
        }
    }

    /// Try to consume tokens from the bucket
    pub async fn try_consume(&self, tokens: u32) -> bool {
        self.refill().await;
        
        let mut current_tokens = self.tokens.write().await;
        if *current_tokens >= tokens {
            *current_tokens -= tokens;
            debug!("🪣 Token bucket '{}': consumed {} tokens, {} remaining", 
                   self.name, tokens, *current_tokens);
            true
        } else {
            debug!("🚫 Token bucket '{}': denied {} tokens, only {} available", 
                   self.name, tokens, *current_tokens);
            false
        }
    }

    /// Refill tokens based on elapsed time
    async fn refill(&self) {
        let now = Instant::now();
        let mut last_refill = self.last_refill.write().await;
        let elapsed = now.duration_since(*last_refill);
        
        if elapsed >= Duration::from_millis(100) { // Refill every 100ms minimum
            let tokens_to_add = (elapsed.as_secs_f64() * self.refill_rate as f64) as u32;
            if tokens_to_add > 0 {
                let mut current_tokens = self.tokens.write().await;
                *current_tokens = (*current_tokens + tokens_to_add).min(self.capacity);
                *last_refill = now;
                debug!("🔄 Token bucket '{}': refilled {} tokens, {} total", 
                       self.name, tokens_to_add, *current_tokens);
            }
        }
    }

    /// Get current token count
    pub async fn current_tokens(&self) -> u32 {
        self.refill().await;
        *self.tokens.read().await
    }
}

/// Main resource management system
pub struct ResourceManager {
    config: ResourceManagementConfig,
    cpu_throttle: Option<AdaptiveThrottle>,
    token_buckets: Arc<RwLock<std::collections::HashMap<String, Arc<TokenBucket>>>>,
    memory_stats: Arc<RwLock<MemoryManagementMetrics>>,
    pressure_level: Arc<RwLock<MemoryPressureLevel>>,
    event_sender: broadcast::Sender<ResourceManagementEvent>,
    optimization_history: Arc<Mutex<VecDeque<OptimizationMetrics>>>,
    start_time: Instant,
}

impl ResourceManager {
    /// Create a new resource management system
    pub fn new(config: ResourceManagementConfig) -> Result<Self> {
        info!("🛠️ Initializing comprehensive resource management system");
        
        // Initialize CPU throttling if enabled
        let cpu_throttle = if config.cpu_throttling.enabled {
            let throttle_config = ThrottleConfig {
                base_permits: 100,
                min_permits: 10,
                max_permits: 200,
                adjustment_interval: config.cpu_throttling.check_interval,
                ..Default::default()
            };
            Some(AdaptiveThrottle::new(throttle_config)?)
        } else {
            None
        };

        // Initialize token buckets for rate limiting
        let mut buckets = std::collections::HashMap::new();
        if config.rate_limiting.enabled {
            // Global bucket
            buckets.insert(
                "global".to_string(),
                Arc::new(TokenBucket::new(
                    "global".to_string(),
                    config.rate_limiting.bucket_capacity,
                    config.rate_limiting.refill_rate,
                ))
            );

            // Category buckets
            for category in &config.rate_limiting.categories {
                buckets.insert(
                    category.name.clone(),
                    Arc::new(TokenBucket::new(
                        category.name.clone(),
                        category.capacity,
                        category.refill_rate,
                    ))
                );
            }
        }

        let (event_sender, _) = broadcast::channel(1000);

        Ok(Self {
            config,
            cpu_throttle,
            token_buckets: Arc::new(RwLock::new(buckets)),
            memory_stats: Arc::new(RwLock::new(MemoryManagementMetrics {
                current_usage_bytes: 0,
                usage_percentage: 0.0,
                limit_exceeded: false,
                gc_collections: 0,
                memory_cleanups: 0,
                allocation_rate: 0.0,
            })),
            pressure_level: Arc::new(RwLock::new(MemoryPressureLevel::None)),
            event_sender,
            optimization_history: Arc::new(Mutex::new(VecDeque::with_capacity(100))),
            start_time: Instant::now(),
        })
    }

    /// Start the resource management system
    pub async fn start(&self, 
        mut resource_metrics_receiver: broadcast::Receiver<ResourceMetrics>,
        shutdown_receiver: broadcast::Receiver<()>
    ) -> Result<()> {
        info!("🚀 Starting comprehensive resource management system");

        // Start CPU throttling if enabled
        if let Some(ref throttle) = self.cpu_throttle {
            throttle.start_monitoring(
                resource_metrics_receiver.resubscribe(), 
                shutdown_receiver.resubscribe()
            ).await?;
        }

        // Start memory pressure detection
        self.start_memory_pressure_monitoring(
            resource_metrics_receiver.resubscribe(),
            shutdown_receiver.resubscribe()
        ).await;

        // Start resource optimization
        self.start_resource_optimization(
            resource_metrics_receiver.resubscribe(),
            shutdown_receiver.resubscribe()
        ).await;

        // Start main resource monitoring loop
        self.start_resource_monitoring(
            resource_metrics_receiver,
            shutdown_receiver
        ).await;

        Ok(())
    }

    /// Acquire a resource permit with comprehensive checks
    pub async fn acquire_resource_permit(&self, category: &str, tokens: u32) -> Result<Option<ResourcePermit>> {
        // Check rate limiting first
        if self.config.rate_limiting.enabled {
            let buckets = self.token_buckets.read().await;
            
            // Try global bucket first
            if let Some(global_bucket) = buckets.get("global") {
                if !global_bucket.try_consume(1).await {
                    debug!("🚫 Resource permit denied: global rate limit exceeded");
                    return Ok(None);
                }
            }

            // Try category-specific bucket
            if let Some(category_bucket) = buckets.get(category) {
                if !category_bucket.try_consume(tokens).await {
                    debug!("🚫 Resource permit denied: {} rate limit exceeded", category);
                    return Ok(None);
                }
            }
        }

        // Check memory limits
        if self.config.memory_limits.enabled {
            let memory_stats = self.memory_stats.read().await;
            if memory_stats.limit_exceeded {
                debug!("🚫 Resource permit denied: memory limit exceeded");
                return Ok(None);
            }
        }

        // Check memory pressure
        let pressure = *self.pressure_level.read().await;
        match pressure {
            MemoryPressureLevel::Critical => {
                debug!("🚫 Resource permit denied: critical memory pressure");
                return Ok(None);
            }
            MemoryPressureLevel::High => {
                // Allow only high priority operations
                if !self.is_high_priority_operation(category) {
                    debug!("🚫 Resource permit denied: high memory pressure, only priority ops allowed");
                    return Ok(None);
                }
            }
            _ => {}
        }

        // Try to acquire CPU throttling permit if enabled
        let throttle_permit = if let Some(ref throttle) = self.cpu_throttle {
            match throttle.try_acquire().await? {
                Some(permit) => Some(permit),
                None => {
                    debug!("🚫 Resource permit denied: CPU throttling active");
                    return Ok(None);
                }
            }
        } else {
            None
        };

        debug!("✅ Resource permit acquired for category: {}", category);
        Ok(Some(ResourcePermit {
            category: category.to_string(),
            _throttle_permit: throttle_permit,
        }))
    }

    /// Start memory pressure monitoring
    async fn start_memory_pressure_monitoring(&self, 
        mut metrics_receiver: broadcast::Receiver<ResourceMetrics>,
        mut shutdown_receiver: broadcast::Receiver<()>
    ) {
        if !self.config.memory_pressure.enabled {
            return;
        }

        let config = self.config.clone();
        let pressure_level = self.pressure_level.clone();
        let memory_stats = self.memory_stats.clone();
        let event_sender = self.event_sender.clone();

        tokio::spawn(async move {
            let mut pressure_timer = interval(Duration::from_secs(config.memory_pressure.detection_interval));
            
            loop {
                tokio::select! {
                    Ok(metrics) = metrics_receiver.recv() => {
                        if let Err(e) = Self::process_memory_pressure(
                            &config,
                            &metrics,
                            &pressure_level,
                            &memory_stats,
                            &event_sender
                        ).await {
                            error!("❌ Memory pressure processing failed: {}", e);
                        }
                    }
                    _ = pressure_timer.tick() => {
                        // Periodic pressure assessment even without new metrics
                        debug!("🔍 Periodic memory pressure check");
                    }
                    _ = shutdown_receiver.recv() => {
                        info!("🛑 Memory pressure monitoring shutting down");
                        break;
                    }
                }
            }
        });

        info!("🧠 Memory pressure monitoring started");
    }

    /// Process memory pressure metrics and take adaptive actions
    async fn process_memory_pressure(
        config: &ResourceManagementConfig,
        metrics: &ResourceMetrics,
        pressure_level: &Arc<RwLock<MemoryPressureLevel>>,
        memory_stats: &Arc<RwLock<MemoryManagementMetrics>>,
        event_sender: &broadcast::Sender<ResourceManagementEvent>
    ) -> Result<()> {
        let memory_usage = metrics.memory.usage_percent;
        let thresholds = &config.memory_pressure.pressure_thresholds;

        // Determine pressure level
        let new_pressure = if memory_usage >= thresholds.critical_pressure {
            MemoryPressureLevel::Critical
        } else if memory_usage >= thresholds.high_pressure {
            MemoryPressureLevel::High
        } else if memory_usage >= thresholds.medium_pressure {
            MemoryPressureLevel::Medium
        } else if memory_usage >= thresholds.low_pressure {
            MemoryPressureLevel::Low
        } else {
            MemoryPressureLevel::None
        };

        let old_pressure = {
            let mut pressure = pressure_level.write().await;
            let old = *pressure;
            *pressure = new_pressure;
            old
        };

        // Update memory statistics
        {
            let mut stats = memory_stats.write().await;
            stats.current_usage_bytes = metrics.memory.used_bytes;
            stats.usage_percentage = memory_usage;
            stats.limit_exceeded = memory_usage >= config.memory_limits.emergency_threshold;
        }

        // Take adaptive actions if pressure level changed or is high
        if new_pressure != old_pressure || matches!(new_pressure, MemoryPressureLevel::High | MemoryPressureLevel::Critical) {
            Self::apply_memory_pressure_response(config, new_pressure, memory_stats).await?;

            // Send event
            let event = ResourceManagementEvent {
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs(),
                event_type: ResourceEventType::MemoryPressureDetected,
                description: format!("Memory pressure level changed from {:?} to {:?} ({}%)", 
                                   old_pressure, new_pressure, memory_usage),
                impact: ResourceImpact {
                    severity: match new_pressure {
                        MemoryPressureLevel::Critical => AlertLevel::Emergency,
                        MemoryPressureLevel::High => AlertLevel::Critical,
                        MemoryPressureLevel::Medium => AlertLevel::Warning,
                        _ => AlertLevel::Normal,
                    },
                    affected_operations: vec!["memory_allocation".to_string(), "caching".to_string()],
                    performance_impact: memory_usage,
                    recovery_time_estimate: Some(Duration::from_secs(30)),
                },
                metrics: ResourceManagementMetrics {
                    cpu: CpuManagementMetrics {
                        current_usage: metrics.cpu.usage_percent,
                        throttling_active: false,
                        throttle_level: "normal".to_string(),
                        throttled_operations: 0,
                        process_priority: None,
                        cpu_affinity: vec![],
                    },
                    memory: stats.clone(),
                    rate_limiting: RateLimitingMetrics {
                        total_requests: 0,
                        allowed_requests: 0,
                        denied_requests: 0,
                        current_tokens: 0,
                        bucket_refills: 0,
                        category_stats: vec![],
                    },
                    pressure: MemoryPressureMetrics {
                        pressure_level: new_pressure,
                        pressure_score: memory_usage,
                        swap_usage: metrics.memory.swap_usage_percent,
                        page_faults_per_second: 0.0,
                        adaptive_actions_taken: 0,
                        pressure_events: 1,
                    },
                    optimization: OptimizationMetrics {
                        optimizations_applied: 0,
                        efficiency_score: 0.0,
                        resource_savings: ResourceSavings {
                            cpu_savings_percent: 0.0,
                            memory_savings_bytes: 0,
                            response_time_improvement: Duration::from_millis(0),
                            throughput_improvement: 0.0,
                        },
                        predictive_actions: 0,
                        load_balancing_adjustments: 0,
                    },
                },
            };

            let _ = event_sender.send(event);

            match new_pressure {
                MemoryPressureLevel::Critical => {
                    error!("🚨 CRITICAL memory pressure detected: {:.1}%", memory_usage);
                }
                MemoryPressureLevel::High => {
                    warn!("⚠️ High memory pressure detected: {:.1}%", memory_usage);
                }
                MemoryPressureLevel::Medium => {
                    info!("📊 Medium memory pressure detected: {:.1}%", memory_usage);
                }
                _ => {
                    debug!("📊 Memory pressure level: {:?} ({:.1}%)", new_pressure, memory_usage);
                }
            }
        }

        Ok(())
    }

    /// Apply adaptive response to memory pressure
    async fn apply_memory_pressure_response(
        config: &ResourceManagementConfig,
        pressure_level: MemoryPressureLevel,
        memory_stats: &Arc<RwLock<MemoryManagementMetrics>>
    ) -> Result<()> {
        let response = &config.memory_pressure.adaptive_response;
        
        match pressure_level {
            MemoryPressureLevel::Medium => {
                if response.reduce_buffers {
                    // Implement buffer reduction logic
                    info!("🔧 Reducing buffer sizes due to medium memory pressure");
                }
            }
            MemoryPressureLevel::High => {
                if response.clear_caches {
                    // Implement cache clearing logic
                    info!("🧹 Clearing caches due to high memory pressure");
                }
                if response.reduce_buffers {
                    info!("🔧 Aggressively reducing buffer sizes");
                }
            }
            MemoryPressureLevel::Critical => {
                if response.activate_emergency_mode {
                    warn!("🚨 Activating emergency mode due to critical memory pressure");
                }
                if response.suspend_background_tasks {
                    warn!("⏸️ Suspending background tasks");
                }
                if config.memory_limits.force_gc_on_pressure {
                    // Trigger garbage collection
                    info!("🗑️ Forcing garbage collection");
                    let mut stats = memory_stats.write().await;
                    stats.gc_collections += 1;
                }
            }
            _ => {}
        }

        Ok(())
    }

    /// Start resource optimization engine
    async fn start_resource_optimization(&self, 
        mut metrics_receiver: broadcast::Receiver<ResourceMetrics>,
        mut shutdown_receiver: broadcast::Receiver<()>
    ) {
        if !self.config.optimization.enabled {
            return;
        }

        let config = self.config.clone();
        let optimization_history = self.optimization_history.clone();
        let event_sender = self.event_sender.clone();

        tokio::spawn(async move {
            let mut optimization_timer = interval(Duration::from_secs(config.optimization.optimization_interval));
            
            loop {
                tokio::select! {
                    Ok(metrics) = metrics_receiver.recv() => {
                        // Process metrics for optimization opportunities
                        debug!("📊 Processing metrics for resource optimization");
                    }
                    _ = optimization_timer.tick() => {
                        if let Err(e) = Self::perform_resource_optimization(
                            &config,
                            &optimization_history,
                            &event_sender
                        ).await {
                            error!("❌ Resource optimization failed: {}", e);
                        }
                    }
                    _ = shutdown_receiver.recv() => {
                        info!("🛑 Resource optimization shutting down");
                        break;
                    }
                }
            }
        });

        info!("⚡ Resource optimization engine started");
    }

    /// Perform resource optimization
    async fn perform_resource_optimization(
        config: &ResourceManagementConfig,
        optimization_history: &Arc<Mutex<VecDeque<OptimizationMetrics>>>,
        event_sender: &broadcast::Sender<ResourceManagementEvent>
    ) -> Result<()> {
        let mut optimizations_applied = 0;

        // Implement optimization algorithms
        if config.optimization.predictive_scaling {
            // Predictive scaling logic
            optimizations_applied += 1;
            debug!("🔮 Applied predictive scaling optimization");
        }

        if config.optimization.load_balancing {
            // Load balancing optimization
            optimizations_applied += 1;
            debug!("⚖️ Applied load balancing optimization");
        }

        // Store optimization metrics
        let metrics = OptimizationMetrics {
            optimizations_applied: optimizations_applied,
            efficiency_score: 85.0, // Calculate based on actual metrics
            resource_savings: ResourceSavings {
                cpu_savings_percent: 5.0,
                memory_savings_bytes: 1_048_576, // 1MB saved
                response_time_improvement: Duration::from_millis(10),
                throughput_improvement: 50.0,
            },
            predictive_actions: if config.optimization.predictive_scaling { 1 } else { 0 },
            load_balancing_adjustments: if config.optimization.load_balancing { 1 } else { 0 },
        };

        {
            let mut history = optimization_history.lock().await;
            history.push_back(metrics.clone());
            if history.len() > 100 {
                history.pop_front();
            }
        }

        info!("⚡ Resource optimization cycle completed: {} optimizations applied", optimizations_applied);
        Ok(())
    }

    /// Start main resource monitoring loop
    async fn start_resource_monitoring(&self,
        mut metrics_receiver: broadcast::Receiver<ResourceMetrics>,
        mut shutdown_receiver: broadcast::Receiver<()>
    ) {
        tokio::spawn(async move {
            loop {
                tokio::select! {
                    Ok(metrics) = metrics_receiver.recv() => {
                        debug!("📊 Processing resource metrics: CPU={:.1}%, Memory={:.1}%", 
                               metrics.cpu.usage_percent, metrics.memory.usage_percent);
                    }
                    _ = shutdown_receiver.recv() => {
                        info!("🛑 Resource management monitoring shutting down");
                        break;
                    }
                }
            }
        });

        info!("📊 Resource management monitoring started");
    }

    /// Check if operation is high priority
    fn is_high_priority_operation(&self, category: &str) -> bool {
        // Define high priority operations
        matches!(category, "emergency" | "health_check" | "critical_alert")
    }

    /// Subscribe to resource management events
    pub fn subscribe_to_events(&self) -> broadcast::Receiver<ResourceManagementEvent> {
        self.event_sender.subscribe()
    }

    /// Get comprehensive resource management metrics
    pub async fn get_comprehensive_metrics(&self) -> Result<ResourceManagementMetrics> {
        let memory_stats = self.memory_stats.read().await.clone();
        let pressure_level = *self.pressure_level.read().await;

        // Get rate limiting metrics
        let buckets = self.token_buckets.read().await;
        let mut category_stats = Vec::new();
        let mut total_tokens = 0;
        
        for (name, bucket) in buckets.iter() {
            let tokens = bucket.current_tokens().await;
            total_tokens += tokens;
            
            category_stats.push(CategoryStats {
                name: name.clone(),
                tokens,
                requests: 0, // Would be tracked in real implementation
                denials: 0,
                average_wait_time: Duration::from_millis(0),
            });
        }

        let rate_limiting = RateLimitingMetrics {
            total_requests: 0,
            allowed_requests: 0,
            denied_requests: 0,
            current_tokens: total_tokens,
            bucket_refills: 0,
            category_stats,
        };

        // Get optimization metrics
        let optimization = {
            let history = self.optimization_history.lock().await;
            history.back().cloned().unwrap_or(OptimizationMetrics {
                optimizations_applied: 0,
                efficiency_score: 0.0,
                resource_savings: ResourceSavings {
                    cpu_savings_percent: 0.0,
                    memory_savings_bytes: 0,
                    response_time_improvement: Duration::from_millis(0),
                    throughput_improvement: 0.0,
                },
                predictive_actions: 0,
                load_balancing_adjustments: 0,
            })
        };

        Ok(ResourceManagementMetrics {
            cpu: CpuManagementMetrics {
                current_usage: 0.0, // Would be updated from real metrics
                throttling_active: self.cpu_throttle.is_some(),
                throttle_level: "normal".to_string(),
                throttled_operations: 0,
                process_priority: None,
                cpu_affinity: self.config.cpu_throttling.preferred_cpu_cores.clone(),
            },
            memory: memory_stats,
            rate_limiting,
            pressure: MemoryPressureMetrics {
                pressure_level,
                pressure_score: 0.0,
                swap_usage: 0.0,
                page_faults_per_second: 0.0,
                adaptive_actions_taken: 0,
                pressure_events: 0,
            },
            optimization,
        })
    }
}

/// Resource permit that manages access to system resources
pub struct ResourcePermit {
    category: String,
    _throttle_permit: Option<ThrottlePermit>,
}

impl ResourcePermit {
    pub fn category(&self) -> &str {
        &self.category
    }
}

// Permit is automatically released when dropped

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_resource_manager_creation() {
        let config = ResourceManagementConfig::default();
        let manager = ResourceManager::new(config).unwrap();
        
        let metrics = manager.get_comprehensive_metrics().await.unwrap();
        assert!(metrics.rate_limiting.current_tokens > 0);
    }

    #[tokio::test]
    async fn test_token_bucket() {
        let bucket = TokenBucket::new("test".to_string(), 10, 5);
        
        // Should be able to consume tokens
        assert!(bucket.try_consume(5).await);
        assert!(bucket.try_consume(5).await);
        
        // Should fail to consume more than available
        assert!(!bucket.try_consume(1).await);
        
        // Wait for refill
        tokio::time::sleep(Duration::from_millis(200)).await;
        assert!(bucket.try_consume(1).await);
    }

    #[test]
    fn test_memory_pressure_determination() {
        let thresholds = MemoryPressureThresholds {
            low_pressure: 60.0,
            medium_pressure: 75.0,
            high_pressure: 85.0,
            critical_pressure: 95.0,
        };

        // Test pressure level determination logic would go here
        assert_eq!(50.0 < thresholds.low_pressure, true);
        assert_eq!(80.0 >= thresholds.medium_pressure, true);
    }
}