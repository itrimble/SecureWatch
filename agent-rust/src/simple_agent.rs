// Simplified SecureWatch Agent using Tokio patterns

use crate::config::AgentConfig;
use serde::{Deserialize, Serialize};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::sync::mpsc;
use tokio::time::{interval, sleep};
use tracing::{error, info, warn};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimpleLogEvent {
    pub timestamp: u64,
    pub level: String,
    pub message: String,
    pub source: String,
}

pub struct SimpleAgent {
    config: AgentConfig,
    agent_id: String,
}

impl SimpleAgent {
    pub fn new(config: AgentConfig) -> Self {
        let agent_id = format!("{}-{}", 
            config.agent.name, 
            Uuid::new_v4().to_string()[..8].to_string()
        );

        info!("🤖 Initializing Simple SecureWatch Agent: {}", agent_id);

        Self {
            config,
            agent_id,
        }
    }

    pub async fn run(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        info!("🚀 Starting Simple SecureWatch Agent runtime");

        // Create event channels using Tokio patterns
        let (event_tx, mut event_rx) = mpsc::channel::<SimpleLogEvent>(1000);
        let (shutdown_tx, mut shutdown_rx) = mpsc::channel::<()>(1);

        // Spawn heartbeat task using tokio::spawn
        let heartbeat_task = {
            let agent_id = self.agent_id.clone();
            let interval_secs = self.config.agent.heartbeat_interval;
            
            tokio::spawn(async move {
                let mut timer = interval(Duration::from_secs(interval_secs));
                loop {
                    timer.tick().await;
                    info!("💓 Heartbeat from agent: {}", agent_id);
                }
            })
        };

        // Spawn event processor using tokio::spawn
        let processor_task = tokio::spawn(async move {
            while let Some(event) = event_rx.recv().await {
                info!("📨 Processing event: {} - {}", event.source, event.message);
                // Simulate processing
                sleep(Duration::from_millis(10)).await;
            }
            info!("📨 Event processor shutting down");
        });

        // Spawn event generator for demo
        let generator_task = tokio::spawn(async move {
            let mut counter = 0;
            let mut timer = interval(Duration::from_secs(5));
            
            loop {
                timer.tick().await;
                counter += 1;
                
                let event = SimpleLogEvent {
                    timestamp: SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap()
                        .as_secs(),
                    level: "INFO".to_string(),
                    message: format!("Demo event #{}", counter),
                    source: "agent".to_string(),
                };

                if event_tx.send(event).await.is_err() {
                    break;
                }
            }
        });

        info!("✅ All agent tasks started successfully");

        // Wait for shutdown signal or task completion using tokio::select!
        tokio::select! {
            _ = shutdown_rx.recv() => {
                info!("🛑 Shutdown signal received");
            }
            result = heartbeat_task => {
                match result {
                    Ok(_) => info!("✅ Heartbeat task completed"),
                    Err(e) => error!("❌ Heartbeat task failed: {}", e),
                }
            }
            result = processor_task => {
                match result {
                    Ok(_) => info!("✅ Processor task completed"),
                    Err(e) => error!("❌ Processor task failed: {}", e),
                }
            }
            result = generator_task => {
                match result {
                    Ok(_) => info!("✅ Generator task completed"),
                    Err(e) => error!("❌ Generator task failed: {}", e),
                }
            }
        }

        info!("✅ Agent shutdown complete");
        Ok(())
    }
}