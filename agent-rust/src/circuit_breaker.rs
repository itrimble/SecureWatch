// Circuit breaker pattern implementation for external service resilience
// Provides automatic failure detection, recovery attempts, and service isolation

use crate::errors::{TransportError, TransportResult};
use std::sync::Arc;
use std::time::{Duration, SystemTime};
use tokio::sync::RwLock;
use tracing::{info, warn, error, debug};

/// Circuit breaker states following the standard pattern
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CircuitBreakerState {
    /// Circuit is closed - requests are allowed through
    Closed,
    /// Circuit is open - requests are rejected immediately
    Open,
    /// Circuit is half-open - allowing test requests to check service recovery
    HalfOpen,
}

impl std::fmt::Display for CircuitBreakerState {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CircuitBreakerState::Closed => write!(f, "CLOSED"),
            CircuitBreakerState::Open => write!(f, "OPEN"),
            CircuitBreakerState::HalfOpen => write!(f, "HALF_OPEN"),
        }
    }
}

/// Configuration for circuit breaker behavior
#[derive(Debug, Clone)]
pub struct CircuitBreakerConfig {
    /// Number of consecutive failures required to open the circuit
    pub failure_threshold: u32,
    /// Duration to wait before attempting recovery (half-open state)
    pub recovery_timeout: Duration,
    /// Number of successful requests in half-open state to close circuit
    pub success_threshold: u32,
    /// Maximum duration to keep circuit open before forcing half-open
    pub max_open_duration: Duration,
    /// Sliding window size for failure rate calculation
    pub sliding_window_size: usize,
    /// Failure rate threshold (0.0-1.0) to open circuit
    pub failure_rate_threshold: f64,
    /// Minimum number of requests before evaluating failure rate
    pub minimum_requests: u32,
}

impl Default for CircuitBreakerConfig {
    fn default() -> Self {
        Self {
            failure_threshold: 5,
            recovery_timeout: Duration::from_secs(30),
            success_threshold: 3,
            max_open_duration: Duration::from_secs(300), // 5 minutes
            sliding_window_size: 100,
            failure_rate_threshold: 0.5, // 50% failure rate
            minimum_requests: 10,
        }
    }
}

/// Circuit breaker statistics for monitoring and debugging
#[derive(Debug, Clone)]
pub struct CircuitBreakerStats {
    pub name: String,
    pub state: CircuitBreakerState,
    pub failure_count: u32,
    pub success_count: u32,
    pub total_requests: u64,
    pub last_failure_time: Option<SystemTime>,
    pub last_success_time: Option<SystemTime>,
    pub next_attempt_time: Option<SystemTime>,
    pub failure_rate: f64,
    pub uptime_percentage: f64,
    pub state_changes: u32,
}

/// Request outcome for circuit breaker tracking
#[derive(Debug, Clone, Copy)]
pub enum RequestOutcome {
    Success,
    Failure,
    Timeout,
    Cancelled,
}

impl RequestOutcome {
    pub fn is_success(&self) -> bool {
        matches!(self, RequestOutcome::Success)
    }
    
    pub fn is_failure(&self) -> bool {
        !self.is_success()
    }
}

/// Sliding window for tracking request outcomes
#[derive(Debug)]
struct SlidingWindow {
    outcomes: Vec<RequestOutcome>,
    current_index: usize,
    size: usize,
    total_requests: u64,
}

impl SlidingWindow {
    fn new(size: usize) -> Self {
        Self {
            outcomes: Vec::with_capacity(size),
            current_index: 0,
            size,
            total_requests: 0,
        }
    }
    
    fn record(&mut self, outcome: RequestOutcome) {
        self.total_requests += 1;
        
        if self.outcomes.len() < self.size {
            self.outcomes.push(outcome);
        } else {
            self.outcomes[self.current_index] = outcome;
            self.current_index = (self.current_index + 1) % self.size;
        }
    }
    
    fn failure_rate(&self) -> f64 {
        if self.outcomes.is_empty() {
            return 0.0;
        }
        
        let failures = self.outcomes.iter().filter(|o| o.is_failure()).count();
        failures as f64 / self.outcomes.len() as f64
    }
    
    fn request_count(&self) -> usize {
        self.outcomes.len()
    }
    
    fn clear(&mut self) {
        self.outcomes.clear();
        self.current_index = 0;
    }
}

/// Internal circuit breaker state tracking
#[derive(Debug)]
struct CircuitBreakerInner {
    name: String,
    config: CircuitBreakerConfig,
    state: CircuitBreakerState,
    consecutive_failures: u32,
    consecutive_successes: u32,
    last_state_change: SystemTime,
    last_failure_time: Option<SystemTime>,
    last_success_time: Option<SystemTime>,
    next_attempt_time: Option<SystemTime>,
    sliding_window: SlidingWindow,
    state_changes: u32,
    total_requests: u64,
    total_successes: u64,
    total_failures: u64,
}

impl CircuitBreakerInner {
    fn new(name: String, config: CircuitBreakerConfig) -> Self {
        let sliding_window = SlidingWindow::new(config.sliding_window_size);
        
        Self {
            name,
            config,
            state: CircuitBreakerState::Closed,
            consecutive_failures: 0,
            consecutive_successes: 0,
            last_state_change: SystemTime::now(),
            last_failure_time: None,
            last_success_time: None,
            next_attempt_time: None,
            sliding_window,
            state_changes: 0,
            total_requests: 0,
            total_successes: 0,
            total_failures: 0,
        }
    }
    
    fn should_allow_request(&mut self) -> TransportResult<()> {
        let now = SystemTime::now();
        self.total_requests += 1;
        
        match self.state {
            CircuitBreakerState::Closed => {
                // Check if we should open based on failure rate
                if self.sliding_window.request_count() >= self.config.minimum_requests as usize {
                    let failure_rate = self.sliding_window.failure_rate();
                    if failure_rate >= self.config.failure_rate_threshold {
                        self.transition_to_open(now);
                        return Err(TransportError::CircuitBreakerOpen {
                            name: self.name.clone(),
                            state: self.state.to_string(),
                            failure_count: self.consecutive_failures,
                            next_attempt_at: self.next_attempt_time,
                        });
                    }
                }
                
                // Also check consecutive failures
                if self.consecutive_failures >= self.config.failure_threshold {
                    self.transition_to_open(now);
                    return Err(TransportError::CircuitBreakerOpen {
                        name: self.name.clone(),
                        state: self.state.to_string(),
                        failure_count: self.consecutive_failures,
                        next_attempt_at: self.next_attempt_time,
                    });
                }
                
                Ok(())
            },
            CircuitBreakerState::Open => {
                // Check if recovery timeout has passed
                if let Some(next_attempt) = self.next_attempt_time {
                    if now >= next_attempt {
                        self.transition_to_half_open(now);
                        Ok(())
                    } else {
                        Err(TransportError::CircuitBreakerOpen {
                            name: self.name.clone(),
                            state: self.state.to_string(),
                            failure_count: self.consecutive_failures,
                            next_attempt_at: self.next_attempt_time,
                        })
                    }
                } else {
                    // Should not happen, but handle gracefully
                    self.transition_to_half_open(now);
                    Ok(())
                }
            },
            CircuitBreakerState::HalfOpen => {
                // Allow limited requests in half-open state
                Ok(())
            },
        }
    }
    
    fn record_success(&mut self) {
        let now = SystemTime::now();
        self.consecutive_failures = 0;
        self.consecutive_successes += 1;
        self.last_success_time = Some(now);
        self.total_successes += 1;
        
        self.sliding_window.record(RequestOutcome::Success);
        
        match self.state {
            CircuitBreakerState::Closed => {
                // Stay closed on success
            },
            CircuitBreakerState::Open => {
                // This should not happen in open state
                warn!("Circuit breaker '{}' recorded success while OPEN", self.name);
            },
            CircuitBreakerState::HalfOpen => {
                // Check if we have enough successes to close
                if self.consecutive_successes >= self.config.success_threshold {
                    self.transition_to_closed(now);
                }
            },
        }
        
        debug!(
            "Circuit breaker '{}' recorded success (consecutive: {}, state: {})",
            self.name, self.consecutive_successes, self.state
        );
    }
    
    fn record_failure(&mut self, outcome: RequestOutcome) {
        let now = SystemTime::now();
        self.consecutive_successes = 0;
        self.consecutive_failures += 1;
        self.last_failure_time = Some(now);
        self.total_failures += 1;
        
        self.sliding_window.record(outcome);
        
        match self.state {
            CircuitBreakerState::Closed => {
                // Check if we should open
                if self.consecutive_failures >= self.config.failure_threshold {
                    self.transition_to_open(now);
                } else {
                    // Also check failure rate
                    if self.sliding_window.request_count() >= self.config.minimum_requests as usize {
                        let failure_rate = self.sliding_window.failure_rate();
                        if failure_rate >= self.config.failure_rate_threshold {
                            self.transition_to_open(now);
                        }
                    }
                }
            },
            CircuitBreakerState::Open => {
                // Stay open on failure
            },
            CircuitBreakerState::HalfOpen => {
                // Go back to open on any failure in half-open state
                self.transition_to_open(now);
            },
        }
        
        debug!(
            "Circuit breaker '{}' recorded failure (consecutive: {}, state: {})",
            self.name, self.consecutive_failures, self.state
        );
    }
    
    fn transition_to_open(&mut self, now: SystemTime) {
        if self.state != CircuitBreakerState::Open {
            self.state = CircuitBreakerState::Open;
            self.last_state_change = now;
            self.state_changes += 1;
            self.next_attempt_time = Some(now + self.config.recovery_timeout);
            
            warn!(
                "Circuit breaker '{}' opened after {} consecutive failures (failure rate: {:.2}%)",
                self.name,
                self.consecutive_failures,
                self.sliding_window.failure_rate() * 100.0
            );
        }
    }
    
    fn transition_to_half_open(&mut self, now: SystemTime) {
        if self.state != CircuitBreakerState::HalfOpen {
            self.state = CircuitBreakerState::HalfOpen;
            self.last_state_change = now;
            self.state_changes += 1;
            self.consecutive_successes = 0;
            self.next_attempt_time = None;
            
            info!(
                "Circuit breaker '{}' transitioned to HALF_OPEN for recovery testing",
                self.name
            );
        }
    }
    
    fn transition_to_closed(&mut self, now: SystemTime) {
        if self.state != CircuitBreakerState::Closed {
            self.state = CircuitBreakerState::Closed;
            self.last_state_change = now;
            self.state_changes += 1;
            self.consecutive_failures = 0;
            self.next_attempt_time = None;
            self.sliding_window.clear(); // Reset failure tracking
            
            info!(
                "Circuit breaker '{}' closed after {} consecutive successes",
                self.name, self.consecutive_successes
            );
        }
    }
    
    fn force_open(&mut self) {
        let now = SystemTime::now();
        self.transition_to_open(now);
        self.next_attempt_time = Some(now + self.config.max_open_duration);
        
        warn!("Circuit breaker '{}' forced open manually", self.name);
    }
    
    fn force_closed(&mut self) {
        let now = SystemTime::now();
        self.consecutive_failures = 0;
        self.consecutive_successes = 0;
        self.sliding_window.clear();
        self.transition_to_closed(now);
        
        info!("Circuit breaker '{}' forced closed manually", self.name);
    }
    
    fn force_half_open(&mut self) {
        let now = SystemTime::now();
        self.consecutive_successes = 0;
        self.transition_to_half_open(now);
        
        info!("Circuit breaker '{}' forced to HALF_OPEN manually", self.name);
    }
    
    fn reset_stats(&mut self) {
        self.consecutive_failures = 0;
        self.consecutive_successes = 0;
        self.sliding_window.clear();
        self.total_requests = 0;
        self.total_successes = 0;
        self.total_failures = 0;
        self.state_changes = 0;
        
        debug!("Circuit breaker '{}' statistics reset", self.name);
    }
    
    fn get_stats(&self) -> CircuitBreakerStats {
        let uptime_percentage = if self.total_requests > 0 {
            (self.total_successes as f64 / self.total_requests as f64) * 100.0
        } else {
            100.0
        };
        
        CircuitBreakerStats {
            name: self.name.clone(),
            state: self.state,
            failure_count: self.consecutive_failures,
            success_count: self.consecutive_successes,
            total_requests: self.total_requests,
            last_failure_time: self.last_failure_time,
            last_success_time: self.last_success_time,
            next_attempt_time: self.next_attempt_time,
            failure_rate: self.sliding_window.failure_rate(),
            uptime_percentage,
            state_changes: self.state_changes,
        }
    }
}

/// Circuit breaker for protecting external service calls
/// Implements the circuit breaker pattern with automatic failure detection and recovery
#[derive(Debug, Clone)]
pub struct CircuitBreaker {
    inner: Arc<RwLock<CircuitBreakerInner>>,
}

impl CircuitBreaker {
    /// Create a new circuit breaker with the given name and configuration
    pub fn new(name: String, config: CircuitBreakerConfig) -> Self {
        let inner = CircuitBreakerInner::new(name.clone(), config);
        
        debug!("Created circuit breaker '{}' with config: {:?}", name, inner.config);
        
        Self {
            inner: Arc::new(RwLock::new(inner)),
        }
    }
    
    /// Create a circuit breaker with default configuration
    pub fn with_defaults(name: String) -> Self {
        Self::new(name, CircuitBreakerConfig::default())
    }
    
    /// Execute a function with circuit breaker protection
    /// Returns the result of the function or a circuit breaker error
    pub async fn call<F, Fut, T>(&self, operation: F) -> TransportResult<T>
    where
        F: FnOnce() -> Fut,
        Fut: std::future::Future<Output = TransportResult<T>>,
    {
        // Check if request is allowed
        {
            let mut inner = self.inner.write().await;
            inner.should_allow_request()?;
        }
        
        // Execute the operation
        let start_time = SystemTime::now();
        let result = operation().await;
        let duration = start_time.elapsed().unwrap_or(Duration::ZERO);
        
        // Record the outcome
        {
            let mut inner = self.inner.write().await;
            match &result {
                Ok(_) => {
                    inner.record_success();
                    debug!("Circuit breaker '{}' call succeeded in {:?}", inner.name, duration);
                },
                Err(error) => {
                    let outcome = match error {
                        TransportError::Timeout { .. } => RequestOutcome::Timeout,
                        TransportError::ConnectionFailed { .. } => RequestOutcome::Failure,
                        TransportError::ServerError { status, .. } => {
                            // Only treat 5xx errors as failures
                            if *status >= 500 {
                                RequestOutcome::Failure
                            } else {
                                RequestOutcome::Success // Treat 4xx as successful from circuit breaker perspective
                            }
                        },
                        _ => RequestOutcome::Failure,
                    };
                    
                    inner.record_failure(outcome);
                    debug!("Circuit breaker '{}' call failed in {:?}: {}", inner.name, duration, error);
                },
            }
        }
        
        result
    }
    
    /// Check if the circuit breaker would allow a request
    pub async fn is_call_allowed(&self) -> bool {
        let mut inner = self.inner.write().await;
        inner.should_allow_request().is_ok()
    }
    
    /// Get current circuit breaker state
    pub async fn state(&self) -> CircuitBreakerState {
        let inner = self.inner.read().await;
        inner.state
    }
    
    /// Get comprehensive circuit breaker statistics
    pub async fn stats(&self) -> CircuitBreakerStats {
        let inner = self.inner.read().await;
        inner.get_stats()
    }
    
    /// Manually force the circuit breaker to open state
    pub async fn force_open(&self) {
        let mut inner = self.inner.write().await;
        inner.force_open();
    }
    
    /// Manually force the circuit breaker to closed state
    pub async fn force_closed(&self) {
        let mut inner = self.inner.write().await;
        inner.force_closed();
    }
    
    /// Manually force the circuit breaker to half-open state
    pub async fn force_half_open(&self) {
        let mut inner = self.inner.write().await;
        inner.force_half_open();
    }
    
    /// Reset all circuit breaker statistics
    pub async fn reset(&self) {
        let mut inner = self.inner.write().await;
        inner.reset_stats();
    }
    
    /// Get the circuit breaker name
    pub async fn name(&self) -> String {
        let inner = self.inner.read().await;
        inner.name.clone()
    }
    
    /// Update circuit breaker configuration
    pub async fn update_config(&self, config: CircuitBreakerConfig) {
        let mut inner = self.inner.write().await;
        inner.config = config;
        inner.sliding_window = SlidingWindow::new(inner.config.sliding_window_size);
        
        info!("Circuit breaker '{}' configuration updated", inner.name);
    }
}

/// Circuit breaker registry for managing multiple circuit breakers
#[derive(Debug)]
pub struct CircuitBreakerRegistry {
    breakers: Arc<RwLock<std::collections::HashMap<String, CircuitBreaker>>>,
}

impl CircuitBreakerRegistry {
    /// Create a new circuit breaker registry
    pub fn new() -> Self {
        Self {
            breakers: Arc::new(RwLock::new(std::collections::HashMap::new())),
        }
    }
    
    /// Get or create a circuit breaker with the given name and configuration
    pub async fn get_or_create(&self, name: String, config: CircuitBreakerConfig) -> CircuitBreaker {
        let mut breakers = self.breakers.write().await;
        
        breakers.entry(name.clone())
            .or_insert_with(|| CircuitBreaker::new(name, config))
            .clone()
    }
    
    /// Get an existing circuit breaker by name
    pub async fn get(&self, name: &str) -> Option<CircuitBreaker> {
        let breakers = self.breakers.read().await;
        breakers.get(name).cloned()
    }
    
    /// Remove a circuit breaker from the registry
    pub async fn remove(&self, name: &str) -> Option<CircuitBreaker> {
        let mut breakers = self.breakers.write().await;
        breakers.remove(name)
    }
    
    /// List all circuit breaker names
    pub async fn list_names(&self) -> Vec<String> {
        let breakers = self.breakers.read().await;
        breakers.keys().cloned().collect()
    }
    
    /// Get statistics for all circuit breakers
    pub async fn get_all_stats(&self) -> Vec<CircuitBreakerStats> {
        let breakers = self.breakers.read().await;
        let mut stats = Vec::new();
        
        for breaker in breakers.values() {
            stats.push(breaker.stats().await);
        }
        
        stats
    }
    
    /// Force all circuit breakers to a specific state
    pub async fn force_all_state(&self, target_state: CircuitBreakerState) {
        let breakers = self.breakers.read().await;
        
        for breaker in breakers.values() {
            match target_state {
                CircuitBreakerState::Open => breaker.force_open().await,
                CircuitBreakerState::Closed => breaker.force_closed().await,
                CircuitBreakerState::HalfOpen => breaker.force_half_open().await,
            }
        }
        
        info!("Forced all {} circuit breakers to {} state", breakers.len(), target_state);
    }
    
    /// Reset statistics for all circuit breakers
    pub async fn reset_all_stats(&self) {
        let breakers = self.breakers.read().await;
        
        for breaker in breakers.values() {
            breaker.reset().await;
        }
        
        info!("Reset statistics for all {} circuit breakers", breakers.len());
    }
}

impl Default for CircuitBreakerRegistry {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests;