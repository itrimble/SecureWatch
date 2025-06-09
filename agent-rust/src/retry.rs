// Enhanced retry mechanism with exponential backoff for SecureWatch Agent
// Implements industry-standard retry patterns with circuit breaker integration

use crate::errors::{AgentError, TransportError};
use std::future::Future;
use std::time::{Duration, Instant};
use tokio::time::sleep;
use tracing::{debug, warn, error, info};

/// Retry configuration with exponential backoff parameters
#[derive(Debug, Clone)]
pub struct RetryConfig {
    /// Maximum number of retry attempts (default: 3)
    pub max_attempts: u32,
    
    /// Initial delay before first retry (default: 100ms)
    pub initial_delay: Duration,
    
    /// Maximum delay between retries (default: 30s)
    pub max_delay: Duration,
    
    /// Backoff multiplier for exponential growth (default: 2.0)
    pub backoff_multiplier: f64,
    
    /// Maximum jitter percentage to add randomness (default: 0.1 = 10%)
    pub jitter_factor: f64,
    
    /// Overall timeout for all retry attempts (default: 5 minutes)
    pub total_timeout: Option<Duration>,
    
    /// Whether to retry on rate limit errors (default: true)
    pub retry_on_rate_limit: bool,
    
    /// Whether to retry on network errors (default: true) 
    pub retry_on_network_errors: bool,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            max_attempts: 3,
            initial_delay: Duration::from_millis(100),
            max_delay: Duration::from_secs(30),
            backoff_multiplier: 2.0,
            jitter_factor: 0.1,
            total_timeout: Some(Duration::from_secs(300)), // 5 minutes
            retry_on_rate_limit: true,
            retry_on_network_errors: true,
        }
    }
}

impl RetryConfig {
    /// Create a fast retry config for low-latency operations
    pub fn fast() -> Self {
        Self {
            max_attempts: 2,
            initial_delay: Duration::from_millis(50),
            max_delay: Duration::from_secs(5),
            backoff_multiplier: 1.5,
            total_timeout: Some(Duration::from_secs(30)),
            ..Default::default()
        }
    }
    
    /// Create a conservative retry config for critical operations
    pub fn conservative() -> Self {
        Self {
            max_attempts: 5,
            initial_delay: Duration::from_millis(200),
            max_delay: Duration::from_secs(60),
            backoff_multiplier: 2.5,
            total_timeout: Some(Duration::from_secs(600)), // 10 minutes
            ..Default::default()
        }
    }
    
    /// Create a retry config optimized for network operations
    pub fn network() -> Self {
        Self {
            max_attempts: 4,
            initial_delay: Duration::from_millis(500),
            max_delay: Duration::from_secs(45),
            backoff_multiplier: 2.0,
            retry_on_rate_limit: true,
            retry_on_network_errors: true,
            ..Default::default()
        }
    }
}

/// Retry attempt information passed to the operation
#[derive(Debug, Clone)]
pub struct RetryAttempt {
    /// Current attempt number (1-based)
    pub attempt: u32,
    
    /// Time elapsed since first attempt
    pub elapsed: Duration,
    
    /// Delay that was applied before this attempt
    pub previous_delay: Option<Duration>,
    
    /// Whether this is the final attempt
    pub is_final_attempt: bool,
}

/// Retry operation result with context
#[derive(Debug)]
pub struct RetryResult<T> {
    /// Final result after all retry attempts
    pub result: Result<T, AgentError>,
    
    /// Total number of attempts made
    pub attempts_made: u32,
    
    /// Total time spent retrying
    pub total_elapsed: Duration,
    
    /// Last error encountered (if operation failed)
    pub last_error: Option<AgentError>,
}

/// Main retry executor with exponential backoff
pub struct RetryExecutor {
    config: RetryConfig,
}

impl RetryExecutor {
    /// Create a new retry executor with the given configuration
    pub fn new(config: RetryConfig) -> Self {
        Self { config }
    }
    
    /// Create a retry executor with default configuration
    pub fn default() -> Self {
        Self::new(RetryConfig::default())
    }
    
    /// Execute an operation with retry logic and exponential backoff
    pub async fn execute<F, Fut, T>(&self, operation: F) -> RetryResult<T>
    where
        F: Fn(RetryAttempt) -> Fut,
        Fut: Future<Output = Result<T, AgentError>>,
    {
        let start_time = Instant::now();
        let mut current_delay = self.config.initial_delay;
        let mut last_error = None;
        
        for attempt in 1..=self.config.max_attempts {
            let elapsed = start_time.elapsed();
            
            // Check total timeout
            if let Some(timeout) = self.config.total_timeout {
                if elapsed >= timeout {
                    warn!("🔄 Retry total timeout exceeded after {:.2}s", elapsed.as_secs_f64());
                    break;
                }
            }
            
            let retry_attempt = RetryAttempt {
                attempt,
                elapsed,
                previous_delay: if attempt > 1 { Some(current_delay) } else { None },
                is_final_attempt: attempt == self.config.max_attempts,
            };
            
            debug!(
                "🔄 Retry attempt {}/{} (elapsed: {:.2}s)", 
                attempt, self.config.max_attempts, elapsed.as_secs_f64()
            );
            
            // Execute the operation
            match operation(retry_attempt).await {
                Ok(result) => {
                    if attempt > 1 {
                        info!(
                            "✅ Operation succeeded on attempt {}/{} after {:.2}s",
                            attempt, self.config.max_attempts, elapsed.as_secs_f64()
                        );
                    }
                    
                    return RetryResult {
                        result: Ok(result),
                        attempts_made: attempt,
                        total_elapsed: elapsed,
                        last_error: None,
                    };
                }
                Err(error) => {
                    // Store error message instead of cloning the error
                    let error_msg = error.to_string();
                    last_error = Some(AgentError::critical(&format!("Retry failed: {}", error_msg), crate::errors::ErrorSeverity::High));
                    
                    // Check if error is retryable
                    if !self.is_retryable_error(&error) {
                        debug!("🚫 Error is not retryable: {}", error);
                        break;
                    }
                    
                    // Log the error and retry info
                    if attempt < self.config.max_attempts {
                        warn!(
                            "⚠️  Attempt {}/{} failed: {} (will retry in {:.2}s)",
                            attempt, self.config.max_attempts, error, current_delay.as_secs_f64()
                        );
                        
                        // Apply delay with jitter before next attempt
                        let delay_with_jitter = self.apply_jitter(current_delay);
                        sleep(delay_with_jitter).await;
                        
                        // Calculate next delay using exponential backoff
                        current_delay = self.calculate_next_delay(current_delay);
                    } else {
                        error!("❌ Final attempt {}/{} failed: {}", attempt, self.config.max_attempts, error);
                    }
                }
            }
        }
        
        let final_elapsed = start_time.elapsed();
        
        match last_error {
            Some(error) => RetryResult {
                result: Err(AgentError::critical("Retry operation failed", crate::errors::ErrorSeverity::High)),
                attempts_made: self.config.max_attempts,
                total_elapsed: final_elapsed,
                last_error: Some(error),
            },
            None => RetryResult {
                result: Err(AgentError::critical("Retry operation failed without specific error", crate::errors::ErrorSeverity::High)),
                attempts_made: self.config.max_attempts,
                total_elapsed: final_elapsed,
                last_error: None,
            }
        }
    }
    
    /// Execute with a simple closure (convenience method)
    pub async fn execute_simple<F, Fut, T>(&self, operation: F) -> Result<T, AgentError>
    where
        F: Fn() -> Fut,
        Fut: Future<Output = Result<T, AgentError>>,
    {
        let result = self.execute(|_attempt| operation()).await;
        result.result
    }
    
    /// Check if an error should trigger a retry attempt
    fn is_retryable_error(&self, error: &AgentError) -> bool {
        match error {
            // Transport errors - check specific retryability
            AgentError::Transport(transport_err) => {
                if !self.config.retry_on_network_errors {
                    return false;
                }
                transport_err.is_retryable()
            }
            
            // Collector errors - mostly retryable except config issues
            AgentError::Collector(collector_err) => collector_err.is_retryable(),
            
            // Buffer errors - check if recoverable
            AgentError::Buffer(buffer_err) => buffer_err.is_retryable(),
            
            // IO errors are generally retryable
            AgentError::Io(_) => true,
            
            // Channel errors might be transient
            AgentError::ChannelError { .. } => true,
            
            // Configuration and parsing errors are not retryable
            AgentError::Config(_) => false,
            AgentError::Parser(_) => false,
            AgentError::UrlParse(_) => false,
            
            // Critical errors should not be retried
            AgentError::CriticalError { .. } => false,
            
            // Shutdown timeouts are not retryable
            AgentError::ShutdownTimeout { .. } => false,
            
            // Initialization failures are not retryable
            AgentError::InitializationFailed { .. } => false,
            
            // Task join errors are not retryable
            AgentError::TaskJoin(_) => false,
            
            // JSON parse errors are not retryable
            AgentError::Json(_) => false,
            
            // Management errors depend on specific type
            AgentError::Management(_) => false, // Generally not retryable
            
            // Resource errors might be retryable if temporary
            AgentError::Resource(_) => true,
            
            // Security errors are generally not retryable
            AgentError::Security(_) => false,
        }
    }
    
    /// Calculate next delay using exponential backoff
    fn calculate_next_delay(&self, current_delay: Duration) -> Duration {
        let next_delay_ms = (current_delay.as_millis() as f64 * self.config.backoff_multiplier) as u64;
        let next_delay = Duration::from_millis(next_delay_ms);
        
        // Cap at maximum delay
        if next_delay > self.config.max_delay {
            self.config.max_delay
        } else {
            next_delay
        }
    }
    
    /// Apply jitter to delay to avoid thundering herd problem
    fn apply_jitter(&self, delay: Duration) -> Duration {
        if self.config.jitter_factor <= 0.0 {
            return delay;
        }
        
        // Use a simple linear congruential generator for deterministic jitter
        // This avoids needing external random number dependencies
        let seed = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos() as u64;
        
        // Simple LCG: next = (a * seed + c) % m
        let a = 1664525u64;
        let c = 1013904223u64;
        let random = a.wrapping_mul(seed).wrapping_add(c);
        
        // Convert to 0.0-1.0 range
        let normalized = (random % 1000000) as f64 / 1000000.0;
        
        // Apply jitter: delay ± (jitter_factor * delay)
        let jitter_range = delay.as_secs_f64() * self.config.jitter_factor;
        let jitter = (normalized - 0.5) * 2.0 * jitter_range; // -jitter_range to +jitter_range
        
        let final_delay_secs = delay.as_secs_f64() + jitter;
        Duration::from_secs_f64(final_delay_secs.max(0.0))
    }
}

/// Convenience functions for common retry scenarios
impl RetryExecutor {
    /// Retry a network operation with network-optimized settings
    pub async fn retry_network_operation<F, Fut, T>(operation: F) -> Result<T, AgentError>
    where
        F: Fn() -> Fut,
        Fut: Future<Output = Result<T, AgentError>>,
    {
        let executor = RetryExecutor::new(RetryConfig::network());
        executor.execute_simple(operation).await
    }
    
    /// Retry a critical operation with conservative settings
    pub async fn retry_critical_operation<F, Fut, T>(operation: F) -> Result<T, AgentError>
    where
        F: Fn() -> Fut,
        Fut: Future<Output = Result<T, AgentError>>,
    {
        let executor = RetryExecutor::new(RetryConfig::conservative());
        executor.execute_simple(operation).await
    }
    
    /// Retry a fast operation with minimal delay
    pub async fn retry_fast_operation<F, Fut, T>(operation: F) -> Result<T, AgentError>
    where
        F: Fn() -> Fut,
        Fut: Future<Output = Result<T, AgentError>>,
    {
        let executor = RetryExecutor::new(RetryConfig::fast());
        executor.execute_simple(operation).await
    }
}

/// Circuit breaker integration for retry operations
#[derive(Debug, Clone)]
pub struct CircuitBreakerConfig {
    /// Number of consecutive failures before opening circuit
    pub failure_threshold: u32,
    
    /// Duration to keep circuit open before attempting recovery
    pub recovery_timeout: Duration,
    
    /// Number of successful attempts needed to close circuit
    pub success_threshold: u32,
}

impl Default for CircuitBreakerConfig {
    fn default() -> Self {
        Self {
            failure_threshold: 5,
            recovery_timeout: Duration::from_secs(60),
            success_threshold: 2,
        }
    }
}

/// Circuit breaker state for managing retry behavior
#[derive(Debug, Clone, PartialEq)]
pub enum CircuitState {
    /// Circuit is closed, operations flow normally
    Closed,
    
    /// Circuit is open, operations are rejected
    Open {
        /// When the circuit was opened
        opened_at: Instant,
        /// Number of consecutive failures
        failure_count: u32,
    },
    
    /// Circuit is half-open, testing if service has recovered
    HalfOpen {
        /// Number of successful attempts in half-open state
        success_count: u32,
    },
}

/// Circuit breaker for managing retry behavior based on failure patterns
pub struct CircuitBreaker {
    config: CircuitBreakerConfig,
    state: std::sync::Arc<tokio::sync::RwLock<CircuitState>>,
    failure_count: std::sync::Arc<std::sync::atomic::AtomicU32>,
}

impl CircuitBreaker {
    /// Create a new circuit breaker with the given configuration
    pub fn new(config: CircuitBreakerConfig) -> Self {
        Self {
            config,
            state: std::sync::Arc::new(tokio::sync::RwLock::new(CircuitState::Closed)),
            failure_count: std::sync::Arc::new(std::sync::atomic::AtomicU32::new(0)),
        }
    }
    
    /// Check if the circuit allows operations
    pub async fn is_operation_allowed(&self) -> bool {
        let state = self.state.read().await;
        
        match &*state {
            CircuitState::Closed => true,
            CircuitState::HalfOpen { .. } => true,
            CircuitState::Open { opened_at, .. } => {
                // Check if recovery timeout has elapsed
                opened_at.elapsed() >= self.config.recovery_timeout
            }
        }
    }
    
    /// Record a successful operation
    pub async fn record_success(&self) {
        let mut state = self.state.write().await;
        
        match &*state {
            CircuitState::Closed => {
                // Reset failure count
                self.failure_count.store(0, std::sync::atomic::Ordering::SeqCst);
            }
            CircuitState::HalfOpen { success_count } => {
                let new_success_count = success_count + 1;
                
                if new_success_count >= self.config.success_threshold {
                    // Close the circuit
                    *state = CircuitState::Closed;
                    self.failure_count.store(0, std::sync::atomic::Ordering::SeqCst);
                    info!("🔄 Circuit breaker closed after {} successful attempts", new_success_count);
                } else {
                    *state = CircuitState::HalfOpen { 
                        success_count: new_success_count 
                    };
                }
            }
            CircuitState::Open { opened_at, .. } => {
                // Transition to half-open if recovery timeout has elapsed
                if opened_at.elapsed() >= self.config.recovery_timeout {
                    *state = CircuitState::HalfOpen { success_count: 1 };
                    info!("🔄 Circuit breaker transitioned to half-open state");
                }
            }
        }
    }
    
    /// Record a failed operation
    pub async fn record_failure(&self) {
        let failure_count = self.failure_count.fetch_add(1, std::sync::atomic::Ordering::SeqCst) + 1;
        
        if failure_count >= self.config.failure_threshold {
            let mut state = self.state.write().await;
            
            match &*state {
                CircuitState::Closed => {
                    *state = CircuitState::Open {
                        opened_at: Instant::now(),
                        failure_count,
                    };
                    warn!("🔄 Circuit breaker opened after {} consecutive failures", failure_count);
                }
                CircuitState::HalfOpen { .. } => {
                    *state = CircuitState::Open {
                        opened_at: Instant::now(),
                        failure_count,
                    };
                    warn!("🔄 Circuit breaker reopened during half-open state");
                }
                CircuitState::Open { .. } => {
                    // Already open, just update failure count
                    *state = CircuitState::Open {
                        opened_at: Instant::now(),
                        failure_count,
                    };
                }
            }
        }
    }
    
    /// Get current circuit state
    pub async fn get_state(&self) -> CircuitState {
        self.state.read().await.clone()
    }
}

/// Enhanced retry executor with circuit breaker integration
pub struct RetryExecutorWithCircuitBreaker {
    retry_executor: RetryExecutor,
    circuit_breaker: CircuitBreaker,
}

impl RetryExecutorWithCircuitBreaker {
    /// Create a new retry executor with circuit breaker
    pub fn new(retry_config: RetryConfig, circuit_config: CircuitBreakerConfig) -> Self {
        Self {
            retry_executor: RetryExecutor::new(retry_config),
            circuit_breaker: CircuitBreaker::new(circuit_config),
        }
    }
    
    /// Execute operation with both retry logic and circuit breaker
    pub async fn execute<F, Fut, T>(&self, operation: F) -> RetryResult<T>
    where
        F: Fn(RetryAttempt) -> Fut + Clone,
        Fut: Future<Output = Result<T, AgentError>>,
    {
        // Check if circuit breaker allows operation
        if !self.circuit_breaker.is_operation_allowed().await {
            warn!("🔄 Circuit breaker is open, rejecting operation");
            return RetryResult {
                result: Err(AgentError::Transport(TransportError::CircuitBreakerOpen {
                    name: "retry_executor".to_string(),
                    state: "open".to_string(),
                    failure_count: 0, // We'd need to track this properly
                    next_attempt_at: None,
                })),
                attempts_made: 0,
                total_elapsed: Duration::ZERO,
                last_error: None,
            };
        }
        
        // Execute with retry logic
        let result = self.retry_executor.execute(operation).await;
        
        // Update circuit breaker based on result
        match &result.result {
            Ok(_) => {
                self.circuit_breaker.record_success().await;
            }
            Err(_) => {
                self.circuit_breaker.record_failure().await;
            }
        }
        
        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::time::{timeout, Duration};
    
    #[tokio::test]
    async fn test_retry_success_on_first_attempt() {
        let executor = RetryExecutor::default();
        
        let result = executor.execute_simple(|| async {
            Ok::<i32, AgentError>(42)
        }).await;
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 42);
    }
    
    #[tokio::test]
    async fn test_retry_success_after_failures() {
        let executor = RetryExecutor::new(RetryConfig {
            max_attempts: 3,
            initial_delay: Duration::from_millis(10),
            ..Default::default()
        });
        
        let attempt_count = std::sync::Arc::new(std::sync::atomic::AtomicU32::new(0));
        
        let result = executor.execute(|retry_attempt| {
            let count = attempt_count.clone();
            async move {
                let current = count.fetch_add(1, std::sync::atomic::Ordering::SeqCst) + 1;
                
                if current < 3 {
                    // Fail first two attempts
                    Err(AgentError::Transport(TransportError::connection_failed("network error")))
                } else {
                    // Succeed on third attempt
                    Ok(format!("success on attempt {}", retry_attempt.attempt))
                }
            }
        }).await;
        
        assert!(result.result.is_ok());
        assert_eq!(result.attempts_made, 3);
    }
    
    #[tokio::test]
    async fn test_retry_failure_non_retryable_error() {
        let executor = RetryExecutor::default();
        
        let result = executor.execute_simple(|| async {
            Err::<i32, AgentError>(AgentError::Config(crate::errors::ConfigError::Parse("invalid config".to_string())))
        }).await;
        
        assert!(result.is_err());
    }
    
    #[tokio::test]
    async fn test_circuit_breaker_opens_after_failures() {
        let circuit_breaker = CircuitBreaker::new(CircuitBreakerConfig {
            failure_threshold: 2,
            ..Default::default()
        });
        
        // Record failures
        circuit_breaker.record_failure().await;
        circuit_breaker.record_failure().await;
        
        // Circuit should be open
        let state = circuit_breaker.get_state().await;
        assert!(matches!(state, CircuitState::Open { .. }));
        
        // Operations should be blocked
        assert!(!circuit_breaker.is_operation_allowed().await);
    }
}