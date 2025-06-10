#[cfg(test)]
mod validation_tests {
    use super::*;
    use std::collections::HashMap;
    use pretty_assertions::assert_eq;
    use proptest::prelude::*;

    fn create_test_config() -> ValidationConfig {
        ValidationConfig {
            strict_mode: true,
            auto_sanitize: false,
            block_suspicious_patterns: true,
            log_violations: true,
            max_field_length: 1000,
            max_message_length: 10000,
            allowed_protocols: vec!["http".to_string(), "https".to_string()],
            blocked_file_extensions: vec!["exe".to_string(), "bat".to_string()],
            sanitization_rules: HashMap::new(),
        }
    }

    fn create_test_event() -> ParsedEvent {
        ParsedEvent {
            timestamp: chrono::Utc::now(),
            source: "test".to_string(),
            event_type: "test_event".to_string(),
            message: "Clean test message".to_string(),
            fields: HashMap::new(),
            raw_data: "clean raw data".to_string(),
        }
    }

    #[tokio::test]
    async fn test_validator_creation() {
        let config = create_test_config();
        let validator = InputValidator::new(config.clone()).await.expect("Should create validator");
        
        assert_eq!(validator.config.strict_mode, true);
        assert_eq!(validator.config.max_field_length, 1000);
    }

    #[tokio::test]
    async fn test_validate_clean_event() {
        let config = create_test_config();
        let validator = InputValidator::new(config).await.expect("Should create validator");
        let event = create_test_event();
        
        let result = validator.validate_event(&event).await;
        assert!(result.is_ok());
        
        let validation_result = result.unwrap();
        assert_eq!(validation_result.risk_level, ValidationRiskLevel::Low);
        assert!(validation_result.violations.is_empty());
    }

    #[tokio::test]
    async fn test_validate_sql_injection() {
        let config = create_test_config();
        let validator = InputValidator::new(config).await.expect("Should create validator");
        
        let mut event = create_test_event();
        event.message = "'; DROP TABLE users; --".to_string();
        
        let result = validator.validate_event(&event).await;
        assert!(result.is_ok());
        
        let validation_result = result.unwrap();
        assert_eq!(validation_result.risk_level, ValidationRiskLevel::Critical);
        assert!(!validation_result.violations.is_empty());
        assert!(validation_result.violations.iter().any(|v| v.violation_type == "sql_injection"));
    }

    #[tokio::test]
    async fn test_validate_xss_attack() {
        let config = create_test_config();
        let validator = InputValidator::new(config).await.expect("Should create validator");
        
        let mut event = create_test_event();
        event.fields.insert("user_input".to_string(), 
            serde_json::Value::String("<script>alert('xss')</script>".to_string()));
        
        let result = validator.validate_event(&event).await;
        assert!(result.is_ok());
        
        let validation_result = result.unwrap();
        assert!(validation_result.risk_level >= ValidationRiskLevel::High);
        assert!(validation_result.violations.iter().any(|v| v.violation_type == "xss"));
    }

    #[tokio::test]
    async fn test_validate_command_injection() {
        let config = create_test_config();
        let validator = InputValidator::new(config).await.expect("Should create validator");
        
        let mut event = create_test_event();
        event.message = "test; rm -rf /".to_string();
        
        let result = validator.validate_event(&event).await;
        assert!(result.is_ok());
        
        let validation_result = result.unwrap();
        assert!(validation_result.risk_level >= ValidationRiskLevel::High);
        assert!(validation_result.violations.iter().any(|v| v.violation_type == "command_injection"));
    }

    #[tokio::test]
    async fn test_validate_path_traversal() {
        let config = create_test_config();
        let validator = InputValidator::new(config).await.expect("Should create validator");
        
        let mut event = create_test_event();
        event.fields.insert("file_path".to_string(), 
            serde_json::Value::String("../../../etc/passwd".to_string()));
        
        let result = validator.validate_event(&event).await;
        assert!(result.is_ok());
        
        let validation_result = result.unwrap();
        assert!(validation_result.risk_level >= ValidationRiskLevel::High);
        assert!(validation_result.violations.iter().any(|v| v.violation_type == "path_traversal"));
    }

    #[tokio::test]
    async fn test_validate_ldap_injection() {
        let config = create_test_config();
        let validator = InputValidator::new(config).await.expect("Should create validator");
        
        let mut event = create_test_event();
        event.message = "user=*)(uid=*))(|(uid=*".to_string();
        
        let result = validator.validate_event(&event).await;
        assert!(result.is_ok());
        
        let validation_result = result.unwrap();
        assert!(validation_result.risk_level >= ValidationRiskLevel::Medium);
        assert!(validation_result.violations.iter().any(|v| v.violation_type == "ldap_injection"));
    }

    #[tokio::test]
    async fn test_validate_xml_injection() {
        let config = create_test_config();
        let validator = InputValidator::new(config).await.expect("Should create validator");
        
        let mut event = create_test_event();
        event.message = "<?xml version=\"1.0\"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM \"file:///etc/passwd\">]>".to_string();
        
        let result = validator.validate_event(&event).await;
        assert!(result.is_ok());
        
        let validation_result = result.unwrap();
        assert!(validation_result.risk_level >= ValidationRiskLevel::High);
        assert!(validation_result.violations.iter().any(|v| v.violation_type == "xml_injection"));
    }

    #[tokio::test]
    async fn test_validate_log_injection() {
        let config = create_test_config();
        let validator = InputValidator::new(config).await.expect("Should create validator");
        
        let mut event = create_test_event();
        event.message = "user input\n[FAKE] Admin logged in successfully".to_string();
        
        let result = validator.validate_event(&event).await;
        assert!(result.is_ok());
        
        let validation_result = result.unwrap();
        assert!(validation_result.risk_level >= ValidationRiskLevel::Medium);
        assert!(validation_result.violations.iter().any(|v| v.violation_type == "log_injection"));
    }

    #[tokio::test]
    async fn test_validate_dangerous_files() {
        let config = create_test_config();
        let validator = InputValidator::new(config).await.expect("Should create validator");
        
        let mut event = create_test_event();
        event.fields.insert("filename".to_string(), 
            serde_json::Value::String("malware.exe".to_string()));
        
        let result = validator.validate_event(&event).await;
        assert!(result.is_ok());
        
        let validation_result = result.unwrap();
        assert!(validation_result.risk_level >= ValidationRiskLevel::Medium);
        assert!(validation_result.violations.iter().any(|v| v.violation_type == "dangerous_file"));
    }

    #[tokio::test]
    async fn test_validate_message_length() {
        let config = create_test_config();
        let validator = InputValidator::new(config).await.expect("Should create validator");
        
        let mut event = create_test_event();
        event.message = "A".repeat(20000); // Exceeds max_message_length
        
        let result = validator.validate_event(&event).await;
        assert!(result.is_ok());
        
        let validation_result = result.unwrap();
        assert!(validation_result.risk_level >= ValidationRiskLevel::Medium);
        assert!(validation_result.violations.iter().any(|v| v.violation_type == "length_exceeded"));
    }

    #[tokio::test]
    async fn test_validate_field_length() {
        let config = create_test_config();
        let validator = InputValidator::new(config).await.expect("Should create validator");
        
        let mut event = create_test_event();
        event.fields.insert("long_field".to_string(), 
            serde_json::Value::String("B".repeat(2000))); // Exceeds max_field_length
        
        let result = validator.validate_event(&event).await;
        assert!(result.is_ok());
        
        let validation_result = result.unwrap();
        assert!(validation_result.risk_level >= ValidationRiskLevel::Medium);
        assert!(validation_result.violations.iter().any(|v| v.violation_type == "length_exceeded"));
    }

    #[tokio::test]
    async fn test_validate_url() {
        let config = create_test_config();
        let validator = InputValidator::new(config).await.expect("Should create validator");
        
        // Valid URL
        let result = validator.validate_url("https://example.com/path").await;
        assert!(result.is_ok());
        
        // Invalid protocol
        let result = validator.validate_url("ftp://example.com").await;
        assert!(result.is_err());
        
        // Malformed URL
        let result = validator.validate_url("not-a-url").await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_validate_email() {
        let config = create_test_config();
        let validator = InputValidator::new(config).await.expect("Should create validator");
        
        // Valid email
        let result = validator.validate_email("user@example.com").await;
        assert!(result.is_ok());
        
        // Invalid email
        let result = validator.validate_email("not-an-email").await;
        assert!(result.is_err());
        
        // Email with injection attempt
        let result = validator.validate_email("user'; DROP TABLE users; --@example.com").await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_validate_file_path() {
        let config = create_test_config();
        let validator = InputValidator::new(config).await.expect("Should create validator");
        
        // Valid path
        let result = validator.validate_file_path("/var/log/app.log").await;
        assert!(result.is_ok());
        
        // Path traversal attempt
        let result = validator.validate_file_path("../../../etc/passwd").await;
        assert!(result.is_err());
        
        // Dangerous file extension
        let result = validator.validate_file_path("/tmp/malware.exe").await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_validate_json() {
        let config = create_test_config();
        let validator = InputValidator::new(config).await.expect("Should create validator");
        
        // Valid JSON
        let valid_json = r#"{"name": "test", "value": 123}"#;
        let result = validator.validate_json(valid_json).await;
        assert!(result.is_ok());
        
        // Invalid JSON
        let invalid_json = r#"{"name": "test", "value":}"#;
        let result = validator.validate_json(invalid_json).await;
        assert!(result.is_err());
        
        // JSON with suspicious content
        let suspicious_json = r#"{"query": "'; DROP TABLE users; --"}"#;
        let result = validator.validate_json(suspicious_json).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_sanitize_input() {
        let config = create_test_config();
        let validator = InputValidator::new(config).await.expect("Should create validator");
        
        let input = "<script>alert('xss')</script>Hello World";
        let sanitized = validator.sanitize_input(input).await.expect("Should sanitize");
        
        // Should remove or escape dangerous content
        assert!(!sanitized.contains("<script>"));
        assert!(sanitized.contains("Hello World"));
    }

    #[tokio::test]
    async fn test_validator_metrics() {
        let config = create_test_config();
        let validator = InputValidator::new(config).await.expect("Should create validator");
        
        // Validate some events to generate metrics
        let clean_event = create_test_event();
        let _ = validator.validate_event(&clean_event).await;
        
        let mut malicious_event = create_test_event();
        malicious_event.message = "'; DROP TABLE users; --".to_string();
        let _ = validator.validate_event(&malicious_event).await;
        
        let stats = validator.get_stats().await.expect("Should get stats");
        
        assert!(stats.total_validations >= 2);
        assert!(stats.total_violations >= 1);
        assert!(stats.blocked_requests >= 0);
    }

    #[tokio::test]
    async fn test_validator_auto_sanitize() {
        let mut config = create_test_config();
        config.auto_sanitize = true;
        let validator = InputValidator::new(config).await.expect("Should create validator");
        
        let mut event = create_test_event();
        event.message = "<script>alert('xss')</script>Clean message".to_string();
        
        let result = validator.validate_event(&event).await;
        assert!(result.is_ok());
        
        let validation_result = result.unwrap();
        // Should have violations but lower risk due to sanitization
        assert!(validation_result.violations.len() > 0);
        assert!(validation_result.sanitized_content.is_some());
    }

    #[tokio::test]
    async fn test_validator_strict_mode() {
        let mut config = create_test_config();
        config.strict_mode = false;
        let validator = InputValidator::new(config).await.expect("Should create validator");
        
        let mut event = create_test_event();
        event.message = "Slightly suspicious content".to_string();
        
        let result = validator.validate_event(&event).await;
        assert!(result.is_ok());
        
        let validation_result = result.unwrap();
        // Non-strict mode should be more permissive
        assert!(validation_result.risk_level <= ValidationRiskLevel::Medium);
    }

    #[tokio::test]
    async fn test_validator_performance() {
        let config = create_test_config();
        let validator = InputValidator::new(config).await.expect("Should create validator");
        
        let start_time = std::time::Instant::now();
        
        // Validate many events to test performance
        for i in 0..1000 {
            let mut event = create_test_event();
            event.message = format!("Test message {}", i);
            let _ = validator.validate_event(&event).await;
        }
        
        let duration = start_time.elapsed();
        
        // Should complete validation quickly (less than 1 second for 1000 events)
        assert!(duration < std::time::Duration::from_secs(1));
    }

    // Property-based testing for robust validation
    proptest! {
        #[test]
        fn test_validate_arbitrary_strings(input in ".*") {
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let config = create_test_config();
                let validator = InputValidator::new(config).await.expect("Should create validator");
                
                let mut event = create_test_event();
                event.message = input;
                
                // Should never panic, always return a result
                let result = validator.validate_event(&event).await;
                assert!(result.is_ok());
            });
        }
    }

    proptest! {
        #[test]
        fn test_sanitize_arbitrary_input(input in ".*") {
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let config = create_test_config();
                let validator = InputValidator::new(config).await.expect("Should create validator");
                
                // Should never panic when sanitizing
                let result = validator.sanitize_input(&input).await;
                assert!(result.is_ok());
                
                // Sanitized output should not be longer than input + some overhead
                if let Ok(sanitized) = result {
                    assert!(sanitized.len() <= input.len() + 100);
                }
            });
        }
    }

    #[tokio::test]
    async fn test_validator_concurrent_access() {
        let config = create_test_config();
        let validator = std::sync::Arc::new(InputValidator::new(config).await.expect("Should create validator"));
        
        let mut handles = Vec::new();
        
        // Spawn multiple concurrent validation tasks
        for i in 0..100 {
            let validator_clone = validator.clone();
            let handle = tokio::spawn(async move {
                let mut event = create_test_event();
                event.message = format!("Concurrent message {}", i);
                
                validator_clone.validate_event(&event).await
            });
            handles.push(handle);
        }
        
        // Wait for all tasks to complete
        for handle in handles {
            let result = handle.await.expect("Task should complete");
            assert!(result.is_ok());
        }
    }

    #[test]
    fn test_validation_config_validation() {
        let mut config = create_test_config();
        
        // Test valid configuration
        assert!(config.validate().is_ok());
        
        // Test invalid max_field_length
        config.max_field_length = 0;
        assert!(config.validate().is_err());
        
        // Test invalid max_message_length
        config.max_field_length = 1000;
        config.max_message_length = 0;
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_validation_risk_level_ordering() {
        assert!(ValidationRiskLevel::Low < ValidationRiskLevel::Medium);
        assert!(ValidationRiskLevel::Medium < ValidationRiskLevel::High);
        assert!(ValidationRiskLevel::High < ValidationRiskLevel::Critical);
        
        // Test that the ordering is total
        let levels = vec![
            ValidationRiskLevel::Low,
            ValidationRiskLevel::Medium,
            ValidationRiskLevel::High,
            ValidationRiskLevel::Critical,
        ];
        
        for (i, level1) in levels.iter().enumerate() {
            for (j, level2) in levels.iter().enumerate() {
                if i < j {
                    assert!(level1 < level2);
                } else if i > j {
                    assert!(level1 > level2);
                } else {
                    assert!(level1 == level2);
                }
            }
        }
    }
}