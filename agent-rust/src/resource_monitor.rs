// Resource Management - Comprehensive system resource monitoring
// Implements CPU, memory, disk, and network monitoring with thresholds and alerting

use crate::errors::{AgentError, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use sysinfo::{System, Disks, Networks, Components};
use tokio::sync::{broadcast, RwLock};
use tokio::time::interval;
use tracing::{debug, info, warn, error};

/// Configuration for resource monitoring
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ResourceMonitorConfig {
    /// Monitoring interval in seconds
    pub monitoring_interval: u64,
    /// CPU usage thresholds
    pub cpu_thresholds: ResourceThresholds,
    /// Memory usage thresholds  
    pub memory_thresholds: ResourceThresholds,
    /// Disk usage thresholds
    pub disk_thresholds: ResourceThresholds,
    /// Network usage thresholds (bytes per second)
    pub network_thresholds: NetworkThresholds,
    /// Enable detailed per-process monitoring
    pub monitor_processes: bool,
    /// Enable disk I/O monitoring
    pub monitor_disk_io: bool,
    /// Enable network interface monitoring
    pub monitor_network: bool,
    /// Enable system temperature monitoring
    pub monitor_temperature: bool,
}

impl Default for ResourceMonitorConfig {
    fn default() -> Self {
        Self {
            monitoring_interval: 30, // 30 seconds
            cpu_thresholds: ResourceThresholds {
                warning: 70.0,
                critical: 85.0,
                emergency: 95.0,
            },
            memory_thresholds: ResourceThresholds {
                warning: 75.0,
                critical: 85.0,
                emergency: 95.0,
            },
            disk_thresholds: ResourceThresholds {
                warning: 80.0,
                critical: 90.0,
                emergency: 95.0,
            },
            network_thresholds: NetworkThresholds {
                warning_mbps: 80.0,
                critical_mbps: 95.0,
                emergency_mbps: 100.0,
            },
            monitor_processes: true,
            monitor_disk_io: true,
            monitor_network: true,
            monitor_temperature: true,
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ResourceThresholds {
    /// Warning threshold percentage (0-100)
    pub warning: f32,
    /// Critical threshold percentage (0-100)
    pub critical: f32,
    /// Emergency threshold percentage (0-100)
    pub emergency: f32,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct NetworkThresholds {
    /// Warning threshold in Mbps
    pub warning_mbps: f32,
    /// Critical threshold in Mbps
    pub critical_mbps: f32,
    /// Emergency threshold in Mbps
    pub emergency_mbps: f32,
}

/// Represents the current system resource state
#[derive(Debug, Clone, Serialize)]
pub struct ResourceMetrics {
    pub timestamp: u64,
    pub cpu: CpuMetrics,
    pub memory: MemoryMetrics,
    pub disk: Vec<DiskMetrics>,
    pub network: Vec<NetworkMetrics>,
    pub processes: Option<Vec<ProcessMetrics>>,
    pub system: SystemMetrics,
}

#[derive(Debug, Clone, Serialize)]
pub struct CpuMetrics {
    pub usage_percent: f32,
    pub per_core_usage: Vec<f32>,
    pub core_count: usize,
    pub load_average: Option<LoadAverage>,
}

#[derive(Debug, Clone, Serialize)]
pub struct LoadAverage {
    pub one_minute: f64,
    pub five_minute: f64,
    pub fifteen_minute: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct MemoryMetrics {
    pub total_bytes: u64,
    pub used_bytes: u64,
    pub available_bytes: u64,
    pub usage_percent: f32,
    pub swap_total_bytes: u64,
    pub swap_used_bytes: u64,
    pub swap_usage_percent: f32,
}

#[derive(Debug, Clone, Serialize)]
pub struct DiskMetrics {
    pub name: String,
    pub mount_point: String,
    pub total_bytes: u64,
    pub used_bytes: u64,
    pub available_bytes: u64,
    pub usage_percent: f32,
    pub file_system: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct NetworkMetrics {
    pub interface_name: String,
    pub bytes_received: u64,
    pub bytes_transmitted: u64,
    pub packets_received: u64,
    pub packets_transmitted: u64,
    pub errors_received: u64,
    pub errors_transmitted: u64,
    pub speed_mbps: Option<f32>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProcessMetrics {
    pub pid: u32,
    pub name: String,
    pub cpu_usage: f32,
    pub memory_bytes: u64,
    pub memory_percent: f32,
    pub status: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct SystemMetrics {
    pub hostname: String,
    pub os_name: String,
    pub os_version: String,
    pub uptime_seconds: u64,
    pub boot_time: u64,
    pub temperature: Option<Vec<TemperatureMetrics>>,
}

#[derive(Debug, Clone, Serialize)]
pub struct TemperatureMetrics {
    pub component: String,
    pub temperature_celsius: f32,
    pub max_temperature_celsius: Option<f32>,
    pub critical_temperature_celsius: Option<f32>,
}

/// Resource alert levels
#[derive(Debug, Clone, PartialEq, Serialize)]
pub enum AlertLevel {
    Normal,
    Warning,
    Critical,
    Emergency,
}

/// Resource monitoring events
#[derive(Debug, Clone, Serialize)]
pub struct ResourceAlert {
    pub timestamp: u64,
    pub resource_type: String,
    pub resource_name: String,
    pub alert_level: AlertLevel,
    pub current_value: f32,
    pub threshold_value: f32,
    pub message: String,
}

/// Statistics for resource monitoring
#[derive(Debug, Clone, Default, Serialize)]
pub struct ResourceMonitorStats {
    pub monitoring_cycles: u64,
    pub alerts_generated: u64,
    pub last_alert_timestamp: Option<u64>,
    pub average_cpu_usage: f32,
    pub average_memory_usage: f32,
    pub peak_cpu_usage: f32,
    pub peak_memory_usage: f32,
    pub uptime_seconds: u64,
}

/// Main resource monitoring system
pub struct ResourceMonitor {
    config: ResourceMonitorConfig,
    system: Arc<RwLock<System>>,
    disks: Arc<RwLock<Disks>>,
    networks: Arc<RwLock<Networks>>,
    components: Arc<RwLock<Components>>,
    stats: Arc<RwLock<ResourceMonitorStats>>,
    last_network_stats: Arc<RwLock<HashMap<String, (u64, u64, Instant)>>>,
    alert_sender: broadcast::Sender<ResourceAlert>,
    metrics_sender: broadcast::Sender<ResourceMetrics>,
    start_time: Instant,
}

impl ResourceMonitor {
    /// Create a new resource monitor
    pub fn new(config: ResourceMonitorConfig) -> Result<Self> {
        info!("🔍 Initializing resource monitor with {}s interval", config.monitoring_interval);
        
        let mut system = System::new_all();
        system.refresh_all();
        
        let disks = Disks::new_with_refreshed_list();
        let networks = Networks::new_with_refreshed_list();
        let components = Components::new_with_refreshed_list();
        
        let (alert_sender, _) = broadcast::channel(1000);
        let (metrics_sender, _) = broadcast::channel(1000);
        
        Ok(Self {
            config,
            system: Arc::new(RwLock::new(system)),
            disks: Arc::new(RwLock::new(disks)),
            networks: Arc::new(RwLock::new(networks)),
            components: Arc::new(RwLock::new(components)),
            stats: Arc::new(RwLock::new(ResourceMonitorStats::default())),
            last_network_stats: Arc::new(RwLock::new(HashMap::new())),
            alert_sender,
            metrics_sender,
            start_time: Instant::now(),
        })
    }
    
    /// Start monitoring in the background
    pub async fn start_monitoring(&self, mut shutdown_receiver: broadcast::Receiver<()>) -> Result<()> {
        info!("🚀 Starting resource monitoring background task");
        
        let config = self.config.clone();
        let system = self.system.clone();
        let disks = self.disks.clone();
        let networks = self.networks.clone();
        let components = self.components.clone();
        let stats = self.stats.clone();
        let last_network_stats = self.last_network_stats.clone();
        let alert_sender = self.alert_sender.clone();
        let metrics_sender = self.metrics_sender.clone();
        let start_time = self.start_time;
        
        tokio::spawn(async move {
            let mut monitoring_timer = interval(Duration::from_secs(config.monitoring_interval));
            
            loop {
                tokio::select! {
                    _ = monitoring_timer.tick() => {
                        if let Err(e) = Self::monitoring_cycle(
                            &config,
                            &system,
                            &disks,
                            &networks,
                            &components,
                            &stats,
                            &last_network_stats,
                            &alert_sender,
                            &metrics_sender,
                            start_time,
                        ).await {
                            error!("❌ Resource monitoring cycle failed: {}", e);
                        }
                    }
                    _ = shutdown_receiver.recv() => {
                        info!("🛑 Resource monitoring shutting down");
                        break;
                    }
                }
            }
        });
        
        Ok(())
    }
    
    /// Single monitoring cycle
    async fn monitoring_cycle(
        config: &ResourceMonitorConfig,
        system: &Arc<RwLock<System>>,
        disks: &Arc<RwLock<Disks>>,
        networks: &Arc<RwLock<Networks>>,
        components: &Arc<RwLock<Components>>,
        stats: &Arc<RwLock<ResourceMonitorStats>>,
        last_network_stats: &Arc<RwLock<HashMap<String, (u64, u64, Instant)>>>,
        alert_sender: &broadcast::Sender<ResourceAlert>,
        metrics_sender: &broadcast::Sender<ResourceMetrics>,
        start_time: Instant,
    ) -> Result<()> {
        // Refresh system information
        {
            let mut sys = system.write().await;
            sys.refresh_all();
        }
        {
            let mut disks_guard = disks.write().await;
            disks_guard.refresh();
        }
        {
            let mut networks_guard = networks.write().await;
            networks_guard.refresh();
        }
        {
            let mut components_guard = components.write().await;
            components_guard.refresh();
        }
        
        let metrics = Self::collect_metrics(config, system, disks, networks, components, last_network_stats).await?;
        
        // Update statistics
        {
            let mut stats = stats.write().await;
            stats.monitoring_cycles += 1;
            stats.uptime_seconds = start_time.elapsed().as_secs();
            
            // Update averages (simple moving average)
            let alpha = 0.1; // Smoothing factor
            stats.average_cpu_usage = stats.average_cpu_usage * (1.0 - alpha) + metrics.cpu.usage_percent * alpha;
            stats.average_memory_usage = stats.average_memory_usage * (1.0 - alpha) + metrics.memory.usage_percent * alpha;
            
            // Update peaks
            stats.peak_cpu_usage = stats.peak_cpu_usage.max(metrics.cpu.usage_percent);
            stats.peak_memory_usage = stats.peak_memory_usage.max(metrics.memory.usage_percent);
        }
        
        // Check thresholds and generate alerts
        Self::check_thresholds_and_alert(config, &metrics, alert_sender, stats).await?;
        
        // Broadcast metrics for throttling system
        let _ = metrics_sender.send(metrics.clone());
        
        debug!("📊 Resource monitoring cycle completed - CPU: {:.1}%, Memory: {:.1}%", 
               metrics.cpu.usage_percent, metrics.memory.usage_percent);
        
        Ok(())
    }
    
    /// Collect comprehensive system metrics
    async fn collect_metrics(
        config: &ResourceMonitorConfig,
        system: &Arc<RwLock<System>>,
        disks: &Arc<RwLock<Disks>>,
        networks: &Arc<RwLock<Networks>>,
        components: &Arc<RwLock<Components>>,
        last_network_stats: &Arc<RwLock<HashMap<String, (u64, u64, Instant)>>>,
    ) -> Result<ResourceMetrics> {
        let sys = system.read().await;
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
        
        // CPU metrics
        let cpu_usage = sys.global_cpu_usage();
        let per_core_usage: Vec<f32> = sys.cpus().iter().map(|cpu| cpu.cpu_usage()).collect();
        let core_count = sys.cpus().len();
        
        let load_average = System::load_average();
        let load_avg = if load_average.one != 0.0 || load_average.five != 0.0 || load_average.fifteen != 0.0 {
            Some(LoadAverage {
                one_minute: load_average.one,
                five_minute: load_average.five,
                fifteen_minute: load_average.fifteen,
            })
        } else {
            None
        };
        
        let cpu = CpuMetrics {
            usage_percent: cpu_usage,
            per_core_usage,
            core_count,
            load_average: load_avg,
        };
        
        // Memory metrics
        let total_memory = sys.total_memory();
        let used_memory = sys.used_memory();
        let available_memory = sys.available_memory();
        let memory_usage_percent = if total_memory > 0 {
            (used_memory as f32 / total_memory as f32) * 100.0
        } else {
            0.0
        };
        
        let total_swap = sys.total_swap();
        let used_swap = sys.used_swap();
        let swap_usage_percent = if total_swap > 0 {
            (used_swap as f32 / total_swap as f32) * 100.0
        } else {
            0.0
        };
        
        let memory = MemoryMetrics {
            total_bytes: total_memory,
            used_bytes: used_memory,
            available_bytes: available_memory,
            usage_percent: memory_usage_percent,
            swap_total_bytes: total_swap,
            swap_used_bytes: used_swap,
            swap_usage_percent,
        };
        
        // Disk metrics
        let mut disk_metrics = Vec::new();
        if config.monitor_disk_io {
            let disks_guard = disks.read().await;
            for disk in disks_guard.iter() {
                let total_space = disk.total_space();
                let available_space = disk.available_space();
                let used_space = total_space.saturating_sub(available_space);
                let usage_percent = if total_space > 0 {
                    (used_space as f32 / total_space as f32) * 100.0
                } else {
                    0.0
                };
                
                disk_metrics.push(DiskMetrics {
                    name: disk.name().to_string_lossy().to_string(),
                    mount_point: disk.mount_point().to_string_lossy().to_string(),
                    total_bytes: total_space,
                    used_bytes: used_space,
                    available_bytes: available_space,
                    usage_percent,
                    file_system: disk.file_system().to_string_lossy().to_string(),
                });
            }
        }
        
        // Network metrics
        let mut network_metrics = Vec::new();
        if config.monitor_network {
            let mut last_stats = last_network_stats.write().await;
            let current_time = Instant::now();
            let networks_guard = networks.read().await;
            
            for (interface_name, network_data) in networks_guard.iter() {
                let bytes_received = network_data.received();
                let bytes_transmitted = network_data.transmitted();
                let packets_received = network_data.packets_received();
                let packets_transmitted = network_data.packets_transmitted();
                let errors_received = network_data.errors_on_received();
                let errors_transmitted = network_data.errors_on_transmitted();
                
                // Calculate speed if we have previous data
                let speed_mbps = if let Some((prev_rx, prev_tx, prev_time)) = last_stats.get(interface_name) {
                    let time_diff = current_time.duration_since(*prev_time).as_secs_f32();
                    if time_diff > 0.0 {
                        let rx_diff = bytes_received.saturating_sub(*prev_rx) as f32;
                        let tx_diff = bytes_transmitted.saturating_sub(*prev_tx) as f32;
                        let total_bytes_per_sec = (rx_diff + tx_diff) / time_diff;
                        Some(total_bytes_per_sec * 8.0 / 1_000_000.0) // Convert to Mbps
                    } else {
                        None
                    }
                } else {
                    None
                };
                
                // Store current stats for next calculation
                last_stats.insert(interface_name.clone(), (bytes_received, bytes_transmitted, current_time));
                
                network_metrics.push(NetworkMetrics {
                    interface_name: interface_name.clone(),
                    bytes_received,
                    bytes_transmitted,
                    packets_received,
                    packets_transmitted,
                    errors_received,
                    errors_transmitted,
                    speed_mbps,
                });
            }
        }
        
        // Process metrics (optional)
        let processes = if config.monitor_processes {
            let mut process_metrics = Vec::new();
            for (pid, process) in sys.processes() {
                process_metrics.push(ProcessMetrics {
                    pid: pid.as_u32(),
                    name: process.name().to_string_lossy().to_string(),
                    cpu_usage: process.cpu_usage(),
                    memory_bytes: process.memory(),
                    memory_percent: if total_memory > 0 {
                        (process.memory() as f32 / total_memory as f32) * 100.0
                    } else {
                        0.0
                    },
                    status: format!("{:?}", process.status()),
                });
            }
            
            // Sort by CPU usage and take top 10
            process_metrics.sort_by(|a, b| b.cpu_usage.partial_cmp(&a.cpu_usage).unwrap_or(std::cmp::Ordering::Equal));
            process_metrics.truncate(10);
            Some(process_metrics)
        } else {
            None
        };
        
        // Temperature metrics (optional)
        let temperature = if config.monitor_temperature {
            let mut temp_metrics = Vec::new();
            let components_guard = components.read().await;
            for component in components_guard.iter() {
                temp_metrics.push(TemperatureMetrics {
                    component: component.label().to_string(),
                    temperature_celsius: component.temperature(),
                    max_temperature_celsius: Some(component.max()),
                    critical_temperature_celsius: component.critical(),
                });
            }
            if temp_metrics.is_empty() {
                None
            } else {
                Some(temp_metrics)
            }
        } else {
            None
        };
        
        // System metrics
        let system_metrics = SystemMetrics {
            hostname: System::host_name().unwrap_or_else(|| "unknown".to_string()),
            os_name: System::name().unwrap_or_else(|| "unknown".to_string()),
            os_version: System::os_version().unwrap_or_else(|| "unknown".to_string()),
            uptime_seconds: System::uptime(),
            boot_time: System::boot_time(),
            temperature,
        };
        
        Ok(ResourceMetrics {
            timestamp: now,
            cpu,
            memory,
            disk: disk_metrics,
            network: network_metrics,
            processes,
            system: system_metrics,
        })
    }
    
    /// Check thresholds and generate alerts
    async fn check_thresholds_and_alert(
        config: &ResourceMonitorConfig,
        metrics: &ResourceMetrics,
        alert_sender: &broadcast::Sender<ResourceAlert>,
        stats: &Arc<RwLock<ResourceMonitorStats>>,
    ) -> Result<()> {
        let mut alerts_generated = 0;
        
        // Check CPU thresholds
        let cpu_alert_level = Self::determine_alert_level(metrics.cpu.usage_percent, &config.cpu_thresholds);
        if cpu_alert_level != AlertLevel::Normal {
            let alert = ResourceAlert {
                timestamp: metrics.timestamp,
                resource_type: "CPU".to_string(),
                resource_name: "Global".to_string(),
                alert_level: cpu_alert_level.clone(),
                current_value: metrics.cpu.usage_percent,
                threshold_value: Self::get_threshold_value(&cpu_alert_level, &config.cpu_thresholds),
                message: format!("CPU usage is {:.1}% ({:?} threshold exceeded)", 
                               metrics.cpu.usage_percent, cpu_alert_level),
            };
            
            if alert_sender.send(alert).is_ok() {
                alerts_generated += 1;
                warn!("⚠️ CPU Alert: {:.1}% usage ({:?})", metrics.cpu.usage_percent, cpu_alert_level);
            }
        }
        
        // Check Memory thresholds
        let memory_alert_level = Self::determine_alert_level(metrics.memory.usage_percent, &config.memory_thresholds);
        if memory_alert_level != AlertLevel::Normal {
            let alert = ResourceAlert {
                timestamp: metrics.timestamp,
                resource_type: "Memory".to_string(),
                resource_name: "System".to_string(),
                alert_level: memory_alert_level.clone(),
                current_value: metrics.memory.usage_percent,
                threshold_value: Self::get_threshold_value(&memory_alert_level, &config.memory_thresholds),
                message: format!("Memory usage is {:.1}% ({:?} threshold exceeded)", 
                               metrics.memory.usage_percent, memory_alert_level),
            };
            
            if alert_sender.send(alert).is_ok() {
                alerts_generated += 1;
                warn!("⚠️ Memory Alert: {:.1}% usage ({:?})", metrics.memory.usage_percent, memory_alert_level);
            }
        }
        
        // Check Disk thresholds
        for disk in &metrics.disk {
            let disk_alert_level = Self::determine_alert_level(disk.usage_percent, &config.disk_thresholds);
            if disk_alert_level != AlertLevel::Normal {
                let alert = ResourceAlert {
                    timestamp: metrics.timestamp,
                    resource_type: "Disk".to_string(),
                    resource_name: disk.mount_point.clone(),
                    alert_level: disk_alert_level.clone(),
                    current_value: disk.usage_percent,
                    threshold_value: Self::get_threshold_value(&disk_alert_level, &config.disk_thresholds),
                    message: format!("Disk {} usage is {:.1}% ({:?} threshold exceeded)", 
                                   disk.mount_point, disk.usage_percent, disk_alert_level),
                };
                
                if alert_sender.send(alert).is_ok() {
                    alerts_generated += 1;
                    warn!("⚠️ Disk Alert: {} at {:.1}% usage ({:?})", 
                          disk.mount_point, disk.usage_percent, disk_alert_level);
                }
            }
        }
        
        // Check Network thresholds
        for network in &metrics.network {
            if let Some(speed_mbps) = network.speed_mbps {
                let network_alert_level = Self::determine_network_alert_level(speed_mbps, &config.network_thresholds);
                if network_alert_level != AlertLevel::Normal {
                    let alert = ResourceAlert {
                        timestamp: metrics.timestamp,
                        resource_type: "Network".to_string(),
                        resource_name: network.interface_name.clone(),
                        alert_level: network_alert_level.clone(),
                        current_value: speed_mbps,
                        threshold_value: Self::get_network_threshold_value(&network_alert_level, &config.network_thresholds),
                        message: format!("Network {} usage is {:.1} Mbps ({:?} threshold exceeded)", 
                                       network.interface_name, speed_mbps, network_alert_level),
                    };
                    
                    if alert_sender.send(alert).is_ok() {
                        alerts_generated += 1;
                        warn!("⚠️ Network Alert: {} at {:.1} Mbps ({:?})", 
                              network.interface_name, speed_mbps, network_alert_level);
                    }
                }
            }
        }
        
        // Update statistics
        if alerts_generated > 0 {
            let mut stats = stats.write().await;
            stats.alerts_generated += alerts_generated;
            stats.last_alert_timestamp = Some(metrics.timestamp);
        }
        
        Ok(())
    }
    
    /// Determine alert level based on value and thresholds
    fn determine_alert_level(value: f32, thresholds: &ResourceThresholds) -> AlertLevel {
        if value >= thresholds.emergency {
            AlertLevel::Emergency
        } else if value >= thresholds.critical {
            AlertLevel::Critical
        } else if value >= thresholds.warning {
            AlertLevel::Warning
        } else {
            AlertLevel::Normal
        }
    }
    
    /// Determine network alert level
    fn determine_network_alert_level(value: f32, thresholds: &NetworkThresholds) -> AlertLevel {
        if value >= thresholds.emergency_mbps {
            AlertLevel::Emergency
        } else if value >= thresholds.critical_mbps {
            AlertLevel::Critical
        } else if value >= thresholds.warning_mbps {
            AlertLevel::Warning
        } else {
            AlertLevel::Normal
        }
    }
    
    /// Get threshold value for alert level
    fn get_threshold_value(alert_level: &AlertLevel, thresholds: &ResourceThresholds) -> f32 {
        match alert_level {
            AlertLevel::Warning => thresholds.warning,
            AlertLevel::Critical => thresholds.critical,
            AlertLevel::Emergency => thresholds.emergency,
            AlertLevel::Normal => 0.0,
        }
    }
    
    /// Get network threshold value for alert level
    fn get_network_threshold_value(alert_level: &AlertLevel, thresholds: &NetworkThresholds) -> f32 {
        match alert_level {
            AlertLevel::Warning => thresholds.warning_mbps,
            AlertLevel::Critical => thresholds.critical_mbps,
            AlertLevel::Emergency => thresholds.emergency_mbps,
            AlertLevel::Normal => 0.0,
        }
    }
    
    /// Subscribe to resource alerts
    pub fn subscribe_to_alerts(&self) -> broadcast::Receiver<ResourceAlert> {
        self.alert_sender.subscribe()
    }
    
    /// Subscribe to resource metrics
    pub fn subscribe_to_metrics(&self) -> broadcast::Receiver<ResourceMetrics> {
        self.metrics_sender.subscribe()
    }
    
    /// Get current resource metrics
    pub async fn get_current_metrics(&self) -> Result<ResourceMetrics> {
        Self::collect_metrics(&self.config, &self.system, &self.disks, &self.networks, &self.components, &self.last_network_stats).await
    }
    
    /// Get monitoring statistics
    pub async fn get_stats(&self) -> ResourceMonitorStats {
        let mut stats = self.stats.read().await.clone();
        stats.uptime_seconds = self.start_time.elapsed().as_secs();
        stats
    }
    
    /// Update configuration
    pub async fn update_config(&mut self, new_config: ResourceMonitorConfig) -> Result<()> {
        info!("🔄 Updating resource monitor configuration");
        self.config = new_config;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::time::timeout;
    
    #[tokio::test]
    async fn test_resource_monitor_creation() {
        let config = ResourceMonitorConfig::default();
        let monitor = ResourceMonitor::new(config).unwrap();
        
        // Should be able to get initial stats
        let stats = monitor.get_stats().await;
        assert_eq!(stats.monitoring_cycles, 0);
    }
    
    #[tokio::test]
    async fn test_metrics_collection() {
        let config = ResourceMonitorConfig::default();
        let monitor = ResourceMonitor::new(config).unwrap();
        
        // Should be able to collect metrics
        let metrics = monitor.get_current_metrics().await.unwrap();
        assert!(metrics.cpu.usage_percent >= 0.0);
        assert!(metrics.memory.total_bytes > 0);
    }
    
    #[tokio::test]
    async fn test_alert_thresholds() {
        let thresholds = ResourceThresholds {
            warning: 50.0,
            critical: 75.0,
            emergency: 90.0,
        };
        
        assert_eq!(ResourceMonitor::determine_alert_level(30.0, &thresholds), AlertLevel::Normal);
        assert_eq!(ResourceMonitor::determine_alert_level(60.0, &thresholds), AlertLevel::Warning);
        assert_eq!(ResourceMonitor::determine_alert_level(80.0, &thresholds), AlertLevel::Critical);
        assert_eq!(ResourceMonitor::determine_alert_level(95.0, &thresholds), AlertLevel::Emergency);
    }
    
    #[tokio::test]
    async fn test_alert_subscription() {
        let config = ResourceMonitorConfig::default();
        let monitor = ResourceMonitor::new(config).unwrap();
        
        let mut alert_receiver = monitor.subscribe_to_alerts();
        
        // Should be able to subscribe without blocking
        let result = timeout(Duration::from_millis(100), alert_receiver.recv()).await;
        assert!(result.is_err()); // Should timeout as no alerts generated yet
    }
    
    #[test]
    fn test_default_config() {
        let config = ResourceMonitorConfig::default();
        assert_eq!(config.monitoring_interval, 30);
        assert_eq!(config.cpu_thresholds.warning, 70.0);
        assert_eq!(config.memory_thresholds.critical, 85.0);
        assert!(config.monitor_processes);
    }
}