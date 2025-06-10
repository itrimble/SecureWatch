// Comprehensive input validation and sanitization for SecureWatch Agent
// 
// This module provides enterprise-grade input validation and sanitization
// capabilities to protect against injection attacks, malformed data, and
// security vulnerabilities across all agent components.

use crate::errors::{AgentError, Result};
use regex::Regex;

#[cfg(test)]
mod tests;
use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use std::net::IpAddr;
use std::time::SystemTime;
use tracing::{debug, warn, error};

/// Maximum lengths for various input types to prevent DoS attacks
pub const MAX_STRING_LENGTH: usize = 32768;         // 32KB
pub const MAX_LOG_MESSAGE_LENGTH: usize = 1048576;  // 1MB
pub const MAX_FIELD_NAME_LENGTH: usize = 256;
pub const MAX_FIELD_VALUE_LENGTH: usize = 65536;    // 64KB
pub const MAX_URL_LENGTH: usize = 2048;
pub const MAX_EMAIL_LENGTH: usize = 254;
pub const MAX_HOSTNAME_LENGTH: usize = 253;
pub const MAX_PATH_LENGTH: usize = 4096;
pub const MAX_JSON_DEPTH: usize = 32;
pub const MAX_ARRAY_LENGTH: usize = 10000;

/// Security risk levels for validation failures
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum ValidationRiskLevel {
    Low,       // Minor format issues
    Medium,    // Potential security implications
    High,      // Clear security risk
    Critical,  // Immediate security threat
}

/// Validation result with detailed context
#[derive(Debug, Clone)]
pub struct ValidationResult {
    pub is_valid: bool,
    pub sanitized_value: Option<String>,
    pub risk_level: ValidationRiskLevel,
    pub violations: Vec<ValidationViolation>,
    pub metadata: HashMap<String, String>,
}

/// Detailed validation violation information
#[derive(Debug, Clone)]
pub struct ValidationViolation {
    pub rule_name: String,
    pub violation_type: ViolationType,
    pub description: String,
    pub detected_pattern: Option<String>,
    pub position: Option<usize>,
    pub severity: ValidationRiskLevel,
}

/// Types of validation violations
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ViolationType {
    LengthViolation,
    FormatViolation,
    InjectionAttempt,
    MaliciousPattern,
    EncodingViolation,
    CharacterViolation,
    StructureViolation,
    SecurityViolation,
}

/// Input validation and sanitization engine
pub struct InputValidator {
    config: ValidationConfig,
    sql_injection_patterns: Vec<Regex>,
    xss_patterns: Vec<Regex>,
    command_injection_patterns: Vec<Regex>,
    path_traversal_patterns: Vec<Regex>,
    ldap_injection_patterns: Vec<Regex>,
    xml_injection_patterns: Vec<Regex>,
    log_injection_patterns: Vec<Regex>,
    dangerous_file_patterns: Vec<Regex>,
    stats: ValidationStats,
}

/// Configuration for input validation
#[derive(Debug, Clone)]
pub struct ValidationConfig {
    pub strict_mode: bool,
    pub auto_sanitize: bool,
    pub block_suspicious_patterns: bool,
    pub log_violations: bool,
    pub max_string_length: usize,
    pub max_array_length: usize,
    pub max_json_depth: usize,
    pub allowed_encodings: Vec<String>,
    pub blocked_file_extensions: Vec<String>,
    pub trusted_domains: Vec<String>,
    pub enable_content_scanning: bool,
    pub quarantine_suspicious_input: bool,
}

/// Validation statistics for monitoring
#[derive(Debug, Clone, Default)]
pub struct ValidationStats {
    pub total_validations: u64,
    pub successful_validations: u64,
    pub failed_validations: u64,
    pub sanitizations_performed: u64,
    pub injection_attempts_blocked: u64,
    pub malicious_patterns_detected: u64,
    pub quarantined_inputs: u64,
    pub start_time: Option<SystemTime>,
}

impl Default for ValidationConfig {
    fn default() -> Self {
        Self {
            strict_mode: true,
            auto_sanitize: true,
            block_suspicious_patterns: true,
            log_violations: true,
            max_string_length: MAX_STRING_LENGTH,
            max_array_length: MAX_ARRAY_LENGTH,
            max_json_depth: MAX_JSON_DEPTH,
            allowed_encodings: vec!["utf-8".to_string(), "ascii".to_string()],
            blocked_file_extensions: vec![
                "exe".to_string(), "bat".to_string(), "cmd".to_string(), 
                "com".to_string(), "scr".to_string(), "pif".to_string(),
                "vbs".to_string(), "js".to_string(), "jar".to_string(),
                "ps1".to_string(), "sh".to_string(), "bin".to_string(),
            ],
            trusted_domains: vec![],
            enable_content_scanning: true,
            quarantine_suspicious_input: true,
        }
    }
}

impl InputValidator {
    /// Create a new input validator with comprehensive security patterns
    pub fn new(config: ValidationConfig) -> Result<Self> {
        debug!("🔒 Initializing input validator with comprehensive security patterns");
        
        // SQL injection patterns - comprehensive coverage
        let sql_injection_patterns = Self::compile_patterns(&[
            r"(?i)(\b(select|insert|update|delete|drop|create|alter|exec|execute|union|script)\b)",
            r"(?i)(--|/\*|\*/|;)",
            r"(?i)(\b(or|and)\s+\d+\s*=\s*\d+)",
            r"(?i)(\b(or|and)\s+'[^']*'\s*=\s*'[^']*')",
            r"(?i)(union\s+(all\s+)?select)",
            r"(?i)(exec\s*\()",
            r"(?i)(sp_executesql)",
            r"(?i)(xp_cmdshell)",
            r"(?i)(information_schema)",
            r"(?i)(@@version|@@servername)",
            r"(?i)(waitfor\s+delay)",
            r"(?i)(benchmark\s*\()",
            r"(?i)(sleep\s*\()",
        ])?;
        
        // XSS (Cross-Site Scripting) patterns
        let xss_patterns = Self::compile_patterns(&[
            r"(?i)(<script[^>]*>.*?</script>)",
            r"(?i)(<iframe[^>]*>.*?</iframe>)",
            r"(?i)(javascript:)",
            r"(?i)(on\w+\s*=)",
            r"(?i)(<img[^>]+src[^>]*>)",
            r"(?i)(<object[^>]*>.*?</object>)",
            r"(?i)(<embed[^>]*>)",
            r"(?i)(<form[^>]*>.*?</form>)",
            r"(?i)(eval\s*\()",
            r"(?i)(document\.cookie)",
            r"(?i)(document\.write)",
            r"(?i)(window\.location)",
            r"(?i)(alert\s*\()",
            r"(?i)(prompt\s*\()",
            r"(?i)(confirm\s*\()",
        ])?;
        
        // Command injection patterns
        let command_injection_patterns = Self::compile_patterns(&[
            r"(?i)(\||&|;|`|\$\(|\$\{)",
            r"(?i)(cmd\.exe|powershell|bash|sh|zsh|fish)",
            r"(?i)(system\s*\()",
            r"(?i)(exec\s*\()",
            r"(?i)(passthru\s*\()",
            r"(?i)(shell_exec\s*\()",
            r"(?i)(popen\s*\()",
            r"(?i)(proc_open\s*\()",
            r"(?i)(rm\s+-rf|del\s+/f)",
            r"(?i)(wget|curl|nc|netcat)",
            r"(?i)(chmod\s+777)",
            r"(?i)(/etc/passwd|/etc/shadow)",
            r"(?i)(sudo\s+)",
        ])?;
        
        // Path traversal patterns
        let path_traversal_patterns = Self::compile_patterns(&[
            r"(\.\./|\.\.\|\.\.%2f|\.\.%5c)",
            r"(%2e%2e%2f|%2e%2e%5c)",
            r"(\.\.\\|\.\.\/)",
            r"(%2e%2e/|%2e%2e\\)",
            r"(..%c0%af|..%c1%9c)",
            r"(\.%00\.)",
            r"(%00\.\.)",
            r"(\x00\.\.)",
        ])?;
        
        // LDAP injection patterns
        let ldap_injection_patterns = Self::compile_patterns(&[
            r"(\(\||\)|\*|\x00)",
            r"(\&\(|\|\()",
            r"(\)\(\|)",
            r"(\*\)\(\&)",
            r"(\(\&\(\|)",
        ])?;
        
        // XML injection patterns
        let xml_injection_patterns = Self::compile_patterns(&[
            r"(?i)(<!entity|<!doctype)",
            r"(?i)(&\w+;)",
            r"(?i)(]]>|<!\[cdata\[)",
            r"(?i)(<\?xml)",
            r"(?i)(xmlns:)",
        ])?;
        
        // Log injection patterns (CRLF injection, log forging)
        let log_injection_patterns = Self::compile_patterns(&[
            r"(\r\n|\n\r|\r|\n)",
            r"(%0d%0a|%0a%0d|%0d|%0a)",
            r"(\x0d\x0a|\x0a\x0d|\x0d|\x0a)",
            r"(\\r\\n|\\n\\r|\\r|\\n)",
        ])?;
        
        // Dangerous file patterns
        let dangerous_file_patterns = Self::compile_patterns(&[
            r"(?i)\.(exe|bat|cmd|com|scr|pif|vbs|js|jar|ps1|sh|bin)$",
            r"(?i)\.(php|asp|aspx|jsp|jspx)$",
            r"(?i)\.htaccess$",
            r"(?i)\.htpasswd$",
            r"(?i)\.(config|conf)$",
        ])?;
        
        let stats = ValidationStats {
            start_time: Some(SystemTime::now()),
            ..Default::default()
        };
        
        debug!("✅ Input validator initialized with {} security pattern categories", 8);
        
        Ok(Self {
            config,
            sql_injection_patterns,
            xss_patterns,
            command_injection_patterns,
            path_traversal_patterns,
            ldap_injection_patterns,
            xml_injection_patterns,
            log_injection_patterns,
            dangerous_file_patterns,
            stats,
        })
    }
    
    /// Compile a list of regex patterns for security detection
    fn compile_patterns(patterns: &[&str]) -> Result<Vec<Regex>> {
        let mut compiled = Vec::new();
        for pattern in patterns {
            match Regex::new(pattern) {
                Ok(regex) => compiled.push(regex),
                Err(e) => {
                    error!("❌ Failed to compile security pattern: {} - {}", pattern, e);
                    return Err(AgentError::Configuration(
                        format!("Invalid security pattern: {}", e)
                    ));
                }
            }
        }
        Ok(compiled)
    }
    
    /// Validate and sanitize a generic string input
    pub async fn validate_string(&mut self, input: &str, context: &str) -> ValidationResult {
        self.stats.total_validations += 1;
        
        let mut violations = Vec::new();
        let mut risk_level = ValidationRiskLevel::Low;
        let mut sanitized = input.to_string();
        let mut metadata = HashMap::new();
        
        metadata.insert("context".to_string(), context.to_string());
        metadata.insert("original_length".to_string(), input.len().to_string());
        
        // Length validation
        if input.len() > self.config.max_string_length {
            violations.push(ValidationViolation {
                rule_name: "max_length".to_string(),
                violation_type: ViolationType::LengthViolation,
                description: format!("Input exceeds maximum length of {} characters", self.config.max_string_length),
                detected_pattern: None,
                position: Some(self.config.max_string_length),
                severity: ValidationRiskLevel::Medium,
            });
            
            if self.config.auto_sanitize {
                sanitized.truncate(self.config.max_string_length);
                metadata.insert("truncated".to_string(), "true".to_string());
            }
            risk_level = ValidationRiskLevel::Medium;
        }
        
        // Security pattern detection
        self.detect_security_violations(&input, &mut violations, &mut risk_level);
        
        // Character encoding validation
        if !input.is_ascii() && !self.config.allowed_encodings.contains(&"utf-8".to_string()) {
            violations.push(ValidationViolation {
                rule_name: "encoding_validation".to_string(),
                violation_type: ViolationType::EncodingViolation,
                description: "Non-ASCII characters detected but not allowed".to_string(),
                detected_pattern: None,
                position: None,
                severity: ValidationRiskLevel::Medium,
            });
            risk_level = std::cmp::max(risk_level, ValidationRiskLevel::Medium);
        }
        
        // Control character detection
        if input.chars().any(|c| c.is_control() && c != '\t' && c != '\n' && c != '\r') {
            violations.push(ValidationViolation {
                rule_name: "control_characters".to_string(),
                violation_type: ViolationType::CharacterViolation,
                description: "Control characters detected".to_string(),
                detected_pattern: None,
                position: None,
                severity: ValidationRiskLevel::High,
            });
            risk_level = std::cmp::max(risk_level, ValidationRiskLevel::High);
            
            if self.config.auto_sanitize {
                sanitized = sanitized.chars()
                    .filter(|c| !c.is_control() || *c == '\t' || *c == '\n' || *c == '\r')
                    .collect();
                metadata.insert("control_chars_removed".to_string(), "true".to_string());
            }
        }
        
        // Update statistics
        if violations.is_empty() {
            self.stats.successful_validations += 1;
        } else {
            self.stats.failed_validations += 1;
            
            if violations.iter().any(|v| matches!(v.violation_type, ViolationType::InjectionAttempt)) {
                self.stats.injection_attempts_blocked += 1;
            }
            
            if violations.iter().any(|v| matches!(v.violation_type, ViolationType::MaliciousPattern)) {
                self.stats.malicious_patterns_detected += 1;
            }
        }
        
        if self.config.auto_sanitize && sanitized != input {
            self.stats.sanitizations_performed += 1;
        }
        
        // Log violations if enabled
        if self.config.log_violations && !violations.is_empty() {
            self.log_violations(context, &input, &violations, &risk_level);
        }
        
        // Quarantine highly suspicious input
        let should_quarantine = matches!(risk_level, ValidationRiskLevel::Critical) 
            && self.config.quarantine_suspicious_input;
        
        if should_quarantine {
            self.stats.quarantined_inputs += 1;
            metadata.insert("quarantined".to_string(), "true".to_string());
        }
        
        ValidationResult {
            is_valid: violations.is_empty() || (!self.config.strict_mode && risk_level < ValidationRiskLevel::High),
            sanitized_value: if self.config.auto_sanitize { Some(sanitized) } else { None },
            risk_level,
            violations,
            metadata,
        }
    }
    
    /// Detect various security violation patterns
    fn detect_security_violations(&self, input: &str, violations: &mut Vec<ValidationViolation>, risk_level: &mut ValidationRiskLevel) {
        // SQL injection detection
        for pattern in &self.sql_injection_patterns {
            if let Some(matches) = pattern.find(input) {
                violations.push(ValidationViolation {
                    rule_name: "sql_injection".to_string(),
                    violation_type: ViolationType::InjectionAttempt,
                    description: "Potential SQL injection attempt detected".to_string(),
                    detected_pattern: Some(matches.as_str().to_string()),
                    position: Some(matches.start()),
                    severity: ValidationRiskLevel::Critical,
                });
                *risk_level = ValidationRiskLevel::Critical;
            }
        }
        
        // XSS detection
        for pattern in &self.xss_patterns {
            if let Some(matches) = pattern.find(input) {
                violations.push(ValidationViolation {
                    rule_name: "xss_injection".to_string(),
                    violation_type: ViolationType::InjectionAttempt,
                    description: "Potential XSS attempt detected".to_string(),
                    detected_pattern: Some(matches.as_str().to_string()),
                    position: Some(matches.start()),
                    severity: ValidationRiskLevel::Critical,
                });
                *risk_level = ValidationRiskLevel::Critical;
            }
        }
        
        // Command injection detection
        for pattern in &self.command_injection_patterns {
            if let Some(matches) = pattern.find(input) {
                violations.push(ValidationViolation {
                    rule_name: "command_injection".to_string(),
                    violation_type: ViolationType::InjectionAttempt,
                    description: "Potential command injection attempt detected".to_string(),
                    detected_pattern: Some(matches.as_str().to_string()),
                    position: Some(matches.start()),
                    severity: ValidationRiskLevel::Critical,
                });
                *risk_level = ValidationRiskLevel::Critical;
            }
        }
        
        // Path traversal detection
        for pattern in &self.path_traversal_patterns {
            if let Some(matches) = pattern.find(input) {
                violations.push(ValidationViolation {
                    rule_name: "path_traversal".to_string(),
                    violation_type: ViolationType::SecurityViolation,
                    description: "Potential path traversal attempt detected".to_string(),
                    detected_pattern: Some(matches.as_str().to_string()),
                    position: Some(matches.start()),
                    severity: ValidationRiskLevel::High,
                });
                *risk_level = std::cmp::max(*risk_level, ValidationRiskLevel::High);
            }
        }
        
        // LDAP injection detection
        for pattern in &self.ldap_injection_patterns {
            if let Some(matches) = pattern.find(input) {
                violations.push(ValidationViolation {
                    rule_name: "ldap_injection".to_string(),
                    violation_type: ViolationType::InjectionAttempt,
                    description: "Potential LDAP injection attempt detected".to_string(),
                    detected_pattern: Some(matches.as_str().to_string()),
                    position: Some(matches.start()),
                    severity: ValidationRiskLevel::High,
                });
                *risk_level = std::cmp::max(*risk_level, ValidationRiskLevel::High);
            }
        }
        
        // Log injection detection
        for pattern in &self.log_injection_patterns {
            if let Some(matches) = pattern.find(input) {
                violations.push(ValidationViolation {
                    rule_name: "log_injection".to_string(),
                    violation_type: ViolationType::InjectionAttempt,
                    description: "Potential log injection/CRLF injection detected".to_string(),
                    detected_pattern: Some(matches.as_str().to_string()),
                    position: Some(matches.start()),
                    severity: ValidationRiskLevel::Medium,
                });
                *risk_level = std::cmp::max(*risk_level, ValidationRiskLevel::Medium);
            }
        }
    }
    
    /// Log validation violations for security monitoring
    fn log_violations(&self, context: &str, input: &str, violations: &[ValidationViolation], risk_level: &ValidationRiskLevel) {
        for violation in violations {
            match violation.severity {
                ValidationRiskLevel::Critical => {
                    error!("🚨 CRITICAL validation violation in {}: {} - Pattern: {:?} - Input length: {}", 
                           context, violation.description, violation.detected_pattern, input.len());
                }
                ValidationRiskLevel::High => {
                    warn!("⚠️ HIGH risk validation violation in {}: {} - Pattern: {:?}", 
                          context, violation.description, violation.detected_pattern);
                }
                ValidationRiskLevel::Medium => {
                    warn!("⚠️ MEDIUM risk validation violation in {}: {}", 
                          context, violation.description);
                }
                ValidationRiskLevel::Low => {
                    debug!("ℹ️ LOW risk validation violation in {}: {}", 
                           context, violation.description);
                }
            }
        }
    }
    
    /// Validate URL input with comprehensive security checks
    pub async fn validate_url(&mut self, url: &str) -> ValidationResult {
        let mut violations = Vec::new();
        let mut risk_level = ValidationRiskLevel::Low;
        let mut metadata = HashMap::new();
        
        metadata.insert("input_type".to_string(), "url".to_string());
        
        // Length check
        if url.len() > MAX_URL_LENGTH {
            violations.push(ValidationViolation {
                rule_name: "url_max_length".to_string(),
                violation_type: ViolationType::LengthViolation,
                description: "URL exceeds maximum allowed length".to_string(),
                detected_pattern: None,
                position: Some(MAX_URL_LENGTH),
                severity: ValidationRiskLevel::Medium,
            });
            risk_level = ValidationRiskLevel::Medium;
        }
        
        // URL parsing validation
        match url::Url::parse(url) {
            Ok(parsed_url) => {
                metadata.insert("scheme".to_string(), parsed_url.scheme().to_string());
                
                // Scheme validation
                match parsed_url.scheme() {
                    "http" | "https" => {
                        // Valid schemes
                    }
                    "ftp" | "ftps" => {
                        violations.push(ValidationViolation {
                            rule_name: "suspicious_scheme".to_string(),
                            violation_type: ViolationType::SecurityViolation,
                            description: "FTP scheme detected - potential security risk".to_string(),
                            detected_pattern: Some(parsed_url.scheme().to_string()),
                            position: None,
                            severity: ValidationRiskLevel::Medium,
                        });
                        risk_level = std::cmp::max(risk_level, ValidationRiskLevel::Medium);
                    }
                    "file" | "javascript" | "data" => {
                        violations.push(ValidationViolation {
                            rule_name: "dangerous_scheme".to_string(),
                            violation_type: ViolationType::SecurityViolation,
                            description: "Dangerous URL scheme detected".to_string(),
                            detected_pattern: Some(parsed_url.scheme().to_string()),
                            position: None,
                            severity: ValidationRiskLevel::High,
                        });
                        risk_level = ValidationRiskLevel::High;
                    }
                    _ => {
                        violations.push(ValidationViolation {
                            rule_name: "unknown_scheme".to_string(),
                            violation_type: ViolationType::SecurityViolation,
                            description: "Unknown or unusual URL scheme".to_string(),
                            detected_pattern: Some(parsed_url.scheme().to_string()),
                            position: None,
                            severity: ValidationRiskLevel::Medium,
                        });
                        risk_level = std::cmp::max(risk_level, ValidationRiskLevel::Medium);
                    }
                }
                
                // Domain validation
                if let Some(host) = parsed_url.host_str() {
                    metadata.insert("host".to_string(), host.to_string());
                    
                    // Check against trusted domains if configured
                    if !self.config.trusted_domains.is_empty() 
                        && !self.config.trusted_domains.iter().any(|domain| host.ends_with(domain)) {
                        violations.push(ValidationViolation {
                            rule_name: "untrusted_domain".to_string(),
                            violation_type: ViolationType::SecurityViolation,
                            description: "Domain not in trusted domains list".to_string(),
                            detected_pattern: Some(host.to_string()),
                            position: None,
                            severity: ValidationRiskLevel::Medium,
                        });
                        risk_level = std::cmp::max(risk_level, ValidationRiskLevel::Medium);
                    }
                    
                    // IP address detection
                    if host.parse::<IpAddr>().is_ok() {
                        violations.push(ValidationViolation {
                            rule_name: "ip_address_host".to_string(),
                            violation_type: ViolationType::SecurityViolation,
                            description: "Direct IP address in URL - potential security risk".to_string(),
                            detected_pattern: Some(host.to_string()),
                            position: None,
                            severity: ValidationRiskLevel::Medium,
                        });
                        risk_level = std::cmp::max(risk_level, ValidationRiskLevel::Medium);
                    }
                    
                    // Private IP ranges detection
                    if let Ok(ip) = host.parse::<IpAddr>() {
                        if self.is_private_ip(&ip) {
                            violations.push(ValidationViolation {
                                rule_name: "private_ip_address".to_string(),
                                violation_type: ViolationType::SecurityViolation,
                                description: "Private IP address detected".to_string(),
                                detected_pattern: Some(host.to_string()),
                                position: None,
                                severity: ValidationRiskLevel::High,
                            });
                            risk_level = ValidationRiskLevel::High;
                        }
                    }
                }
                
                // Path validation for directory traversal
                let path = parsed_url.path();
                if path.contains("..") || path.contains("%2e%2e") {
                    violations.push(ValidationViolation {
                        rule_name: "path_traversal_url".to_string(),
                        violation_type: ViolationType::SecurityViolation,
                        description: "Path traversal attempt in URL path".to_string(),
                        detected_pattern: Some(path.to_string()),
                        position: None,
                        severity: ValidationRiskLevel::High,
                    });
                    risk_level = ValidationRiskLevel::High;
                }
            }
            Err(_) => {
                violations.push(ValidationViolation {
                    rule_name: "invalid_url_format".to_string(),
                    violation_type: ViolationType::FormatViolation,
                    description: "Invalid URL format".to_string(),
                    detected_pattern: None,
                    position: None,
                    severity: ValidationRiskLevel::Medium,
                });
                risk_level = ValidationRiskLevel::Medium;
            }
        }
        
        ValidationResult {
            is_valid: violations.is_empty() || (!self.config.strict_mode && risk_level < ValidationRiskLevel::High),
            sanitized_value: None,
            risk_level,
            violations,
            metadata,
        }
    }
    
    /// Check if an IP address is in private ranges
    fn is_private_ip(&self, ip: &IpAddr) -> bool {
        match ip {
            IpAddr::V4(ipv4) => {
                let octets = ipv4.octets();
                matches!(octets[0], 10) ||                                    // 10.0.0.0/8
                (octets[0] == 172 && (16..=31).contains(&octets[1])) ||      // 172.16.0.0/12
                (octets[0] == 192 && octets[1] == 168) ||                    // 192.168.0.0/16
                (octets[0] == 127) ||                                        // 127.0.0.0/8 (loopback)
                (octets[0] == 169 && octets[1] == 254)                       // 169.254.0.0/16 (link-local)
            }
            IpAddr::V6(ipv6) => {
                ipv6.is_loopback() || 
                ipv6.is_unspecified() ||
                (ipv6.segments()[0] & 0xfe00) == 0xfc00 ||  // fc00::/7 (Unique Local)
                (ipv6.segments()[0] & 0xffc0) == 0xfe80     // fe80::/10 (Link Local)
            }
        }
    }
    
    /// Validate email address format
    pub async fn validate_email(&mut self, email: &str) -> ValidationResult {
        let mut violations = Vec::new();
        let mut risk_level = ValidationRiskLevel::Low;
        let mut metadata = HashMap::new();
        
        metadata.insert("input_type".to_string(), "email".to_string());
        
        // Length check
        if email.len() > MAX_EMAIL_LENGTH {
            violations.push(ValidationViolation {
                rule_name: "email_max_length".to_string(),
                violation_type: ViolationType::LengthViolation,
                description: "Email exceeds maximum allowed length".to_string(),
                detected_pattern: None,
                position: Some(MAX_EMAIL_LENGTH),
                severity: ValidationRiskLevel::Medium,
            });
            risk_level = ValidationRiskLevel::Medium;
        }
        
        // Basic email format validation
        let email_regex = Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$").unwrap();
        if !email_regex.is_match(email) {
            violations.push(ValidationViolation {
                rule_name: "invalid_email_format".to_string(),
                violation_type: ViolationType::FormatViolation,
                description: "Invalid email format".to_string(),
                detected_pattern: None,
                position: None,
                severity: ValidationRiskLevel::Medium,
            });
            risk_level = ValidationRiskLevel::Medium;
        }
        
        // Additional security checks for emails
        if email.contains("..") || email.starts_with('.') || email.ends_with('.') {
            violations.push(ValidationViolation {
                rule_name: "suspicious_email_format".to_string(),
                violation_type: ViolationType::SecurityViolation,
                description: "Suspicious email format detected".to_string(),
                detected_pattern: None,
                position: None,
                severity: ValidationRiskLevel::Medium,
            });
            risk_level = std::cmp::max(risk_level, ValidationRiskLevel::Medium);
        }
        
        ValidationResult {
            is_valid: violations.is_empty() || (!self.config.strict_mode && risk_level < ValidationRiskLevel::High),
            sanitized_value: None,
            risk_level,
            violations,
            metadata,
        }
    }
    
    /// Validate file path for security issues
    pub async fn validate_file_path(&mut self, path: &str) -> ValidationResult {
        let mut violations = Vec::new();
        let mut risk_level = ValidationRiskLevel::Low;
        let mut metadata = HashMap::new();
        
        metadata.insert("input_type".to_string(), "file_path".to_string());
        
        // Length check
        if path.len() > MAX_PATH_LENGTH {
            violations.push(ValidationViolation {
                rule_name: "path_max_length".to_string(),
                violation_type: ViolationType::LengthViolation,
                description: "File path exceeds maximum allowed length".to_string(),
                detected_pattern: None,
                position: Some(MAX_PATH_LENGTH),
                severity: ValidationRiskLevel::Medium,
            });
            risk_level = ValidationRiskLevel::Medium;
        }
        
        // Path traversal detection
        if path.contains("..") || path.contains("%2e%2e") || path.contains("\\..\\") {
            violations.push(ValidationViolation {
                rule_name: "path_traversal".to_string(),
                violation_type: ViolationType::SecurityViolation,
                description: "Path traversal attempt detected".to_string(),
                detected_pattern: Some("..".to_string()),
                position: None,
                severity: ValidationRiskLevel::High,
            });
            risk_level = ValidationRiskLevel::High;
        }
        
        // Dangerous file extension detection
        for pattern in &self.dangerous_file_patterns {
            if pattern.is_match(path) {
                violations.push(ValidationViolation {
                    rule_name: "dangerous_file_extension".to_string(),
                    violation_type: ViolationType::SecurityViolation,
                    description: "Dangerous file extension detected".to_string(),
                    detected_pattern: Some(pattern.as_str().to_string()),
                    position: None,
                    severity: ValidationRiskLevel::High,
                });
                risk_level = ValidationRiskLevel::High;
                break;
            }
        }
        
        // Null byte detection
        if path.contains('\0') || path.contains("%00") {
            violations.push(ValidationViolation {
                rule_name: "null_byte_injection".to_string(),
                violation_type: ViolationType::InjectionAttempt,
                description: "Null byte injection attempt detected".to_string(),
                detected_pattern: None,
                position: None,
                severity: ValidationRiskLevel::Critical,
            });
            risk_level = ValidationRiskLevel::Critical;
        }
        
        ValidationResult {
            is_valid: violations.is_empty() || (!self.config.strict_mode && risk_level < ValidationRiskLevel::High),
            sanitized_value: None,
            risk_level,
            violations,
            metadata,
        }
    }
    
    /// Validate JSON structure and content
    pub async fn validate_json(&mut self, json_str: &str) -> ValidationResult {
        let mut violations = Vec::new();
        let mut risk_level = ValidationRiskLevel::Low;
        let mut metadata = HashMap::new();
        
        metadata.insert("input_type".to_string(), "json".to_string());
        
        // Basic string validation first
        let string_result = self.validate_string(json_str, "json_content").await;
        violations.extend(string_result.violations);
        risk_level = std::cmp::max(risk_level, string_result.risk_level);
        
        // JSON parsing validation
        match serde_json::from_str::<serde_json::Value>(json_str) {
            Ok(json_value) => {
                metadata.insert("valid_json".to_string(), "true".to_string());
                
                // Check JSON depth to prevent DoS
                let depth = self.calculate_json_depth(&json_value);
                metadata.insert("json_depth".to_string(), depth.to_string());
                
                if depth > self.config.max_json_depth {
                    violations.push(ValidationViolation {
                        rule_name: "json_depth_limit".to_string(),
                        violation_type: ViolationType::StructureViolation,
                        description: format!("JSON depth {} exceeds maximum allowed depth {}", depth, self.config.max_json_depth),
                        detected_pattern: None,
                        position: None,
                        severity: ValidationRiskLevel::Medium,
                    });
                    risk_level = std::cmp::max(risk_level, ValidationRiskLevel::Medium);
                }
                
                // Validate JSON content recursively
                self.validate_json_content(&json_value, &mut violations, &mut risk_level, 0);
            }
            Err(e) => {
                violations.push(ValidationViolation {
                    rule_name: "invalid_json_format".to_string(),
                    violation_type: ViolationType::FormatViolation,
                    description: format!("Invalid JSON format: {}", e),
                    detected_pattern: None,
                    position: None,
                    severity: ValidationRiskLevel::Medium,
                });
                risk_level = std::cmp::max(risk_level, ValidationRiskLevel::Medium);
                metadata.insert("valid_json".to_string(), "false".to_string());
            }
        }
        
        ValidationResult {
            is_valid: violations.is_empty() || (!self.config.strict_mode && risk_level < ValidationRiskLevel::High),
            sanitized_value: None,
            risk_level,
            violations,
            metadata,
        }
    }
    
    /// Calculate JSON nesting depth
    fn calculate_json_depth(&self, value: &serde_json::Value) -> usize {
        match value {
            serde_json::Value::Object(map) => {
                1 + map.values().map(|v| self.calculate_json_depth(v)).max().unwrap_or(0)
            }
            serde_json::Value::Array(arr) => {
                1 + arr.iter().map(|v| self.calculate_json_depth(v)).max().unwrap_or(0)
            }
            _ => 0,
        }
    }
    
    /// Recursively validate JSON content for security issues
    fn validate_json_content(&self, value: &serde_json::Value, violations: &mut Vec<ValidationViolation>, risk_level: &mut ValidationRiskLevel, depth: usize) {
        match value {
            serde_json::Value::String(s) => {
                // Check string values for injection patterns
                for pattern in &self.sql_injection_patterns {
                    if pattern.is_match(s) {
                        violations.push(ValidationViolation {
                            rule_name: "json_sql_injection".to_string(),
                            violation_type: ViolationType::InjectionAttempt,
                            description: "Potential SQL injection in JSON string value".to_string(),
                            detected_pattern: Some(s.clone()),
                            position: None,
                            severity: ValidationRiskLevel::Critical,
                        });
                        *risk_level = ValidationRiskLevel::Critical;
                    }
                }
                
                for pattern in &self.xss_patterns {
                    if pattern.is_match(s) {
                        violations.push(ValidationViolation {
                            rule_name: "json_xss_injection".to_string(),
                            violation_type: ViolationType::InjectionAttempt,
                            description: "Potential XSS in JSON string value".to_string(),
                            detected_pattern: Some(s.clone()),
                            position: None,
                            severity: ValidationRiskLevel::Critical,
                        });
                        *risk_level = ValidationRiskLevel::Critical;
                    }
                }
            }
            serde_json::Value::Object(map) => {
                if map.len() > self.config.max_array_length {
                    violations.push(ValidationViolation {
                        rule_name: "json_object_size".to_string(),
                        violation_type: ViolationType::StructureViolation,
                        description: format!("JSON object size {} exceeds maximum {}", map.len(), self.config.max_array_length),
                        detected_pattern: None,
                        position: None,
                        severity: ValidationRiskLevel::Medium,
                    });
                    *risk_level = std::cmp::max(*risk_level, ValidationRiskLevel::Medium);
                }
                
                for (key, val) in map {
                    // Validate object keys
                    for pattern in &self.sql_injection_patterns {
                        if pattern.is_match(key) {
                            violations.push(ValidationViolation {
                                rule_name: "json_key_injection".to_string(),
                                violation_type: ViolationType::InjectionAttempt,
                                description: "Potential injection in JSON object key".to_string(),
                                detected_pattern: Some(key.clone()),
                                position: None,
                                severity: ValidationRiskLevel::High,
                            });
                            *risk_level = std::cmp::max(*risk_level, ValidationRiskLevel::High);
                        }
                    }
                    
                    // Recursively validate values
                    self.validate_json_content(val, violations, risk_level, depth + 1);
                }
            }
            serde_json::Value::Array(arr) => {
                if arr.len() > self.config.max_array_length {
                    violations.push(ValidationViolation {
                        rule_name: "json_array_size".to_string(),
                        violation_type: ViolationType::StructureViolation,
                        description: format!("JSON array size {} exceeds maximum {}", arr.len(), self.config.max_array_length),
                        detected_pattern: None,
                        position: None,
                        severity: ValidationRiskLevel::Medium,
                    });
                    *risk_level = std::cmp::max(*risk_level, ValidationRiskLevel::Medium);
                }
                
                for item in arr {
                    self.validate_json_content(item, violations, risk_level, depth + 1);
                }
            }
            _ => {
                // Primitive values (null, bool, number) are generally safe
            }
        }
    }
    
    /// Get current validation statistics
    pub fn get_stats(&self) -> ValidationStats {
        self.stats.clone()
    }
    
    /// Reset validation statistics
    pub fn reset_stats(&mut self) {
        self.stats = ValidationStats {
            start_time: Some(SystemTime::now()),
            ..Default::default()
        };
    }
    
    /// Update validation configuration
    pub fn update_config(&mut self, new_config: ValidationConfig) {
        self.config = new_config;
        debug!("🔧 Validation configuration updated");
    }
}

/// Specialized validator for log messages with enhanced security
pub struct LogMessageValidator {
    base_validator: InputValidator,
    max_message_length: usize,
    suspicious_patterns: Vec<Regex>,
}

impl LogMessageValidator {
    pub fn new(config: ValidationConfig) -> Result<Self> {
        let base_validator = InputValidator::new(config)?;
        
        // Patterns specific to log message security
        let suspicious_patterns = InputValidator::compile_patterns(&[
            r"(?i)(password|passwd|pwd)\s*[:=]\s*\S+",     // Password exposure
            r"(?i)(api[-_]?key|token|secret)\s*[:=]\s*\S+", // API key exposure
            r"(?i)(credit[-_]?card|ssn|social[-_]?security)", // PII
            r"\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b", // Credit card patterns
            r"\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b",           // SSN patterns
        ])?;
        
        Ok(Self {
            base_validator,
            max_message_length: MAX_LOG_MESSAGE_LENGTH,
            suspicious_patterns,
        })
    }
    
    pub async fn validate_log_message(&mut self, message: &str, source: &str) -> ValidationResult {
        let mut result = self.base_validator.validate_string(message, &format!("log_message:{}", source)).await;
        
        // Additional log-specific validations
        if message.len() > self.max_message_length {
            result.violations.push(ValidationViolation {
                rule_name: "log_message_max_length".to_string(),
                violation_type: ViolationType::LengthViolation,
                description: format!("Log message exceeds maximum length of {} characters", self.max_message_length),
                detected_pattern: None,
                position: Some(self.max_message_length),
                severity: ValidationRiskLevel::Medium,
            });
        }
        
        // Check for sensitive data exposure
        for pattern in &self.suspicious_patterns {
            if let Some(matches) = pattern.find(message) {
                result.violations.push(ValidationViolation {
                    rule_name: "sensitive_data_exposure".to_string(),
                    violation_type: ViolationType::SecurityViolation,
                    description: "Potential sensitive data exposure in log message".to_string(),
                    detected_pattern: Some("[REDACTED]".to_string()), // Don't expose the actual match
                    position: Some(matches.start()),
                    severity: ValidationRiskLevel::High,
                });
                result.risk_level = std::cmp::max(result.risk_level, ValidationRiskLevel::High);
            }
        }
        
        result
    }
}

/// Validator for configuration values with enhanced security
pub struct ConfigurationValidator {
    base_validator: InputValidator,
}

impl ConfigurationValidator {
    pub fn new(config: ValidationConfig) -> Result<Self> {
        let base_validator = InputValidator::new(config)?;
        Ok(Self { base_validator })
    }
    
    pub async fn validate_config_string(&mut self, value: &str, key: &str) -> ValidationResult {
        let context = format!("config:{}", key);
        let mut result = self.base_validator.validate_string(value, &context).await;
        
        // Configuration-specific validations
        match key {
            k if k.contains("password") || k.contains("secret") || k.contains("key") => {
                // Validate security-sensitive configuration values
                if value.len() < 8 {
                    result.violations.push(ValidationViolation {
                        rule_name: "weak_security_value".to_string(),
                        violation_type: ViolationType::SecurityViolation,
                        description: "Security-sensitive configuration value is too short".to_string(),
                        detected_pattern: None,
                        position: None,
                        severity: ValidationRiskLevel::High,
                    });
                    result.risk_level = std::cmp::max(result.risk_level, ValidationRiskLevel::High);
                }
                
                if value == "default" || value == "changeme" || value == "admin" {
                    result.violations.push(ValidationViolation {
                        rule_name: "default_security_value".to_string(),
                        violation_type: ViolationType::SecurityViolation,
                        description: "Security-sensitive configuration uses default value".to_string(),
                        detected_pattern: Some(value.to_string()),
                        position: None,
                        severity: ValidationRiskLevel::Critical,
                    });
                    result.risk_level = ValidationRiskLevel::Critical;
                }
            }
            k if k.contains("url") || k.contains("endpoint") => {
                // URL-specific validation
                let url_result = self.base_validator.validate_url(value).await;
                result.violations.extend(url_result.violations);
                result.risk_level = std::cmp::max(result.risk_level, url_result.risk_level);
            }
            k if k.contains("path") || k.contains("file") || k.contains("dir") => {
                // Path-specific validation
                let path_result = self.base_validator.validate_file_path(value).await;
                result.violations.extend(path_result.violations);
                result.risk_level = std::cmp::max(result.risk_level, path_result.risk_level);
            }
            _ => {}
        }
        
        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_sql_injection_detection() {
        let config = ValidationConfig::default();
        let mut validator = InputValidator::new(config).unwrap();
        
        let malicious_inputs = vec![
            "'; DROP TABLE users; --",
            "1' OR '1'='1",
            "admin' UNION SELECT * FROM passwords --",
            "1; exec xp_cmdshell('format c:'); --",
        ];
        
        for input in malicious_inputs {
            let result = validator.validate_string(input, "test").await;
            assert!(!result.is_valid, "SQL injection should be detected: {}", input);
            assert_eq!(result.risk_level, ValidationRiskLevel::Critical);
            assert!(result.violations.iter().any(|v| matches!(v.violation_type, ViolationType::InjectionAttempt)));
        }
    }
    
    #[tokio::test]
    async fn test_xss_detection() {
        let config = ValidationConfig::default();
        let mut validator = InputValidator::new(config).unwrap();
        
        let xss_inputs = vec![
            "<script>alert('xss')</script>",
            "<img src=x onerror=alert('xss')>",
            "javascript:alert('xss')",
            "<iframe src='http://evil.com'></iframe>",
        ];
        
        for input in xss_inputs {
            let result = validator.validate_string(input, "test").await;
            assert!(!result.is_valid, "XSS should be detected: {}", input);
            assert_eq!(result.risk_level, ValidationRiskLevel::Critical);
        }
    }
    
    #[tokio::test]
    async fn test_path_traversal_detection() {
        let config = ValidationConfig::default();
        let mut validator = InputValidator::new(config).unwrap();
        
        let path_traversal_inputs = vec![
            "../../../etc/passwd",
            "..\\..\\..\\windows\\system32\\config\\sam",
            "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
            "....//....//....//etc/passwd",
        ];
        
        for input in path_traversal_inputs {
            let result = validator.validate_file_path(input).await;
            assert!(!result.is_valid, "Path traversal should be detected: {}", input);
            assert!(matches!(result.risk_level, ValidationRiskLevel::High | ValidationRiskLevel::Critical));
        }
    }
    
    #[tokio::test]
    async fn test_url_validation() {
        let config = ValidationConfig::default();
        let mut validator = InputValidator::new(config).unwrap();
        
        // Valid URLs
        let valid_urls = vec![
            "https://example.com",
            "http://subdomain.example.com:8080/path",
        ];
        
        for url in valid_urls {
            let result = validator.validate_url(url).await;
            assert!(result.is_valid, "Valid URL should pass: {}", url);
        }
        
        // Invalid/suspicious URLs
        let suspicious_urls = vec![
            "javascript:alert('xss')",
            "file:///etc/passwd",
            "http://192.168.1.1/admin",
            "ftp://192.168.1.100/sensitive",
        ];
        
        for url in suspicious_urls {
            let result = validator.validate_url(url).await;
            assert!(!result.is_valid || result.risk_level >= ValidationRiskLevel::Medium, 
                   "Suspicious URL should be flagged: {}", url);
        }
    }
    
    #[tokio::test]
    async fn test_json_validation() {
        let config = ValidationConfig::default();
        let mut validator = InputValidator::new(config).unwrap();
        
        // Valid JSON
        let valid_json = r#"{"name": "test", "value": 123}"#;
        let result = validator.validate_json(valid_json).await;
        assert!(result.is_valid);
        
        // Malicious JSON with SQL injection
        let malicious_json = r#"{"query": "'; DROP TABLE users; --"}"#;
        let result = validator.validate_json(malicious_json).await;
        assert!(!result.is_valid);
        assert_eq!(result.risk_level, ValidationRiskLevel::Critical);
    }
    
    #[tokio::test]
    async fn test_log_message_validation() {
        let config = ValidationConfig::default();
        let mut validator = LogMessageValidator::new(config).unwrap();
        
        // Safe log message
        let safe_message = "User login successful for user: john.doe";
        let result = validator.validate_log_message(safe_message, "auth").await;
        assert!(result.is_valid);
        
        // Log message with exposed password
        let unsafe_message = "User login failed with password: secretpassword123";
        let result = validator.validate_log_message(unsafe_message, "auth").await;
        assert!(!result.is_valid);
        assert!(result.risk_level >= ValidationRiskLevel::High);
    }
    
    #[tokio::test]
    async fn test_configuration_validation() {
        let config = ValidationConfig::default();
        let mut validator = ConfigurationValidator::new(config).unwrap();
        
        // Weak password
        let weak_password = "123";
        let result = validator.validate_config_string(weak_password, "api_password").await;
        assert!(!result.is_valid);
        assert!(result.risk_level >= ValidationRiskLevel::High);
        
        // Default value
        let default_value = "changeme";
        let result = validator.validate_config_string(default_value, "admin_password").await;
        assert!(!result.is_valid);
        assert_eq!(result.risk_level, ValidationRiskLevel::Critical);
        
        // Valid strong password
        let strong_password = "MySecureP@ssw0rd2024!";
        let result = validator.validate_config_string(strong_password, "api_password").await;
        assert!(result.is_valid || result.risk_level < ValidationRiskLevel::High);
    }
    
    #[tokio::test]
    async fn test_sanitization() {
        let mut config = ValidationConfig::default();
        config.auto_sanitize = true;
        let mut validator = InputValidator::new(config).unwrap();
        
        // Input with control characters
        let input_with_controls = "test\x00\x01\x02message";
        let result = validator.validate_string(input_with_controls, "test").await;
        
        if let Some(sanitized) = result.sanitized_value {
            assert!(!sanitized.contains('\x00'));
            assert!(!sanitized.contains('\x01'));
            assert!(!sanitized.contains('\x02'));
            assert_eq!(sanitized, "testmessage");
        }
    }
    
    #[tokio::test]
    async fn test_validation_stats() {
        let config = ValidationConfig::default();
        let mut validator = InputValidator::new(config).unwrap();
        
        // Perform some validations
        let _ = validator.validate_string("safe_input", "test").await;
        let _ = validator.validate_string("'; DROP TABLE users; --", "test").await;
        let _ = validator.validate_string("<script>alert('xss')</script>", "test").await;
        
        let stats = validator.get_stats();
        assert_eq!(stats.total_validations, 3);
        assert_eq!(stats.successful_validations, 1);
        assert_eq!(stats.failed_validations, 2);
        assert_eq!(stats.injection_attempts_blocked, 2);
    }
}