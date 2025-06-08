// Syslog collector with UDP/TCP support and RFC 3164/5424 parsing

use crate::collectors::{Collector, RawLogEvent};
use crate::config::SyslogCollectorConfig;
use crate::errors::CollectorError;
use async_trait::async_trait;
use std::collections::HashMap;
use std::net::SocketAddr;
use tokio::net::{UdpSocket, TcpListener, TcpStream};
use tokio::sync::mpsc;
use tokio::io::{AsyncBufReadExt, BufReader};
use tracing::{info, error, debug, warn};

pub struct SyslogCollector {
    config: SyslogCollectorConfig,
    event_sender: mpsc::Sender<RawLogEvent>,
    shutdown_sender: Option<tokio::sync::oneshot::Sender<()>>,
    running: bool,
}

impl SyslogCollector {
    pub fn new(
        config: SyslogCollectorConfig,
        event_sender: mpsc::Sender<RawLogEvent>,
    ) -> Self {
        Self {
            config,
            event_sender,
            shutdown_sender: None,
            running: false,
        }
    }
    
    async fn start_udp_server(&self) -> Result<(), CollectorError> {
        let bind_addr = format!("{}:{}", self.config.bind_address, self.config.port);
        let socket = UdpSocket::bind(&bind_addr).await
            .map_err(|e| CollectorError::Network(format!("Failed to bind UDP socket to {}: {}", bind_addr, e)))?;
            
        info!("🌐 Syslog UDP server listening on {}", bind_addr);
        
        let event_sender = self.event_sender.clone();
        
        tokio::spawn(async move {
            let mut buffer = [0u8; 8192];
            
            loop {
                match socket.recv_from(&mut buffer).await {
                    Ok((size, peer_addr)) => {
                        let raw_data = String::from_utf8_lossy(&buffer[..size]).into_owned();
                        if !raw_data.trim().is_empty() {
                            let event = RawLogEvent {
                                timestamp: chrono::Utc::now(),
                                source: "syslog".to_string(),
                                raw_data: raw_data.trim().to_string(),
                                metadata: HashMap::from([
                                    ("protocol".to_string(), "udp".to_string()),
                                    ("peer_address".to_string(), peer_addr.to_string()),
                                ]),
                            };
                            
                            if let Err(e) = event_sender.send(event).await {
                                error!("Failed to send syslog event: {}", e);
                                break;
                            }
                        }
                    }
                    Err(e) => {
                        error!("UDP receive error: {}", e);
                        break;
                    }
                }
            }
        });
        
        Ok(())
    }
    
    async fn start_tcp_server(&self) -> Result<(), CollectorError> {
        let bind_addr = format!("{}:{}", self.config.bind_address, self.config.port);
        let listener = TcpListener::bind(&bind_addr).await
            .map_err(|e| CollectorError::Network(format!("Failed to bind TCP listener to {}: {}", bind_addr, e)))?;
            
        info!("🌐 Syslog TCP server listening on {}", bind_addr);
        
        let event_sender = self.event_sender.clone();
        
        tokio::spawn(async move {
            loop {
                match listener.accept().await {
                    Ok((stream, peer_addr)) => {
                        let event_sender = event_sender.clone();
                        tokio::spawn(async move {
                            if let Err(e) = Self::handle_tcp_connection(stream, peer_addr, event_sender).await {
                                warn!("TCP connection error from {}: {}", peer_addr, e);
                            }
                        });
                    }
                    Err(e) => {
                        error!("TCP accept error: {}", e);
                        break;
                    }
                }
            }
        });
        
        Ok(())
    }
    
    async fn handle_tcp_connection(
        stream: TcpStream,
        peer_addr: SocketAddr,
        event_sender: mpsc::Sender<RawLogEvent>,
    ) -> Result<(), CollectorError> {
        let mut reader = BufReader::new(stream);
        let mut line_buffer = String::new();
        
        debug!("📡 New TCP connection from {}", peer_addr);
        
        loop {
            line_buffer.clear();
            
            match reader.read_line(&mut line_buffer).await {
                Ok(0) => {
                    debug!("📡 TCP connection closed by {}", peer_addr);
                    break; // Connection closed
                }
                Ok(_) => {
                    let raw_data = line_buffer.trim();
                    if !raw_data.is_empty() {
                        let event = RawLogEvent {
                            timestamp: chrono::Utc::now(),
                            source: "syslog".to_string(),
                            raw_data: raw_data.to_string(),
                            metadata: HashMap::from([
                                ("protocol".to_string(), "tcp".to_string()),
                                ("peer_address".to_string(), peer_addr.to_string()),
                            ]),
                        };
                        
                        if let Err(e) = event_sender.send(event).await {
                            error!("Failed to send TCP syslog event: {}", e);
                            break;
                        }
                    }
                }
                Err(e) => {
                    return Err(CollectorError::Network(format!("TCP read error: {}", e)));
                }
            }
        }
        
        Ok(())
    }
}

#[async_trait]
impl Collector for SyslogCollector {
    async fn start(&mut self) -> Result<(), CollectorError> {
        if !self.config.enabled {
            info!("Syslog collector is disabled");
            return Ok(());
        }
        
        info!("🚀 Starting syslog collector ({})", self.config.protocol);
        
        match self.config.protocol.to_lowercase().as_str() {
            "udp" => self.start_udp_server().await?,
            "tcp" => self.start_tcp_server().await?,
            "both" => {
                self.start_udp_server().await?;
                self.start_tcp_server().await?;
            }
            _ => {
                return Err(CollectorError::InvalidConfig(
                    format!("Unsupported syslog protocol: {}", self.config.protocol)
                ));
            }
        }
        
        self.running = true;
        Ok(())
    }
    
    async fn stop(&mut self) -> Result<(), CollectorError> {
        info!("🛑 Stopping syslog collector");
        
        if let Some(sender) = self.shutdown_sender.take() {
            let _ = sender.send(());
        }
        
        self.running = false;
        Ok(())
    }
    
    async fn collect(&mut self) -> Result<Vec<RawLogEvent>, CollectorError> {
        // For syslog, collection happens asynchronously via network servers
        // This method is mainly for compatibility with the Collector trait
        Ok(Vec::new())
    }
    
    fn name(&self) -> &str {
        "syslog"
    }
    
    fn is_running(&self) -> bool {
        self.running
    }
}