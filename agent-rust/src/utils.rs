// Utility modules for SecureWatch Agent

use crate::transport::LogEvent;
use std::collections::VecDeque;
use std::time::{Duration, Instant};
use sysinfo::{System, SystemExt, ProcessExt, Pid};
use tracing::{debug, warn};

#[derive(Debug, Clone)]
pub struct AgentStats {
    pub start_time: Instant,
    pub events_collected: u64,
    pub events_sent: u64,
    pub events_failed: u64,
    pub last_heartbeat: Option<Instant>,
    pub errors: Vec<String>,
}

impl AgentStats {
    pub fn new() -> Self {
        Self {
            start_time: Instant::now(),
            events_collected: 0,
            events_sent: 0,
            events_failed: 0,
            last_heartbeat: None,
            errors: Vec::new(),
        }
    }

    pub fn uptime(&self) -> Duration {
        self.start_time.elapsed()
    }

    pub fn add_error(&mut self, error: String) {
        // Keep only last 100 errors
        if self.errors.len() >= 100 {
            self.errors.remove(0);
        }
        self.errors.push(error);
    }
}

#[derive(Debug)]
pub struct EventBuffer {
    events: VecDeque<LogEvent>,
    max_events: usize,
    max_size_bytes: usize,
    current_size_bytes: usize,
}

impl EventBuffer {
    pub fn new(max_events: usize, max_size_mb: usize) -> Self {
        Self {
            events: VecDeque::with_capacity(max_events),
            max_events,
            max_size_bytes: max_size_mb * 1024 * 1024,
            current_size_bytes: 0,
        }
    }

    pub async fn add_event(&mut self, event: LogEvent) {
        let event_size = self.estimate_event_size(&event);

        // Remove old events if we're at capacity
        while (self.events.len() >= self.max_events) || 
              (self.current_size_bytes + event_size > self.max_size_bytes) {
            if let Some(removed_event) = self.events.pop_front() {
                self.current_size_bytes -= self.estimate_event_size(&removed_event);
            } else {
                break;
            }
        }

        self.current_size_bytes += event_size;
        self.events.push_back(event);

        debug!("Buffer: {} events, {} bytes", self.events.len(), self.current_size_bytes);
    }

    pub async fn drain_events(&mut self, max_count: usize) -> Vec<LogEvent> {
        let count = std::cmp::min(max_count, self.events.len());
        let mut result = Vec::with_capacity(count);

        for _ in 0..count {
            if let Some(event) = self.events.pop_front() {
                self.current_size_bytes -= self.estimate_event_size(&event);
                result.push(event);
            }
        }

        result
    }

    pub async fn drain_all(&mut self) -> Vec<LogEvent> {
        let result: Vec<LogEvent> = self.events.drain(..).collect();
        self.current_size_bytes = 0;
        result
    }

    pub fn len(&self) -> usize {
        self.events.len()
    }

    pub fn is_empty(&self) -> bool {
        self.events.is_empty()
    }

    pub fn size_bytes(&self) -> usize {
        self.current_size_bytes
    }

    fn estimate_event_size(&self, event: &LogEvent) -> usize {
        // Rough estimation of event size in memory
        event.message.len() + 
        event.source.len() + 
        event.level.len() + 
        event.metadata.to_string().len() + 
        64 // overhead for other fields
    }
}

#[derive(Debug, Clone)]
pub struct HealthMonitor {
    max_memory_mb: usize,
    max_cpu_percent: f32,
    system: System,
    current_pid: Pid,
}

impl HealthMonitor {
    pub fn new(max_memory_mb: usize, max_cpu_percent: f32) -> Self {
        let mut system = System::new_all();
        system.refresh_all();
        
        let current_pid = Pid::from(std::process::id() as usize);

        Self {
            max_memory_mb,
            max_cpu_percent,
            system,
            current_pid,
        }
    }

    pub async fn check_health(&mut self) -> Result<HealthStatus, HealthError> {
        self.system.refresh_process(self.current_pid);

        if let Some(process) = self.system.process(self.current_pid) {
            let memory_mb = process.memory() / 1024 / 1024; // Convert to MB
            let cpu_percent = process.cpu_usage();

            let status = HealthStatus {
                memory_usage_mb: memory_mb,
                cpu_usage_percent: cpu_percent,
                memory_limit_mb: self.max_memory_mb as u64,
                cpu_limit_percent: self.max_cpu_percent,
                is_healthy: memory_mb <= self.max_memory_mb as u64 && cpu_percent <= self.max_cpu_percent,
            };

            if !status.is_healthy {
                warn!(
                    "⚠️  Health check warning - Memory: {}MB/{} MB, CPU: {:.1}%/{:.1}%",
                    memory_mb, self.max_memory_mb, cpu_percent, self.max_cpu_percent
                );
            }

            Ok(status)
        } else {
            Err(HealthError::ProcessNotFound)
        }
    }
}

#[derive(Debug, Clone)]
pub struct HealthStatus {
    pub memory_usage_mb: u64,
    pub cpu_usage_percent: f32,
    pub memory_limit_mb: u64,
    pub cpu_limit_percent: f32,
    pub is_healthy: bool,
}

#[derive(Debug, thiserror::Error)]
pub enum HealthError {
    #[error("Process not found")]
    ProcessNotFound,

    #[error("System error: {0}")]
    System(String),
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[tokio::test]
    async fn test_event_buffer() {
        let mut buffer = EventBuffer::new(3, 1); // 3 events max, 1MB max

        let event1 = LogEvent {
            timestamp: 1234567890,
            level: "info".to_string(),
            message: "Test message 1".to_string(),
            source: "test".to_string(),
            metadata: json!({}),
        };

        let event2 = LogEvent {
            timestamp: 1234567891,
            level: "warn".to_string(),
            message: "Test message 2".to_string(),
            source: "test".to_string(),
            metadata: json!({}),
        };

        // Add events
        buffer.add_event(event1.clone()).await;
        buffer.add_event(event2.clone()).await;

        assert_eq!(buffer.len(), 2);

        // Drain one event
        let drained = buffer.drain_events(1).await;
        assert_eq!(drained.len(), 1);
        assert_eq!(buffer.len(), 1);

        // Drain all
        let remaining = buffer.drain_all().await;
        assert_eq!(remaining.len(), 1);
        assert_eq!(buffer.len(), 0);
    }

    #[tokio::test]
    async fn test_agent_stats() {
        let mut stats = AgentStats::new();
        
        stats.events_collected = 100;
        stats.events_sent = 95;
        stats.events_failed = 5;

        assert_eq!(stats.events_collected, 100);
        assert!(stats.uptime().as_millis() > 0);

        stats.add_error("Test error".to_string());
        assert_eq!(stats.errors.len(), 1);
    }
}