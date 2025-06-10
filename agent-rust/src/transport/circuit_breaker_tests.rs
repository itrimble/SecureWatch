// Tests for circuit breaker integration with transport layer

use super::*;
use crate::circuit_breaker::{CircuitBreakerState, CircuitBreakerConfig};
use crate::config::TransportConfig;
use crate::parsers::ParsedEvent;
use wiremock::{Mock, MockServer, ResponseTemplate};
use wiremock::matchers::{method, path};
use std::time::Duration;
use tokio::time::sleep;

fn create_test_transport_config(server_url: String) -> TransportConfig {
    TransportConfig {
        server_url,
        api_key: "test-api-key".to_string(),
        tls_verify: false,
        compression: false,
        batch_size: 10,
        batch_timeout: 1000,
        retry_attempts: 2,
        retry_delay: 100,
        client_cert_path: None,
        client_key_path: None,
        client_key_password: None,
        ca_cert_path: None,
        cert_expiry_warning_days: 30,
        
        // Circuit breaker configuration for testing
        circuit_breaker_failure_threshold: Some(3),
        circuit_breaker_recovery_timeout: Some(Duration::from_millis(100)),
        circuit_breaker_success_threshold: Some(2),
        circuit_breaker_max_open_duration: Some(Duration::from_secs(5)),
        circuit_breaker_sliding_window_size: Some(10),
        circuit_breaker_failure_rate_threshold: Some(0.6),
        circuit_breaker_minimum_requests: Some(5),
    }
}

fn create_test_event() -> ParsedEvent {
    ParsedEvent {
        timestamp: chrono::Utc::now(),
        source: "test-source".to_string(),
        event_type: "test".to_string(),
        message: "Test message".to_string(),
        fields: std::collections::HashMap::new(),
        raw_data: "raw test data".to_string(),
    }
}

#[tokio::test]
async fn test_circuit_breaker_successful_requests() {
    let mock_server = MockServer::start().await;
    let config = create_test_transport_config(mock_server.uri());
    
    // Setup successful response mock
    Mock::given(method("POST"))
        .and(path("/"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "status": "success"
        })))
        .mount(&mock_server)
        .await;
    
    let transport = SecureTransport::new(config).await.expect("Should create transport");
    
    // Initial state should be closed
    assert_eq!(transport.get_circuit_breaker_state().await, CircuitBreakerState::Closed);
    assert!(transport.is_circuit_breaker_healthy().await);
    
    // Send successful requests
    for _ in 0..5 {
        let events = vec![create_test_event()];
        let result = transport.send_batch(events).await;
        assert!(result.is_ok(), "Request should succeed");
    }
    
    // Circuit breaker should remain closed
    assert_eq!(transport.get_circuit_breaker_state().await, CircuitBreakerState::Closed);
    
    let stats = transport.get_circuit_breaker_stats().await;
    assert_eq!(stats.total_requests, 5);
    assert!(stats.success_count > 0);
}

#[tokio::test]
async fn test_circuit_breaker_opens_on_failures() {
    let mock_server = MockServer::start().await;
    let config = create_test_transport_config(mock_server.uri());
    
    // Setup failing response mock
    Mock::given(method("POST"))
        .and(path("/"))
        .respond_with(ResponseTemplate::new(500).set_body("Internal Server Error"))
        .mount(&mock_server)
        .await;
    
    let transport = SecureTransport::new(config).await.expect("Should create transport");
    
    // Send failing requests to trigger circuit breaker
    for i in 0..3 {
        let events = vec![create_test_event()];
        let result = transport.send_batch(events).await;
        assert!(result.is_err(), "Request {} should fail", i + 1);
        
        // Check state after each failure
        if i < 2 {
            assert_eq!(transport.get_circuit_breaker_state().await, CircuitBreakerState::Closed);
        }
    }
    
    // Circuit breaker should now be open
    assert_eq!(transport.get_circuit_breaker_state().await, CircuitBreakerState::Open);
    assert!(!transport.is_circuit_breaker_healthy().await);
}

#[tokio::test]
async fn test_circuit_breaker_rejects_requests_when_open() {
    let mock_server = MockServer::start().await;
    let config = create_test_transport_config(mock_server.uri());
    
    // Setup failing response mock to open circuit breaker
    Mock::given(method("POST"))
        .and(path("/"))
        .respond_with(ResponseTemplate::new(500).set_body("Internal Server Error"))
        .mount(&mock_server)
        .await;
    
    let transport = SecureTransport::new(config).await.expect("Should create transport");
    
    // Trigger circuit breaker to open
    for _ in 0..3 {
        let events = vec![create_test_event()];
        let _ = transport.send_batch(events).await;
    }
    
    assert_eq!(transport.get_circuit_breaker_state().await, CircuitBreakerState::Open);
    
    // Now setup successful mock for when circuit breaker is open
    Mock::given(method("POST"))
        .and(path("/"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "status": "success"
        })))
        .mount(&mock_server)
        .await;
    
    // Request should be rejected by circuit breaker
    let events = vec![create_test_event()];
    let result = transport.send_batch(events).await;
    assert!(result.is_err());
    
    // Verify it's a circuit breaker error
    if let Err(transport_error) = result {
        match transport_error {
            TransportError::CircuitBreakerOpen { .. } => {
                // Expected error type
            }
            _ => panic!("Expected CircuitBreakerOpen error, got: {:?}", transport_error),
        }
    }
}

#[tokio::test]
async fn test_circuit_breaker_half_open_recovery() {
    let mock_server = MockServer::start().await;
    let config = create_test_transport_config(mock_server.uri());
    
    // Setup failing response mock to open circuit breaker
    Mock::given(method("POST"))
        .and(path("/"))
        .respond_with(ResponseTemplate::new(500).set_body("Internal Server Error"))
        .mount(&mock_server)
        .await;
    
    let transport = SecureTransport::new(config).await.expect("Should create transport");
    
    // Trigger circuit breaker to open
    for _ in 0..3 {
        let events = vec![create_test_event()];
        let _ = transport.send_batch(events).await;
    }
    
    assert_eq!(transport.get_circuit_breaker_state().await, CircuitBreakerState::Open);
    
    // Wait for recovery timeout
    sleep(Duration::from_millis(150)).await;
    
    // Setup successful response mock
    Mock::given(method("POST"))
        .and(path("/"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "status": "success"
        })))
        .mount(&mock_server)
        .await;
    
    // First request should transition to half-open
    let events = vec![create_test_event()];
    let result = transport.send_batch(events).await;
    assert!(result.is_ok(), "First request after timeout should succeed");
    assert_eq!(transport.get_circuit_breaker_state().await, CircuitBreakerState::HalfOpen);
    
    // Second successful request should close the circuit
    let events = vec![create_test_event()];
    let result = transport.send_batch(events).await;
    assert!(result.is_ok(), "Second request should succeed and close circuit");
    assert_eq!(transport.get_circuit_breaker_state().await, CircuitBreakerState::Closed);
}

#[tokio::test]
async fn test_circuit_breaker_half_open_failure_reopens() {
    let mock_server = MockServer::start().await;
    let config = create_test_transport_config(mock_server.uri());
    
    // Setup failing response mock to open circuit breaker
    Mock::given(method("POST"))
        .and(path("/"))
        .respond_with(ResponseTemplate::new(500).set_body("Internal Server Error"))
        .mount(&mock_server)
        .await;
    
    let transport = SecureTransport::new(config).await.expect("Should create transport");
    
    // Trigger circuit breaker to open
    for _ in 0..3 {
        let events = vec![create_test_event()];
        let _ = transport.send_batch(events).await;
    }
    
    assert_eq!(transport.get_circuit_breaker_state().await, CircuitBreakerState::Open);
    
    // Wait for recovery timeout
    sleep(Duration::from_millis(150)).await;
    
    // Setup one successful response followed by failure
    Mock::given(method("POST"))
        .and(path("/"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "status": "success"
        })))
        .up_to_n_times(1)
        .mount(&mock_server)
        .await;
    
    Mock::given(method("POST"))
        .and(path("/"))
        .respond_with(ResponseTemplate::new(500).set_body("Internal Server Error"))
        .mount(&mock_server)
        .await;
    
    // First request should succeed and transition to half-open
    let events = vec![create_test_event()];
    let result = transport.send_batch(events).await;
    assert!(result.is_ok());
    assert_eq!(transport.get_circuit_breaker_state().await, CircuitBreakerState::HalfOpen);
    
    // Second request fails and should reopen the circuit
    let events = vec![create_test_event()];
    let result = transport.send_batch(events).await;
    assert!(result.is_err());
    assert_eq!(transport.get_circuit_breaker_state().await, CircuitBreakerState::Open);
}

#[tokio::test]
async fn test_circuit_breaker_manual_control() {
    let mock_server = MockServer::start().await;
    let config = create_test_transport_config(mock_server.uri());
    
    // Setup successful response mock
    Mock::given(method("POST"))
        .and(path("/"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "status": "success"
        })))
        .mount(&mock_server)
        .await;
    
    let transport = SecureTransport::new(config).await.expect("Should create transport");
    
    // Test manual open
    transport.force_circuit_breaker_open().await;
    assert_eq!(transport.get_circuit_breaker_state().await, CircuitBreakerState::Open);
    assert!(!transport.is_circuit_breaker_healthy().await);
    
    // Test manual close
    transport.force_circuit_breaker_closed().await;
    assert_eq!(transport.get_circuit_breaker_state().await, CircuitBreakerState::Closed);
    assert!(transport.is_circuit_breaker_healthy().await);
    
    // Test stats reset
    let events = vec![create_test_event()];
    let _ = transport.send_batch(events).await;
    
    let stats_before = transport.get_circuit_breaker_stats().await;
    assert!(stats_before.total_requests > 0);
    
    transport.reset_circuit_breaker_stats().await;
    
    let stats_after = transport.get_circuit_breaker_stats().await;
    assert_eq!(stats_after.total_requests, 0);
}

#[tokio::test]
async fn test_circuit_breaker_error_classification() {
    let mock_server = MockServer::start().await;
    let config = create_test_transport_config(mock_server.uri());
    
    let transport = SecureTransport::new(config).await.expect("Should create transport");
    
    // Test 4xx errors (should not trigger circuit breaker)
    Mock::given(method("POST"))
        .and(path("/"))
        .respond_with(ResponseTemplate::new(404).set_body("Not Found"))
        .mount(&mock_server)
        .await;
    
    for _ in 0..5 {
        let events = vec![create_test_event()];
        let result = transport.send_batch(events).await;
        assert!(result.is_err());
    }
    
    // Circuit breaker should still be closed for 4xx errors
    assert_eq!(transport.get_circuit_breaker_state().await, CircuitBreakerState::Closed);
    
    // Test 5xx errors (should trigger circuit breaker)
    Mock::given(method("POST"))
        .and(path("/"))
        .respond_with(ResponseTemplate::new(500).set_body("Internal Server Error"))
        .mount(&mock_server)
        .await;
    
    for _ in 0..3 {
        let events = vec![create_test_event()];
        let result = transport.send_batch(events).await;
        assert!(result.is_err());
    }
    
    // Circuit breaker should now be open for 5xx errors
    assert_eq!(transport.get_circuit_breaker_state().await, CircuitBreakerState::Open);
}

#[tokio::test]
async fn test_circuit_breaker_stats_tracking() {
    let mock_server = MockServer::start().await;
    let config = create_test_transport_config(mock_server.uri());
    
    // Setup alternating success/failure responses
    Mock::given(method("POST"))
        .and(path("/"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "status": "success"
        })))
        .up_to_n_times(3)
        .mount(&mock_server)
        .await;
    
    Mock::given(method("POST"))
        .and(path("/"))
        .respond_with(ResponseTemplate::new(500).set_body("Internal Server Error"))
        .up_to_n_times(2)
        .mount(&mock_server)
        .await;
    
    let transport = SecureTransport::new(config).await.expect("Should create transport");
    
    // Send mixed requests
    for i in 0..5 {
        let events = vec![create_test_event()];
        let _ = transport.send_batch(events).await;
    }
    
    let stats = transport.get_circuit_breaker_stats().await;
    assert_eq!(stats.total_requests, 5);
    assert!(stats.last_success_time.is_some());
    assert!(stats.last_failure_time.is_some());
    assert!(stats.failure_rate > 0.0);
    assert!(stats.uptime_percentage < 100.0);
}

#[tokio::test]
async fn test_circuit_breaker_registry_access() {
    let mock_server = MockServer::start().await;
    let config = create_test_transport_config(mock_server.uri());
    
    let transport = SecureTransport::new(config).await.expect("Should create transport");
    
    // Test registry access
    let registry = transport.get_circuit_breaker_registry();
    let names = registry.list_names().await;
    
    // Should have at least one circuit breaker (the transport one)
    assert!(!names.is_empty());
    
    // Test getting stats from registry
    let all_stats = registry.get_all_stats().await;
    assert!(!all_stats.is_empty());
}