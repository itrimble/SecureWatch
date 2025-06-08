// Syslog collector implementation using Tokio async networking

use super::base::{Collector, CollectorError, CollectorStats};
use crate::config::SyslogCollectorConfig;
use crate::transport::LogEvent;

use async_trait::async_trait;
use std::net::SocketAddr;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH, Instant};
use tokio::net::UdpSocket;
use tokio::sync::{mpsc, RwLock};
use tracing::{debug, error, info, instrument, warn};

pub struct SyslogCollector {
    config: SyslogCollectorConfig,
    running: Arc<AtomicBool>,
    stats: Arc<RwLock<CollectorStats>>,
    shutdown_tx: Option<mpsc::Sender<()>>,
    start_time: Instant,
}

impl SyslogCollector {
    pub async fn new(config: SyslogCollectorConfig) -> Result<Self, CollectorError> {
        let stats = Arc::new(RwLock::new(CollectorStats {
            name: "syslog".to_string(),
            ..Default::default()
        }));

        Ok(Self {
            config,
            running: Arc::new(AtomicBool::new(false)),
            stats,
            shutdown_tx: None,
            start_time: Instant::now(),
        })
    }

    #[instrument(skip(self, event_tx))]
    async fn run_udp_server(&self, event_tx: mpsc::Sender<LogEvent>) -> Result<(), CollectorError> {
        let bind_addr: SocketAddr = format!("{}:{}", self.config.bind_address, self.config.port)
            .parse()
            .map_err(|e| CollectorError::Config(format!("Invalid bind address: {}", e)))?;

        info!("📡 Starting Syslog UDP server on {}", bind_addr);

        let socket = UdpSocket::bind(bind_addr).await
            .map_err(|e| CollectorError::Network(format!("Failed to bind UDP socket: {}", e)))?;

        let mut buf = [0u8; 8192]; // Standard syslog message buffer
        let stats = Arc::clone(&self.stats);
        let running = Arc::clone(&self.running);

        while running.load(Ordering::Relaxed) {
            tokio::select! {
                result = socket.recv_from(&mut buf) => {
                    match result {
                        Ok((len, addr)) => {
                            let raw_message = &buf[..len];
                            if let Ok(message) = std::str::from_utf8(raw_message) {
                                let event = self.parse_syslog_message(message, addr).await;
                                
                                if let Err(e) = event_tx.send(event).await {
                                    warn!("Failed to send syslog event: {}", e);
                                    let mut stats = stats.write().await;
                                    stats.events_failed += 1;
                                } else {
                                    let mut stats = stats.write().await;
                                    stats.events_collected += 1;
                                }
                            } else {
                                warn!("Received non-UTF8 syslog message from {}", addr);
                                let mut stats = stats.write().await;
                                stats.events_failed += 1;
                            }
                        }
                        Err(e) => {
                            error!("UDP receive error: {}", e);
                            let mut stats = stats.write().await;
                            stats.last_error = Some(e.to_string());
                        }
                    }
                }
                // Check for shutdown periodically
                _ = tokio::time::sleep(tokio::time::Duration::from_millis(100)) => {
                    // Continue loop to check running flag
                }
            }
        }

        info!("📡 Syslog UDP server stopped");
        Ok(())
    }

    #[instrument(skip(self, event_tx))]
    async fn run_tcp_server(&self, event_tx: mpsc::Sender<LogEvent>) -> Result<(), CollectorError> {
        let bind_addr: SocketAddr = format!("{}:{}", self.config.bind_address, self.config.port)
            .parse()
            .map_err(|e| CollectorError::Config(format!("Invalid bind address: {}", e)))?;

        info!("📡 Starting Syslog TCP server on {}", bind_addr);

        let listener = tokio::net::TcpListener::bind(bind_addr).await
            .map_err(|e| CollectorError::Network(format!("Failed to bind TCP socket: {}", e)))?;

        let stats = Arc::clone(&self.stats);
        let running = Arc::clone(&self.running);

        while running.load(Ordering::Relaxed) {
            tokio::select! {
                result = listener.accept() => {
                    match result {
                        Ok((mut socket, addr)) => {
                            let event_tx = event_tx.clone();
                            let stats = Arc::clone(&stats);
                            
                            // Handle each TCP connection in a separate task
                            tokio::spawn(async move {
                                use tokio::io::{AsyncBufReadExt, BufReader};
                                
                                let reader = BufReader::new(&mut socket);
                                let mut lines = reader.lines();
                                
                                while let Ok(Some(line)) = lines.next_line().await {
                                    let event = Self::parse_syslog_message_static(&line, addr).await;
                                    
                                    if let Err(e) = event_tx.send(event).await {
                                        warn!("Failed to send TCP syslog event: {}", e);
                                        let mut stats = stats.write().await;
                                        stats.events_failed += 1;
                                        break;
                                    } else {
                                        let mut stats = stats.write().await;
                                        stats.events_collected += 1;
                                    }
                                }
                                
                                debug!("TCP connection from {} closed", addr);
                            });
                        }
                        Err(e) => {
                            error!("TCP accept error: {}", e);
                            let mut stats = stats.write().await;
                            stats.last_error = Some(e.to_string());
                        }
                    }
                }
                // Check for shutdown periodically
                _ = tokio::time::sleep(tokio::time::Duration::from_millis(100)) => {
                    // Continue loop to check running flag
                }
            }
        }

        info!("📡 Syslog TCP server stopped");
        Ok(())
    }

    async fn parse_syslog_message(&self, message: &str, source_addr: SocketAddr) -> LogEvent {
        Self::parse_syslog_message_static(message, source_addr).await
    }

    async fn parse_syslog_message_static(message: &str, source_addr: SocketAddr) -> LogEvent {
        // Basic RFC3164/RFC5424 syslog parsing
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        // Try to extract priority and facility
        let (priority, remaining) = if message.starts_with('<') && message.contains('>') {
            let end = message.find('>').unwrap();
            let priority_str = &message[1..end];
            if let Ok(priority) = priority_str.parse::<u8>() {
                (Some(priority), &message[end + 1..])
            } else {
                (None, message)
            }
        } else {
            (None, message)
        };

        let (facility, severity) = if let Some(p) = priority {
            (Some(p >> 3), Some(p & 0x7))
        } else {
            (None, None)
        };

        // Determine log level from severity
        let level = match severity {
            Some(0) => "emergency",
            Some(1) => "alert", 
            Some(2) => "critical",
            Some(3) => "error",
            Some(4) => "warning",
            Some(5) => "notice",
            Some(6) => "info",
            Some(7) => "debug",
            _ => "info",
        }.to_string();

        LogEvent {
            timestamp,
            level,
            message: remaining.trim().to_string(),
            source: format!("syslog://{}", source_addr),
            metadata: serde_json::json!({
                "collector": "syslog",
                "source_ip": source_addr.ip().to_string(),
                "source_port": source_addr.port(),
                "facility": facility,
                "severity": severity,
                "priority": priority,
                "raw_message": message,
            }),
        }
    }
}

#[async_trait]
impl Collector for SyslogCollector {
    fn name(&self) -> &str {
        "syslog"
    }

    #[instrument(skip(self, event_tx))]
    async fn start(&mut self, event_tx: mpsc::Sender<LogEvent>) -> Result<(), CollectorError> {
        if self.running.load(Ordering::Relaxed) {
            return Err(CollectorError::AlreadyRunning);
        }

        self.running.store(true, Ordering::Relaxed);
        self.start_time = Instant::now();

        let (shutdown_tx, mut shutdown_rx) = mpsc::channel::<()>(1);
        self.shutdown_tx = Some(shutdown_tx);

        let collector = match self.config.protocol.as_str() {
            "udp" => {
                let collector_clone = SyslogCollector {
                    config: self.config.clone(),
                    running: Arc::clone(&self.running),
                    stats: Arc::clone(&self.stats),
                    shutdown_tx: None,
                    start_time: self.start_time,
                };
                tokio::spawn(async move {
                    if let Err(e) = collector_clone.run_udp_server(event_tx).await {
                        error!("Syslog UDP server error: {}", e);
                    }
                })
            }
            "tcp" => {
                let collector_clone = SyslogCollector {
                    config: self.config.clone(),
                    running: Arc::clone(&self.running),
                    stats: Arc::clone(&self.stats),
                    shutdown_tx: None,
                    start_time: self.start_time,
                };
                tokio::spawn(async move {
                    if let Err(e) = collector_clone.run_tcp_server(event_tx).await {
                        error!("Syslog TCP server error: {}", e);
                    }
                })
            }
            _ => {
                return Err(CollectorError::Config(
                    format!("Unsupported protocol: {}", self.config.protocol)
                ));
            }
        };

        // Update stats
        {
            let mut stats = self.stats.write().await;
            stats.is_running = true;
        }

        info!("✅ Syslog collector started on {}:{} ({})", 
               self.config.bind_address, self.config.port, self.config.protocol);

        Ok(())
    }

    async fn stop(&mut self) -> Result<(), CollectorError> {
        if !self.running.load(Ordering::Relaxed) {
            return Err(CollectorError::NotRunning);
        }

        info!("🛑 Stopping syslog collector");

        self.running.store(false, Ordering::Relaxed);

        if let Some(shutdown_tx) = self.shutdown_tx.take() {
            let _ = shutdown_tx.send(()).await;
        }

        // Update stats
        {
            let mut stats = self.stats.write().await;
            stats.is_running = false;
        }

        info!("✅ Syslog collector stopped");
        Ok(())
    }

    fn is_running(&self) -> bool {
        self.running.load(Ordering::Relaxed)
    }

    async fn get_stats(&self) -> CollectorStats {
        let mut stats = self.stats.read().await.clone();
        stats.uptime_seconds = self.start_time.elapsed().as_secs();
        stats
    }
}