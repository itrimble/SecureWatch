// Secure credential storage and rotation system for SecureWatch Agent
// Implements enterprise-grade security with encryption, rotation, and audit logging

use crate::errors::{AgentError, SecurityError, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::sync::{RwLock, Mutex, broadcast};
use tokio::time::{interval, sleep};
use tracing::{debug, info, warn, error, trace};
use base64::{Engine as _, engine::general_purpose};
use ring::{aead, pbkdf2, rand::{self, SecureRandom}};
use zeroize::{Zeroize, ZeroizeOnDrop};

/// Configuration for secure credential management
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityConfig {
    /// Path to encrypted credential store
    pub credential_store_path: String,
    /// Master password for credential encryption (should be set via environment)
    pub master_password_env: String,
    /// Credential rotation interval in seconds
    pub rotation_interval_seconds: u64,
    /// Maximum credential age before forced rotation
    pub max_credential_age_seconds: u64,
    /// Enable automatic credential rotation
    pub auto_rotation_enabled: bool,
    /// Backup credentials before rotation
    pub backup_on_rotation: bool,
    /// Number of credential backups to retain
    pub backup_retention_count: usize,
    /// Enable audit logging for security events
    pub audit_logging_enabled: bool,
    /// Audit log file path
    pub audit_log_path: String,
    /// Key derivation iterations (higher = more secure but slower)
    pub pbkdf2_iterations: u32,
    /// Enable credential validation on startup
    pub validate_on_startup: bool,
}

impl Default for SecurityConfig {
    fn default() -> Self {
        Self {
            credential_store_path: "./security/credentials.enc".to_string(),
            master_password_env: "SECUREWATCH_MASTER_PASSWORD".to_string(),
            rotation_interval_seconds: 86400, // 24 hours
            max_credential_age_seconds: 604800, // 7 days
            auto_rotation_enabled: true,
            backup_on_rotation: true,
            backup_retention_count: 5,
            audit_logging_enabled: true,
            audit_log_path: "./security/audit.log".to_string(),
            pbkdf2_iterations: 100_000,
            validate_on_startup: true,
        }
    }
}

/// Secure credential with metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecureCredential {
    /// Credential identifier
    pub id: String,
    /// Credential type (api_key, certificate, token, etc.)
    pub credential_type: CredentialType,
    /// Encrypted credential value
    #[serde(with = "base64_serde")]
    pub encrypted_value: Vec<u8>,
    /// Salt used for encryption
    #[serde(with = "base64_serde")]
    pub salt: Vec<u8>,
    /// Nonce used for encryption
    #[serde(with = "base64_serde")]
    pub nonce: Vec<u8>,
    /// Creation timestamp
    pub created_at: u64,
    /// Last rotation timestamp
    pub last_rotated_at: u64,
    /// Next rotation due timestamp
    pub next_rotation_at: u64,
    /// Whether this credential requires manual rotation
    pub manual_rotation_only: bool,
    /// Associated metadata
    pub metadata: HashMap<String, String>,
}

/// Types of credentials supported
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum CredentialType {
    ApiKey,
    BearerToken,
    BasicAuth,
    Certificate,
    PrivateKey,
    DatabasePassword,
    EncryptionKey,
    Custom(String),
}

/// Credential rotation event
#[derive(Debug, Clone, Serialize)]
pub struct CredentialRotationEvent {
    pub timestamp: u64,
    pub credential_id: String,
    pub event_type: RotationEventType,
    pub success: bool,
    pub reason: String,
    pub old_credential_hash: Option<String>,
    pub new_credential_hash: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub enum RotationEventType {
    AutomaticRotation,
    ManualRotation,
    EmergencyRotation,
    BackupCreated,
    ValidationFailed,
    ExpirationWarning,
}

/// Security audit event
#[derive(Debug, Clone, Serialize)]
pub struct SecurityAuditEvent {
    pub timestamp: u64,
    pub event_type: AuditEventType,
    pub credential_id: Option<String>,
    pub user_context: Option<String>,
    pub success: bool,
    pub details: String,
    pub risk_level: RiskLevel,
}

#[derive(Debug, Clone, Serialize)]
pub enum AuditEventType {
    CredentialAccess,
    CredentialCreation,
    CredentialUpdate,
    CredentialDeletion,
    CredentialRotation,
    EncryptionKeyGeneration,
    DecryptionAttempt,
    ValidationFailure,
    UnauthorizedAccess,
    SystemSecurityEvent,
}

#[derive(Debug, Clone, Serialize)]
pub enum RiskLevel {
    Low,
    Medium,
    High,
    Critical,
}

/// Statistics for credential management
#[derive(Debug, Clone, Serialize)]
pub struct SecurityStats {
    pub total_credentials: usize,
    pub credentials_due_for_rotation: usize,
    pub credentials_expired: usize,
    pub last_rotation_check: Option<u64>,
    pub total_rotations_performed: u64,
    pub failed_rotations: u64,
    pub audit_events_logged: u64,
    pub security_warnings: u64,
    pub uptime_seconds: u64,
}

/// Secure credential manager with encryption and rotation
pub struct SecureCredentialManager {
    config: SecurityConfig,
    credentials: Arc<RwLock<HashMap<String, SecureCredential>>>,
    master_key: Arc<RwLock<Option<aead::LessSafeKey>>>,
    stats: Arc<RwLock<SecurityStats>>,
    
    // Event broadcasting
    rotation_event_sender: broadcast::Sender<CredentialRotationEvent>,
    audit_event_sender: broadcast::Sender<SecurityAuditEvent>,
    
    // Audit logging
    audit_logger: Arc<Mutex<Option<tokio::fs::File>>>,
    
    start_time: SystemTime,
}

impl SecureCredentialManager {
    /// Create a new secure credential manager
    pub async fn new(config: SecurityConfig) -> Result<Self> {
        info!("🔐 Initializing secure credential manager");
        
        // Create security directory if it doesn't exist
        if let Some(parent) = std::path::Path::new(&config.credential_store_path).parent() {
            tokio::fs::create_dir_all(parent).await
                .map_err(|e| AgentError::Io(format!("Failed to create security directory: {}", e)))?;
        }
        
        // Initialize event broadcasters
        let (rotation_event_sender, _) = broadcast::channel(1000);
        let (audit_event_sender, _) = broadcast::channel(1000);
        
        // Initialize audit logger if enabled
        let audit_logger = if config.audit_logging_enabled {
            if let Some(parent) = std::path::Path::new(&config.audit_log_path).parent() {
                tokio::fs::create_dir_all(parent).await
                    .map_err(|e| AgentError::Io(format!("Failed to create audit log directory: {}", e)))?;
            }
            
            let file = tokio::fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(&config.audit_log_path).await
                .map_err(|e| AgentError::Io(format!("Failed to open audit log: {}", e)))?;
            
            Arc::new(Mutex::new(Some(file)))
        } else {
            Arc::new(Mutex::new(None))
        };
        
        let stats = SecurityStats {
            total_credentials: 0,
            credentials_due_for_rotation: 0,
            credentials_expired: 0,
            last_rotation_check: None,
            total_rotations_performed: 0,
            failed_rotations: 0,
            audit_events_logged: 0,
            security_warnings: 0,
            uptime_seconds: 0,
        };
        
        let manager = Self {
            config,
            credentials: Arc::new(RwLock::new(HashMap::new())),
            master_key: Arc::new(RwLock::new(None)),
            stats: Arc::new(RwLock::new(stats)),
            rotation_event_sender,
            audit_event_sender,
            audit_logger,
            start_time: SystemTime::now(),
        };
        
        // Log initialization
        manager.log_audit_event(AuditEventType::SystemSecurityEvent, None, true, 
                               "Secure credential manager initialized".to_string(), RiskLevel::Low).await;
        
        info!("✅ Secure credential manager initialized successfully");
        Ok(manager)
    }
    
    /// Initialize the credential manager with master password
    pub async fn initialize(&self, master_password: &str) -> Result<()> {
        info!("🔑 Initializing credential manager with master password");
        
        // Derive master key from password
        let master_key = self.derive_master_key(master_password).await?;
        *self.master_key.write().await = Some(master_key);
        
        // Load existing credentials if they exist
        if tokio::fs::metadata(&self.config.credential_store_path).await.is_ok() {
            self.load_credentials().await?;
        }
        
        // Validate credentials if enabled
        if self.config.validate_on_startup {
            self.validate_all_credentials().await?;
        }
        
        self.log_audit_event(AuditEventType::SystemSecurityEvent, None, true,
                           "Credential manager initialized with master key".to_string(), RiskLevel::Medium).await;
        
        info!("✅ Credential manager initialization complete");
        Ok(())
    }
    
    /// Store a new credential securely
    pub async fn store_credential(
        &self,
        id: String,
        credential_type: CredentialType,
        value: &str,
        metadata: Option<HashMap<String, String>>,
        manual_rotation_only: bool,
    ) -> Result<()> {
        info!("📥 Storing new credential: {}", id);
        
        // Check if master key is available
        let master_key = self.master_key.read().await;
        if master_key.is_none() {
            return Err(AgentError::Security(SecurityError::MasterKeyNotInitialized));
        }
        let master_key = master_key.as_ref().unwrap();
        
        // Generate salt and nonce
        let mut salt = [0u8; 32];
        let mut nonce = [0u8; 12];
        let rng = rand::SystemRandom::new();
        rng.fill(&mut salt).map_err(|_| AgentError::Security(SecurityError::SaltGenerationFailed))?;
        rng.fill(&mut nonce).map_err(|_| AgentError::Security(SecurityError::NonceGenerationFailed))?;
        
        // Encrypt the credential
        let encrypted_value = self.encrypt_credential(value, master_key, &nonce).await?;
        
        let now = SystemTime::now().duration_since(UNIX_EPOCH)
            .map_err(|_| AgentError::Security("System time error".to_string()))?
            .as_secs();
        
        let credential = SecureCredential {
            id: id.clone(),
            credential_type,
            encrypted_value,
            salt: salt.to_vec(),
            nonce: nonce.to_vec(),
            created_at: now,
            last_rotated_at: now,
            next_rotation_at: if manual_rotation_only { 
                now + self.config.max_credential_age_seconds 
            } else { 
                now + self.config.rotation_interval_seconds 
            },
            manual_rotation_only,
            metadata: metadata.unwrap_or_default(),
        };
        
        // Store credential
        {
            let mut credentials = self.credentials.write().await;
            credentials.insert(id.clone(), credential);
        }
        
        // Save to disk
        self.save_credentials().await?;
        
        // Update statistics
        {
            let mut stats = self.stats.write().await;
            stats.total_credentials += 1;
        }
        
        // Log audit event
        self.log_audit_event(AuditEventType::CredentialCreation, Some(id), true,
                           "New credential stored securely".to_string(), RiskLevel::Medium).await;
        
        info!("✅ Credential stored successfully");
        Ok(())
    }
    
    /// Retrieve and decrypt a credential
    pub async fn get_credential(&self, id: &str) -> Result<String> {
        trace!("🔍 Retrieving credential: {}", id);
        
        // Check if master key is available
        let master_key = self.master_key.read().await;
        if master_key.is_none() {
            self.log_audit_event(AuditEventType::CredentialAccess, Some(id.to_string()), false,
                               "Attempted access without master key".to_string(), RiskLevel::High).await;
            return Err(AgentError::Security(SecurityError::MasterKeyNotInitialized));
        }
        let master_key = master_key.as_ref().unwrap();
        
        // Get credential
        let credential = {
            let credentials = self.credentials.read().await;
            credentials.get(id).cloned()
                .ok_or_else(|| AgentError::Security(format!("Credential not found: {}", id)))?
        };
        
        // Check if credential is expired
        let now = SystemTime::now().duration_since(UNIX_EPOCH)
            .map_err(|_| AgentError::Security("System time error".to_string()))?
            .as_secs();
        
        if now > credential.next_rotation_at {
            self.log_audit_event(AuditEventType::CredentialAccess, Some(id.to_string()), false,
                               "Attempted access to expired credential".to_string(), RiskLevel::High).await;
            return Err(AgentError::Security(format!("Credential expired: {}", id)));
        }
        
        // Decrypt credential
        let decrypted_value = self.decrypt_credential(&credential, master_key).await?;
        
        // Log successful access
        self.log_audit_event(AuditEventType::CredentialAccess, Some(id.to_string()), true,
                           "Credential accessed successfully".to_string(), RiskLevel::Low).await;
        
        Ok(decrypted_value)
    }
    
    /// Rotate a specific credential
    pub async fn rotate_credential(&self, id: &str, new_value: &str) -> Result<()> {
        info!("🔄 Rotating credential: {}", id);
        
        // Get current credential
        let mut credential = {
            let credentials = self.credentials.read().await;
            credentials.get(id).cloned()
                .ok_or_else(|| AgentError::Security(format!("Credential not found: {}", id)))?
        };
        
        // Backup old credential if enabled
        if self.config.backup_on_rotation {
            self.backup_credential(&credential).await?;
        }
        
        // Get master key
        let master_key = self.master_key.read().await;
        if master_key.is_none() {
            return Err(AgentError::Security(SecurityError::MasterKeyNotInitialized));
        }
        let master_key = master_key.as_ref().unwrap();
        
        // Generate new nonce
        let mut nonce = [0u8; 12];
        let rng = rand::SystemRandom::new();
        rng.fill(&mut nonce).map_err(|_| AgentError::Security(SecurityError::NonceGenerationFailed))?;
        
        // Calculate old credential hash for audit
        let old_hash = self.calculate_credential_hash(&credential.encrypted_value);
        
        // Encrypt new value
        let encrypted_value = self.encrypt_credential(new_value, master_key, &nonce).await?;
        let new_hash = self.calculate_credential_hash(&encrypted_value);
        
        let now = SystemTime::now().duration_since(UNIX_EPOCH)
            .map_err(|_| AgentError::Security("System time error".to_string()))?
            .as_secs();
        
        // Update credential
        credential.encrypted_value = encrypted_value;
        credential.nonce = nonce.to_vec();
        credential.last_rotated_at = now;
        credential.next_rotation_at = if credential.manual_rotation_only {
            now + self.config.max_credential_age_seconds
        } else {
            now + self.config.rotation_interval_seconds
        };
        
        // Store updated credential
        {
            let mut credentials = self.credentials.write().await;
            credentials.insert(id.to_string(), credential);
        }
        
        // Save to disk
        self.save_credentials().await?;
        
        // Update statistics
        {
            let mut stats = self.stats.write().await;
            stats.total_rotations_performed += 1;
        }
        
        // Send rotation event
        let event = CredentialRotationEvent {
            timestamp: now,
            credential_id: id.to_string(),
            event_type: RotationEventType::ManualRotation,
            success: true,
            reason: "Manual credential rotation".to_string(),
            old_credential_hash: Some(old_hash),
            new_credential_hash: Some(new_hash),
        };
        let _ = self.rotation_event_sender.send(event);
        
        // Log audit event
        self.log_audit_event(AuditEventType::CredentialRotation, Some(id.to_string()), true,
                           "Credential rotated successfully".to_string(), RiskLevel::Medium).await;
        
        info!("✅ Credential rotation completed successfully");
        Ok(())
    }
    
    /// Start automatic credential rotation monitoring
    pub async fn start_rotation_monitoring(&self, shutdown_receiver: broadcast::Receiver<()>) -> Result<()> {
        if !self.config.auto_rotation_enabled {
            info!("🔄 Automatic credential rotation is disabled");
            return Ok();
        }
        
        info!("🚀 Starting automatic credential rotation monitoring");
        
        let config = self.config.clone();
        let credentials = self.credentials.clone();
        let stats = self.stats.clone();
        let rotation_sender = self.rotation_event_sender.clone();
        let audit_sender = self.audit_event_sender.clone();
        
        tokio::spawn(async move {
            let mut rotation_timer = interval(Duration::from_secs(config.rotation_interval_seconds));
            let mut shutdown_receiver = shutdown_receiver;
            
            loop {
                tokio::select! {
                    _ = rotation_timer.tick() => {
                        if let Err(e) = Self::check_and_rotate_credentials(
                            &config,
                            &credentials,
                            &stats,
                            &rotation_sender,
                            &audit_sender,
                        ).await {
                            error!("❌ Credential rotation check failed: {}", e);
                        }
                    }
                    _ = shutdown_receiver.recv() => {
                        info!("🛑 Credential rotation monitoring shutting down");
                        break;
                    }
                }
            }
        });
        
        info!("✅ Credential rotation monitoring started");
        Ok(())
    }
    
    /// Check for credentials that need rotation
    async fn check_and_rotate_credentials(
        config: &SecurityConfig,
        credentials: &Arc<RwLock<HashMap<String, SecureCredential>>>,
        stats: &Arc<RwLock<SecurityStats>>,
        rotation_sender: &broadcast::Sender<CredentialRotationEvent>,
        audit_sender: &broadcast::Sender<SecurityAuditEvent>,
    ) -> Result<()> {
        debug!("🔍 Checking credentials for rotation needs");
        
        let now = SystemTime::now().duration_since(UNIX_EPOCH)
            .map_err(|_| AgentError::Security("System time error".to_string()))?
            .as_secs();
        
        let mut credentials_due = 0;
        let mut credentials_expired = 0;
        
        {
            let credentials_guard = credentials.read().await;
            for (id, credential) in credentials_guard.iter() {
                // Skip manual rotation only credentials
                if credential.manual_rotation_only {
                    continue;
                }
                
                if now >= credential.next_rotation_at {
                    credentials_due += 1;
                    
                    // Check if credential is expired (past max age)
                    if now > credential.created_at + config.max_credential_age_seconds {
                        credentials_expired += 1;
                        
                        warn!("⚠️ Credential expired and requires immediate attention: {}", id);
                        
                        // Send critical audit event
                        let audit_event = SecurityAuditEvent {
                            timestamp: now,
                            event_type: AuditEventType::ValidationFailure,
                            credential_id: Some(id.clone()),
                            user_context: None,
                            success: false,
                            details: format!("Credential {} has expired and requires immediate rotation", id),
                            risk_level: RiskLevel::Critical,
                        };
                        let _ = audit_sender.send(audit_event);
                    } else {
                        info!("📅 Credential due for rotation: {}", id);
                        
                        // Send rotation event
                        let rotation_event = CredentialRotationEvent {
                            timestamp: now,
                            credential_id: id.clone(),
                            event_type: RotationEventType::ExpirationWarning,
                            success: true,
                            reason: "Credential due for automatic rotation".to_string(),
                            old_credential_hash: None,
                            new_credential_hash: None,
                        };
                        let _ = rotation_sender.send(rotation_event);
                    }
                }
            }
        }
        
        // Update statistics
        {
            let mut stats_guard = stats.write().await;
            stats_guard.credentials_due_for_rotation = credentials_due;
            stats_guard.credentials_expired = credentials_expired;
            stats_guard.last_rotation_check = Some(now);
        }
        
        if credentials_due > 0 {
            warn!("⚠️ {} credentials due for rotation ({} expired)", credentials_due, credentials_expired);
        }
        
        Ok(())
    }
    
    /// Encrypt a credential value
    async fn encrypt_credential(&self, value: &str, key: &aead::LessSafeKey, nonce: &[u8]) -> Result<Vec<u8>> {
        let nonce = aead::Nonce::try_assume_unique_for_key(nonce)
            .map_err(|_| AgentError::Security("Invalid nonce".to_string()))?;
        
        let mut in_out = value.as_bytes().to_vec();
        key.seal_in_place_append_tag(nonce, aead::Aad::empty(), &mut in_out)
            .map_err(|_| AgentError::Security("Encryption failed".to_string()))?;
        
        Ok(in_out)
    }
    
    /// Decrypt a credential value
    async fn decrypt_credential(&self, credential: &SecureCredential, key: &aead::LessSafeKey) -> Result<String> {
        let nonce = aead::Nonce::try_assume_unique_for_key(&credential.nonce)
            .map_err(|_| AgentError::Security("Invalid nonce".to_string()))?;
        
        let mut in_out = credential.encrypted_value.clone();
        let plaintext = key.open_in_place(nonce, aead::Aad::empty(), &mut in_out)
            .map_err(|_| AgentError::Security("Decryption failed".to_string()))?;
        
        String::from_utf8(plaintext.to_vec())
            .map_err(|_| AgentError::Security("Invalid UTF-8 in decrypted credential".to_string()))
    }
    
    /// Derive master key from password
    async fn derive_master_key(&self, password: &str) -> Result<aead::LessSafeKey> {
        let mut salt = [0u8; 32];
        let rng = rand::SystemRandom::new();
        rng.fill(&mut salt).map_err(|_| AgentError::Security(SecurityError::SaltGenerationFailed))?;
        
        let mut key_bytes = [0u8; 32];
        pbkdf2::derive(
            pbkdf2::PBKDF2_HMAC_SHA256,
            std::num::NonZeroU32::new(self.config.pbkdf2_iterations).unwrap(),
            &salt,
            password.as_bytes(),
            &mut key_bytes,
        );
        
        let unbound_key = aead::UnboundKey::new(&aead::CHACHA20_POLY1305, &key_bytes)
            .map_err(|_| AgentError::Security("Failed to create encryption key".to_string()))?;
        
        Ok(aead::LessSafeKey::new(unbound_key))
    }
    
    /// Calculate credential hash for audit purposes
    fn calculate_credential_hash(&self, data: &[u8]) -> String {
        use ring::digest;
        let hash = digest::digest(&digest::SHA256, data);
        general_purpose::STANDARD.encode(hash.as_ref())
    }
    
    /// Backup a credential before rotation
    async fn backup_credential(&self, credential: &SecureCredential) -> Result<()> {
        debug!("💾 Creating backup for credential: {}", credential.id);
        
        let backup_dir = std::path::Path::new(&self.config.credential_store_path)
            .parent()
            .unwrap_or_else(|| std::path::Path::new("."))
            .join("backups");
        
        tokio::fs::create_dir_all(&backup_dir).await
            .map_err(|e| AgentError::Io(format!("Failed to create backup directory: {}", e)))?;
        
        let timestamp = SystemTime::now().duration_since(UNIX_EPOCH)
            .map_err(|_| AgentError::Security("System time error".to_string()))?
            .as_secs();
        
        let backup_file = backup_dir.join(format!("{}_{}.json", credential.id, timestamp));
        let backup_data = serde_json::to_string_pretty(credential)
            .map_err(|e| AgentError::Serialization(format!("Failed to serialize backup: {}", e)))?;
        
        tokio::fs::write(&backup_file, backup_data).await
            .map_err(|e| AgentError::Io(format!("Failed to write backup: {}", e)))?;
        
        debug!("✅ Backup created: {}", backup_file.display());
        Ok(())
    }
    
    /// Load credentials from encrypted storage
    async fn load_credentials(&self) -> Result<()> {
        debug!("📂 Loading credentials from storage");
        
        let encrypted_data = tokio::fs::read(&self.config.credential_store_path).await
            .map_err(|e| AgentError::Io(format!("Failed to read credential store: {}", e)))?;
        
        // For now, we'll use a simple JSON format
        // In production, this should be properly encrypted at rest
        let credentials: HashMap<String, SecureCredential> = serde_json::from_slice(&encrypted_data)
            .map_err(|e| AgentError::Serialization(format!("Failed to deserialize credentials: {}", e)))?;
        
        let count = credentials.len();
        *self.credentials.write().await = credentials;
        
        // Update statistics
        {
            let mut stats = self.stats.write().await;
            stats.total_credentials = count;
        }
        
        info!("✅ Loaded {} credentials from storage", count);
        Ok(())
    }
    
    /// Save credentials to encrypted storage
    async fn save_credentials(&self) -> Result<()> {
        debug!("💾 Saving credentials to storage");
        
        let credentials = self.credentials.read().await;
        let serialized = serde_json::to_string_pretty(&*credentials)
            .map_err(|e| AgentError::Serialization(format!("Failed to serialize credentials: {}", e)))?;
        
        tokio::fs::write(&self.config.credential_store_path, serialized).await
            .map_err(|e| AgentError::Io(format!("Failed to write credential store: {}", e)))?;
        
        debug!("✅ Credentials saved to storage");
        Ok(())
    }
    
    /// Validate all credentials
    async fn validate_all_credentials(&self) -> Result<()> {
        info!("🔍 Validating all credentials");
        
        let master_key = self.master_key.read().await;
        if master_key.is_none() {
            return Err(AgentError::Security(SecurityError::MasterKeyNotInitialized));
        }
        let master_key = master_key.as_ref().unwrap();
        
        let credentials = self.credentials.read().await;
        let mut validation_errors = 0;
        
        for (id, credential) in credentials.iter() {
            match self.decrypt_credential(credential, master_key).await {
                Ok(_) => trace!("✅ Credential {} validation passed", id),
                Err(e) => {
                    error!("❌ Credential {} validation failed: {}", id, e);
                    validation_errors += 1;
                    
                    self.log_audit_event(AuditEventType::ValidationFailure, Some(id.clone()), false,
                                       format!("Credential validation failed: {}", e), RiskLevel::High).await;
                }
            }
        }
        
        if validation_errors > 0 {
            warn!("⚠️ {} credentials failed validation", validation_errors);
            return Err(AgentError::Security(format!("{} credentials failed validation", validation_errors)));
        }
        
        info!("✅ All {} credentials validated successfully", credentials.len());
        Ok(())
    }
    
    /// Log security audit event
    async fn log_audit_event(
        &self,
        event_type: AuditEventType,
        credential_id: Option<String>,
        success: bool,
        details: String,
        risk_level: RiskLevel,
    ) {
        let timestamp = SystemTime::now().duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        
        let event = SecurityAuditEvent {
            timestamp,
            event_type,
            credential_id,
            user_context: None, // Could be enhanced to include user context
            success,
            details,
            risk_level,
        };
        
        // Send event
        let _ = self.audit_event_sender.send(event.clone());
        
        // Write to audit log if enabled
        if self.config.audit_logging_enabled {
            if let Ok(mut audit_logger) = self.audit_logger.try_lock() {
                if let Some(ref mut file) = *audit_logger {
                    let log_line = format!("{}\n", serde_json::to_string(&event).unwrap_or_default());
                    let _ = tokio::io::AsyncWriteExt::write_all(file, log_line.as_bytes()).await;
                    let _ = tokio::io::AsyncWriteExt::flush(file).await;
                }
            }
        }
        
        // Update statistics
        if let Ok(mut stats) = self.stats.try_write() {
            stats.audit_events_logged += 1;
            if !success && matches!(risk_level, RiskLevel::High | RiskLevel::Critical) {
                stats.security_warnings += 1;
            }
        }
    }
    
    /// Subscribe to rotation events
    pub fn subscribe_to_rotation_events(&self) -> broadcast::Receiver<CredentialRotationEvent> {
        self.rotation_event_sender.subscribe()
    }
    
    /// Subscribe to audit events
    pub fn subscribe_to_audit_events(&self) -> broadcast::Receiver<SecurityAuditEvent> {
        self.audit_event_sender.subscribe()
    }
    
    /// Get current security statistics
    pub async fn get_stats(&self) -> SecurityStats {
        let mut stats = self.stats.read().await.clone();
        stats.uptime_seconds = self.start_time.elapsed().unwrap_or_default().as_secs();
        stats
    }
    
    /// List all credential IDs and metadata
    pub async fn list_credentials(&self) -> Vec<(String, CredentialType, HashMap<String, String>)> {
        let credentials = self.credentials.read().await;
        credentials.iter()
            .map(|(id, cred)| (id.clone(), cred.credential_type.clone(), cred.metadata.clone()))
            .collect()
    }
    
    /// Delete a credential
    pub async fn delete_credential(&self, id: &str) -> Result<()> {
        info!("🗑️ Deleting credential: {}", id);
        
        {
            let mut credentials = self.credentials.write().await;
            if credentials.remove(id).is_none() {
                return Err(AgentError::Security(format!("Credential not found: {}", id)));
            }
        }
        
        // Save to disk
        self.save_credentials().await?;
        
        // Update statistics
        {
            let mut stats = self.stats.write().await;
            stats.total_credentials = stats.total_credentials.saturating_sub(1);
        }
        
        // Log audit event
        self.log_audit_event(AuditEventType::CredentialDeletion, Some(id.to_string()), true,
                           "Credential deleted".to_string(), RiskLevel::Medium).await;
        
        info!("✅ Credential deleted successfully");
        Ok(())
    }
}

// Helper module for base64 serialization
mod base64_serde {
    use serde::{Deserialize, Deserializer, Serializer};
    use base64::{Engine as _, engine::general_purpose};
    
    pub fn serialize<S>(bytes: &Vec<u8>, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&general_purpose::STANDARD.encode(bytes))
    }
    
    pub fn deserialize<'de, D>(deserializer: D) -> Result<Vec<u8>, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        general_purpose::STANDARD.decode(s).map_err(serde::de::Error::custom)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    
    #[tokio::test]
    async fn test_credential_storage_and_retrieval() {
        let temp_dir = TempDir::new().unwrap();
        let mut config = SecurityConfig::default();
        config.credential_store_path = temp_dir.path().join("credentials.enc").to_string_lossy().to_string();
        config.audit_log_path = temp_dir.path().join("audit.log").to_string_lossy().to_string();
        
        let manager = SecureCredentialManager::new(config).await.unwrap();
        manager.initialize("test-master-password").await.unwrap();
        
        // Store a credential
        let api_key = "sk-test-api-key-12345";
        manager.store_credential(
            "test-api-key".to_string(),
            CredentialType::ApiKey,
            api_key,
            None,
            false,
        ).await.unwrap();
        
        // Retrieve the credential
        let retrieved = manager.get_credential("test-api-key").await.unwrap();
        assert_eq!(retrieved, api_key);
        
        // Check statistics
        let stats = manager.get_stats().await;
        assert_eq!(stats.total_credentials, 1);
    }
    
    #[tokio::test]
    async fn test_credential_rotation() {
        let temp_dir = TempDir::new().unwrap();
        let mut config = SecurityConfig::default();
        config.credential_store_path = temp_dir.path().join("credentials.enc").to_string_lossy().to_string();
        config.audit_log_path = temp_dir.path().join("audit.log").to_string_lossy().to_string();
        
        let manager = SecureCredentialManager::new(config).await.unwrap();
        manager.initialize("test-master-password").await.unwrap();
        
        // Store initial credential
        manager.store_credential(
            "test-rotation".to_string(),
            CredentialType::ApiKey,
            "old-value",
            None,
            false,
        ).await.unwrap();
        
        // Rotate the credential
        manager.rotate_credential("test-rotation", "new-value").await.unwrap();
        
        // Verify new value
        let retrieved = manager.get_credential("test-rotation").await.unwrap();
        assert_eq!(retrieved, "new-value");
        
        // Check statistics
        let stats = manager.get_stats().await;
        assert_eq!(stats.total_rotations_performed, 1);
    }
    
    #[tokio::test]
    async fn test_audit_logging() {
        let temp_dir = TempDir::new().unwrap();
        let mut config = SecurityConfig::default();
        config.credential_store_path = temp_dir.path().join("credentials.enc").to_string_lossy().to_string();
        config.audit_log_path = temp_dir.path().join("audit.log").to_string_lossy().to_string();
        
        let manager = SecureCredentialManager::new(config.clone()).await.unwrap();
        manager.initialize("test-master-password").await.unwrap();
        
        // Store a credential (this should generate audit events)
        manager.store_credential(
            "test-audit".to_string(),
            CredentialType::ApiKey,
            "test-value",
            None,
            false,
        ).await.unwrap();
        
        // Check that audit log was created and has content
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await; // Allow time for async write
        
        let audit_content = tokio::fs::read_to_string(&config.audit_log_path).await.unwrap();
        assert!(!audit_content.is_empty());
        assert!(audit_content.contains("CredentialCreation"));
    }
    
    #[tokio::test]
    async fn test_credential_validation() {
        let temp_dir = TempDir::new().unwrap();
        let mut config = SecurityConfig::default();
        config.credential_store_path = temp_dir.path().join("credentials.enc").to_string_lossy().to_string();
        config.audit_log_path = temp_dir.path().join("audit.log").to_string_lossy().to_string();
        
        let manager = SecureCredentialManager::new(config).await.unwrap();
        manager.initialize("test-master-password").await.unwrap();
        
        // Store multiple credentials
        for i in 0..3 {
            manager.store_credential(
                format!("test-cred-{}", i),
                CredentialType::ApiKey,
                &format!("value-{}", i),
                None,
                false,
            ).await.unwrap();
        }
        
        // Validate all credentials
        manager.validate_all_credentials().await.unwrap();
        
        // Check statistics
        let stats = manager.get_stats().await;
        assert_eq!(stats.total_credentials, 3);
    }
}