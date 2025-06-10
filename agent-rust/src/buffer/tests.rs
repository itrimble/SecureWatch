#[cfg(test)]
mod buffer_tests {
    use super::*;
    use crate::config::BufferConfig;
    use std::time::Duration;
    use tokio::time::sleep;
    use tempfile::tempdir;
    use pretty_assertions::assert_eq;
    use serial_test::serial;

    fn create_test_event() -> ParsedEvent {
        ParsedEvent {
            timestamp: chrono::Utc::now(),
            source: "test".to_string(),
            event_type: "test_event".to_string(),
            message: "Test message".to_string(),
            fields: std::collections::HashMap::new(),
            raw_data: "raw test data".to_string(),
        }
    }

    fn create_buffer_config() -> BufferConfig {
        BufferConfig {
            max_size: 1000,
            flush_threshold: 10,
            flush_interval: Duration::from_millis(100),
            compression_enabled: false,
            ..Default::default()
        }
    }

    #[tokio::test]
    async fn test_memory_buffer_creation() {
        let config = create_buffer_config();
        let buffer = MemoryBuffer::new(config.clone()).await.expect("Should create buffer");
        
        assert_eq!(buffer.config.max_size, 1000);
        assert_eq!(buffer.len().await.expect("Should get length"), 0);
        assert!(buffer.is_empty().await.expect("Should check if empty"));
    }

    #[tokio::test]
    async fn test_memory_buffer_add_single_event() {
        let config = create_buffer_config();
        let mut buffer = MemoryBuffer::new(config).await.expect("Should create buffer");
        let event = create_test_event();
        
        buffer.add(event.clone()).await.expect("Should add event");
        
        assert_eq!(buffer.len().await.expect("Should get length"), 1);
        assert!(!buffer.is_empty().await.expect("Should check if empty"));
    }

    #[tokio::test]
    async fn test_memory_buffer_add_multiple_events() {
        let config = create_buffer_config();
        let mut buffer = MemoryBuffer::new(config).await.expect("Should create buffer");
        
        for i in 0..5 {
            let mut event = create_test_event();
            event.message = format!("Test message {}", i);
            buffer.add(event).await.expect("Should add event");
        }
        
        assert_eq!(buffer.len().await.expect("Should get length"), 5);
    }

    #[tokio::test]
    async fn test_memory_buffer_flush_by_size() {
        let mut config = create_buffer_config();
        config.flush_threshold = 3;
        let mut buffer = MemoryBuffer::new(config).await.expect("Should create buffer");
        
        // Add events up to flush threshold
        for i in 0..3 {
            let mut event = create_test_event();
            event.message = format!("Test message {}", i);
            buffer.add(event).await.expect("Should add event");
        }
        
        let flushed = buffer.try_flush().await.expect("Should flush");
        assert_eq!(flushed.len(), 3);
        assert_eq!(buffer.len().await.expect("Should get length"), 0);
    }

    #[tokio::test]
    async fn test_memory_buffer_flush_by_time() {
        let mut config = create_buffer_config();
        config.flush_interval = Duration::from_millis(50);
        let mut buffer = MemoryBuffer::new(config).await.expect("Should create buffer");
        
        let event = create_test_event();
        buffer.add(event).await.expect("Should add event");
        
        // Wait for flush interval to pass
        sleep(Duration::from_millis(60)).await;
        
        let flushed = buffer.try_flush().await.expect("Should flush");
        assert_eq!(flushed.len(), 1);
    }

    #[tokio::test]
    async fn test_memory_buffer_capacity_limit() {
        let mut config = create_buffer_config();
        config.max_size = 5;
        let mut buffer = MemoryBuffer::new(config).await.expect("Should create buffer");
        
        // Add more events than capacity
        for i in 0..10 {
            let mut event = create_test_event();
            event.message = format!("Test message {}", i);
            let result = buffer.add(event).await;
            
            if i < 5 {
                assert!(result.is_ok(), "Should accept event {}", i);
            } else {
                // Should either reject or auto-flush
                assert!(result.is_ok() || buffer.len().await.unwrap() <= 5);
            }
        }
        
        assert!(buffer.len().await.expect("Should get length") <= 5);
    }

    #[tokio::test]
    async fn test_memory_buffer_clear() {
        let config = create_buffer_config();
        let mut buffer = MemoryBuffer::new(config).await.expect("Should create buffer");
        
        // Add some events
        for i in 0..3 {
            let mut event = create_test_event();
            event.message = format!("Test message {}", i);
            buffer.add(event).await.expect("Should add event");
        }
        
        assert_eq!(buffer.len().await.expect("Should get length"), 3);
        
        buffer.clear().await.expect("Should clear buffer");
        assert_eq!(buffer.len().await.expect("Should get length"), 0);
        assert!(buffer.is_empty().await.expect("Should check if empty"));
    }

    #[tokio::test]
    async fn test_memory_buffer_force_flush() {
        let config = create_buffer_config();
        let mut buffer = MemoryBuffer::new(config).await.expect("Should create buffer");
        
        let event = create_test_event();
        buffer.add(event).await.expect("Should add event");
        
        let flushed = buffer.force_flush().await.expect("Should force flush");
        assert_eq!(flushed.len(), 1);
        assert_eq!(buffer.len().await.expect("Should get length"), 0);
    }

    #[tokio::test]
    async fn test_memory_buffer_concurrent_access() {
        let config = create_buffer_config();
        let buffer = std::sync::Arc::new(tokio::sync::Mutex::new(
            MemoryBuffer::new(config).await.expect("Should create buffer")
        ));
        
        let mut handles = Vec::new();
        
        // Spawn multiple tasks adding events concurrently
        for i in 0..10 {
            let buffer_clone = buffer.clone();
            let handle = tokio::spawn(async move {
                let mut event = create_test_event();
                event.message = format!("Concurrent message {}", i);
                
                let mut buf = buffer_clone.lock().await;
                buf.add(event).await.expect("Should add event");
            });
            handles.push(handle);
        }
        
        // Wait for all tasks to complete
        for handle in handles {
            handle.await.expect("Task should complete");
        }
        
        let buf = buffer.lock().await;
        assert_eq!(buf.len().await.expect("Should get length"), 10);
    }

    #[cfg(feature = "persistent-storage")]
    #[tokio::test]
    #[serial]
    async fn test_persistent_buffer_creation() {
        let dir = tempdir().expect("Should create temp dir");
        let db_path = dir.path().join("test.db");
        
        let mut config = create_buffer_config();
        config.persistent = true;
        config.db_path = Some(db_path.to_string_lossy().to_string());
        
        let buffer = PersistentBuffer::new(config.clone()).await.expect("Should create persistent buffer");
        
        assert_eq!(buffer.config.max_size, 1000);
        assert_eq!(buffer.len().await.expect("Should get length"), 0);
    }

    #[cfg(feature = "persistent-storage")]
    #[tokio::test]
    #[serial]
    async fn test_persistent_buffer_persistence() {
        let dir = tempdir().expect("Should create temp dir");
        let db_path = dir.path().join("persistence_test.db");
        
        let mut config = create_buffer_config();
        config.persistent = true;
        config.db_path = Some(db_path.to_string_lossy().to_string());
        
        // Create buffer and add events
        {
            let mut buffer = PersistentBuffer::new(config.clone()).await.expect("Should create buffer");
            let event = create_test_event();
            buffer.add(event).await.expect("Should add event");
            assert_eq!(buffer.len().await.expect("Should get length"), 1);
        }
        
        // Recreate buffer and verify data persisted
        {
            let buffer = PersistentBuffer::new(config).await.expect("Should recreate buffer");
            assert_eq!(buffer.len().await.expect("Should get length"), 1);
        }
    }

    #[test]
    fn test_buffer_config_validation() {
        let mut config = create_buffer_config();
        assert!(config.validate().is_ok());
        
        // Test invalid max_size
        config.max_size = 0;
        assert!(config.validate().is_err());
        
        // Test invalid flush_threshold
        config.max_size = 1000;
        config.flush_threshold = 0;
        assert!(config.validate().is_err());
        
        // Test flush_threshold greater than max_size
        config.flush_threshold = 2000;
        assert!(config.validate().is_err());
    }

    #[tokio::test]
    async fn test_buffer_metrics() {
        let config = create_buffer_config();
        let buffer = MemoryBuffer::new(config).await.expect("Should create buffer");
        
        let metrics = buffer.get_metrics().await.expect("Should get metrics");
        
        assert_eq!(metrics.total_events, 0);
        assert_eq!(metrics.buffer_size, 0);
        assert!(metrics.memory_usage > 0);
    }

    #[tokio::test]
    async fn test_buffer_compression() {
        let mut config = create_buffer_config();
        config.compression_enabled = true;
        let mut buffer = MemoryBuffer::new(config).await.expect("Should create buffer");
        
        // Add a large event that should benefit from compression
        let mut event = create_test_event();
        event.message = "A".repeat(1000);
        
        buffer.add(event).await.expect("Should add event");
        
        let flushed = buffer.force_flush().await.expect("Should flush");
        assert_eq!(flushed.len(), 1);
    }

    #[tokio::test]
    async fn test_buffer_error_handling() {
        let config = create_buffer_config();
        let buffer = MemoryBuffer::new(config).await.expect("Should create buffer");
        
        // Test operations on empty buffer
        let empty_flush = buffer.try_flush().await.expect("Should handle empty flush");
        assert!(empty_flush.is_empty());
        
        let force_flush = buffer.force_flush().await.expect("Should handle empty force flush");
        assert!(force_flush.is_empty());
    }

    #[tokio::test]
    async fn test_buffer_memory_pressure() {
        let mut config = create_buffer_config();
        config.max_size = 2;
        let mut buffer = MemoryBuffer::new(config).await.expect("Should create buffer");
        
        // Fill buffer to capacity
        for i in 0..2 {
            let mut event = create_test_event();
            event.message = format!("Event {}", i);
            buffer.add(event).await.expect("Should add event");
        }
        
        // Adding another event should trigger overflow handling
        let mut overflow_event = create_test_event();
        overflow_event.message = "Overflow event".to_string();
        
        let result = buffer.add(overflow_event).await;
        // Should either succeed (auto-flush) or fail gracefully
        assert!(result.is_ok() || result.err().unwrap().to_string().contains("buffer full"));
    }
}