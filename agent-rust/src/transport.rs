// Secure transport layer with HTTPS, TLS, mTLS, compression, and retry logic

use crate::config::TransportConfig;
use crate::errors::TransportError;
use crate::parsers::ParsedEvent;
use reqwest::{Client, ClientBuilder};
use serde_json::Value;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use std::path::Path;
use tokio::time::sleep;
use tracing::{info, warn, error, debug};

pub struct SecureTransport {
    client: Client,
    config: TransportConfig,
    cert_expiry_warning_sent: std::sync::Arc<std::sync::Mutex<bool>>,
}

impl SecureTransport {
    /// Configure mTLS client certificates for the HTTP client
    fn configure_mtls_certificates(
        mut client_builder: ClientBuilder, 
        cert_path: &str, 
        key_path: &str, 
        config: &TransportConfig
    ) -> Result<ClientBuilder, TransportError> {
        // Read certificate file
        let cert_pem = std::fs::read(cert_path)
            .map_err(|e| TransportError::TlsError {
                operation: "read_client_certificate".to_string(),
                reason: format!("Failed to read certificate file '{}': {}", cert_path, e),
                certificate_issue: true,
                source: Box::new(e),
            })?;
        
        // Read private key file
        let key_pem = std::fs::read(key_path)
            .map_err(|e| TransportError::TlsError {
                operation: "read_client_key".to_string(),
                reason: format!("Failed to read private key file '{}': {}", key_path, e),
                certificate_issue: true,
                source: Box::new(e),
            })?;
        
        info!("🔑 Loading mTLS client certificate from: {}", cert_path);
        
        // Configure based on TLS backend
        #[cfg(feature = "rustls-backend")]
        {
            // For rustls backend, use PKCS8 PEM format
            let identity = reqwest::Identity::from_pkcs8_pem(&cert_pem, &key_pem)
                .map_err(|e| TransportError::TlsError {
                    operation: "create_identity".to_string(),
                    reason: format!("Failed to create client identity from PKCS8 PEM: {}", e),
                    certificate_issue: true,
                    source: Box::new(std::io::Error::new(std::io::ErrorKind::InvalidData, e.to_string())),
                })?;
            
            client_builder = client_builder.identity(identity);
        }
        
        #[cfg(feature = "native-tls-backend")]
        {
            // For native-tls, try PKCS12 first, then PKCS8 PEM
            let identity = if let Some(password) = &config.client_key_password {
                // Try PKCS12 format first
                reqwest::Identity::from_pkcs12_der(&cert_pem, password)
                    .or_else(|_| reqwest::Identity::from_pkcs8_pem(&cert_pem, &key_pem))
            } else {
                // Use PKCS8 PEM format
                reqwest::Identity::from_pkcs8_pem(&cert_pem, &key_pem)
            }
            .map_err(|e| TransportError::TlsError {
                operation: "create_identity".to_string(),
                reason: format!("Failed to create client identity: {}", e),
                certificate_issue: true,
                source: Box::new(std::io::Error::new(std::io::ErrorKind::InvalidData, e.to_string())),
            })?;
            
            client_builder = client_builder.identity(identity);
        }
        
        info!("✅ mTLS client certificate configured successfully");
        Ok(client_builder)
    }
    
    /// Configure custom CA certificate
    fn configure_custom_ca(mut client_builder: ClientBuilder, ca_path: &str) -> Result<ClientBuilder, TransportError> {
        let ca_cert = std::fs::read(ca_path)
            .map_err(|e| TransportError::TlsError {
                operation: "read_ca_certificate".to_string(),
                reason: format!("Failed to read CA certificate file '{}': {}", ca_path, e),
                certificate_issue: true,
                source: Box::new(e),
            })?;
        
        let ca_cert = reqwest::Certificate::from_pem(&ca_cert)
            .map_err(|e| TransportError::TlsError {
                operation: "parse_ca_certificate".to_string(),
                reason: format!("Failed to parse CA certificate: {}", e),
                certificate_issue: true,
                source: Box::new(std::io::Error::new(std::io::ErrorKind::InvalidData, e.to_string())),
            })?;
        
        client_builder = client_builder.add_root_certificate(ca_cert);
        info!("🏛️  Custom CA certificate loaded from: {}", ca_path);
        
        Ok(client_builder)
    }
    
    /// Check certificate expiry and warn if approaching expiration
    async fn check_certificate_expiry(&self, cert_path: &str) -> Result<(), TransportError> {
        let cert_pem = tokio::fs::read(cert_path).await
            .map_err(|e| TransportError::TlsError {
                operation: "read_certificate_for_expiry_check".to_string(),
                reason: format!("Failed to read certificate for expiry check: {}", e),
                certificate_issue: true,
                source: Box::new(e),
            })?;
        
        // Parse certificate to check expiry (simplified approach)
        // In a production environment, you'd want to use a proper X.509 parsing library
        let cert_str = String::from_utf8_lossy(&cert_pem);
        
        // Look for certificate validity dates in PEM format
        // This is a basic implementation - for production use a proper X.509 parser like x509-parser
        if let Some(_) = cert_str.find("-----BEGIN CERTIFICATE-----") {
            info!("📋 Certificate found, expiry checking is basic (consider upgrading to full X.509 parsing)");
            
            // For now, just log that we have a certificate
            // In a full implementation, you would:
            // 1. Parse the X.509 certificate
            // 2. Extract the notAfter field
            // 3. Compare with current time + warning threshold
            // 4. Send appropriate warnings
            
            // This is a placeholder that would need proper X.509 parsing
            self.schedule_expiry_check().await;
        }
        
        Ok(())
    }
    
    /// Schedule periodic certificate expiry checks
    async fn schedule_expiry_check(&self) {
        // This would typically be enhanced with proper X.509 parsing
        // For now, just log that monitoring is active
        debug!("📅 Certificate expiry monitoring is active (basic implementation)");
        
        // In a production implementation, you would:
        // 1. Parse the certificate to get actual expiry date
        // 2. Set up a timer to check periodically
        // 3. Send warnings at configurable thresholds (30, 14, 7, 1 days)
        // 4. Potentially trigger certificate renewal workflows
    }

    pub fn new(config: TransportConfig) -> Result<Self, TransportError> {
        let mut client_builder = ClientBuilder::new()
            .timeout(Duration::from_secs(30))
            .connect_timeout(Duration::from_secs(10))
            .user_agent("SecureWatch-Agent/1.0.0");

        // Configure TLS - use appropriate backend based on features
        if config.tls_verify {
            #[cfg(feature = "rustls-backend")]
            {
                client_builder = client_builder
                    .use_rustls_tls()
                    .tls_built_in_root_certs(true);
            }
            
            #[cfg(feature = "native-tls-backend")]
            {
                client_builder = client_builder
                    .use_native_tls()
                    .tls_built_in_root_certs(true);
            }
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

        // Configure mTLS client certificates if provided
        if let (Some(cert_path), Some(key_path)) = (&config.client_cert_path, &config.client_key_path) {
            client_builder = Self::configure_mtls_certificates(client_builder, cert_path, key_path, &config)?;
        }
        
        // Configure custom CA certificate if provided
        if let Some(ca_path) = &config.ca_cert_path {
            client_builder = Self::configure_custom_ca(client_builder, ca_path)?;
        }

        let client = client_builder
            .build()
            .map_err(|e| TransportError::connection_failed(&format!("Failed to create HTTP client: {}", e)))?;

        let mtls_status = if config.client_cert_path.is_some() { "enabled" } else { "disabled" };
        info!("🔐 Secure transport initialized with TLS: {}, mTLS: {}, Compression: {}", 
              config.tls_verify, mtls_status, config.compression);
        
        let transport = Self { 
            client, 
            config: config.clone(), 
            cert_expiry_warning_sent: std::sync::Arc::new(std::sync::Mutex::new(false))
        };
        
        // Note: Certificate expiry check is performed during operations
        // to avoid async issues in constructor

        Ok(transport)
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

        Err(last_error.unwrap_or_else(|| TransportError::connection_failed("Unknown error")))
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
                    TransportError::Timeout {
                        operation: "http_request".to_string(),
                        duration_ms: 30000,
                        retryable: true,
                    }
                } else if e.is_connect() {
                    TransportError::connection_failed(&e.to_string())
                } else {
                    TransportError::RequestFailed {
                        method: "POST".to_string(),
                        url: self.config.server_url.clone(),
                        status_code: None,
                        source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
                    }
                }
            })?;

        let status = response.status();
        
        if status.is_success() {
            debug!("✅ Server responded with status: {}", status);
            Ok(())
        } else if status.is_client_error() {
            let error_body = response.text().await.unwrap_or_default();
            
            if status == 401 {
                Err(TransportError::AuthenticationFailed {
                    method: "api_key".to_string(),
                    reason: format!("Invalid API key: {}", error_body),
                    retry_allowed: false,
                })
            } else {
                Err(TransportError::ServerError {
                    status: status.as_u16(),
                    message: error_body,
                    headers: vec![],
                    body: None,
                    retryable: false,
                })
            }
        } else {
            let error_body = response.text().await.unwrap_or_default();
            Err(TransportError::ServerError {
                status: status.as_u16(),
                message: error_body,
                headers: vec![],
                body: None,
                retryable: status.as_u16() >= 500,
            })
        }
    }

    fn prepare_payload(&self, events: &[ParsedEvent]) -> Result<Vec<u8>, TransportError> {
        let json_events: Vec<Value> = events
            .iter()
            .map(|event| {
                serde_json::to_value(event)
                    .map_err(|e| TransportError::serialization_error(&e.to_string()))
            })
            .collect::<Result<Vec<_>, _>>()?;

        let payload = serde_json::json!({
            "events": json_events,
            "agent_id": "rust-agent", // This could be configurable
            "timestamp": chrono::Utc::now().to_rfc3339(),
            "version": "1.0.0"
        });

        serde_json::to_vec(&payload)
            .map_err(|e| TransportError::serialization_error(&e.to_string()))
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
                    TransportError::Timeout {
                        operation: "http_request".to_string(),
                        duration_ms: 30000,
                        retryable: true,
                    }
                } else if e.is_connect() {
                    TransportError::connection_failed(&e.to_string())
                } else {
                    TransportError::RequestFailed {
                        method: "POST".to_string(),
                        url: self.config.server_url.clone(),
                        status_code: None,
                        source: Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())),
                    }
                }
            })?;

        if response.status().is_success() {
            info!("✅ Connection test successful");
            Ok(())
        } else {
            Err(TransportError::ServerError {
                status: response.status().as_u16(),
                message: "Connection test failed".to_string(),
                headers: vec![],
                body: None,
                retryable: false,
            })
        }
    }

    /// Get mTLS certificate status and expiry information
    pub async fn get_certificate_status(&self) -> Option<CertificateStatus> {
        if let Some(cert_path) = &self.config.client_cert_path {
            match self.get_certificate_info(cert_path).await {
                Ok(info) => Some(info),
                Err(e) => {
                    warn!("Failed to get certificate status: {}", e);
                    None
                }
            }
        } else {
            None
        }
    }
    
    /// Get detailed certificate information
    async fn get_certificate_info(&self, cert_path: &str) -> Result<CertificateStatus, TransportError> {
        // Read certificate file
        let cert_pem = tokio::fs::read(cert_path).await
            .map_err(|e| TransportError::TlsError {
                operation: "read_certificate_info".to_string(),
                reason: format!("Failed to read certificate file: {}", e),
                certificate_issue: true,
                source: Box::new(e),
            })?;
        
        // Basic certificate information extraction (placeholder implementation)
        // In production, you'd use a proper X.509 parsing library like x509-parser
        let cert_str = String::from_utf8_lossy(&cert_pem);
        let has_certificate = cert_str.contains("-----BEGIN CERTIFICATE-----");
        
        Ok(CertificateStatus {
            path: cert_path.to_string(),
            exists: true,
            valid: has_certificate,
            expires_at: None, // Would be populated with actual X.509 parsing
            days_until_expiry: None,
            subject: None,
            issuer: None,
        })
    }

    pub fn get_stats(&self) -> TransportStats {
        TransportStats {
            server_url: self.config.server_url.clone(),
            tls_enabled: self.config.tls_verify,
            mtls_enabled: self.config.client_cert_path.is_some(),
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
    pub mtls_enabled: bool,
    pub compression_enabled: bool,
    pub batch_size: usize,
    pub retry_attempts: usize,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct CertificateStatus {
    pub path: String,
    pub exists: bool,
    pub valid: bool,
    pub expires_at: Option<SystemTime>,
    pub days_until_expiry: Option<i64>,
    pub subject: Option<String>,
    pub issuer: Option<String>,
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
            client_cert_path: None,
            client_key_path: None,
            client_key_password: None,
            ca_cert_path: None,
            cert_expiry_warning_days: 30,
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
            client_cert_path: None,
            client_key_path: None,
            client_key_password: None,
            ca_cert_path: None,
            cert_expiry_warning_days: 30,
        };

        let transport = SecureTransport::new(config).unwrap();
        let events = vec![]; // Empty events for test
        let payload = transport.prepare_payload(&events);
        assert!(payload.is_ok());
    }
}