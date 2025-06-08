// Secure transport layer for SecureWatch Agent
// Implements async HTTP transport with TLS, compression, and retry logic

use crate::config::TransportConfig;
use reqwest::{Client, ClientBuilder};
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tokio::time::{sleep, timeout};
use tracing::{debug, error, instrument, warn};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEvent {
    pub timestamp: u64,
    pub level: String,
    pub message: String,
    pub source: String,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Clone)]
pub struct SecureTransport {
    client: Client,
    config: TransportConfig,
    base_url: String,
}

impl SecureTransport {
    #[instrument(skip(config))]
    pub async fn new(config: &TransportConfig) -> Result<Self, TransportError> {
        let mut client_builder = ClientBuilder::new()
            .timeout(Duration::from_secs(30))
            .connection_verbose(true)
            .pool_idle_timeout(Duration::from_secs(90))
            .pool_max_idle_per_host(10);

        // Configure TLS
        if config.tls_verify {
            client_builder = client_builder
                .use_rustls_tls()
                .https_only(true);
        } else {
            warn!("⚠️  TLS verification disabled - not recommended for production");
            client_builder = client_builder.danger_accept_invalid_certs(true);
        }

        // Configure compression
        if config.compression {
            client_builder = client_builder.gzip(true).brotli(true);
        }

        let client = client_builder.build()?;

        let base_url = config.server_url.trim_end_matches('/').to_string();

        let transport = Self {
            client,
            config: config.clone(),
            base_url,
        };

        // Test connection
        transport.test_connection().await?;

        debug!("✅ SecureTransport initialized successfully");
        Ok(transport)
    }

    #[instrument(skip(self))]
    async fn test_connection(&self) -> Result<(), TransportError> {
        let url = format!("{}/health", self.base_url);
        
        match timeout(Duration::from_secs(10), self.client.get(&url).send()).await {
            Ok(Ok(response)) => {
                if response.status().is_success() {
                    debug!("✅ Connection test successful");
                    Ok(())
                } else {
                    Err(TransportError::ConnectionFailed(
                        format!("Server returned status: {}", response.status())
                    ))
                }
            }
            Ok(Err(e)) => Err(TransportError::ConnectionFailed(e.to_string())),
            Err(_) => Err(TransportError::Timeout("Connection test timed out".to_string())),
        }
    }

    #[instrument(skip(self, event))]
    pub async fn send_event(&self, event: &LogEvent) -> Result<(), TransportError> {
        self.send_events(&[event.clone()]).await
    }

    #[instrument(skip(self, events))]
    pub async fn send_events(&self, events: &[LogEvent]) -> Result<(), TransportError> {
        if events.is_empty() {
            return Ok(());
        }

        let url = format!("{}/api/v1/events", self.base_url);
        let payload = EventBatch {
            events: events.to_vec(),
            agent_info: AgentInfo {
                version: env!("CARGO_PKG_VERSION").to_string(),
                platform: std::env::consts::OS.to_string(),
                arch: std::env::consts::ARCH.to_string(),
            },
        };

        let mut last_error = None;

        for attempt in 1..=self.config.retry_attempts {
            debug!("Sending {} events (attempt {}/{})", events.len(), attempt, self.config.retry_attempts);

            match self.execute_request(&url, &payload).await {
                Ok(_) => {
                    debug!("✅ Successfully sent {} events", events.len());
                    return Ok(());
                }
                Err(e) => {
                    warn!("❌ Failed to send events (attempt {}): {}", attempt, e);
                    last_error = Some(e);

                    if attempt < self.config.retry_attempts {
                        let delay = Duration::from_secs(self.config.retry_delay * attempt as u64);
                        debug!("⏳ Retrying in {:?}", delay);
                        sleep(delay).await;
                    }
                }
            }
        }

        Err(last_error.unwrap_or_else(|| {
            TransportError::SendFailed("All retry attempts exhausted".to_string())
        }))
    }

    #[instrument(skip(self, payload))]
    async fn execute_request(&self, url: &str, payload: &EventBatch) -> Result<(), TransportError> {
        let request = self.client
            .post(url)
            .header("Authorization", format!("Bearer {}", self.config.api_key))
            .header("Content-Type", "application/json")
            .header("User-Agent", format!("SecureWatch-Agent/{}", env!("CARGO_PKG_VERSION")))
            .json(payload);

        let response = timeout(Duration::from_secs(30), request.send()).await
            .map_err(|_| TransportError::Timeout("Request timed out".to_string()))?
            .map_err(|e| TransportError::RequestFailed(e.to_string()))?;

        if response.status().is_success() {
            Ok(())
        } else {
            let status = response.status();
            let error_text = response.text().await
                .unwrap_or_else(|_| "Unknown error".to_string());
            
            Err(TransportError::ServerError {
                status: status.as_u16(),
                message: error_text,
            })
        }
    }

    #[instrument(skip(self))]
    pub async fn send_heartbeat(&self, agent_id: &str) -> Result<(), TransportError> {
        let url = format!("{}/api/v1/heartbeat", self.base_url);
        let payload = HeartbeatPayload {
            agent_id: agent_id.to_string(),
            timestamp: chrono::Utc::now().timestamp() as u64,
            status: "active".to_string(),
            metadata: serde_json::json!({
                "version": env!("CARGO_PKG_VERSION"),
                "platform": std::env::consts::OS,
                "arch": std::env::consts::ARCH,
            }),
        };

        let request = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.config.api_key))
            .header("Content-Type", "application/json")
            .json(&payload);

        let response = timeout(Duration::from_secs(10), request.send()).await
            .map_err(|_| TransportError::Timeout("Heartbeat request timed out".to_string()))?
            .map_err(|e| TransportError::RequestFailed(e.to_string()))?;

        if response.status().is_success() {
            debug!("✅ Heartbeat sent successfully");
            Ok(())
        } else {
            Err(TransportError::ServerError {
                status: response.status().as_u16(),
                message: "Heartbeat failed".to_string(),
            })
        }
    }
}

#[derive(Debug, Serialize)]
struct EventBatch {
    events: Vec<LogEvent>,
    agent_info: AgentInfo,
}

#[derive(Debug, Serialize)]
struct AgentInfo {
    version: String,
    platform: String,
    arch: String,
}

#[derive(Debug, Serialize)]
struct HeartbeatPayload {
    agent_id: String,
    timestamp: u64,
    status: String,
    metadata: serde_json::Value,
}

#[derive(Debug, thiserror::Error)]
pub enum TransportError {
    #[error("HTTP client error: {0}")]
    HttpClient(#[from] reqwest::Error),

    #[error("Connection failed: {0}")]
    ConnectionFailed(String),

    #[error("Request timed out: {0}")]
    Timeout(String),

    #[error("Request failed: {0}")]
    RequestFailed(String),

    #[error("Server error {status}: {message}")]
    ServerError { status: u16, message: String },

    #[error("Failed to send events: {0}")]
    SendFailed(String),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
}