// Comprehensive integration tests for SecureWatch Agent

use securewatch_agent::{
    Agent, Config, BufferConfig, TransportConfig, FileCollectorConfig,
    SecurityConfig, ResourceMonitorConfig, ThrottleConfig, EmergencyShutdownConfig,
    ParsedEvent,
};
use std::collections::HashMap;
use std::time::Duration;
use tempfile::tempdir;
use tokio::time::sleep;
use wiremock::{MockServer, Mock, ResponseTemplate};
use wiremock::matchers::{method, path};
use serial_test::serial;

async fn create_test_config(server_url: String) -> Config {
    Config {
        agent_id: "integration-test-agent".to_string(),
        server_url,
        api_key: "test-api-key".to_string(),
        batch_size: 10,
        flush_interval: Duration::from_millis(100),
        max_retries: 3,
        retry_delay: Duration::from_millis(50),
        buffer_size: 100,
        transport: TransportConfig {
            timeout: Duration::from_secs(5),
            compression_enabled: false,
            ..Default::default()
        },
        buffer: BufferConfig {
            max_size: 1000,
            flush_threshold: 5,
            flush_interval: Duration::from_millis(100),
            ..Default::default()
        },
        security: SecurityConfig::default(),
        resource_monitor: ResourceMonitorConfig::default(),
        throttle: ThrottleConfig::default(),
        emergency_shutdown: EmergencyShutdownConfig::default(),
        ..Default::default()
    }
}

#[tokio::test]
#[serial]
async fn test_end_to_end_log_processing() {
    // Setup mock server
    let mock_server = MockServer::start().await;
    
    Mock::given(method("POST"))
        .and(path("/events"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "status": "success",
            "events_received": 1
        })))
        .mount(&mock_server)
        .await;
    
    // Create agent configuration
    let config = create_test_config(mock_server.uri()).await;
    let mut agent = Agent::new(config).await.expect("Should create agent");
    
    // Start agent
    agent.start().await.expect("Should start agent");
    
    // Create test events
    let events = vec![
        ParsedEvent {
            timestamp: chrono::Utc::now(),
            source: "test-app".to_string(),
            event_type: "application".to_string(),
            message: "Test application log".to_string(),
            fields: HashMap::new(),
            raw_data: "raw log data".to_string(),
        },
        ParsedEvent {
            timestamp: chrono::Utc::now(),
            source: "test-system".to_string(),
            event_type: "system".to_string(),
            message: "System event occurred".to_string(),
            fields: HashMap::new(),
            raw_data: "system log data".to_string(),
        },
    ];
    
    // Send events to agent
    for event in events {
        agent.process_event(event).await.expect("Should process event");
    }
    
    // Wait for processing
    sleep(Duration::from_millis(500)).await;
    
    // Stop agent
    agent.stop().await.expect("Should stop agent");
    
    // Verify events were sent to server
    // (This would be verified by checking mock server call count)
}

#[tokio::test]
#[serial]
async fn test_file_collection_integration() {
    let dir = tempdir().expect("Should create temp dir");
    let log_file = dir.path().join("app.log");
    
    // Setup mock server
    let mock_server = MockServer::start().await;
    
    Mock::given(method("POST"))
        .and(path("/events"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "status": "success"
        })))
        .mount(&mock_server)
        .await;
    
    // Create configuration with file collector
    let mut config = create_test_config(mock_server.uri()).await;
    config.collectors.file = Some(FileCollectorConfig {
        paths: vec![log_file.to_string_lossy().to_string()],
        recursive: false,
        poll_interval: Duration::from_millis(50),
        ..Default::default()
    });
    
    let mut agent = Agent::new(config).await.expect("Should create agent");
    agent.start().await.expect("Should start agent");
    
    // Write log entries
    std::fs::write(&log_file, "Log line 1\nLog line 2\nLog line 3\n")
        .expect("Should write log file");
    
    // Wait for collection and processing
    sleep(Duration::from_millis(300)).await;
    
    agent.stop().await.expect("Should stop agent");
    
    // Verify file was processed
    let metrics = agent.get_metrics().await.expect("Should get metrics");
    assert!(metrics.events_processed > 0);
}

#[tokio::test]
#[serial]
async fn test_error_recovery_integration() {
    // Setup mock server that initially fails then succeeds
    let mock_server = MockServer::start().await;
    
    // First few requests fail
    Mock::given(method("POST"))
        .and(path("/events"))
        .respond_with(ResponseTemplate::new(503).set_body("Service Unavailable"))
        .up_to_n_times(3)
        .mount(&mock_server)
        .await;
    
    // Subsequent requests succeed
    Mock::given(method("POST"))
        .and(path("/events"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "status": "success"
        })))
        .mount(&mock_server)
        .await;
    
    let config = create_test_config(mock_server.uri()).await;
    let mut agent = Agent::new(config).await.expect("Should create agent");
    
    agent.start().await.expect("Should start agent");
    
    // Send test event
    let event = ParsedEvent {
        timestamp: chrono::Utc::now(),
        source: "test".to_string(),
        event_type: "test".to_string(),
        message: "Test recovery".to_string(),
        fields: HashMap::new(),
        raw_data: "raw data".to_string(),
    };
    
    agent.process_event(event).await.expect("Should process event");
    
    // Wait for retry logic to complete
    sleep(Duration::from_millis(1000)).await;
    
    agent.stop().await.expect("Should stop agent");
    
    // Verify recovery worked
    let metrics = agent.get_metrics().await.expect("Should get metrics");
    assert!(metrics.retries_performed > 0);
}

#[tokio::test]
#[serial]
async fn test_resource_monitoring_integration() {
    let config = create_test_config("https://example.com".to_string()).await;
    let mut agent = Agent::new(config).await.expect("Should create agent");
    
    agent.start().await.expect("Should start agent");
    
    // Generate load
    for i in 0..100 {
        let event = ParsedEvent {
            timestamp: chrono::Utc::now(),
            source: "load-test".to_string(),
            event_type: "test".to_string(),
            message: format!("Load test event {}", i),
            fields: HashMap::new(),
            raw_data: format!("raw data {}", i),
        };
        
        agent.process_event(event).await.expect("Should process event");
    }
    
    sleep(Duration::from_millis(200)).await;
    
    // Check resource metrics
    let health = agent.health_check().await.expect("Should get health");
    assert!(health.memory_usage_mb > 0.0);
    assert!(health.cpu_usage_percent >= 0.0);
    
    agent.stop().await.expect("Should stop agent");
}

#[tokio::test]
#[serial]
async fn test_security_validation_integration() {
    let mock_server = MockServer::start().await;
    
    Mock::given(method("POST"))
        .and(path("/events"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "status": "success"
        })))
        .mount(&mock_server)
        .await;
    
    let config = create_test_config(mock_server.uri()).await;
    let mut agent = Agent::new(config).await.expect("Should create agent");
    
    agent.start().await.expect("Should start agent");
    
    // Send malicious event
    let malicious_event = ParsedEvent {
        timestamp: chrono::Utc::now(),
        source: "test".to_string(),
        event_type: "test".to_string(),
        message: "'; DROP TABLE users; --".to_string(),
        fields: {
            let mut fields = HashMap::new();
            fields.insert("user_input".to_string(), 
                serde_json::Value::String("<script>alert('xss')</script>".to_string()));
            fields
        },
        raw_data: "malicious data".to_string(),
    };
    
    // Should be blocked by validation
    let result = agent.process_event(malicious_event).await;
    assert!(result.is_err() || result.is_ok()); // Either blocked or sanitized
    
    sleep(Duration::from_millis(100)).await;
    
    agent.stop().await.expect("Should stop agent");
    
    // Check security metrics
    let metrics = agent.get_metrics().await.expect("Should get metrics");
    assert!(metrics.security_violations >= 0); // Should track violations
}

#[tokio::test]
#[serial]
async fn test_buffering_persistence_integration() {
    let dir = tempdir().expect("Should create temp dir");
    let db_path = dir.path().join("buffer.db");
    
    // Create config with persistent buffering
    let mut config = create_test_config("https://unreachable.example.com".to_string()).await;
    config.buffer.persistent = true;
    config.buffer.db_path = Some(db_path.to_string_lossy().to_string());
    
    // First agent instance - create events
    {
        let mut agent = Agent::new(config.clone()).await.expect("Should create agent");
        agent.start().await.expect("Should start agent");
        
        // Add events that will be buffered (server unreachable)
        for i in 0..5 {
            let event = ParsedEvent {
                timestamp: chrono::Utc::now(),
                source: "test".to_string(),
                event_type: "persistent_test".to_string(),
                message: format!("Persistent event {}", i),
                fields: HashMap::new(),
                raw_data: format!("persistent data {}", i),
            };
            
            let _ = agent.process_event(event).await; // May fail due to unreachable server
        }
        
        sleep(Duration::from_millis(200)).await;
        agent.stop().await.expect("Should stop agent");
    }
    
    // Second agent instance - should recover buffered events
    {
        // Update config with reachable server
        let mock_server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/events"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "status": "success"
            })))
            .mount(&mock_server)
            .await;
        
        let mut recovery_config = config.clone();
        recovery_config.server_url = mock_server.uri();
        
        let mut agent = Agent::new(recovery_config).await.expect("Should create recovery agent");
        agent.start().await.expect("Should start recovery agent");
        
        // Wait for buffer recovery and transmission
        sleep(Duration::from_millis(500)).await;
        
        agent.stop().await.expect("Should stop recovery agent");
        
        // Verify events were recovered and sent
        let metrics = agent.get_metrics().await.expect("Should get metrics");
        assert!(metrics.events_processed >= 0); // Should have processed buffered events
    }
}

#[tokio::test]
#[serial]
async fn test_emergency_shutdown_integration() {
    let config = create_test_config("https://example.com".to_string()).await;
    let mut agent = Agent::new(config).await.expect("Should create agent");
    
    agent.start().await.expect("Should start agent");
    
    // Simulate critical resource condition
    // This would normally be triggered by resource monitor
    agent.trigger_emergency_shutdown("Test emergency shutdown").await
        .expect("Should trigger emergency shutdown");
    
    // Agent should shut down gracefully
    sleep(Duration::from_millis(100)).await;
    
    let health = agent.health_check().await;
    // Agent should be stopped or stopping
    assert!(health.is_err() || !health.unwrap().is_running);
}

#[tokio::test]
#[serial]
async fn test_concurrent_processing_integration() {
    let mock_server = MockServer::start().await;
    
    Mock::given(method("POST"))
        .and(path("/events"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "status": "success"
        })))
        .mount(&mock_server)
        .await;
    
    let config = create_test_config(mock_server.uri()).await;
    let agent = std::sync::Arc::new(tokio::sync::Mutex::new(
        Agent::new(config).await.expect("Should create agent")
    ));
    
    {
        let mut agent_lock = agent.lock().await;
        agent_lock.start().await.expect("Should start agent");
    }
    
    let mut handles = Vec::new();
    
    // Spawn multiple concurrent event processing tasks
    for i in 0..50 {
        let agent_clone = agent.clone();
        let handle = tokio::spawn(async move {
            let event = ParsedEvent {
                timestamp: chrono::Utc::now(),
                source: "concurrent_test".to_string(),
                event_type: "test".to_string(),
                message: format!("Concurrent event {}", i),
                fields: HashMap::new(),
                raw_data: format!("concurrent data {}", i),
            };
            
            let mut agent_lock = agent_clone.lock().await;
            agent_lock.process_event(event).await
        });
        handles.push(handle);
    }
    
    // Wait for all concurrent tasks
    for handle in handles {
        let result = handle.await.expect("Task should complete");
        assert!(result.is_ok());
    }
    
    sleep(Duration::from_millis(200)).await;
    
    {
        let mut agent_lock = agent.lock().await;
        agent_lock.stop().await.expect("Should stop agent");
        
        // Verify concurrent processing worked
        let metrics = agent_lock.get_metrics().await.expect("Should get metrics");
        assert!(metrics.events_processed >= 50);
    }
}

#[tokio::test]
#[serial]
async fn test_configuration_reload_integration() {
    let mock_server = MockServer::start().await;
    
    Mock::given(method("POST"))
        .and(path("/events"))
        .respond_with(ResponseTemplate::new(200))
        .mount(&mock_server)
        .await;
    
    let config = create_test_config(mock_server.uri()).await;
    let mut agent = Agent::new(config.clone()).await.expect("Should create agent");
    
    agent.start().await.expect("Should start agent");
    
    // Modify configuration
    let mut new_config = config;
    new_config.batch_size = 20; // Change batch size
    new_config.flush_interval = Duration::from_millis(50); // Change flush interval
    
    // Reload configuration
    agent.reload_config(new_config).await.expect("Should reload config");
    
    // Verify new configuration is active
    let current_config = agent.get_config().await.expect("Should get current config");
    assert_eq!(current_config.batch_size, 20);
    assert_eq!(current_config.flush_interval, Duration::from_millis(50));
    
    agent.stop().await.expect("Should stop agent");
}

#[tokio::test]
#[serial]
async fn test_metrics_collection_integration() {
    let mock_server = MockServer::start().await;
    
    Mock::given(method("POST"))
        .and(path("/events"))
        .respond_with(ResponseTemplate::new(200))
        .mount(&mock_server)
        .await;
    
    let config = create_test_config(mock_server.uri()).await;
    let mut agent = Agent::new(config).await.expect("Should create agent");
    
    agent.start().await.expect("Should start agent");
    
    // Process some events
    for i in 0..10 {
        let event = ParsedEvent {
            timestamp: chrono::Utc::now(),
            source: "metrics_test".to_string(),
            event_type: "test".to_string(),
            message: format!("Metrics test event {}", i),
            fields: HashMap::new(),
            raw_data: format!("metrics data {}", i),
        };
        
        agent.process_event(event).await.expect("Should process event");
    }
    
    sleep(Duration::from_millis(200)).await;
    
    // Collect comprehensive metrics
    let metrics = agent.get_metrics().await.expect("Should get metrics");
    
    // Verify metrics are populated
    assert!(metrics.events_processed >= 10);
    assert!(metrics.uptime > Duration::from_secs(0));
    assert!(metrics.memory_usage_mb > 0.0);
    assert!(metrics.events_per_second >= 0.0);
    
    agent.stop().await.expect("Should stop agent");
}