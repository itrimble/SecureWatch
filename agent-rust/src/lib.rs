// SecureWatch Agent Library - Enterprise async implementation using Tokio patterns

pub mod config;
pub mod errors;
pub mod agent;
pub mod collectors;
pub mod transport;
pub mod circuit_breaker;
#[cfg(feature = "persistent-storage")]
pub mod buffer;
#[cfg(not(feature = "persistent-storage"))]
#[path = "buffer_minimal.rs"]
pub mod buffer;
pub mod parsers;
pub mod utils;
pub mod retry;
pub mod resource_monitor;
pub mod throttle;
pub mod resource_management;
pub mod emergency_shutdown;
pub mod security;
pub mod validation;
#[cfg(feature = "grpc-management")]
pub mod management;
#[cfg(not(feature = "grpc-management"))]
#[path = "management_disabled.rs"]
pub mod management;

pub use config::AgentConfig;
pub use errors::{AgentError, Result};
pub use agent::Agent;
pub use circuit_breaker::{CircuitBreaker, CircuitBreakerConfig, CircuitBreakerState, CircuitBreakerRegistry};