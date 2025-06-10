// Performance benchmarks for SecureWatch Agent

use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};
use securewatch_agent::{
    Agent, Config, BufferConfig, TransportConfig, ParsedEvent,
    InputValidator, ValidationConfig,
};
use std::collections::HashMap;
use std::time::Duration;
use tokio::runtime::Runtime;

fn create_test_event(id: usize) -> ParsedEvent {
    ParsedEvent {
        timestamp: chrono::Utc::now(),
        source: format!("benchmark_source_{}", id),
        event_type: "benchmark".to_string(),
        message: format!("Benchmark message {} with some content to make it realistic", id),
        fields: {
            let mut fields = HashMap::new();
            fields.insert("event_id".to_string(), serde_json::Value::Number(serde_json::Number::from(id)));
            fields.insert("severity".to_string(), serde_json::Value::String("info".to_string()));
            fields.insert("category".to_string(), serde_json::Value::String("application".to_string()));
            fields
        },
        raw_data: format!("raw benchmark data for event {}", id),
    }
}

fn create_test_config() -> Config {
    Config {
        agent_id: "benchmark-agent".to_string(),
        server_url: "https://localhost:4002".to_string(),
        api_key: "benchmark-key".to_string(),
        batch_size: 100,
        flush_interval: Duration::from_secs(1),
        max_retries: 1,
        retry_delay: Duration::from_millis(10),
        buffer_size: 10000,
        transport: TransportConfig {
            timeout: Duration::from_secs(5),
            compression_enabled: false,
            ..Default::default()
        },
        buffer: BufferConfig {
            max_size: 10000,
            flush_threshold: 100,
            flush_interval: Duration::from_secs(1),
            ..Default::default()
        },
        ..Default::default()
    }
}

fn benchmark_event_processing(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    let config = create_test_config();
    
    let mut group = c.benchmark_group("event_processing");
    
    for batch_size in [1, 10, 100, 1000].iter() {
        group.benchmark_with_input(
            BenchmarkId::new("process_events", batch_size),
            batch_size,
            |b, &size| {
                b.to_async(&rt).iter(|| async {
                    let mut agent = Agent::new(config.clone()).await.expect("Should create agent");
                    
                    let events: Vec<ParsedEvent> = (0..size)
                        .map(|i| create_test_event(i))
                        .collect();
                    
                    let start = std::time::Instant::now();
                    
                    for event in events {
                        let _ = agent.process_event(black_box(event)).await;
                    }
                    
                    black_box(start.elapsed())
                });
            },
        );
    }
    
    group.finish();
}

fn benchmark_buffer_operations(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    
    let mut group = c.benchmark_group("buffer_operations");
    
    for buffer_size in [100, 1000, 10000].iter() {
        group.benchmark_with_input(
            BenchmarkId::new("buffer_add_and_flush", buffer_size),
            buffer_size,
            |b, &size| {
                b.to_async(&rt).iter(|| async {
                    let config = BufferConfig {
                        max_size: size,
                        flush_threshold: size / 2,
                        flush_interval: Duration::from_secs(1),
                        ..Default::default()
                    };
                    
                    let mut buffer = securewatch_agent::MemoryBuffer::new(config).await
                        .expect("Should create buffer");
                    
                    let events: Vec<ParsedEvent> = (0..size)
                        .map(|i| create_test_event(i))
                        .collect();
                    
                    let start = std::time::Instant::now();
                    
                    for event in events {
                        let _ = buffer.add(black_box(event)).await;
                    }
                    
                    let _ = buffer.force_flush().await;
                    
                    black_box(start.elapsed())
                });
            },
        );
    }
    
    group.finish();
}

fn benchmark_validation_performance(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    
    let mut group = c.benchmark_group("validation_performance");
    
    let validation_config = ValidationConfig {
        strict_mode: true,
        auto_sanitize: false,
        block_suspicious_patterns: true,
        log_violations: true,
        max_field_length: 1000,
        max_message_length: 10000,
        ..Default::default()
    };
    
    // Benchmark clean events
    group.benchmark_function("validate_clean_events", |b| {
        b.to_async(&rt).iter(|| async {
            let validator = InputValidator::new(validation_config.clone()).await
                .expect("Should create validator");
            
            let events: Vec<ParsedEvent> = (0..100)
                .map(|i| create_test_event(i))
                .collect();
            
            let start = std::time::Instant::now();
            
            for event in events {
                let _ = validator.validate_event(&black_box(event)).await;
            }
            
            black_box(start.elapsed())
        });
    });
    
    // Benchmark malicious events
    group.benchmark_function("validate_malicious_events", |b| {
        b.to_async(&rt).iter(|| async {
            let validator = InputValidator::new(validation_config.clone()).await
                .expect("Should create validator");
            
            let malicious_events: Vec<ParsedEvent> = (0..100)
                .map(|i| {
                    let mut event = create_test_event(i);
                    event.message = format!("'; DROP TABLE users; -- Event {}", i);
                    event.fields.insert("user_input".to_string(),
                        serde_json::Value::String("<script>alert('xss')</script>".to_string()));
                    event
                })
                .collect();
            
            let start = std::time::Instant::now();
            
            for event in malicious_events {
                let _ = validator.validate_event(&black_box(event)).await;
            }
            
            black_box(start.elapsed())
        });
    });
    
    group.finish();
}

fn benchmark_serialization_performance(c: &mut Criterion) {
    let mut group = c.benchmark_group("serialization_performance");
    
    for event_count in [10, 100, 1000].iter() {
        group.benchmark_with_input(
            BenchmarkId::new("json_serialization", event_count),
            event_count,
            |b, &count| {
                let events: Vec<ParsedEvent> = (0..count)
                    .map(|i| create_test_event(i))
                    .collect();
                
                b.iter(|| {
                    let start = std::time::Instant::now();
                    
                    for event in &events {
                        let _ = serde_json::to_string(&black_box(event));
                    }
                    
                    black_box(start.elapsed())
                });
            },
        );
        
        group.benchmark_with_input(
            BenchmarkId::new("bincode_serialization", event_count),
            event_count,
            |b, &count| {
                let events: Vec<ParsedEvent> = (0..count)
                    .map(|i| create_test_event(i))
                    .collect();
                
                b.iter(|| {
                    let start = std::time::Instant::now();
                    
                    for event in &events {
                        let _ = bincode::serialize(&black_box(event));
                    }
                    
                    black_box(start.elapsed())
                });
            },
        );
    }
    
    group.finish();
}

fn benchmark_concurrent_processing(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    
    let mut group = c.benchmark_group("concurrent_processing");
    
    for thread_count in [1, 2, 4, 8].iter() {
        group.benchmark_with_input(
            BenchmarkId::new("concurrent_event_processing", thread_count),
            thread_count,
            |b, &threads| {
                b.to_async(&rt).iter(|| async {
                    let config = create_test_config();
                    let agent = std::sync::Arc::new(tokio::sync::Mutex::new(
                        Agent::new(config).await.expect("Should create agent")
                    ));
                    
                    let events_per_thread = 100;
                    let mut handles = Vec::new();
                    
                    let start = std::time::Instant::now();
                    
                    for thread_id in 0..threads {
                        let agent_clone = agent.clone();
                        let handle = tokio::spawn(async move {
                            for i in 0..events_per_thread {
                                let event = create_test_event(thread_id * events_per_thread + i);
                                let mut agent_lock = agent_clone.lock().await;
                                let _ = agent_lock.process_event(event).await;
                            }
                        });
                        handles.push(handle);
                    }
                    
                    for handle in handles {
                        let _ = handle.await;
                    }
                    
                    black_box(start.elapsed())
                });
            },
        );
    }
    
    group.finish();
}

fn benchmark_memory_usage(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    
    let mut group = c.benchmark_group("memory_usage");
    
    group.benchmark_function("agent_memory_footprint", |b| {
        b.to_async(&rt).iter(|| async {
            let config = create_test_config();
            let agent = Agent::new(config).await.expect("Should create agent");
            
            // Process events and measure memory
            for i in 0..1000 {
                let event = create_test_event(i);
                let _ = agent.process_event(black_box(event)).await;
            }
            
            let metrics = agent.get_metrics().await.expect("Should get metrics");
            black_box(metrics.memory_usage_mb)
        });
    });
    
    group.finish();
}

fn benchmark_regex_performance(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    
    let mut group = c.benchmark_group("regex_performance");
    
    let test_strings = vec![
        "Normal log message without any suspicious content",
        "'; DROP TABLE users; --",
        "<script>alert('xss')</script>",
        "SELECT * FROM users WHERE id = 1",
        "../../../etc/passwd",
        "rm -rf /",
        "user=*)(uid=*))(|(uid=*",
        "<?xml version=\"1.0\"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM \"file:///etc/passwd\">]>",
    ];
    
    group.benchmark_function("pattern_matching", |b| {
        b.to_async(&rt).iter(|| async {
            let validation_config = ValidationConfig::default();
            let validator = InputValidator::new(validation_config).await
                .expect("Should create validator");
            
            let start = std::time::Instant::now();
            
            for test_string in &test_strings {
                let _ = validator.sanitize_input(black_box(test_string)).await;
            }
            
            black_box(start.elapsed())
        });
    });
    
    group.finish();
}

fn benchmark_transport_compression(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    
    let mut group = c.benchmark_group("transport_compression");
    
    for compression in [false, true].iter() {
        group.benchmark_with_input(
            BenchmarkId::new("event_serialization", compression),
            compression,
            |b, &compress| {
                b.to_async(&rt).iter(|| async {
                    let mut config = TransportConfig::default();
                    config.compression_enabled = compress;
                    config.server_url = "https://localhost:4002".to_string();
                    config.api_key = "test-key".to_string();
                    
                    let transport = securewatch_agent::SecureTransport::new(config).await
                        .expect("Should create transport");
                    
                    let events: Vec<ParsedEvent> = (0..100)
                        .map(|i| {
                            let mut event = create_test_event(i);
                            event.message = "A".repeat(1000); // Large message to test compression
                            event
                        })
                        .collect();
                    
                    let start = std::time::Instant::now();
                    
                    // Note: This will fail network call, but we're measuring serialization/compression time
                    let _ = transport.send_events(black_box(events)).await;
                    
                    black_box(start.elapsed())
                });
            },
        );
    }
    
    group.finish();
}

criterion_group!(
    benches,
    benchmark_event_processing,
    benchmark_buffer_operations,
    benchmark_validation_performance,
    benchmark_serialization_performance,
    benchmark_concurrent_processing,
    benchmark_memory_usage,
    benchmark_regex_performance,
    benchmark_transport_compression
);

criterion_main!(benches);