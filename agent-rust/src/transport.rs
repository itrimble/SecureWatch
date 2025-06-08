// Secure transport layer with HTTPS, TLS, compression, and retry logic

use crate::config::TransportConfig;
use crate::errors::TransportError;
use crate::parsers::ParsedEvent;
use reqwest::{Client, ClientBuilder};
use serde_json::Value;
use std::time::Duration;
use tokio::time::sleep;
use tracing::{info, warn, error, debug};

pub struct SecureTransport {
    client: Client,
    config: TransportConfig,
}

impl SecureTransport {
    pub fn new(config: TransportConfig) -> Result<Self, TransportError> {
        let mut client_builder = ClientBuilder::new()
            .timeout(Duration::from_secs(30))
            .connect_timeout(Duration::from_secs(10))
            .user_agent("SecureWatch-Agent/1.0.0");

        // Configure TLS
        if config.tls_verify {
            client_builder = client_builder
                .use_rustls_tls()
                .tls_built_in_root_certs(true);
        } else {
            client_builder = client_builder
                .danger_accept_invalid_certs(true);
            warn!("⚠️  TLS certificate verification is disabled");
        }

        // Configure compression
        if config.compression {
            client_builder = client_builder
                .gzip(true)
                .brotli(true);
            debug!("🗜️  Compression enabled (gzip, brotli)");
        }

        let client = client_builder
            .build()
            .map_err(|e| TransportError::ConnectionFailed(format!("Failed to create HTTP client: {}", e)))?;

        info!("🔐 Secure transport initialized with TLS: {}, Compression: {}", config.tls_verify, config.compression);

        Ok(Self { client, config })
    }

    pub async fn send_batch(&self, events: Vec<ParsedEvent>) -> Result<(), TransportError> {
        if events.is_empty() {
            return Ok(());
        }

        let batch_size = self.config.batch_size.min(events.len());
        let batches: Vec<Vec<ParsedEvent>> = events
            .chunks(batch_size)
            .map(|chunk| chunk.to_vec())
            .collect();

        info!("📤 Sending {} events in {} batches", events.len(), batches.len());
        let total_batches = batches.len();

        for (i, batch) in batches.into_iter().enumerate() {
            debug!("📦 Sending batch {}/{} with {} events", i + 1, events.len() / batch_size + 1, batch.len());
            
            match self.send_single_batch(batch).await {
                Ok(_) => {
                    debug!("✅ Batch {} sent successfully", i + 1);
                }
                Err(e) => {
                    error!("❌ Failed to send batch {}: {}", i + 1, e);
                    return Err(e);
                }
            }

            // Small delay between batches to avoid overwhelming the server
            if i < total_batches - 1 {
                sleep(Duration::from_millis(10)).await;
            }
        }

        Ok(())
    }

    async fn send_single_batch(&self, events: Vec<ParsedEvent>) -> Result<(), TransportError> {
        let mut attempt = 0;
        let mut last_error = None;

        while attempt < self.config.retry_attempts {
            if attempt > 0 {
                let delay = Duration::from_secs(self.config.retry_delay * 2_u64.pow(attempt as u32 - 1));
                debug!("⏳ Retrying in {:?} (attempt {}/{})", delay, attempt + 1, self.config.retry_attempts);
                sleep(delay).await;
            }

            match self.perform_request(&events).await {
                Ok(_) => {
                    if attempt > 0 {
                        info!("✅ Request succeeded on attempt {}", attempt + 1);
                    }
                    return Ok(());
                }
                Err(e) => {
                    last_error = Some(e);
                    attempt += 1;
                    warn!("⚠️  Request failed on attempt {}: {:?}", attempt, last_error);
                }
            }
        }

        Err(last_error.unwrap_or(TransportError::RequestFailed("Unknown error".to_string())))
    }

    async fn perform_request(&self, events: &[ParsedEvent]) -> Result<(), TransportError> {
        let payload = self.prepare_payload(events)?;
        
        debug!("🌐 Sending {} bytes to {}", payload.len(), self.config.server_url);

        let response = self
            .client
            .post(&self.config.server_url)
            .bearer_auth(&self.config.api_key)
            .header("Content-Type", "application/json")
            .body(payload)
            .send()
            .await
            .map_err(|e| {
                if e.is_timeout() {
                    TransportError::Timeout
                } else if e.is_connect() {
                    TransportError::ConnectionFailed(e.to_string())
                } else {
                    TransportError::RequestFailed(e.to_string())
                }
            })?;

        let status = response.status();
        
        if status.is_success() {
            debug!("✅ Server responded with status: {}", status);
            Ok(())
        } else if status.is_client_error() {
            let error_body = response.text().await.unwrap_or_default();
            
            if status == 401 {
                Err(TransportError::AuthenticationFailed(format!("Invalid API key: {}", error_body)))
            } else {
                Err(TransportError::ServerError {
                    status: status.as_u16(),
                    message: error_body,
                })
            }
        } else {
            let error_body = response.text().await.unwrap_or_default();
            Err(TransportError::ServerError {
                status: status.as_u16(),
                message: error_body,
            })
        }
    }

    fn prepare_payload(&self, events: &[ParsedEvent]) -> Result<Vec<u8>, TransportError> {
        let json_events: Vec<Value> = events
            .iter()
            .map(|event| {
                serde_json::to_value(event)
                    .map_err(|e| TransportError::Serialization(e.to_string()))
            })
            .collect::<Result<Vec<_>, _>>()?;

        let payload = serde_json::json!({
            "events": json_events,
            "agent_id": "rust-agent", // This could be configurable
            "timestamp": chrono::Utc::now().to_rfc3339(),
            "version": "1.0.0"
        });

        serde_json::to_vec(&payload)
            .map_err(|e| TransportError::Serialization(e.to_string()))
    }

    pub async fn test_connection(&self) -> Result<(), TransportError> {
        info!("🔍 Testing connection to {}", self.config.server_url);

        let test_payload = serde_json::json!({
            "test": true,
            "timestamp": chrono::Utc::now().to_rfc3339()
        });

        let response = self
            .client
            .post(format!("{}/health", self.config.server_url))
            .bearer_auth(&self.config.api_key)
            .header("Content-Type", "application/json")
            .json(&test_payload)
            .send()
            .await
            .map_err(|e| {
                if e.is_timeout() {
                    TransportError::Timeout
                } else if e.is_connect() {
                    TransportError::ConnectionFailed(e.to_string())
                } else {
                    TransportError::RequestFailed(e.to_string())
                }
            })?;

        if response.status().is_success() {
            info!("✅ Connection test successful");
            Ok(())
        } else {
            Err(TransportError::ServerError {
                status: response.status().as_u16(),
                message: "Connection test failed".to_string(),
            })
        }
    }

    pub fn get_stats(&self) -> TransportStats {
        TransportStats {
            server_url: self.config.server_url.clone(),
            tls_enabled: self.config.tls_verify,
            compression_enabled: self.config.compression,
            batch_size: self.config.batch_size,
            retry_attempts: self.config.retry_attempts,
        }
    }
}

#[derive(Debug, serde::Serialize)]
pub struct TransportStats {
    pub server_url: String,
    pub tls_enabled: bool,
    pub compression_enabled: bool,
    pub batch_size: usize,
    pub retry_attempts: usize,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parsers::ParsedEvent;

    #[tokio::test]
    async fn test_transport_creation() {
        let config = TransportConfig {
            server_url: "https://api.example.com".to_string(),
            api_key: "test-key".to_string(),
            tls_verify: true,
            compression: true,
            batch_size: 100,
            batch_timeout: 5,
            retry_attempts: 3,
            retry_delay: 2,
        };

        let transport = SecureTransport::new(config);
        assert!(transport.is_ok());
    }

    #[test]
    fn test_prepare_payload() {
        let config = TransportConfig {
            server_url: "https://api.example.com".to_string(),
            api_key: "test-key".to_string(),
            tls_verify: true,
            compression: true,
            batch_size: 100,
            batch_timeout: 5,
            retry_attempts: 3,
            retry_delay: 2,
        };

        let transport = SecureTransport::new(config).unwrap();
        let events = vec![]; // Empty events for test
        let payload = transport.prepare_payload(&events);
        assert!(payload.is_ok());
    }
}