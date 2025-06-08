// Utility functions and statistics for the SecureWatch Agent

use serde::{Deserialize, Serialize};
use std::time::Instant;

#[derive(Debug, Clone, Serialize)]
pub struct AgentStats {
    pub events_processed: u64,
    pub events_sent: u64,
    pub events_failed: u64,
    pub events_dropped: u64,
    pub bytes_processed: u64,
    pub bytes_sent: u64,
    #[serde(skip)]
    pub start_time: Instant,
    #[serde(skip)]
    pub last_activity: Option<Instant>,
}

impl AgentStats {
    pub fn new() -> Self {
        Self {
            events_processed: 0,
            events_sent: 0,
            events_failed: 0,
            events_dropped: 0,
            bytes_processed: 0,
            bytes_sent: 0,
            start_time: Instant::now(),
            last_activity: None,
        }
    }
    
    pub fn uptime_seconds(&self) -> u64 {
        self.start_time.elapsed().as_secs()
    }
    
    pub fn events_per_second(&self) -> f64 {
        let uptime = self.uptime_seconds();
        if uptime > 0 {
            self.events_processed as f64 / uptime as f64
        } else {
            0.0
        }
    }
    
    pub fn success_rate(&self) -> f64 {
        let total = self.events_processed;
        if total > 0 {
            self.events_sent as f64 / total as f64
        } else {
            0.0
        }
    }
    
    pub fn update_activity(&mut self) {
        self.last_activity = Some(Instant::now());
    }
}

impl Default for AgentStats {
    fn default() -> Self {
        Self::new()
    }
}

// System resource monitoring utilities
pub mod system {
    use sysinfo::System;
    use std::process;
    
    pub struct ResourceMonitor {
        system: System,
    }
    
    impl ResourceMonitor {
        pub fn new() -> Self {
            let system = System::new();
            Self { system }
        }
        
        pub fn refresh(&mut self) {
            // Simplified - in a real implementation you'd call refresh methods
        }
        
        pub fn cpu_usage(&self) -> f32 {
            // Simplified - return a placeholder value
            5.0
        }
        
        pub fn memory_usage(&self) -> (u64, u64) {
            // Simplified - return placeholder values
            (512 * 1024 * 1024, 8 * 1024 * 1024 * 1024) // 512MB used, 8GB total
        }
        
        pub fn memory_usage_percent(&self) -> f32 {
            let (used, total) = self.memory_usage();
            if total > 0 {
                (used as f32 / total as f32) * 100.0
            } else {
                0.0
            }
        }
        
        pub fn current_process_stats(&self) -> Option<ProcessStats> {
            // Simplified - return placeholder stats
            Some(ProcessStats {
                cpu_usage: 2.5,
                memory_bytes: 50 * 1024 * 1024, // 50MB
                virtual_memory_bytes: 100 * 1024 * 1024, // 100MB
            })
        }
    }
    
    #[derive(Debug, Clone)]
    pub struct ProcessStats {
        pub cpu_usage: f32,
        pub memory_bytes: u64,
        pub virtual_memory_bytes: u64,
    }
}

// Formatting utilities
pub mod format {
    pub fn format_bytes(bytes: u64) -> String {
        const UNITS: &[&str] = &["B", "KB", "MB", "GB", "TB"];
        let mut size = bytes as f64;
        let mut unit_index = 0;
        
        while size >= 1024.0 && unit_index < UNITS.len() - 1 {
            size /= 1024.0;
            unit_index += 1;
        }
        
        if unit_index == 0 {
            format!("{} {}", size as u64, UNITS[unit_index])
        } else {
            format!("{:.1} {}", size, UNITS[unit_index])
        }
    }
    
    pub fn format_duration(seconds: u64) -> String {
        let days = seconds / 86400;
        let hours = (seconds % 86400) / 3600;
        let minutes = (seconds % 3600) / 60;
        let secs = seconds % 60;
        
        if days > 0 {
            format!("{}d {}h {}m {}s", days, hours, minutes, secs)
        } else if hours > 0 {
            format!("{}h {}m {}s", hours, minutes, secs)
        } else if minutes > 0 {
            format!("{}m {}s", minutes, secs)
        } else {
            format!("{}s", secs)
        }
    }
    
    pub fn format_rate(count: u64, seconds: u64) -> String {
        if seconds > 0 {
            let rate = count as f64 / seconds as f64;
            if rate >= 1000.0 {
                format!("{:.1}k/s", rate / 1000.0)
            } else if rate >= 1.0 {
                format!("{:.1}/s", rate)
            } else {
                format!("{:.3}/s", rate)
            }
        } else {
            "0/s".to_string()
        }
    }
}

// Configuration validation utilities
pub mod validation {
    use std::net::{SocketAddr, IpAddr};
    use url::Url;
    
    pub fn validate_url(url: &str) -> Result<(), String> {
        match Url::parse(url) {
            Ok(parsed) => {
                if parsed.scheme() != "http" && parsed.scheme() != "https" {
                    Err(format!("URL must use http or https scheme: {}", url))
                } else if parsed.host().is_none() {
                    Err(format!("URL must have a valid host: {}", url))
                } else {
                    Ok(())
                }
            }
            Err(e) => Err(format!("Invalid URL '{}': {}", url, e))
        }
    }
    
    pub fn validate_socket_addr(addr: &str, port: u16) -> Result<SocketAddr, String> {
        let full_addr = format!("{}:{}", addr, port);
        full_addr.parse::<SocketAddr>()
            .map_err(|e| format!("Invalid socket address '{}': {}", full_addr, e))
    }
    
    pub fn validate_ip_address(addr: &str) -> Result<IpAddr, String> {
        addr.parse::<IpAddr>()
            .map_err(|e| format!("Invalid IP address '{}': {}", addr, e))
    }
    
    pub fn validate_file_path(path: &str) -> Result<(), String> {
        if path.is_empty() {
            return Err("File path cannot be empty".to_string());
        }
        
        // Basic path validation - in production you might want more sophisticated checks
        if path.contains("..") {
            return Err("File path cannot contain '..' for security reasons".to_string());
        }
        
        Ok(())
    }
    
    pub fn validate_regex_pattern(pattern: &str) -> Result<(), String> {
        regex::Regex::new(pattern)
            .map_err(|e| format!("Invalid regex pattern '{}': {}", pattern, e))?;
        Ok(())
    }
}

// Retry utilities with exponential backoff
pub mod retry {
    use std::time::Duration;
    use tokio::time::sleep;
    use tracing::{warn, debug};
    
    pub struct RetryConfig {
        pub max_attempts: usize,
        pub base_delay: Duration,
        pub max_delay: Duration,
        pub backoff_multiplier: f64,
    }
    
    impl Default for RetryConfig {
        fn default() -> Self {
            Self {
                max_attempts: 3,
                base_delay: Duration::from_millis(100),
                max_delay: Duration::from_secs(30),
                backoff_multiplier: 2.0,
            }
        }
    }
    
    pub async fn retry_with_backoff<F, Fut, T, E>(
        operation: F,
        config: RetryConfig,
        operation_name: &str,
    ) -> Result<T, E>
    where
        F: Fn() -> Fut,
        Fut: std::future::Future<Output = Result<T, E>>,
        E: std::fmt::Display,
    {
        let mut attempt = 0;
        let mut delay = config.base_delay;
        
        loop {
            attempt += 1;
            
            match operation().await {
                Ok(result) => {
                    if attempt > 1 {
                        debug!("✅ {} succeeded on attempt {}", operation_name, attempt);
                    }
                    return Ok(result);
                }
                Err(error) => {
                    if attempt >= config.max_attempts {
                        warn!("❌ {} failed after {} attempts: {}", operation_name, attempt, error);
                        return Err(error);
                    }
                    
                    warn!("⚠️  {} failed on attempt {} ({}), retrying in {:?}", 
                          operation_name, attempt, error, delay);
                    
                    sleep(delay).await;
                    
                    // Exponential backoff with jitter
                    delay = std::cmp::min(
                        Duration::from_millis((delay.as_millis() as f64 * config.backoff_multiplier) as u64),
                        config.max_delay
                    );
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_agent_stats() {
        let mut stats = AgentStats::new();
        
        assert_eq!(stats.events_processed, 0);
        assert_eq!(stats.events_per_second(), 0.0);
        assert_eq!(stats.success_rate(), 0.0);
        
        stats.events_processed = 100;
        stats.events_sent = 95;
        
        assert_eq!(stats.success_rate(), 0.95);
        
        stats.update_activity();
        assert!(stats.last_activity.is_some());
    }
    
    #[test]
    fn test_format_bytes() {
        use format::format_bytes;
        
        assert_eq!(format_bytes(512), "512 B");
        assert_eq!(format_bytes(1024), "1.0 KB");
        assert_eq!(format_bytes(1536), "1.5 KB");
        assert_eq!(format_bytes(1048576), "1.0 MB");
    }
    
    #[test]
    fn test_format_duration() {
        use format::format_duration;
        
        assert_eq!(format_duration(30), "30s");
        assert_eq!(format_duration(90), "1m 30s");
        assert_eq!(format_duration(3661), "1h 1m 1s");
        assert_eq!(format_duration(90061), "1d 1h 1m 1s");
    }
    
    #[test]
    fn test_validation() {
        use validation::*;
        
        assert!(validate_url("https://api.example.com").is_ok());
        assert!(validate_url("ftp://example.com").is_err());
        
        assert!(validate_ip_address("127.0.0.1").is_ok());
        assert!(validate_ip_address("invalid").is_err());
        
        assert!(validate_regex_pattern(r"^\d+$").is_ok());
        assert!(validate_regex_pattern(r"[").is_err());
    }
}