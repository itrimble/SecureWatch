// Minimal management server stub when gRPC is disabled

use crate::config::ManagementConfig;
use crate::errors::ManagementError;
use crate::buffer::BufferStats;
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::info;

pub struct ManagementServer {
    config: ManagementConfig,
}

impl ManagementServer {
    pub fn new(
        _agent_id: String,
        config: ManagementConfig,
        _buffer_stats: Arc<Mutex<BufferStats>>,
    ) -> Self {
        Self { config }
    }
    
    pub async fn start(&self) -> Result<(), ManagementError> {
        if self.config.enabled {
            info!("🚫 Management server requested but gRPC support is disabled");
        }
        Ok(())
    }
}