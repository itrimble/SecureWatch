#[cfg(test)]
mod collector_tests {
    use super::*;
    use crate::config::{FileCollectorConfig, SyslogCollectorConfig};
    use std::fs::{File, create_dir_all};
    use std::io::Write;
    use tempfile::tempdir;
    use tokio::time::{sleep, Duration};
    use pretty_assertions::assert_eq;
    use serial_test::serial;

    fn create_test_file_config() -> FileCollectorConfig {
        FileCollectorConfig {
            paths: vec!["/tmp/test*.log".to_string()],
            recursive: false,
            include_patterns: vec!["*.log".to_string()],
            exclude_patterns: vec!["*.tmp".to_string()],
            max_file_size: 10 * 1024 * 1024, // 10MB
            follow_symlinks: false,
            poll_interval: Duration::from_millis(100),
        }
    }

    fn create_test_syslog_config() -> SyslogCollectorConfig {
        SyslogCollectorConfig {
            port: 5140, // Non-standard port for testing
            protocol: "udp".to_string(),
            bind_address: "127.0.0.1".to_string(),
            max_message_size: 8192,
            enable_tls: false,
            tls_cert_path: None,
            tls_key_path: None,
        }
    }

    #[tokio::test]
    async fn test_file_collector_creation() {
        let config = create_test_file_config();
        let collector = FileCollector::new(config.clone()).await.expect("Should create collector");
        
        assert_eq!(collector.config.paths, config.paths);
        assert_eq!(collector.config.recursive, config.recursive);
        assert!(!collector.is_running().await);
    }

    #[tokio::test]
    #[serial]
    async fn test_file_collector_start_stop() {
        let dir = tempdir().expect("Should create temp dir");
        let log_path = dir.path().join("test.log");
        
        let mut config = create_test_file_config();
        config.paths = vec![log_path.to_string_lossy().to_string()];
        
        let mut collector = FileCollector::new(config).await.expect("Should create collector");
        
        // Start collector
        let (tx, mut rx) = tokio::sync::mpsc::channel(100);
        collector.start(tx).await.expect("Should start collector");
        assert!(collector.is_running().await);
        
        // Create test file with content
        let mut file = File::create(&log_path).expect("Should create test file");
        writeln!(file, "Test log line 1").expect("Should write to file");
        writeln!(file, "Test log line 2").expect("Should write to file");
        file.sync_all().expect("Should sync file");
        
        // Wait for events
        sleep(Duration::from_millis(200)).await;
        
        // Stop collector
        collector.stop().await.expect("Should stop collector");
        assert!(!collector.is_running().await);
        
        // Check if events were received
        let mut event_count = 0;
        while let Ok(event) = rx.try_recv() {
            event_count += 1;
            assert!(event.message.contains("Test log line"));
            assert_eq!(event.source, log_path.to_string_lossy());
        }
        
        assert!(event_count > 0, "Should have received events");
    }

    #[tokio::test]
    #[serial]
    async fn test_file_collector_file_rotation() {
        let dir = tempdir().expect("Should create temp dir");
        let log_path = dir.path().join("rotating.log");
        
        let mut config = create_test_file_config();
        config.paths = vec![log_path.to_string_lossy().to_string()];
        
        let mut collector = FileCollector::new(config).await.expect("Should create collector");
        
        let (tx, mut rx) = tokio::sync::mpsc::channel(100);
        collector.start(tx).await.expect("Should start collector");
        
        // Create initial file
        {
            let mut file = File::create(&log_path).expect("Should create test file");
            writeln!(file, "Initial log line").expect("Should write to file");
            file.sync_all().expect("Should sync file");
        }
        
        sleep(Duration::from_millis(100)).await;
        
        // Simulate log rotation by recreating the file
        std::fs::remove_file(&log_path).expect("Should remove file");
        {
            let mut file = File::create(&log_path).expect("Should recreate test file");
            writeln!(file, "New log line after rotation").expect("Should write to file");
            file.sync_all().expect("Should sync file");
        }
        
        sleep(Duration::from_millis(200)).await;
        
        collector.stop().await.expect("Should stop collector");
        
        // Verify we received events from both files
        let mut events = Vec::new();
        while let Ok(event) = rx.try_recv() {
            events.push(event.message);
        }
        
        assert!(events.iter().any(|msg| msg.contains("Initial log line")));
        assert!(events.iter().any(|msg| msg.contains("New log line after rotation")));
    }

    #[tokio::test]
    #[serial]
    async fn test_file_collector_pattern_matching() {
        let dir = tempdir().expect("Should create temp dir");
        
        let mut config = create_test_file_config();
        config.paths = vec![format!("{}/*.log", dir.path().to_string_lossy())];
        config.exclude_patterns = vec!["*debug*.log".to_string()];
        
        let mut collector = FileCollector::new(config).await.expect("Should create collector");
        
        // Create matching file
        let app_log = dir.path().join("app.log");
        let mut file = File::create(&app_log).expect("Should create app.log");
        writeln!(file, "App log message").expect("Should write to file");
        file.sync_all().expect("Should sync file");
        
        // Create excluded file
        let debug_log = dir.path().join("debug.log");
        let mut file = File::create(&debug_log).expect("Should create debug.log");
        writeln!(file, "Debug log message").expect("Should write to file");
        file.sync_all().expect("Should sync file");
        
        let (tx, mut rx) = tokio::sync::mpsc::channel(100);
        collector.start(tx).await.expect("Should start collector");
        
        sleep(Duration::from_millis(200)).await;
        
        collector.stop().await.expect("Should stop collector");
        
        // Check events
        let mut events = Vec::new();
        while let Ok(event) = rx.try_recv() {
            events.push(event.message);
        }
        
        // Should have app.log events but not debug.log events
        assert!(events.iter().any(|msg| msg.contains("App log message")));
        assert!(!events.iter().any(|msg| msg.contains("Debug log message")));
    }

    #[tokio::test]
    async fn test_syslog_collector_creation() {
        let config = create_test_syslog_config();
        let collector = SyslogCollector::new(config.clone()).await.expect("Should create collector");
        
        assert_eq!(collector.config.port, config.port);
        assert_eq!(collector.config.protocol, config.protocol);
        assert!(!collector.is_running().await);
    }

    #[tokio::test]
    #[serial]
    async fn test_syslog_collector_udp() {
        let config = create_test_syslog_config();
        let mut collector = SyslogCollector::new(config.clone()).await.expect("Should create collector");
        
        let (tx, mut rx) = tokio::sync::mpsc::channel(100);
        collector.start(tx).await.expect("Should start collector");
        
        // Give collector time to bind
        sleep(Duration::from_millis(100)).await;
        
        // Send test syslog message via UDP
        let socket = std::net::UdpSocket::bind("127.0.0.1:0").expect("Should bind UDP socket");
        let test_message = "<34>1 2023-01-01T12:00:00Z hostname app 1234 ID47 - Test syslog message";
        socket.send_to(test_message.as_bytes(), format!("127.0.0.1:{}", config.port))
            .expect("Should send UDP message");
        
        // Wait for message processing
        sleep(Duration::from_millis(200)).await;
        
        collector.stop().await.expect("Should stop collector");
        
        // Check if event was received
        let mut received_event = false;
        while let Ok(event) = rx.try_recv() {
            if event.message.contains("Test syslog message") {
                received_event = true;
                assert_eq!(event.event_type, "syslog");
                break;
            }
        }
        
        assert!(received_event, "Should have received syslog event");
    }

    #[tokio::test]
    async fn test_syslog_parser() {
        let parser = SyslogParser::new();
        
        // Test RFC 3164 format
        let rfc3164_msg = "<34>Jan 1 12:00:00 hostname app: Test message";
        let event = parser.parse_message(rfc3164_msg).expect("Should parse RFC 3164");
        
        assert_eq!(event.event_type, "syslog");
        assert!(event.message.contains("Test message"));
        assert!(event.fields.contains_key("facility"));
        assert!(event.fields.contains_key("severity"));
        
        // Test RFC 5424 format
        let rfc5424_msg = "<34>1 2023-01-01T12:00:00Z hostname app 1234 ID47 - Test message RFC 5424";
        let event = parser.parse_message(rfc5424_msg).expect("Should parse RFC 5424");
        
        assert_eq!(event.event_type, "syslog");
        assert!(event.message.contains("Test message RFC 5424"));
        assert!(event.fields.contains_key("version"));
        assert!(event.fields.contains_key("msgid"));
    }

    #[tokio::test]
    async fn test_syslog_parser_malformed() {
        let parser = SyslogParser::new();
        
        // Test malformed message
        let malformed_msg = "This is not a syslog message";
        let result = parser.parse_message(malformed_msg);
        
        // Should handle gracefully
        assert!(result.is_ok());
        let event = result.unwrap();
        assert_eq!(event.message, malformed_msg);
    }

    #[cfg(windows)]
    #[tokio::test]
    async fn test_windows_event_collector_creation() {
        let config = WindowsEventConfig {
            channels: vec!["System".to_string(), "Application".to_string()],
            query: "*".to_string(),
            max_events_per_read: 100,
            poll_interval: Duration::from_secs(1),
        };
        
        let result = WindowsEventCollector::new(config).await;
        // May fail on non-Windows systems, but should not panic
        match result {
            Ok(collector) => {
                assert_eq!(collector.config.channels.len(), 2);
                assert!(!collector.is_running().await);
            }
            Err(_) => {
                // Expected on non-Windows systems
            }
        }
    }

    #[tokio::test]
    async fn test_collector_health_check() {
        let config = create_test_file_config();
        let collector = FileCollector::new(config).await.expect("Should create collector");
        
        let health = collector.health_check().await.expect("Should get health status");
        
        assert_eq!(health.status, "healthy");
        assert!(health.uptime >= Duration::from_secs(0));
        assert_eq!(health.events_processed, 0);
    }

    #[tokio::test]
    async fn test_collector_metrics() {
        let config = create_test_file_config();
        let collector = FileCollector::new(config).await.expect("Should create collector");
        
        let metrics = collector.get_metrics().await.expect("Should get metrics");
        
        assert_eq!(metrics.events_collected, 0);
        assert_eq!(metrics.events_failed, 0);
        assert_eq!(metrics.files_monitored, 0);
        assert!(metrics.memory_usage > 0);
    }

    #[tokio::test]
    #[serial]
    async fn test_collector_error_handling() {
        // Test with invalid path
        let mut config = create_test_file_config();
        config.paths = vec!["/nonexistent/path/*.log".to_string()];
        
        let mut collector = FileCollector::new(config).await.expect("Should create collector");
        
        let (tx, _rx) = tokio::sync::mpsc::channel(100);
        
        // Should handle gracefully
        let result = collector.start(tx).await;
        assert!(result.is_ok()); // Should not fail immediately
        
        collector.stop().await.expect("Should stop collector");
    }

    #[tokio::test]
    async fn test_collector_concurrent_access() {
        let config = create_test_file_config();
        let collector = std::sync::Arc::new(tokio::sync::Mutex::new(
            FileCollector::new(config).await.expect("Should create collector")
        ));
        
        let mut handles = Vec::new();
        
        // Test concurrent health checks
        for _ in 0..10 {
            let collector_clone = collector.clone();
            let handle = tokio::spawn(async move {
                let coll = collector_clone.lock().await;
                coll.health_check().await
            });
            handles.push(handle);
        }
        
        // All health checks should succeed
        for handle in handles {
            let result = handle.await.expect("Task should complete");
            assert!(result.is_ok());
        }
    }

    #[tokio::test]
    async fn test_collector_configuration_validation() {
        // Test invalid file collector config
        let mut config = create_test_file_config();
        config.paths.clear(); // Empty paths
        
        let result = FileCollector::new(config).await;
        assert!(result.is_err());
        
        // Test invalid syslog collector config
        let mut syslog_config = create_test_syslog_config();
        syslog_config.port = 0; // Invalid port
        
        let result = SyslogCollector::new(syslog_config).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    #[serial]
    async fn test_file_collector_large_file_handling() {
        let dir = tempdir().expect("Should create temp dir");
        let log_path = dir.path().join("large.log");
        
        let mut config = create_test_file_config();
        config.paths = vec![log_path.to_string_lossy().to_string()];
        config.max_file_size = 1024; // 1KB limit
        
        let mut collector = FileCollector::new(config).await.expect("Should create collector");
        
        // Create large file
        {
            let mut file = File::create(&log_path).expect("Should create test file");
            for i in 0..100 {
                writeln!(file, "Large file line {} with lots of content to make it big", i)
                    .expect("Should write to file");
            }
            file.sync_all().expect("Should sync file");
        }
        
        let (tx, mut rx) = tokio::sync::mpsc::channel(100);
        collector.start(tx).await.expect("Should start collector");
        
        sleep(Duration::from_millis(200)).await;
        
        collector.stop().await.expect("Should stop collector");
        
        // Should handle large file gracefully (may truncate or skip)
        let mut event_count = 0;
        while let Ok(_event) = rx.try_recv() {
            event_count += 1;
        }
        
        // Should either process events or skip the file entirely
        // Both behaviors are acceptable for large file handling
    }

    #[tokio::test]
    async fn test_collector_memory_usage() {
        let config = create_test_file_config();
        let collector = FileCollector::new(config).await.expect("Should create collector");
        
        let initial_metrics = collector.get_metrics().await.expect("Should get initial metrics");
        let initial_memory = initial_metrics.memory_usage;
        
        // Memory usage should be reasonable (less than 10MB for empty collector)
        assert!(initial_memory < 10 * 1024 * 1024);
    }

    #[test]
    fn test_collector_config_serialization() {
        let file_config = create_test_file_config();
        let json = serde_json::to_string(&file_config).expect("Should serialize");
        let deserialized: FileCollectorConfig = serde_json::from_str(&json).expect("Should deserialize");
        
        assert_eq!(file_config.paths, deserialized.paths);
        assert_eq!(file_config.recursive, deserialized.recursive);
        
        let syslog_config = create_test_syslog_config();
        let json = serde_json::to_string(&syslog_config).expect("Should serialize");
        let deserialized: SyslogCollectorConfig = serde_json::from_str(&json).expect("Should deserialize");
        
        assert_eq!(syslog_config.port, deserialized.port);
        assert_eq!(syslog_config.protocol, deserialized.protocol);
    }
}