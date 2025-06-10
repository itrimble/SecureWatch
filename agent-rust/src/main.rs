// SecureWatch Rust Agent - Main Entry Point with Tokio async patterns

use clap::Parser;
use std::path::PathBuf;
use tokio::signal;
use tracing::{error, info, Level, warn};
use tracing_subscriber::{
    fmt::{self, time::ChronoUtc},
    layer::SubscriberExt,
    util::SubscriberInitExt,
    EnvFilter, Registry,
};
use tracing_appender::{non_blocking, rolling};

use securewatch_agent::{AgentConfig, Agent};

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

    /// Enable JSON structured logging for SIEM integration
    #[arg(long)]
    json_logs: bool,

    /// Log output directory (default: logs/)
    #[arg(long, default_value = "logs")]
    log_dir: PathBuf,

    /// Validate configuration and exit
    #[arg(long)]
    validate_config: bool,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();

    // Initialize enterprise-grade logging
    init_logging(&cli.log_level, cli.json_logs, &cli.log_dir).await?;

    info!(
        version = env!("CARGO_PKG_VERSION"),
        runtime = "tokio",
        "🛡️  SecureWatch Agent starting..."
    );
    info!(
        language = "rust",
        async_runtime = "tokio",
        "🦀 Built with Rust and Tokio async runtime"
    );

    // Load configuration
    let config = if cli.config.exists() {
        info!(
            config_file = %cli.config.display(),
            source = "file",
            "📖 Loading configuration from file"
        );
        AgentConfig::load_from_file(cli.config.to_str().unwrap()).await?
    } else {
        info!(
            source = "default",
            "📝 Using default configuration"
        );
        AgentConfig::default()
    };

    // Validate config if requested
    if cli.validate_config {
        info!(
            action = "validate_config",
            status = "valid",
            "✅ Configuration is valid"
        );
        return Ok(());
    }

    // Create and initialize agent
    let mut agent = Agent::new(config)?;
    agent.initialize().await?;

    // Setup graceful shutdown with Ctrl+C handling
    let shutdown_future = async {
        signal::ctrl_c().await.expect("Failed to listen for ctrl_c");
        info!(
            signal = "SIGINT",
            action = "shutdown_requested",
            "🛑 Received Ctrl+C, shutting down..."
        );
    };

    // Run agent with graceful shutdown using tokio::select!
    tokio::select! {
        result = agent.run() => {
            match result {
                Ok(_) => info!(
                    status = "completed",
                    exit_code = 0,
                    "✅ Agent completed successfully"
                ),
                Err(e) => error!(
                    status = "failed",
                    error = %e,
                    exit_code = 1,
                    "❌ Agent failed"
                ),
            }
        }
        _ = shutdown_future => {
            info!(
                action = "graceful_shutdown",
                trigger = "signal",
                "🛑 Graceful shutdown initiated"
            );
        }
    }

    info!(
        action = "shutdown",
        status = "complete",
        "👋 SecureWatch Agent shutting down"
    );
    Ok(())
}

async fn init_logging(
    level: &str,
    json_format: bool,
    log_dir: &PathBuf,
) -> Result<(), Box<dyn std::error::Error>> {
    // Parse log level
    let log_level = match level.to_lowercase().as_str() {
        "trace" => Level::TRACE,
        "debug" => Level::DEBUG,
        "info" => Level::INFO,
        "warn" => Level::WARN,
        "error" => Level::ERROR,
        _ => Level::INFO,
    };

    // Create log directory if it doesn't exist
    tokio::fs::create_dir_all(log_dir).await?;

    // Setup environment filter with support for RUST_LOG
    let env_filter = EnvFilter::builder()
        .with_default_directive(log_level.into())
        .from_env_lossy();

    // Setup file appender with daily rotation
    let file_appender = rolling::daily(log_dir, "securewatch-agent.log");
    let (non_blocking_file, _guard) = non_blocking(file_appender);

    // Setup console output
    let (non_blocking_stdout, _stdout_guard) = non_blocking(std::io::stdout());

    if json_format {
        // JSON structured logging for SIEM integration
        Registry::default()
            .with(env_filter)
            .with(
                fmt::layer()
                    .json()
                    .with_timer(ChronoUtc::with_format("%Y-%m-%dT%H:%M:%S%.3fZ".into()))
                    .with_current_span(true)
                    .with_span_list(true)
                    .with_target(true)
                    .with_thread_ids(true)
                    .with_thread_names(true)
                    .with_file(true)
                    .with_line_number(true)
                    .with_writer(non_blocking_file)
                    .with_ansi(false),
            )
            .with(
                fmt::layer()
                    .compact()
                    .with_timer(ChronoUtc::with_format("%H:%M:%S%.3f".into()))
                    .with_target(false)
                    .with_thread_ids(false)
                    .with_file(false)
                    .with_line_number(false)
                    .with_writer(non_blocking_stdout)
                    .with_ansi(true),
            )
            .init();

        info!(
            format = "json",
            file_path = %log_dir.join("securewatch-agent.log").display(),
            "📊 Structured JSON logging enabled for SIEM integration"
        );
    } else {
        // Human-readable logging for development
        Registry::default()
            .with(env_filter)
            .with(
                fmt::layer()
                    .with_timer(ChronoUtc::with_format("%Y-%m-%d %H:%M:%S%.3f".into()))
                    .with_target(true)
                    .with_thread_ids(false)
                    .with_file(false)
                    .with_line_number(false)
                    .with_writer(non_blocking_file)
                    .with_ansi(false),
            )
            .with(
                fmt::layer()
                    .compact()
                    .with_timer(ChronoUtc::with_format("%H:%M:%S%.3f".into()))
                    .with_target(false)
                    .with_thread_ids(false)
                    .with_file(false)
                    .with_line_number(false)
                    .with_writer(non_blocking_stdout)
                    .with_ansi(true),
            )
            .init();

        info!(
            format = "human",
            file_path = %log_dir.join("securewatch-agent.log").display(),
            "📝 Human-readable logging enabled"
        );
    }

    // Prevent guards from being dropped
    std::mem::forget(_guard);
    std::mem::forget(_stdout_guard);

    Ok(())
}