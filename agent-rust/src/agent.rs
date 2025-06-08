// Core SecureWatch Agent implementation using Tokio async runtime

use crate::collectors::{Collector, CollectorManager};
use crate::config::AgentConfig;
use crate::transport::{SecureTransport, LogEvent};
use crate::utils::{AgentStats, HealthMonitor, EventBuffer};

use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::sync::{mpsc, RwLock};
use tokio::time::{interval, timeout, Instant};
use tracing::{debug, error, info, instrument, warn};
use uuid::Uuid;

pub struct SecureWatchAgent {
    config: AgentConfig,
    agent_id: String,
    collector_manager: CollectorManager,
    transport: SecureTransport,
    event_buffer: Arc<RwLock<EventBuffer>>,
    health_monitor: HealthMonitor,
    stats: Arc<RwLock<AgentStats>>,
    shutdown_tx: Option<mpsc::Sender<()>>,
}

impl SecureWatchAgent {
    #[instrument(skip(config))]
    pub async fn new(
        config: AgentConfig,
        agent_id: Option<String>,
    ) -> Result<Self, AgentError> {
        let agent_id = agent_id.unwrap_or_else(|| {
            format!("{}-{}", 
                config.agent.name, 
                Uuid::new_v4().to_string()[..8].to_string()
            )
        });

        info!("🤖 Initializing SecureWatch Agent: {}", agent_id);

        // Initialize components
        let transport = SecureTransport::new(&config.transport).await?;
        let event_buffer = Arc::new(RwLock::new(
            EventBuffer::new(config.buffer.max_events, config.buffer.max_size_mb)
        ));
        let health_monitor = HealthMonitor::new(config.agent.max_memory_mb, config.agent.max_cpu_percent);
        let collector_manager = CollectorManager::new(&config.collectors).await?;

        let stats = Arc::new(RwLock::new(AgentStats::new()));

        Ok(Self {
            config,
            agent_id,
            collector_manager,
            transport,
            event_buffer,
            health_monitor,
            stats,
            shutdown_tx: None,
        })
    }

    #[instrument(skip(self))]
    pub async fn run(&mut self) -> Result<(), AgentError> {
        info!("🚀 Starting SecureWatch Agent runtime");

        // Create event channels
        let (event_tx, event_rx) = mpsc::channel::<LogEvent>(1000);
        let (shutdown_tx, shutdown_rx) = mpsc::channel::<()>(1);
        self.shutdown_tx = Some(shutdown_tx);

        // Start all collectors
        self.collector_manager.start_all(event_tx.clone()).await?;

        // Start core tasks
        let tasks = vec![
            self.spawn_event_processor(event_rx),
            self.spawn_heartbeat_sender(),
            self.spawn_health_monitor(),
            self.spawn_buffer_flusher(),
            self.spawn_stats_reporter(),
        ];

        info!("✅ All agent tasks started successfully");

        // Wait for shutdown signal or task completion
        tokio::select! {
            _ = shutdown_rx.recv() => {
                info!("🛑 Shutdown signal received");
            }
            result = tokio::try_join!(
                tasks[0],
                tasks[1], 
                tasks[2],
                tasks[3],
                tasks[4]
            ) => {
                match result {
                    Ok(_) => info!("✅ All tasks completed successfully"),
                    Err(e) => error!("❌ Task failed: {}", e),
                }
            }
        }

        Ok(())
    }

    #[instrument(skip(self))]
    pub async fn shutdown(&mut self) -> Result<(), AgentError> {
        info!("🔄 Shutting down SecureWatch Agent");

        // Signal shutdown
        if let Some(shutdown_tx) = self.shutdown_tx.take() {
            let _ = shutdown_tx.send(()).await;
        }

        // Stop collectors
        self.collector_manager.stop_all().await?;

        // Flush remaining events
        self.flush_events().await?;

        // Final stats
        let stats = self.stats.read().await;
        info!(
            "📊 Final statistics - Events: {} collected, {} sent, {} failed",
            stats.events_collected,
            stats.events_sent,
            stats.events_failed
        );

        info!("✅ Agent shutdown complete");
        Ok(())
    }

    // Spawns event processing task using Tokio patterns from Context7
    fn spawn_event_processor(&self, mut event_rx: mpsc::Receiver<LogEvent>) -> tokio::task::JoinHandle<()> {
        let buffer = Arc::clone(&self.event_buffer);
        let stats = Arc::clone(&self.stats);
        let batch_size = self.config.transport.batch_size;
        let batch_timeout = self.config.batch_timeout_duration();

        tokio::spawn(async move {
            let mut events_batch = Vec::with_capacity(batch_size);
            let mut flush_timer = interval(batch_timeout);

            loop {
                tokio::select! {
                    // Receive new events
                    Some(event) = event_rx.recv() => {
                        events_batch.push(event);
                        
                        // Update stats
                        {
                            let mut stats = stats.write().await;
                            stats.events_collected += 1;
                        }

                        // Flush if batch is full
                        if events_batch.len() >= batch_size {
                            Self::process_events_batch(&buffer, &mut events_batch).await;
                        }
                    }
                    // Periodic flush
                    _ = flush_timer.tick() => {
                        if !events_batch.is_empty() {
                            Self::process_events_batch(&buffer, &mut events_batch).await;
                        }
                    }
                    // Channel closed
                    else => {
                        if !events_batch.is_empty() {
                            Self::process_events_batch(&buffer, &mut events_batch).await;
                        }
                        break;
                    }
                }
            }

            debug!("Event processor task stopped");
        })
    }

    async fn process_events_batch(
        buffer: &Arc<RwLock<EventBuffer>>,
        events_batch: &mut Vec<LogEvent>,
    ) {
        if events_batch.is_empty() {
            return;
        }

        debug!("Processing batch of {} events", events_batch.len());

        // Add events to buffer
        {
            let mut buffer = buffer.write().await;
            for event in events_batch.drain(..) {
                buffer.add_event(event).await;
            }
        }
    }

    // Heartbeat sender using Tokio interval from Context7 patterns
    fn spawn_heartbeat_sender(&self) -> tokio::task::JoinHandle<()> {
        let transport = self.transport.clone();
        let agent_id = self.agent_id.clone();
        let heartbeat_interval = self.config.heartbeat_duration();
        let stats = Arc::clone(&self.stats);

        tokio::spawn(async move {
            let mut interval = interval(heartbeat_interval);

            loop {
                interval.tick().await;

                let stats = stats.read().await;
                let heartbeat = LogEvent {
                    timestamp: SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs(),
                    level: "info".to_string(),
                    message: "heartbeat".to_string(),
                    source: agent_id.clone(),
                    metadata: serde_json::json!({
                        "type": "heartbeat",
                        "events_collected": stats.events_collected,
                        "events_sent": stats.events_sent,
                        "events_failed": stats.events_failed,
                        "uptime": stats.uptime().as_secs(),
                    }),
                };

                if let Err(e) = transport.send_event(&heartbeat).await {
                    warn!("Failed to send heartbeat: {}", e);
                }
            }
        })
    }

    // Health monitor using async patterns
    fn spawn_health_monitor(&self) -> tokio::task::JoinHandle<()> {
        let mut health_monitor = self.health_monitor.clone();

        tokio::spawn(async move {
            let mut interval = interval(Duration::from_secs(30));

            loop {
                interval.tick().await;

                if let Err(e) = health_monitor.check_health().await {
                    warn!("Health check failed: {}", e);
                }
            }
        })
    }

    // Buffer flusher with async timeout handling
    fn spawn_buffer_flusher(&self) -> tokio::task::JoinHandle<()> {
        let buffer = Arc::clone(&self.event_buffer);
        let transport = self.transport.clone();
        let flush_interval = self.config.flush_interval_duration();
        let stats = Arc::clone(&self.stats);

        tokio::spawn(async move {
            let mut interval = interval(flush_interval);

            loop {
                interval.tick().await;

                // Flush events from buffer
                let events = {
                    let mut buffer = buffer.write().await;
                    buffer.drain_events(100).await
                };

                if !events.is_empty() {
                    debug!("Flushing {} events from buffer", events.len());

                    for event in events {
                        match timeout(Duration::from_secs(10), transport.send_event(&event)).await {
                            Ok(Ok(_)) => {
                                let mut stats = stats.write().await;
                                stats.events_sent += 1;
                            }
                            Ok(Err(e)) => {
                                warn!("Failed to send event: {}", e);
                                let mut stats = stats.write().await;
                                stats.events_failed += 1;
                            }
                            Err(_) => {
                                warn!("Event send timed out");
                                let mut stats = stats.write().await;
                                stats.events_failed += 1;
                            }
                        }
                    }
                }
            }
        })
    }

    // Stats reporter task
    fn spawn_stats_reporter(&self) -> tokio::task::JoinHandle<()> {
        let stats = Arc::clone(&self.stats);

        tokio::spawn(async move {
            let mut interval = interval(Duration::from_secs(300)); // 5 minutes

            loop {
                interval.tick().await;

                let stats = stats.read().await;
                info!(
                    "📊 Agent Statistics - Collected: {}, Sent: {}, Failed: {}, Uptime: {}s",
                    stats.events_collected,
                    stats.events_sent,
                    stats.events_failed,
                    stats.uptime().as_secs()
                );
            }
        })
    }

    async fn flush_events(&self) -> Result<(), AgentError> {
        let events = {
            let mut buffer = self.event_buffer.write().await;
            buffer.drain_all().await
        };

        info!("Flushing {} remaining events", events.len());

        for event in events {
            if let Err(e) = self.transport.send_event(&event).await {
                warn!("Failed to send event during shutdown: {}", e);
            }
        }

        Ok(())
    }
}

#[derive(Debug, thiserror::Error)]
pub enum AgentError {
    #[error("Configuration error: {0}")]
    Config(#[from] crate::config::ConfigError),

    #[error("Transport error: {0}")]
    Transport(#[from] crate::transport::TransportError),

    #[error("Collector error: {0}")]
    Collector(#[from] crate::collectors::CollectorError),

    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Agent error: {0}")]
    Other(String),
}