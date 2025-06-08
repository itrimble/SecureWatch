// SecureWatch Rust Agent - Main Entry Point with Tokio async patterns

use clap::Parser;
use std::path::PathBuf;
use tokio::signal;
use tracing::{error, info, Level};
use tracing_subscriber;

mod config;
mod errors;
mod agent;
mod collectors;
mod transport;
mod buffer;
mod parsers;
mod utils;

use config::AgentConfig;
use agent::Agent;

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
    let config = if cli.config.exists() {
        info!("📖 Loading configuration from: {:?}", cli.config);
        AgentConfig::load_from_file(cli.config.to_str().unwrap()).await?
    } else {
        info!("📝 Using default configuration");
        AgentConfig::default()
    };

    // Validate config if requested
    if cli.validate_config {
        info!("✅ Configuration is valid");
        return Ok(());
    }

    // Create and initialize agent
    let mut agent = Agent::new(config)?;
    agent.initialize().await?;

    // Setup graceful shutdown with Ctrl+C handling
    let shutdown_future = async {
        signal::ctrl_c().await.expect("Failed to listen for ctrl_c");
        info!("🛑 Received Ctrl+C, shutting down...");
    };

    // Run agent with graceful shutdown using tokio::select!
    tokio::select! {
        result = agent.run() => {
            match result {
                Ok(_) => info!("✅ Agent completed successfully"),
                Err(e) => error!("❌ Agent failed: {}", e),
            }
        }
        _ = shutdown_future => {
            info!("🛑 Graceful shutdown initiated");
        }
    }

    info!("👋 SecureWatch Agent shutting down");
    Ok(())
}

fn init_logging(level: &str) -> Result<(), Box<dyn std::error::Error>> {
    let log_level = match level.to_lowercase().as_str() {
        "trace" => Level::TRACE,
        "debug" => Level::DEBUG,
        "info" => Level::INFO,
        "warn" => Level::WARN,
        "error" => Level::ERROR,
        _ => Level::INFO,
    };

    tracing_subscriber::fmt()
        .with_max_level(log_level)
        .with_target(false)
        .with_thread_ids(false)
        .with_file(false)
        .with_line_number(false)
        .init();

    Ok(())
}