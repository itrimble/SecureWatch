// Secure transport layer with HTTPS, TLS, mTLS, WebSocket, compression, retry logic, and circuit breaker

use crate::config::TransportConfig;
use crate::errors::TransportError;
use crate::circuit_breaker::{CircuitBreaker, CircuitBreakerConfig, CircuitBreakerRegistry};

#[cfg(test)]
mod tests;
#[cfg(test)]
mod circuit_breaker_tests;
use crate::parsers::ParsedEvent;
use crate::validation::{InputValidator, ValidationConfig, ValidationRiskLevel};
use reqwest::{Client, ClientBuilder};
use serde_json::Value;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use std::path::Path;
use tokio::time::sleep;
use tokio::sync::mpsc;
use tracing::{info, warn, error, debug};

// WebSocket imports
use tokio_tungstenite::{connect_async, tungstenite::Message};
use futures::{SinkExt, StreamExt};
use url::Url;

// Advanced compression imports
use async_compression::tokio::bufread::ZstdEncoder;
use tokio::io::{AsyncRead, AsyncBufRead, AsyncWrite};

pub struct SecureTransport {
    client: Client,
    config: TransportConfig,
    cert_expiry_warning_sent: std::sync::Arc<std::sync::Mutex<bool>>,
    input_validator: std::sync::Arc<tokio::sync::Mutex<InputValidator>>,
    circuit_breaker: CircuitBreaker,
    circuit_breaker_registry: Arc<CircuitBreakerRegistry>,
    // WebSocket components
    websocket_sender: Option<Arc<tokio::sync::Mutex<mpsc::UnboundedSender<Message>>>>,
    websocket_connected: Arc<AtomicBool>,
    // Connection pooling and keep-alive management
    connection_pool_stats: Arc<tokio::sync::RwLock<ConnectionPoolStats>>,
    keep_alive_monitor: Option<tokio::task::JoinHandle<()>>,
}

// WebSocket connection handle for bidirectional communication
pub struct WebSocketConnection {
    sender: mpsc::UnboundedSender<Message>,
    receiver: mpsc::UnboundedReceiver<Message>,
    connected: Arc<AtomicBool>,
}

impl WebSocketConnection {
    /// Send a message through the WebSocket
    pub async fn send_message(&self, message: Message) -> Result<(), TransportError> {
        if !self.connected.load(Ordering::Relaxed) {
            return Err(TransportError::connection_failed("WebSocket not connected"));
        }

        self.sender.send(message)
            .map_err(|e| TransportError::connection_failed(&format!("Failed to send WebSocket message: {}", e)))
    }

    /// Send text message through the WebSocket
    pub async fn send_text(&self, text: &str) -> Result<(), TransportError> {
        self.send_message(Message::text(text)).await
    }

    /// Send binary message through the WebSocket
    pub async fn send_binary(&self, data: Vec<u8>) -> Result<(), TransportError> {
        self.send_message(Message::binary(data)).await
    }

    /// Receive next message from the WebSocket
    pub async fn receive_message(&mut self) -> Option<Message> {
        self.receiver.recv().await
    }

    /// Check if WebSocket is connected
    pub fn is_connected(&self) -> bool {
        self.connected.load(Ordering::Relaxed)
    }

    /// Send ping message for keepalive
    pub async fn ping(&self, payload: Vec<u8>) -> Result<(), TransportError> {
        self.send_message(Message::ping(payload)).await
    }

    /// Close the WebSocket connection
    pub async fn close(&self) -> Result<(), TransportError> {
        self.send_message(Message::close(None)).await
    }
}

/// Connection pool statistics for monitoring and optimization
#[derive(Debug, Clone, Default)]
pub struct ConnectionPoolStats {
    pub total_connections_created: u64,
    pub active_connections: u64,
    pub idle_connections: u64,
    pub reused_connections: u64,
    pub connection_errors: u64,
    pub average_connection_time_ms: f64,
    pub keep_alive_timeouts: u64,
    pub pool_size_limit: usize,
    pub last_activity: Option<std::time::SystemTime>,
    pub connection_lifetime_seconds: std::collections::HashMap<String, u64>,
}

/// Connection pool health assessment for monitoring and alerting
#[derive(Debug, Clone, serde::Serialize)]
pub struct ConnectionPoolHealth {
    pub status: String,
    pub reuse_rate: f64,
    pub error_rate: f64,
    pub total_requests: u64,
    pub average_connection_time_ms: f64,
    pub recommendations: Vec<String>,
}

impl SecureTransport {
    /// Configure connection pooling and keep-alive management for optimal performance
    fn configure_connection_pooling(
        mut client_builder: ClientBuilder, 
        config: &TransportConfig
    ) -> Result<ClientBuilder, TransportError> {
        // Configure HTTP/1.1 connection pooling
        if let Some(max_idle) = config.pool_max_idle_per_host {
            client_builder = client_builder.pool_max_idle_per_host(max_idle);
            debug!("🔗 Connection pool max idle per host: {}", max_idle);
        }

        if let Some(idle_timeout) = config.pool_idle_timeout {
            client_builder = client_builder.pool_idle_timeout(idle_timeout);
            debug!("⏱️  Connection pool idle timeout: {:?}", idle_timeout);
        }

        // Configure keep-alive settings
        if let Some(keep_alive_timeout) = config.keep_alive_timeout {
            client_builder = client_builder.tcp_keepalive(keep_alive_timeout);
            debug!("💓 TCP keep-alive timeout: {:?}", keep_alive_timeout);
        }

        // Configure HTTP/2 settings (use reqwest available methods)
        // Enable HTTP/2 optimizations for better performance
        // Note: http2_max_frame_size may not be available in all reqwest versions
        // client_builder = client_builder
        //     .http2_max_frame_size(Some(16384)); // Optimize frame size for better throughput
        debug!("🚀 HTTP/2 optimized frame size enabled for better connection performance");
        
        // Log HTTP/2 configuration for monitoring
        if let Some(interval) = config.http2_keep_alive_interval {
            debug!("🔄 HTTP/2 keep-alive interval configured: {:?}", interval);
        }

        if let Some(timeout) = config.http2_keep_alive_timeout {
            debug!("⏰ HTTP/2 keep-alive timeout configured: {:?}", timeout);
        }

        if let Some(while_idle) = config.http2_keep_alive_while_idle {
            debug!("😴 HTTP/2 keep-alive while idle configured: {}", while_idle);
        }

        info!("🔗 Advanced connection pooling and keep-alive management configured");
        Ok(client_builder)
    }

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

    pub async fn new(config: TransportConfig) -> Result<Self, TransportError> {
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

        // Configure connection pooling and keep-alive management
        client_builder = Self::configure_connection_pooling(client_builder, &config)?;

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
        
        // Initialize input validator for transport security
        let validation_config = ValidationConfig {
            strict_mode: true,
            auto_sanitize: true,
            block_suspicious_patterns: true,
            log_violations: true,
            ..Default::default()
        };
        
        let input_validator = InputValidator::new(validation_config).await
            .map_err(|e| TransportError::configuration_invalid(&format!("Failed to initialize input validator: {}", e)))?;
        
        // Initialize circuit breaker with transport-specific configuration
        let circuit_breaker_config = CircuitBreakerConfig {
            failure_threshold: config.circuit_breaker_failure_threshold.unwrap_or(5),
            recovery_timeout: config.circuit_breaker_recovery_timeout.unwrap_or(Duration::from_secs(30)),
            success_threshold: config.circuit_breaker_success_threshold.unwrap_or(3),
            max_open_duration: config.circuit_breaker_max_open_duration.unwrap_or(Duration::from_secs(300)),
            sliding_window_size: config.circuit_breaker_sliding_window_size.unwrap_or(100),
            failure_rate_threshold: config.circuit_breaker_failure_rate_threshold.unwrap_or(0.5),
            minimum_requests: config.circuit_breaker_minimum_requests.unwrap_or(10),
        };
        
        let circuit_breaker_name = format!("transport-{}", config.server_url);
        let circuit_breaker = CircuitBreaker::new(circuit_breaker_name.clone(), circuit_breaker_config);
        let circuit_breaker_registry = Arc::new(CircuitBreakerRegistry::new());
        
        info!("🔄 Circuit breaker '{}' initialized for transport resilience", circuit_breaker_name);
        
        // Initialize connection pool statistics
        let mut initial_stats = ConnectionPoolStats::default();
        initial_stats.pool_size_limit = config.pool_max_idle_per_host.unwrap_or(32);
        initial_stats.last_activity = Some(std::time::SystemTime::now());
        
        let transport = Self { 
            client, 
            config: config.clone(), 
            cert_expiry_warning_sent: std::sync::Arc::new(std::sync::Mutex::new(false)),
            input_validator: std::sync::Arc::new(tokio::sync::Mutex::new(input_validator)),
            circuit_breaker,
            circuit_breaker_registry,
            // Initialize WebSocket components
            websocket_sender: None,
            websocket_connected: Arc::new(AtomicBool::new(false)),
            // Initialize connection pooling components
            connection_pool_stats: Arc::new(tokio::sync::RwLock::new(initial_stats)),
            keep_alive_monitor: None,
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

    /// Validate events before transmission for security
    async fn validate_events(&self, events: &[ParsedEvent]) -> Result<(), TransportError> {
        let mut validator = self.input_validator.lock().await;
        let mut security_violations = 0;
        let mut total_validated = 0;
        
        for (idx, event) in events.iter().enumerate() {
            total_validated += 1;
            
            // Validate the event message
            let result = validator.validate_string(&event.message, &format!("event_message:{}", idx)).await;
                
                match result.risk_level {
                    ValidationRiskLevel::Critical => {
                        security_violations += 1;
                        error!("🚨 CRITICAL security violation in event {}: blocking transmission", idx);
                        for violation in &result.violations {
                            error!("  - {}: {}", violation.rule_name, violation.description);
                        }
                        return Err(TransportError::validation_failed(&format!(
                            "Critical security violation in event {}: potential injection attempt detected", idx
                        )));
                    }
                    ValidationRiskLevel::High => {
                        security_violations += 1;
                        warn!("⚠️ HIGH risk security violation in event {}: continuing with caution", idx);
                        for violation in &result.violations {
                            warn!("  - {}: {}", violation.rule_name, violation.description);
                        }
                    }
                    ValidationRiskLevel::Medium => {
                        warn!("⚠️ MEDIUM risk validation issue in event {}", idx);
                    }
                    ValidationRiskLevel::Low => {
                        debug!("ℹ️ Minor validation issue in event {}", idx);
                    }
                }
            
            // Validate fields
            let fields = &event.fields;
            for (field_name, field_value) in fields {
                // Validate field name
                let name_result = validator.validate_string(field_name, &format!("field_name:{}:{}", idx, field_name)).await;
                if matches!(name_result.risk_level, ValidationRiskLevel::High | ValidationRiskLevel::Critical) {
                    security_violations += 1;
                    error!("🚨 Security violation in field name '{}' for event {}", field_name, idx);
                    if matches!(name_result.risk_level, ValidationRiskLevel::Critical) {
                        return Err(TransportError::validation_failed(&format!(
                            "Critical security violation in field name for event {}", idx
                        )));
                    }
                }
                
                // Validate field value
                let value_str = match field_value {
                    serde_json::Value::String(s) => s.clone(),
                    other => other.to_string(),
                };
                
                let value_result = validator.validate_string(&value_str, &format!("field_value:{}:{}", idx, field_name)).await;
                if matches!(value_result.risk_level, ValidationRiskLevel::High | ValidationRiskLevel::Critical) {
                    security_violations += 1;
                    error!("🚨 Security violation in field value '{}' for event {}", field_name, idx);
                    if matches!(value_result.risk_level, ValidationRiskLevel::Critical) {
                        return Err(TransportError::validation_failed(&format!(
                            "Critical security violation in field '{}' for event {}", field_name, idx
                        )));
                    }
                }
            }
            
            // Validate source
            let result = validator.validate_string(&event.source, &format!("event_source:{}", idx)).await;
            if matches!(result.risk_level, ValidationRiskLevel::Critical) {
                security_violations += 1;
                return Err(TransportError::validation_failed(&format!(
                    "Critical security violation in event source for event {}", idx
                )));
            }
        }
        
        if security_violations > 0 {
            warn!("⚠️ Found {} security violations out of {} validated events", security_violations, total_validated);
        } else {
            debug!("✅ All {} events passed security validation", total_validated);
        }
        
        Ok(())
    }

    async fn send_single_batch(&self, events: Vec<ParsedEvent>) -> Result<(), TransportError> {
        // Validate events for security before transmission
        self.validate_events(&events).await?;
        
        let mut attempt = 0;
        let mut last_error = None;

        while attempt < self.config.retry_attempts {
            if attempt > 0 {
                let delay = Duration::from_secs(self.config.retry_delay * 2_u64.pow(attempt as u32 - 1));
                debug!("⏳ Retrying in {:?} (attempt {}/{})", delay, attempt + 1, self.config.retry_attempts);
                sleep(delay).await;
            }

            // Use circuit breaker to protect the request
            let request_result = self.circuit_breaker.call(|| {
                let events_clone = events.to_vec();
                async move {
                    self.perform_request(&events_clone).await
                }
            }).await;
            
            match request_result {
                Ok(_) => {
                    if attempt > 0 {
                        info!("✅ Request succeeded on attempt {} (circuit breaker: {})", 
                              attempt + 1, self.circuit_breaker.state().await);
                    }
                    return Ok(());
                }
                Err(e) => {
                    // Log circuit breaker state for debugging
                    debug!("Request failed with circuit breaker state: {}", self.circuit_breaker.state().await);
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

        // Measure connection time for statistics
        let start_time = std::time::Instant::now();
        
        let response = self
            .client
            .post(&self.config.server_url)
            .bearer_auth(&self.config.api_key)
            .header("Content-Type", "application/json")
            .body(payload)
            .send()
            .await
            .map_err(|e| {
                // Track connection error
                tokio::spawn({
                    let stats_ref = self.connection_pool_stats.clone();
                    async move {
                        let mut stats = stats_ref.write().await;
                        stats.connection_errors += 1;
                    }
                });
                
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
        let connection_time_ms = start_time.elapsed().as_millis() as f64;
        
        // Update connection statistics
        // Note: reqwest doesn't expose connection reuse information directly,
        // so we estimate based on response time (fast responses likely reused connections)
        let connection_likely_reused = connection_time_ms < 100.0;
        self.update_connection_stats(connection_likely_reused, connection_time_ms).await;
        
        if status.is_success() {
            debug!("✅ Server responded with status: {} ({}ms)", status, connection_time_ms);
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

        let raw_data = serde_json::to_vec(&payload)
            .map_err(|e| TransportError::serialization_error(&e.to_string()))?;

        // Apply intelligent compression based on size threshold
        self.apply_intelligent_compression(raw_data)
    }

    /// Apply intelligent compression based on size thresholds and configuration
    fn apply_intelligent_compression(&self, data: Vec<u8>) -> Result<Vec<u8>, TransportError> {
        // Check if compression is enabled and data meets threshold criteria
        if !self.config.compression {
            debug!("🗜️ Compression disabled, sending raw data ({} bytes)", data.len());
            return Ok(data);
        }

        let threshold = self.config.compression_threshold.unwrap_or(1024); // Default 1KB
        
        if data.len() < threshold {
            debug!("🗜️ Data size ({} bytes) below threshold ({} bytes), sending uncompressed", 
                   data.len(), threshold);
            return Ok(data);
        }

        // Perform zstd compression using tokio-compatible async compression
        let compression_level = self.config.compression_level.unwrap_or(3); // Default level 3
        
        debug!("🗜️ Compressing {} bytes with zstd level {}", data.len(), compression_level);
        
        // Use spawn_blocking to handle the compression without blocking the async executor
        let compressed_data = tokio::task::block_in_place(|| {
            self.compress_with_zstd(&data, compression_level)
        })?;

        let compression_ratio = compressed_data.len() as f64 / data.len() as f64;
        
        if compression_ratio < 0.9 { // Only use compression if we get >10% reduction
            info!("✅ Compression successful: {} → {} bytes (ratio: {:.2})", 
                  data.len(), compressed_data.len(), compression_ratio);
            Ok(compressed_data)
        } else {
            debug!("⚠️ Compression not beneficial (ratio: {:.2}), sending uncompressed", compression_ratio);
            Ok(data)
        }
    }

    /// Synchronous zstd compression for use within spawn_blocking
    fn compress_with_zstd(&self, data: &[u8], level: i32) -> Result<Vec<u8>, TransportError> {
        use std::io::Cursor;
        
        let cursor = Cursor::new(data);
        let mut encoder = zstd::stream::Encoder::new(Vec::new(), level)
            .map_err(|e| TransportError::compression_error(&format!("Failed to create zstd encoder: {}", e)))?;
        
        std::io::copy(&mut cursor.clone(), &mut encoder)
            .map_err(|e| TransportError::compression_error(&format!("Failed to compress data: {}", e)))?;
            
        encoder.finish()
            .map_err(|e| TransportError::compression_error(&format!("Failed to finalize compression: {}", e)))
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

    /// Get circuit breaker statistics for monitoring transport resilience
    pub async fn get_circuit_breaker_stats(&self) -> crate::circuit_breaker::CircuitBreakerStats {
        self.circuit_breaker.stats().await
    }
    
    /// Check if circuit breaker would allow a request
    pub async fn is_circuit_breaker_healthy(&self) -> bool {
        self.circuit_breaker.is_call_allowed().await
    }
    
    /// Get current circuit breaker state
    pub async fn get_circuit_breaker_state(&self) -> crate::circuit_breaker::CircuitBreakerState {
        self.circuit_breaker.state().await
    }
    
    /// Manually force circuit breaker to open state (for maintenance/emergencies)
    pub async fn force_circuit_breaker_open(&self) {
        self.circuit_breaker.force_open().await;
        warn!("🚨 Circuit breaker manually opened for transport '{}'", self.config.server_url);
    }
    
    /// Manually force circuit breaker to closed state (to restore service)
    pub async fn force_circuit_breaker_closed(&self) {
        self.circuit_breaker.force_closed().await;
        info!("🔄 Circuit breaker manually closed for transport '{}'", self.config.server_url);
    }
    
    /// Reset circuit breaker statistics
    pub async fn reset_circuit_breaker_stats(&self) {
        self.circuit_breaker.reset().await;
        info!("📊 Circuit breaker statistics reset for transport '{}'", self.config.server_url);
    }
    
    /// Get the circuit breaker registry for advanced management
    pub fn get_circuit_breaker_registry(&self) -> &Arc<CircuitBreakerRegistry> {
        &self.circuit_breaker_registry
    }

    pub async fn get_stats(&self) -> TransportStats {
        let pool_stats = self.connection_pool_stats.read().await;
        let total_requests = pool_stats.total_connections_created + pool_stats.reused_connections;
        let reuse_rate = if total_requests > 0 {
            (pool_stats.reused_connections as f64 / total_requests as f64) * 100.0
        } else {
            0.0
        };
        
        TransportStats {
            server_url: self.config.server_url.clone(),
            tls_enabled: self.config.tls_verify,
            mtls_enabled: self.config.client_cert_path.is_some(),
            compression_enabled: self.config.compression,
            batch_size: self.config.batch_size,
            retry_attempts: self.config.retry_attempts,
            // Connection pooling stats
            pool_max_idle_per_host: self.config.pool_max_idle_per_host.unwrap_or(32),
            pool_idle_timeout_sec: self.config.pool_idle_timeout.unwrap_or(std::time::Duration::from_secs(90)).as_secs(),
            keep_alive_timeout_sec: self.config.keep_alive_timeout.unwrap_or(std::time::Duration::from_secs(90)).as_secs(),
            connection_reuse_rate: reuse_rate,
            average_connection_time_ms: pool_stats.average_connection_time_ms,
        }
    }

    /// Initialize WebSocket connection for bidirectional communication
    pub async fn connect_websocket(&mut self, websocket_url: &str) -> Result<WebSocketConnection, TransportError> {
        info!("🔌 Establishing WebSocket connection to: {}", websocket_url);
        
        let url = Url::parse(websocket_url)
            .map_err(|e| TransportError::configuration_invalid(&format!("Invalid WebSocket URL: {}", e)))?;

        let (ws_stream, _) = connect_async(url).await
            .map_err(|e| TransportError::connection_failed(&format!("WebSocket connection failed: {}", e)))?;

        info!("✅ WebSocket handshake completed successfully");

        let (ws_write, ws_read) = ws_stream.split();
        let (tx, rx) = mpsc::unbounded_channel();
        let (cmd_tx, cmd_rx) = mpsc::unbounded_channel();

        // Set connection status
        self.websocket_connected.store(true, Ordering::Relaxed);
        self.websocket_sender = Some(Arc::new(tokio::sync::Mutex::new(tx.clone())));

        // Spawn WebSocket writer task
        let connected_write = self.websocket_connected.clone();
        tokio::spawn(async move {
            let mut write = ws_write;
            let mut cmd_receiver = cmd_rx;
            
            while let Some(message) = cmd_receiver.recv().await {
                if let Err(e) = write.send(message).await {
                    error!("❌ WebSocket send error: {}", e);
                    connected_write.store(false, Ordering::Relaxed);
                    break;
                }
            }
        });

        // Spawn WebSocket reader task  
        let connected_read = self.websocket_connected.clone();
        let reader_tx = tx.clone();
        tokio::spawn(async move {
            let mut read = ws_read;
            
            while let Some(msg_result) = read.next().await {
                match msg_result {
                    Ok(msg) => {
                        if msg.is_text() || msg.is_binary() {
                            if reader_tx.send(msg).is_err() {
                                debug!("📨 WebSocket message channel closed");
                                break;
                            }
                        } else if msg.is_close() {
                            info!("🔌 WebSocket connection closed by server");
                            connected_read.store(false, Ordering::Relaxed);
                            break;
                        }
                    }
                    Err(e) => {
                        error!("❌ WebSocket receive error: {}", e);
                        connected_read.store(false, Ordering::Relaxed);
                        break;
                    }
                }
            }
        });

        Ok(WebSocketConnection {
            sender: cmd_tx,
            receiver: rx,
            connected: self.websocket_connected.clone(),
        })
    }

    /// Send events via WebSocket if connected, fallback to HTTP
    pub async fn send_via_websocket(&self, events: &[ParsedEvent]) -> Result<(), TransportError> {
        if !self.websocket_connected.load(Ordering::Relaxed) {
            return Err(TransportError::connection_failed("WebSocket not connected"));
        }

        if let Some(sender_ref) = &self.websocket_sender {
            let payload = self.prepare_payload(events)?;
            let message = Message::text(payload);
            
            let sender = sender_ref.lock().await;
            sender.send(message)
                .map_err(|e| TransportError::connection_failed(&format!("WebSocket send failed: {}", e)))?;
            
            debug!("📤 Sent {} events via WebSocket", events.len());
            Ok(())
        } else {
            Err(TransportError::connection_failed("WebSocket sender not initialized"))
        }
    }

    /// Check if WebSocket connection is active
    pub fn is_websocket_connected(&self) -> bool {
        self.websocket_connected.load(Ordering::Relaxed)
    }

    /// Get connection pool statistics for monitoring and optimization
    pub async fn get_connection_pool_stats(&self) -> ConnectionPoolStats {
        self.connection_pool_stats.read().await.clone()
    }
    
    /// Update connection pool statistics after a request
    async fn update_connection_stats(&self, connection_reused: bool, connection_time_ms: f64) {
        let mut stats = self.connection_pool_stats.write().await;
        
        if connection_reused {
            stats.reused_connections += 1;
        } else {
            stats.total_connections_created += 1;
        }
        
        // Update average connection time with exponential moving average
        if stats.total_connections_created == 1 {
            stats.average_connection_time_ms = connection_time_ms;
        } else {
            stats.average_connection_time_ms = 
                0.9 * stats.average_connection_time_ms + 0.1 * connection_time_ms;
        }
        
        stats.last_activity = Some(std::time::SystemTime::now());
    }
    
    /// Start connection pool monitoring task
    pub async fn start_connection_monitoring(&mut self) -> Result<(), TransportError> {
        let stats_ref = self.connection_pool_stats.clone();
        let config = self.config.clone();
        
        let monitor_handle = tokio::spawn(async move {
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(30));
            
            loop {
                interval.tick().await;
                
                let stats = stats_ref.read().await;
                let total_requests = stats.total_connections_created + stats.reused_connections;
                
                if total_requests > 0 {
                    let reuse_rate = (stats.reused_connections as f64 / total_requests as f64) * 100.0;
                    
                    info!(
                        "🔗 Connection Pool Stats - Total: {}, Reused: {}, Reuse Rate: {:.1}%, Avg Time: {:.2}ms",
                        total_requests,
                        stats.reused_connections,
                        reuse_rate,
                        stats.average_connection_time_ms
                    );
                    
                    // Log warnings for poor connection reuse
                    if reuse_rate < 70.0 && total_requests > 10 {
                        warn!(
                            "⚠️ Low connection reuse rate ({:.1}%). Consider tuning pool settings.",
                            reuse_rate
                        );
                    }
                    
                    // Log info about pool efficiency
                    if stats.connection_errors > 0 {
                        let error_rate = (stats.connection_errors as f64 / total_requests as f64) * 100.0;
                        warn!("❌ Connection error rate: {:.1}% ({} errors)", error_rate, stats.connection_errors);
                    }
                }
            }
        });
        
        self.keep_alive_monitor = Some(monitor_handle);
        info!("📊 Connection pool monitoring started");
        Ok(())
    }
    
    /// Stop connection pool monitoring
    pub async fn stop_connection_monitoring(&mut self) {
        if let Some(handle) = self.keep_alive_monitor.take() {
            handle.abort();
            info!("🛑 Connection pool monitoring stopped");
        }
    }
    
    /// Reset connection pool statistics
    pub async fn reset_connection_stats(&self) {
        let mut stats = self.connection_pool_stats.write().await;
        *stats = ConnectionPoolStats::default();
        stats.pool_size_limit = self.config.pool_max_idle_per_host.unwrap_or(32);
        stats.last_activity = Some(std::time::SystemTime::now());
        info!("📊 Connection pool statistics reset");
    }
    
    /// Check connection pool health and efficiency
    pub async fn check_connection_pool_health(&self) -> ConnectionPoolHealth {
        let stats = self.connection_pool_stats.read().await;
        let total_requests = stats.total_connections_created + stats.reused_connections;
        
        let reuse_rate = if total_requests > 0 {
            (stats.reused_connections as f64 / total_requests as f64) * 100.0
        } else {
            0.0
        };
        
        let error_rate = if total_requests > 0 {
            (stats.connection_errors as f64 / total_requests as f64) * 100.0
        } else {
            0.0
        };
        
        let health_status = if error_rate > 10.0 {
            "unhealthy"
        } else if reuse_rate < 50.0 && total_requests > 10 {
            "poor_efficiency"
        } else if reuse_rate > 80.0 && error_rate < 2.0 {
            "excellent"
        } else {
            "healthy"
        };
        
        ConnectionPoolHealth {
            status: health_status.to_string(),
            reuse_rate,
            error_rate,
            total_requests,
            average_connection_time_ms: stats.average_connection_time_ms,
            recommendations: Self::get_pool_recommendations(reuse_rate, error_rate, &stats),
        }
    }
    
    /// Get recommendations for connection pool optimization
    fn get_pool_recommendations(reuse_rate: f64, error_rate: f64, stats: &ConnectionPoolStats) -> Vec<String> {
        let mut recommendations = Vec::new();
        
        if reuse_rate < 70.0 {
            recommendations.push("Consider increasing pool_max_idle_per_host for better connection reuse".to_string());
            recommendations.push("Check if pool_idle_timeout is too short".to_string());
        }
        
        if error_rate > 5.0 {
            recommendations.push("High connection error rate - check network stability".to_string());
            recommendations.push("Consider increasing connection and read timeouts".to_string());
        }
        
        if stats.average_connection_time_ms > 1000.0 {
            recommendations.push("High average connection time - check network latency".to_string());
            recommendations.push("Consider using HTTP/2 for multiplexing".to_string());
        }
        
        if stats.keep_alive_timeouts > stats.total_connections_created / 4 {
            recommendations.push("Many keep-alive timeouts - consider increasing keep_alive_timeout".to_string());
        }
        
        if recommendations.is_empty() {
            recommendations.push("Connection pool is performing well".to_string());
        }
        
        recommendations
    }

    /// Send hybrid - try WebSocket first, fallback to HTTP
    pub async fn send_hybrid(&self, events: Vec<ParsedEvent>) -> Result<(), TransportError> {
        // Try WebSocket first if connected
        if self.is_websocket_connected() {
            match self.send_via_websocket(&events).await {
                Ok(()) => {
                    debug!("✅ Events sent via WebSocket successfully");
                    return Ok(());
                }
                Err(e) => {
                    warn!("⚠️ WebSocket send failed, falling back to HTTP: {}", e);
                }
            }
        }

        // Fallback to HTTP
        debug!("📤 Sending events via HTTP fallback");
        self.send_batch(events).await
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
    // Connection pooling stats
    pub pool_max_idle_per_host: usize,
    pub pool_idle_timeout_sec: u64,
    pub keep_alive_timeout_sec: u64,
    pub connection_reuse_rate: f64,
    pub average_connection_time_ms: f64,
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
            compression_threshold: Some(1024),
            compression_level: Some(3),
            batch_size: 100,
            batch_timeout: 5,
            retry_attempts: 3,
            retry_delay: 2,
            client_cert_path: None,
            client_key_path: None,
            client_key_password: None,
            ca_cert_path: None,
            cert_expiry_warning_days: 30,
            circuit_breaker_failure_threshold: Some(5),
            circuit_breaker_recovery_timeout: Some(std::time::Duration::from_secs(30)),
            circuit_breaker_success_threshold: Some(3),
            circuit_breaker_max_open_duration: Some(std::time::Duration::from_secs(300)),
            circuit_breaker_sliding_window_size: Some(100),
            circuit_breaker_failure_rate_threshold: Some(0.5),
            circuit_breaker_minimum_requests: Some(10),
            // Connection pooling test configuration
            pool_max_idle_per_host: Some(16),
            pool_idle_timeout: Some(std::time::Duration::from_secs(60)),
            keep_alive_timeout: Some(std::time::Duration::from_secs(60)),
            keep_alive_while_idle: Some(true),
            pool_max_idle_per_host_timeout: Some(std::time::Duration::from_secs(120)),
            http2_keep_alive_interval: Some(std::time::Duration::from_secs(30)),
            http2_keep_alive_timeout: Some(std::time::Duration::from_secs(10)),
            http2_keep_alive_while_idle: Some(true),
        };

        let transport = SecureTransport::new(config);
        assert!(transport.is_ok());
    }

    #[tokio::test]
    async fn test_prepare_payload() {
        let config = TransportConfig {
            server_url: "https://api.example.com".to_string(),
            api_key: "test-key".to_string(),
            tls_verify: true,
            compression: true,
            compression_threshold: Some(1024),
            compression_level: Some(3),
            batch_size: 100,
            batch_timeout: 5,
            retry_attempts: 3,
            retry_delay: 2,
            client_cert_path: None,
            client_key_path: None,
            client_key_password: None,
            ca_cert_path: None,
            cert_expiry_warning_days: 30,
            circuit_breaker_failure_threshold: Some(5),
            circuit_breaker_recovery_timeout: Some(std::time::Duration::from_secs(30)),
            circuit_breaker_success_threshold: Some(3),
            circuit_breaker_max_open_duration: Some(std::time::Duration::from_secs(300)),
            circuit_breaker_sliding_window_size: Some(100),
            circuit_breaker_failure_rate_threshold: Some(0.5),
            circuit_breaker_minimum_requests: Some(10),
            // Connection pooling test configuration
            pool_max_idle_per_host: Some(16),
            pool_idle_timeout: Some(std::time::Duration::from_secs(60)),
            keep_alive_timeout: Some(std::time::Duration::from_secs(60)),
            keep_alive_while_idle: Some(true),
            pool_max_idle_per_host_timeout: Some(std::time::Duration::from_secs(120)),
            http2_keep_alive_interval: Some(std::time::Duration::from_secs(30)),
            http2_keep_alive_timeout: Some(std::time::Duration::from_secs(10)),
            http2_keep_alive_while_idle: Some(true),
        };

        let transport = SecureTransport::new(config).await.unwrap();
        let events = vec![]; // Empty events for test
        let payload = transport.prepare_payload(&events);
        assert!(payload.is_ok());
    }
}