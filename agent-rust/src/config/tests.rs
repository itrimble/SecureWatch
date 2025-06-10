#[cfg(test)]
mod config_tests {
    use super::*;
    use crate::validation::{InputValidator, ValidationConfig};
    use std::fs;
    use tempfile::tempdir;
    use pretty_assertions::assert_eq;
    use serial_test::serial;

    fn create_test_config() -> Config {
        Config {
            agent_id: "test-agent".to_string(),
            server_url: "https://localhost:4002".to_string(),
            api_key: "test-key".to_string(),
            batch_size: 100,
            flush_interval: std::time::Duration::from_secs(30),
            max_retries: 3,
            retry_delay: std::time::Duration::from_secs(1),
            buffer_size: 1000,
            ..Default::default()
        }
    }

    #[test]
    fn test_config_creation() {
        let config = create_test_config();
        assert_eq!(config.agent_id, "test-agent");
        assert_eq!(config.server_url, "https://localhost:4002");
        assert_eq!(config.batch_size, 100);
        assert_eq!(config.max_retries, 3);
    }

    #[test]
    fn test_config_serialization() {
        let config = create_test_config();
        let json = serde_json::to_string(&config).expect("Should serialize");
        let deserialized: Config = serde_json::from_str(&json).expect("Should deserialize");
        
        assert_eq!(config.agent_id, deserialized.agent_id);
        assert_eq!(config.server_url, deserialized.server_url);
        assert_eq!(config.batch_size, deserialized.batch_size);
    }

    #[test]
    fn test_config_validation_valid() {
        let config = create_test_config();
        assert!(config.validate().is_ok());
    }

    #[test]
    fn test_config_validation_invalid_url() {
        let mut config = create_test_config();
        config.server_url = "invalid-url".to_string();
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_config_validation_invalid_batch_size() {
        let mut config = create_test_config();
        config.batch_size = 0;
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_config_validation_invalid_buffer_size() {
        let mut config = create_test_config();
        config.buffer_size = 0;
        assert!(config.validate().is_err());
    }

    #[tokio::test]
    async fn test_config_security_validation() {
        let config = create_test_config();
        
        // Test with malicious payloads
        let mut malicious_config = config.clone();
        malicious_config.agent_id = "'; DROP TABLE users; --".to_string();
        
        assert!(malicious_config.validate_with_security().await.is_err());
    }

    #[test]
    #[serial]
    fn test_config_file_operations() {
        let dir = tempdir().expect("Should create temp dir");
        let config_path = dir.path().join("config.toml");
        
        let config = create_test_config();
        
        // Test saving
        config.save_to_file(&config_path).expect("Should save config");
        assert!(config_path.exists());
        
        // Test loading
        let loaded_config = Config::load_from_file(&config_path).expect("Should load config");
        assert_eq!(config.agent_id, loaded_config.agent_id);
        assert_eq!(config.server_url, loaded_config.server_url);
    }

    #[test]
    fn test_config_from_env() {
        std::env::set_var("SECUREWATCH_AGENT_ID", "env-agent");
        std::env::set_var("SECUREWATCH_SERVER_URL", "https://env.example.com");
        std::env::set_var("SECUREWATCH_API_KEY", "env-key");
        
        let config = Config::from_env().expect("Should create config from env");
        
        assert_eq!(config.agent_id, "env-agent");
        assert_eq!(config.server_url, "https://env.example.com");
        assert_eq!(config.api_key, "env-key");
        
        // Cleanup
        std::env::remove_var("SECUREWATCH_AGENT_ID");
        std::env::remove_var("SECUREWATCH_SERVER_URL");
        std::env::remove_var("SECUREWATCH_API_KEY");
    }

    #[test]
    fn test_transport_config_validation() {
        let mut transport_config = TransportConfig::default();
        
        // Test valid configuration
        assert!(transport_config.validate().is_ok());
        
        // Test invalid timeout
        transport_config.timeout = std::time::Duration::from_secs(0);
        assert!(transport_config.validate().is_err());
        
        // Test invalid max_body_size
        transport_config.max_body_size = 0;
        assert!(transport_config.validate().is_err());
    }

    #[test]
    fn test_collector_config_validation() {
        let file_config = FileCollectorConfig {
            paths: vec!["/var/log/*.log".to_string()],
            recursive: true,
            ..Default::default()
        };
        
        assert!(file_config.validate().is_ok());
        
        // Test empty paths
        let empty_config = FileCollectorConfig {
            paths: vec![],
            ..Default::default()
        };
        
        assert!(empty_config.validate().is_err());
    }

    #[test]
    fn test_buffer_config_validation() {
        let mut buffer_config = BufferConfig::default();
        
        // Test valid configuration
        assert!(buffer_config.validate().is_ok());
        
        // Test invalid max_size
        buffer_config.max_size = 0;
        assert!(buffer_config.validate().is_err());
        
        // Test invalid flush_threshold
        buffer_config.flush_threshold = 0;
        assert!(buffer_config.validate().is_err());
    }

    #[test]
    fn test_config_clone() {
        let config = create_test_config();
        let cloned = config.clone();
        
        assert_eq!(config.agent_id, cloned.agent_id);
        assert_eq!(config.server_url, cloned.server_url);
        assert_eq!(config.batch_size, cloned.batch_size);
    }

    #[test]
    fn test_config_debug() {
        let config = create_test_config();
        let debug_str = format!("{:?}", config);
        
        // Should contain key fields but not sensitive data
        assert!(debug_str.contains("test-agent"));
        assert!(debug_str.contains("localhost"));
        // API key should be masked
        assert!(!debug_str.contains("test-key"));
    }

    #[test]
    fn test_config_partial_eq() {
        let config1 = create_test_config();
        let config2 = create_test_config();
        let mut config3 = create_test_config();
        config3.agent_id = "different-agent".to_string();
        
        assert_eq!(config1, config2);
        assert_ne!(config1, config3);
    }

    #[test]
    fn test_config_bounds() {
        let mut config = create_test_config();
        
        // Test maximum values
        config.batch_size = u32::MAX;
        config.buffer_size = usize::MAX;
        config.max_retries = u32::MAX;
        
        // Should handle large values gracefully
        let result = config.validate();
        assert!(result.is_ok() || result.err().unwrap().to_string().contains("too large"));
    }

    #[test]
    fn test_config_edge_cases() {
        let mut config = create_test_config();
        
        // Test edge case values
        config.batch_size = 1; // Minimum valid batch size
        config.buffer_size = 1; // Minimum valid buffer size
        config.max_retries = 1; // Minimum valid retries
        
        assert!(config.validate().is_ok());
    }
}