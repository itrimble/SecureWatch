// SecureWatch Agent Library - Simple async implementation using Tokio patterns

pub mod config;
pub mod simple_agent;

pub use config::AgentConfig;
pub use simple_agent::{SimpleAgent, SimpleLogEvent};