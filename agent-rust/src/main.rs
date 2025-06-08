// SecureWatch Rust Agent - Main Entry Point
// High-performance async SIEM agent built with Tokio

use clap::Parser;
use std::path::PathBuf;
use tokio::signal;
use tracing::{error, info, warn};

mod agent;
mod collectors;
mod config;
mod transport;
mod utils;

use agent::SecureWatchAgent;
use config::AgentConfig;

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    /// Configuration file path
    #[arg(short, long, default_value = "agent.toml")]
    config: PathBuf,

    /// Agent ID (auto-generated if not provided)
    #[arg(short, long)]
    agent_id: Option<String>,

    /// Log level
    #[arg(short, long, default_value = "info")]
    log_level: String,

    /// Run in daemon mode
    #[arg(short, long)]
    daemon: bool,

    /// Validate configuration and exit
    #[arg(long)]
    validate_config: bool,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();

    // Initialize tracing/logging
    init_logging(&cli.log_level)?;

    info!("🛡️  SecureWatch Agent v{} starting...", env!("CARGO_PKG_VERSION"));
    info!("🦀 Built with Rust and Tokio async runtime");

    // Load configuration
    let config = match AgentConfig::load(&cli.config) {
        Ok(config) => {
            info!("✅ Configuration loaded from: {:?}", cli.config);
            config
        }
        Err(e) => {
            error!("❌ Failed to load configuration: {}", e);
            return Err(e.into());
        }
    };

    // Validate config if requested
    if cli.validate_config {
        info!("✅ Configuration is valid");
        return Ok(());
    }

    // Create and start agent
    let mut agent = SecureWatchAgent::new(config, cli.agent_id).await?;

    // Handle graceful shutdown
    let shutdown_future = async {
        let _ = signal::ctrl_c().await;
        warn!("🛑 Received shutdown signal, stopping agent...");
    };

    // Run agent with graceful shutdown
    tokio::select! {
        result = agent.run() => {
            match result {
                Ok(_) => info!("✅ Agent stopped successfully"),
                Err(e) => error!("❌ Agent stopped with error: {}", e),
            }
        }
        _ = shutdown_future => {
            info!("🔄 Initiating graceful shutdown...");
            agent.shutdown().await?;
            info!("✅ Agent shutdown complete");
        }
    }

    Ok(())
}

fn init_logging(level: &str) -> Result<(), Box<dyn std::error::Error>> {
    use tracing_subscriber::{fmt, EnvFilter};

    let filter = EnvFilter::try_from_default_env()
        .or_else(|_| EnvFilter::try_new(level))?;

    fmt()
        .with_env_filter(filter)
        .with_target(false)
        .with_thread_ids(true)
        .with_file(true)
        .with_line_number(true)
        .init();

    Ok(())
}