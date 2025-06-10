#[cfg(test)]
mod transport_tests {
    use super::*;
    use crate::config::{Config, TransportConfig};
    use crate::validation::{InputValidator, ValidationConfig};
    use wiremock::{MockServer, Mock, ResponseTemplate};
    use wiremock::matchers::{method, path, header};
    use std::collections::HashMap;
    use std::time::Duration;
    use pretty_assertions::assert_eq;
    use tokio::time::timeout;

    fn create_test_event() -> ParsedEvent {
        ParsedEvent {
            timestamp: chrono::Utc::now(),
            source: "test".to_string(),
            event_type: "test_event".to_string(),
            message: "Test message".to_string(),
            fields: HashMap::new(),
            raw_data: "raw test data".to_string(),
        }
    }

    async fn create_test_transport(server_url: String) -> SecureTransport {
        let config = TransportConfig {
            server_url,
            api_key: "test-key".to_string(),
            timeout: Duration::from_secs(30),
            max_retries: 3,
            retry_delay: Duration::from_millis(100),
            compression_enabled: false,
            batch_size: 10,
            ..Default::default()
        };
        
        SecureTransport::new(config).await.expect("Should create transport")
    }

    #[tokio::test]
    async fn test_transport_creation() {
        let mock_server = MockServer::start().await;
        let transport = create_test_transport(mock_server.uri()).await;
        
        assert_eq!(transport.config.api_key, "test-key");
        assert_eq!(transport.config.max_retries, 3);
        assert_eq!(transport.config.batch_size, 10);
    }

    #[tokio::test]
    async fn test_send_single_event_success() {
        let mock_server = MockServer::start().await;
        
        Mock::given(method("POST"))
            .and(path("/events"))
            .and(header("authorization", "Bearer test-key"))
            .and(header("content-type", "application/json"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "status": "success",
                "events_received": 1
            })))
            .mount(&mock_server)
            .await;
        
        let transport = create_test_transport(mock_server.uri()).await;
        let event = create_test_event();
        
        let result = transport.send_events(vec![event]).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_send_batch_events_success() {
        let mock_server = MockServer::start().await;
        
        Mock::given(method("POST"))
            .and(path("/events"))
            .and(header("authorization", "Bearer test-key"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "status": "success",
                "events_received": 5
            })))
            .mount(&mock_server)
            .await;
        
        let transport = create_test_transport(mock_server.uri()).await;
        let events: Vec<ParsedEvent> = (0..5).map(|i| {
            let mut event = create_test_event();
            event.message = format!("Event {}", i);
            event
        }).collect();
        
        let result = transport.send_events(events).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_send_events_server_error() {
        let mock_server = MockServer::start().await;
        
        Mock::given(method("POST"))
            .and(path("/events"))
            .respond_with(ResponseTemplate::new(500).set_body("Internal Server Error"))
            .mount(&mock_server)
            .await;
        
        let transport = create_test_transport(mock_server.uri()).await;
        let event = create_test_event();
        
        let result = transport.send_events(vec![event]).await;
        assert!(result.is_err());
        
        if let Err(TransportError::RequestFailed { status_code, .. }) = result {
            assert_eq!(status_code, Some(500));
        } else {
            panic!("Expected RequestFailed error");
        }
    }

    #[tokio::test]
    async fn test_send_events_network_error() {
        // Use invalid URL to simulate network error
        let transport = create_test_transport("http://invalid-url:99999".to_string()).await;
        let event = create_test_event();
        
        let result = transport.send_events(vec![event]).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_send_events_with_retry() {
        let mock_server = MockServer::start().await;
        
        // First call fails, second succeeds
        Mock::given(method("POST"))
            .and(path("/events"))
            .respond_with(ResponseTemplate::new(503).set_body("Service Unavailable"))
            .up_to_n_times(1)
            .mount(&mock_server)
            .await;
        
        Mock::given(method("POST"))
            .and(path("/events"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "status": "success",
                "events_received": 1
            })))
            .mount(&mock_server)
            .await;
        
        let transport = create_test_transport(mock_server.uri()).await;
        let event = create_test_event();
        
        let result = transport.send_events_with_retry(vec![event]).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_send_events_retry_exhaustion() {
        let mock_server = MockServer::start().await;
        
        Mock::given(method("POST"))
            .and(path("/events"))
            .respond_with(ResponseTemplate::new(503).set_body("Service Unavailable"))
            .mount(&mock_server)
            .await;
        
        let mut config = TransportConfig::default();
        config.server_url = mock_server.uri();
        config.max_retries = 2;
        config.retry_delay = Duration::from_millis(10);
        
        let transport = SecureTransport::new(config).await.expect("Should create transport");
        let event = create_test_event();
        
        let result = transport.send_events_with_retry(vec![event]).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_transport_compression() {
        let mock_server = MockServer::start().await;
        
        Mock::given(method("POST"))
            .and(path("/events"))
            .and(header("content-encoding", "gzip"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "status": "success",
                "events_received": 1
            })))
            .mount(&mock_server)
            .await;
        
        let mut config = TransportConfig::default();
        config.server_url = mock_server.uri();
        config.compression_enabled = true;
        
        let transport = SecureTransport::new(config).await.expect("Should create transport");
        
        // Create large event to test compression
        let mut event = create_test_event();
        event.message = "A".repeat(1000);
        
        let result = transport.send_events(vec![event]).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_transport_timeout() {
        let mock_server = MockServer::start().await;
        
        Mock::given(method("POST"))
            .and(path("/events"))
            .respond_with(ResponseTemplate::new(200)
                .set_delay(Duration::from_secs(2))
                .set_body_json(serde_json::json!({"status": "success"})))
            .mount(&mock_server)
            .await;
        
        let mut config = TransportConfig::default();
        config.server_url = mock_server.uri();
        config.timeout = Duration::from_millis(100);
        
        let transport = SecureTransport::new(config).await.expect("Should create transport");
        let event = create_test_event();
        
        let result = timeout(Duration::from_millis(500), transport.send_events(vec![event])).await;
        assert!(result.is_ok()); // Should complete (with error)
        assert!(result.unwrap().is_err()); // But the request should fail due to timeout
    }

    #[tokio::test]
    async fn test_transport_authentication() {
        let mock_server = MockServer::start().await;
        
        // Test correct API key
        Mock::given(method("POST"))
            .and(path("/events"))
            .and(header("authorization", "Bearer test-key"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "status": "success"
            })))
            .mount(&mock_server)
            .await;
        
        // Test missing API key returns 401
        Mock::given(method("POST"))
            .and(path("/events"))
            .respond_with(ResponseTemplate::new(401).set_body("Unauthorized"))
            .mount(&mock_server)
            .await;
        
        let transport = create_test_transport(mock_server.uri()).await;
        let event = create_test_event();
        
        let result = transport.send_events(vec![event]).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_transport_input_validation() {
        let mock_server = MockServer::start().await;
        
        Mock::given(method("POST"))
            .and(path("/events"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "status": "success"
            })))
            .mount(&mock_server)
            .await;
        
        let transport = create_test_transport(mock_server.uri()).await;
        
        // Test malicious event content
        let mut malicious_event = create_test_event();
        malicious_event.message = "'; DROP TABLE events; --".to_string();
        malicious_event.fields.insert("user_input".to_string(), serde_json::Value::String("<script>alert('xss')</script>".to_string()));
        
        let result = transport.send_events(vec![malicious_event]).await;
        // Should fail validation
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_transport_rate_limiting() {
        let mock_server = MockServer::start().await;
        
        Mock::given(method("POST"))
            .and(path("/events"))
            .respond_with(ResponseTemplate::new(429).set_body("Rate Limited"))
            .up_to_n_times(2)
            .mount(&mock_server)
            .await;
        
        Mock::given(method("POST"))
            .and(path("/events"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "status": "success"
            })))
            .mount(&mock_server)
            .await;
        
        let transport = create_test_transport(mock_server.uri()).await;
        let event = create_test_event();
        
        let result = transport.send_events_with_retry(vec![event]).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_transport_batch_size_splitting() {
        let mock_server = MockServer::start().await;
        
        Mock::given(method("POST"))
            .and(path("/events"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "status": "success"
            })))
            .mount(&mock_server)
            .await;
        
        let mut config = TransportConfig::default();
        config.server_url = mock_server.uri();
        config.batch_size = 3; // Small batch size
        
        let transport = SecureTransport::new(config).await.expect("Should create transport");
        
        // Send 7 events (should be split into 3 batches: 3, 3, 1)
        let events: Vec<ParsedEvent> = (0..7).map(|i| {
            let mut event = create_test_event();
            event.message = format!("Event {}", i);
            event
        }).collect();
        
        let result = transport.send_events(events).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_transport_health_check() {
        let mock_server = MockServer::start().await;
        
        Mock::given(method("GET"))
            .and(path("/health"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "status": "healthy",
                "timestamp": "2023-01-01T00:00:00Z"
            })))
            .mount(&mock_server)
            .await;
        
        let transport = create_test_transport(mock_server.uri()).await;
        
        let result = transport.health_check().await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_transport_health_check_failure() {
        let mock_server = MockServer::start().await;
        
        Mock::given(method("GET"))
            .and(path("/health"))
            .respond_with(ResponseTemplate::new(503).set_body("Service Unavailable"))
            .mount(&mock_server)
            .await;
        
        let transport = create_test_transport(mock_server.uri()).await;
        
        let result = transport.health_check().await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_transport_metrics() {
        let transport = create_test_transport("https://example.com".to_string()).await;
        
        let metrics = transport.get_metrics().await.expect("Should get metrics");
        
        assert_eq!(metrics.events_sent, 0);
        assert_eq!(metrics.events_failed, 0);
        assert_eq!(metrics.total_requests, 0);
        assert!(metrics.average_response_time >= Duration::from_secs(0));
    }

    #[tokio::test]
    async fn test_transport_concurrent_requests() {
        let mock_server = MockServer::start().await;
        
        Mock::given(method("POST"))
            .and(path("/events"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "status": "success"
            })))
            .mount(&mock_server)
            .await;
        
        let transport = std::sync::Arc::new(create_test_transport(mock_server.uri()).await);
        let mut handles = Vec::new();
        
        // Spawn multiple concurrent requests
        for i in 0..10 {
            let transport_clone = transport.clone();
            let handle = tokio::spawn(async move {
                let mut event = create_test_event();
                event.message = format!("Concurrent event {}", i);
                
                transport_clone.send_events(vec![event]).await
            });
            handles.push(handle);
        }
        
        // Wait for all requests to complete
        for handle in handles {
            let result = handle.await.expect("Task should complete");
            assert!(result.is_ok());
        }
    }

    #[test]
    fn test_transport_config_validation() {
        let mut config = TransportConfig::default();
        
        // Test valid configuration
        config.server_url = "https://example.com".to_string();
        config.api_key = "valid-key".to_string();
        assert!(config.validate().is_ok());
        
        // Test invalid URL
        config.server_url = "invalid-url".to_string();
        assert!(config.validate().is_err());
        
        // Test empty API key
        config.server_url = "https://example.com".to_string();
        config.api_key = "".to_string();
        assert!(config.validate().is_err());
        
        // Test invalid timeout
        config.api_key = "valid-key".to_string();
        config.timeout = Duration::from_secs(0);
        assert!(config.validate().is_err());
    }

    #[tokio::test]
    async fn test_transport_error_recovery() {
        let mock_server = MockServer::start().await;
        
        // Simulate intermittent failures
        Mock::given(method("POST"))
            .and(path("/events"))
            .respond_with(ResponseTemplate::new(500))
            .up_to_n_times(2)
            .mount(&mock_server)
            .await;
        
        Mock::given(method("POST"))
            .and(path("/events"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "status": "success"
            })))
            .mount(&mock_server)
            .await;
        
        let transport = create_test_transport(mock_server.uri()).await;
        let event = create_test_event();
        
        // Should eventually succeed after retries
        let result = transport.send_events_with_retry(vec![event]).await;
        assert!(result.is_ok());
    }
}