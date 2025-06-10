// Comprehensive tests for circuit breaker implementation

use super::*;
use crate::errors::TransportError;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Arc as StdArc;
use tokio::time::{sleep, Duration};

fn create_test_config() -> CircuitBreakerConfig {
    CircuitBreakerConfig {
        failure_threshold: 3,
        recovery_timeout: Duration::from_millis(100),
        success_threshold: 2,
        max_open_duration: Duration::from_secs(5),
        sliding_window_size: 10,
        failure_rate_threshold: 0.6, // 60%
        minimum_requests: 5,
    }
}

fn create_test_breaker() -> CircuitBreaker {
    CircuitBreaker::new("test-breaker".to_string(), create_test_config())
}

fn create_connection_error() -> TransportError {
    TransportError::ConnectionFailed {
        endpoint: "test-endpoint".to_string(),
        attempts: 1,
        last_error: "Connection refused".to_string(),
        retry_after: None,
    }
}

fn create_server_error(status: u16) -> TransportError {
    TransportError::ServerError {
        status,
        message: "Server error".to_string(),
        headers: vec![],
        body: None,
        retryable: status >= 500,
    }
}

fn create_timeout_error() -> TransportError {
    TransportError::Timeout {
        operation: "test-operation".to_string(),
        duration_ms: 5000,
        retryable: true,
    }
}

#[tokio::test]
async fn test_circuit_breaker_creation() {
    let config = create_test_config();
    let breaker = CircuitBreaker::new("test".to_string(), config.clone());
    
    assert_eq!(breaker.state().await, CircuitBreakerState::Closed);
    assert_eq!(breaker.name().await, "test");
    
    let stats = breaker.stats().await;
    assert_eq!(stats.name, "test");
    assert_eq!(stats.state, CircuitBreakerState::Closed);
    assert_eq!(stats.failure_count, 0);
    assert_eq!(stats.success_count, 0);
    assert_eq!(stats.total_requests, 0);
}

#[tokio::test]
async fn test_circuit_breaker_success_call() {
    let breaker = create_test_breaker();
    let call_count = StdArc::new(AtomicU32::new(0));
    
    let call_count_clone = call_count.clone();
    let result = breaker.call(|| async move {
        call_count_clone.fetch_add(1, Ordering::SeqCst);
        Ok::<u32, TransportError>(42)
    }).await;
    
    assert!(result.is_ok());
    assert_eq!(result.unwrap(), 42);
    assert_eq!(call_count.load(Ordering::SeqCst), 1);
    assert_eq!(breaker.state().await, CircuitBreakerState::Closed);
    
    let stats = breaker.stats().await;
    assert_eq!(stats.success_count, 1);
    assert_eq!(stats.total_requests, 1);
}

#[tokio::test]
async fn test_circuit_breaker_failure_call() {
    let breaker = create_test_breaker();
    let call_count = StdArc::new(AtomicU32::new(0));
    
    let call_count_clone = call_count.clone();
    let result = breaker.call(|| async move {
        call_count_clone.fetch_add(1, Ordering::SeqCst);
        Err::<u32, TransportError>(create_connection_error())
    }).await;
    
    assert!(result.is_err());
    assert_eq!(call_count.load(Ordering::SeqCst), 1);
    assert_eq!(breaker.state().await, CircuitBreakerState::Closed); // Still closed after one failure
    
    let stats = breaker.stats().await;
    assert_eq!(stats.failure_count, 1);
    assert_eq!(stats.total_requests, 1);
}

#[tokio::test]
async fn test_circuit_breaker_opens_after_threshold() {
    let breaker = create_test_breaker();
    let call_count = StdArc::new(AtomicU32::new(0));
    
    // Make 3 failing calls to trigger the threshold
    for _ in 0..3 {
        let call_count_clone = call_count.clone();
        let result = breaker.call(|| async move {
            call_count_clone.fetch_add(1, Ordering::SeqCst);
            Err::<u32, TransportError>(create_connection_error())
        }).await;
        
        assert!(result.is_err());
    }
    
    // Circuit should now be open
    assert_eq!(breaker.state().await, CircuitBreakerState::Open);
    assert_eq!(call_count.load(Ordering::SeqCst), 3);
    
    // Next call should be rejected without executing the function
    let call_count_clone = call_count.clone();
    let result = breaker.call(|| async move {
        call_count_clone.fetch_add(1, Ordering::SeqCst);
        Ok::<u32, TransportError>(42)
    }).await;
    
    assert!(result.is_err());
    assert!(matches!(result.unwrap_err(), TransportError::CircuitBreakerOpen { .. }));
    assert_eq!(call_count.load(Ordering::SeqCst), 3); // Function not called
}

#[tokio::test]
async fn test_circuit_breaker_half_open_recovery() {
    let breaker = create_test_breaker();
    
    // Trigger circuit breaker to open
    for _ in 0..3 {
        let _ = breaker.call(|| async {
            Err::<u32, TransportError>(create_connection_error())
        }).await;
    }
    
    assert_eq!(breaker.state().await, CircuitBreakerState::Open);
    
    // Wait for recovery timeout
    sleep(Duration::from_millis(150)).await;
    
    // First call after timeout should transition to half-open
    let result = breaker.call(|| async {
        Ok::<u32, TransportError>(42)
    }).await;
    
    assert!(result.is_ok());
    assert_eq!(breaker.state().await, CircuitBreakerState::HalfOpen);
    
    // One more success should close the circuit
    let result = breaker.call(|| async {
        Ok::<u32, TransportError>(43)
    }).await;
    
    assert!(result.is_ok());
    assert_eq!(breaker.state().await, CircuitBreakerState::Closed);
}

#[tokio::test]
async fn test_circuit_breaker_half_open_failure_reopens() {
    let breaker = create_test_breaker();
    
    // Trigger circuit breaker to open
    for _ in 0..3 {
        let _ = breaker.call(|| async {
            Err::<u32, TransportError>(create_connection_error())
        }).await;
    }
    
    assert_eq!(breaker.state().await, CircuitBreakerState::Open);
    
    // Wait for recovery timeout
    sleep(Duration::from_millis(150)).await;
    
    // First call succeeds and transitions to half-open
    let result = breaker.call(|| async {
        Ok::<u32, TransportError>(42)
    }).await;
    
    assert!(result.is_ok());
    assert_eq!(breaker.state().await, CircuitBreakerState::HalfOpen);
    
    // Next call fails and should reopen the circuit
    let result = breaker.call(|| async {
        Err::<u32, TransportError>(create_connection_error())
    }).await;
    
    assert!(result.is_err());
    assert_eq!(breaker.state().await, CircuitBreakerState::Open);
}

#[tokio::test]
async fn test_circuit_breaker_failure_rate_threshold() {
    let breaker = create_test_breaker();
    
    // Make minimum required requests (5) with 60% failure rate (3 failures, 2 successes)
    for i in 0..5 {
        let result = if i < 3 {
            breaker.call(|| async {
                Err::<u32, TransportError>(create_connection_error())
            }).await
        } else {
            breaker.call(|| async {
                Ok::<u32, TransportError>(42)
            }).await
        };
        
        // Should not open until we reach the minimum requests and failure rate
        if i < 4 {
            assert_eq!(breaker.state().await, CircuitBreakerState::Closed);
        }
    }
    
    // After 5 requests with 60% failure rate, circuit should still be closed
    // because our threshold is 60% and we have exactly 60%
    assert_eq!(breaker.state().await, CircuitBreakerState::Closed);
    
    // One more failure should push us over the threshold
    let result = breaker.call(|| async {
        Err::<u32, TransportError>(create_connection_error())
    }).await;
    
    assert!(result.is_err());
    assert_eq!(breaker.state().await, CircuitBreakerState::Open);
}

#[tokio::test]
async fn test_circuit_breaker_server_error_handling() {
    let breaker = create_test_breaker();
    
    // 4xx errors should not count as failures for circuit breaker
    for _ in 0..5 {
        let result = breaker.call(|| async {
            Err::<u32, TransportError>(create_server_error(404))
        }).await;
        
        assert!(result.is_err());
        assert_eq!(breaker.state().await, CircuitBreakerState::Closed);
    }
    
    // 5xx errors should count as failures
    for _ in 0..3 {
        let result = breaker.call(|| async {
            Err::<u32, TransportError>(create_server_error(500))
        }).await;
        
        assert!(result.is_err());
    }
    
    assert_eq!(breaker.state().await, CircuitBreakerState::Open);
}

#[tokio::test]
async fn test_circuit_breaker_timeout_handling() {
    let breaker = create_test_breaker();
    
    // Timeouts should count as failures
    for _ in 0..3 {
        let result = breaker.call(|| async {
            Err::<u32, TransportError>(create_timeout_error())
        }).await;
        
        assert!(result.is_err());
    }
    
    assert_eq!(breaker.state().await, CircuitBreakerState::Open);
}

#[tokio::test]
async fn test_circuit_breaker_manual_state_control() {
    let breaker = create_test_breaker();
    
    // Test manual open
    breaker.force_open().await;
    assert_eq!(breaker.state().await, CircuitBreakerState::Open);
    
    // Test manual half-open
    breaker.force_half_open().await;
    assert_eq!(breaker.state().await, CircuitBreakerState::HalfOpen);
    
    // Test manual close
    breaker.force_closed().await;
    assert_eq!(breaker.state().await, CircuitBreakerState::Closed);
}

#[tokio::test]
async fn test_circuit_breaker_statistics() {
    let breaker = create_test_breaker();
    
    // Make some successful calls
    for _ in 0..3 {
        let _ = breaker.call(|| async {
            Ok::<u32, TransportError>(42)
        }).await;
    }
    
    // Make some failed calls
    for _ in 0..2 {
        let _ = breaker.call(|| async {
            Err::<u32, TransportError>(create_connection_error())
        }).await;
    }
    
    let stats = breaker.stats().await;
    assert_eq!(stats.total_requests, 5);
    assert_eq!(stats.failure_count, 2);
    assert!(stats.last_success_time.is_some());
    assert!(stats.last_failure_time.is_some());
    assert_eq!(stats.failure_rate, 0.4); // 2 failures out of 5 requests
    assert_eq!(stats.uptime_percentage, 60.0); // 3 successes out of 5 requests
}

#[tokio::test]
async fn test_circuit_breaker_reset() {
    let breaker = create_test_breaker();
    
    // Generate some activity
    for _ in 0..5 {
        let _ = breaker.call(|| async {
            Err::<u32, TransportError>(create_connection_error())
        }).await;
    }
    
    // Reset and verify
    breaker.reset().await;
    
    let stats = breaker.stats().await;
    assert_eq!(stats.total_requests, 0);
    assert_eq!(stats.failure_count, 0);
    assert_eq!(stats.success_count, 0);
    assert_eq!(stats.state_changes, 0);
}

#[tokio::test]
async fn test_circuit_breaker_is_call_allowed() {
    let breaker = create_test_breaker();
    
    // Initially should allow calls
    assert!(breaker.is_call_allowed().await);
    
    // Open the circuit
    for _ in 0..3 {
        let _ = breaker.call(|| async {
            Err::<u32, TransportError>(create_connection_error())
        }).await;
    }
    
    // Should not allow calls when open
    assert!(!breaker.is_call_allowed().await);
    
    // Close the circuit
    breaker.force_closed().await;
    
    // Should allow calls again
    assert!(breaker.is_call_allowed().await);
}

#[tokio::test]
async fn test_circuit_breaker_config_update() {
    let breaker = create_test_breaker();
    
    // Original threshold is 3
    for _ in 0..2 {
        let _ = breaker.call(|| async {
            Err::<u32, TransportError>(create_connection_error())
        }).await;
    }
    
    assert_eq!(breaker.state().await, CircuitBreakerState::Closed);
    
    // Update config to lower threshold
    let mut new_config = create_test_config();
    new_config.failure_threshold = 2;
    breaker.update_config(new_config).await;
    
    // One more failure should now open the circuit
    let _ = breaker.call(|| async {
        Err::<u32, TransportError>(create_connection_error())
    }).await;
    
    assert_eq!(breaker.state().await, CircuitBreakerState::Open);
}

#[tokio::test]
async fn test_circuit_breaker_registry() {
    let registry = CircuitBreakerRegistry::new();
    
    // Test get_or_create
    let config = create_test_config();
    let breaker1 = registry.get_or_create("test1".to_string(), config.clone()).await;
    let breaker2 = registry.get_or_create("test1".to_string(), config.clone()).await;
    
    // Should return the same instance
    assert_eq!(breaker1.name().await, breaker2.name().await);
    
    // Test get
    let breaker3 = registry.get("test1").await;
    assert!(breaker3.is_some());
    assert_eq!(breaker3.unwrap().name().await, "test1");
    
    // Test get non-existent
    let breaker4 = registry.get("non-existent").await;
    assert!(breaker4.is_none());
    
    // Test list_names
    let _ = registry.get_or_create("test2".to_string(), config.clone()).await;
    let names = registry.list_names().await;
    assert_eq!(names.len(), 2);
    assert!(names.contains(&"test1".to_string()));
    assert!(names.contains(&"test2".to_string()));
    
    // Test remove
    let removed = registry.remove("test1").await;
    assert!(removed.is_some());
    assert_eq!(removed.unwrap().name().await, "test1");
    
    let names = registry.list_names().await;
    assert_eq!(names.len(), 1);
    assert!(names.contains(&"test2".to_string()));
}

#[tokio::test]
async fn test_circuit_breaker_registry_batch_operations() {
    let registry = CircuitBreakerRegistry::new();
    let config = create_test_config();
    
    // Create multiple breakers
    for i in 0..3 {
        let _ = registry.get_or_create(format!("test{}", i), config.clone()).await;
    }
    
    // Test get_all_stats
    let stats = registry.get_all_stats().await;
    assert_eq!(stats.len(), 3);
    
    // Test force_all_state
    registry.force_all_state(CircuitBreakerState::Open).await;
    
    for i in 0..3 {
        let breaker = registry.get(&format!("test{}", i)).await.unwrap();
        assert_eq!(breaker.state().await, CircuitBreakerState::Open);
    }
    
    // Test reset_all_stats
    registry.reset_all_stats().await;
    
    let stats = registry.get_all_stats().await;
    for stat in stats {
        assert_eq!(stat.total_requests, 0);
        assert_eq!(stat.failure_count, 0);
        assert_eq!(stat.success_count, 0);
    }
}

#[tokio::test]
async fn test_circuit_breaker_concurrent_access() {
    let breaker = StdArc::new(create_test_breaker());
    let call_count = StdArc::new(AtomicU32::new(0));
    let success_count = StdArc::new(AtomicU32::new(0));
    
    let mut handles = Vec::new();
    
    // Spawn multiple concurrent tasks
    for i in 0..10 {
        let breaker_clone = breaker.clone();
        let call_count_clone = call_count.clone();
        let success_count_clone = success_count.clone();
        
        let handle = tokio::spawn(async move {
            let result = breaker_clone.call(|| async move {
                call_count_clone.fetch_add(1, Ordering::SeqCst);
                if i < 7 {
                    Ok::<u32, TransportError>(i)
                } else {
                    Err::<u32, TransportError>(create_connection_error())
                }
            }).await;
            
            if result.is_ok() {
                success_count_clone.fetch_add(1, Ordering::SeqCst);
            }
        });
        
        handles.push(handle);
    }
    
    // Wait for all tasks to complete
    for handle in handles {
        handle.await.unwrap();
    }
    
    // Verify results
    assert_eq!(call_count.load(Ordering::SeqCst), 10);
    assert_eq!(success_count.load(Ordering::SeqCst), 7);
    
    let stats = breaker.stats().await;
    assert_eq!(stats.total_requests, 10);
}

#[tokio::test]
async fn test_sliding_window_behavior() {
    let mut window = SlidingWindow::new(3);
    
    // Test initial state
    assert_eq!(window.failure_rate(), 0.0);
    assert_eq!(window.request_count(), 0);
    
    // Add some outcomes
    window.record(RequestOutcome::Success);
    window.record(RequestOutcome::Failure);
    window.record(RequestOutcome::Success);
    
    assert_eq!(window.failure_rate(), 1.0 / 3.0);
    assert_eq!(window.request_count(), 3);
    
    // Add more outcomes to test sliding behavior
    window.record(RequestOutcome::Failure);
    window.record(RequestOutcome::Failure);
    
    // Should now have [Success, Failure, Failure] (oldest Success pushed out)
    assert_eq!(window.failure_rate(), 2.0 / 3.0);
    assert_eq!(window.request_count(), 3);
    
    // Clear and test
    window.clear();
    assert_eq!(window.failure_rate(), 0.0);
    assert_eq!(window.request_count(), 0);
}

#[tokio::test]
async fn test_request_outcome_classification() {
    assert!(RequestOutcome::Success.is_success());
    assert!(!RequestOutcome::Success.is_failure());
    
    assert!(!RequestOutcome::Failure.is_success());
    assert!(RequestOutcome::Failure.is_failure());
    
    assert!(!RequestOutcome::Timeout.is_success());
    assert!(RequestOutcome::Timeout.is_failure());
    
    assert!(!RequestOutcome::Cancelled.is_success());
    assert!(RequestOutcome::Cancelled.is_failure());
}