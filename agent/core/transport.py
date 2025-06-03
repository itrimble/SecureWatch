"""
SecureWatch Agent - Secure Transport
Handles secure HTTPS/WebSocket communication with mTLS authentication
"""

import asyncio
import json
import ssl
import time
import zstandard as zstd
import websockets
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
import aiohttp
import logging
from cryptography import x509
from cryptography.hazmat.primitives import serialization
from datetime import datetime, timedelta

from .exceptions import TransportError, AuthenticationError


@dataclass
class AuthConfig:
    """Authentication configuration"""
    client_cert_path: str
    client_key_path: str
    ca_cert_path: str
    cert_rotation_days: int = 30
    verify_hostname: bool = True


@dataclass
class CompressionConfig:
    """Compression configuration"""
    enabled: bool = True
    algorithm: str = 'zstd'  # zstandard
    level: int = 3
    min_size: int = 1024  # Only compress if data is larger than this


@dataclass
class RetryConfig:
    """Retry configuration"""
    max_attempts: int = 3
    base_delay: float = 1.0
    max_delay: float = 60.0
    exponential_base: float = 2.0
    jitter: bool = True


class SecureTransport:
    """
    Secure transport layer for SecureWatch agent communication
    Supports HTTPS and WebSocket with mTLS authentication
    """
    
    def __init__(self, endpoint: str, auth_config: AuthConfig, 
                 compression_config: CompressionConfig, retry_config: RetryConfig,
                 agent_id: str):
        self.endpoint = endpoint
        self.auth_config = auth_config
        self.compression_config = compression_config
        self.retry_config = retry_config
        self.agent_id = agent_id
        
        self.logger = logging.getLogger(f"securewatch.transport.{agent_id}")
        
        # Transport state
        self.ssl_context: Optional[ssl.SSLContext] = None
        self.session: Optional[aiohttp.ClientSession] = None
        self.websocket: Optional[websockets.WebSocketServerProtocol] = None
        self.compressor: Optional[zstd.ZstdCompressor] = None
        
        # Statistics
        self.bytes_sent = 0
        self.bytes_received = 0
        self.requests_sent = 0
        self.requests_failed = 0
        self.cert_expiry_check_time = 0
    
    async def initialize(self) -> None:
        """Initialize secure transport"""
        try:
            self.logger.info("Initializing secure transport")
            
            # Setup SSL context with mTLS
            await self._setup_ssl_context()
            
            # Initialize compression if enabled
            if self.compression_config.enabled:
                await self._setup_compression()
            
            # Create HTTP session
            connector = aiohttp.TCPConnector(
                ssl=self.ssl_context,
                limit=100,
                limit_per_host=10,
                keepalive_timeout=30
            )
            
            timeout = aiohttp.ClientTimeout(
                total=30,
                connect=10,
                sock_read=10,
                sock_connect=10
            )
            
            self.session = aiohttp.ClientSession(
                connector=connector,
                timeout=timeout,
                headers={
                    'User-Agent': f'SecureWatch-Agent/{self.agent_id}',
                    'X-Agent-ID': self.agent_id
                }
            )
            
            # Test connection
            await self._test_connection()
            
            self.logger.info("Secure transport initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize transport: {e}")
            raise TransportError(f"Transport initialization failed: {e}") from e
    
    async def _setup_ssl_context(self) -> None:
        """Setup SSL context with mTLS authentication"""
        try:
            # Create SSL context
            self.ssl_context = ssl.create_default_context(ssl.Purpose.SERVER_AUTH)
            
            # Load CA certificate
            ca_cert_path = Path(self.auth_config.ca_cert_path)
            if not ca_cert_path.exists():
                raise FileNotFoundError(f"CA certificate not found: {ca_cert_path}")
            
            self.ssl_context.load_verify_locations(str(ca_cert_path))
            
            # Load client certificate and key
            client_cert_path = Path(self.auth_config.client_cert_path)
            client_key_path = Path(self.auth_config.client_key_path)
            
            if not client_cert_path.exists():
                raise FileNotFoundError(f"Client certificate not found: {client_cert_path}")
            if not client_key_path.exists():
                raise FileNotFoundError(f"Client key not found: {client_key_path}")
            
            self.ssl_context.load_cert_chain(str(client_cert_path), str(client_key_path))
            
            # Configure SSL settings
            self.ssl_context.check_hostname = self.auth_config.verify_hostname
            self.ssl_context.verify_mode = ssl.CERT_REQUIRED
            
            # Set minimum TLS version
            self.ssl_context.minimum_version = ssl.TLSVersion.TLSv1_2
            
            # Check certificate expiry
            await self._check_certificate_expiry()
            
            self.logger.info("SSL context configured with mTLS")
            
        except Exception as e:
            raise AuthenticationError(f"SSL setup failed: {e}") from e
    
    async def _check_certificate_expiry(self) -> None:
        """Check if client certificate is near expiry"""
        try:
            cert_path = Path(self.auth_config.client_cert_path)
            
            with open(cert_path, 'rb') as f:
                cert_data = f.read()
            
            cert = x509.load_pem_x509_certificate(cert_data)
            expiry_date = cert.not_valid_after
            
            # Check if certificate expires within rotation days
            rotation_threshold = datetime.now() + timedelta(days=self.auth_config.cert_rotation_days)
            
            if expiry_date <= rotation_threshold:
                self.logger.warning(f"Client certificate expires soon: {expiry_date}")
                # In production, trigger certificate renewal process
            
            self.cert_expiry_check_time = time.time()
            
        except Exception as e:
            self.logger.error(f"Certificate expiry check failed: {e}")
    
    async def _setup_compression(self) -> None:
        """Setup compression for data transmission"""
        try:
            if self.compression_config.algorithm == 'zstd':
                self.compressor = zstd.ZstdCompressor(
                    level=self.compression_config.level,
                    write_content_size=True,
                    write_checksum=True
                )
                self.logger.info(f"Zstandard compression enabled (level {self.compression_config.level})")
            else:
                raise ValueError(f"Unsupported compression algorithm: {self.compression_config.algorithm}")
                
        except Exception as e:
            raise TransportError(f"Compression setup failed: {e}") from e
    
    def _compress_data(self, data: bytes) -> bytes:
        """Compress data if configured and beneficial"""
        if not self.compression_config.enabled or not self.compressor:
            return data
        
        # Only compress if data is larger than minimum size
        if len(data) < self.compression_config.min_size:
            return data
        
        try:
            compressed = self.compressor.compress(data)
            
            # Only use compressed data if it's actually smaller
            if len(compressed) < len(data):
                self.logger.debug(f"Compressed {len(data)} bytes to {len(compressed)} bytes "
                                f"({100 - (len(compressed) * 100 // len(data))}% reduction)")
                return compressed
            else:
                return data
                
        except Exception as e:
            self.logger.warning(f"Compression failed, sending uncompressed: {e}")
            return data
    
    async def _test_connection(self) -> None:
        """Test the connection to the endpoint"""
        try:
            health_url = f"{self.endpoint}/health"
            
            async with self.session.get(health_url) as response:
                if response.status == 200:
                    self.logger.info("Connection test successful")
                else:
                    raise TransportError(f"Health check failed: {response.status}")
                    
        except Exception as e:
            raise TransportError(f"Connection test failed: {e}") from e
    
    async def send_events(self, events: List[Dict[str, Any]]) -> Tuple[bool, int]:
        """
        Send events to the server
        Returns (success, bytes_sent)
        """
        if not events:
            return True, 0
        
        try:
            # Serialize events to JSON
            payload = {
                'agent_id': self.agent_id,
                'timestamp': time.time(),
                'events': events
            }
            
            json_data = json.dumps(payload, default=str).encode('utf-8')
            
            # Compress data if configured
            compressed_data = self._compress_data(json_data)
            
            # Determine content encoding
            headers = {
                'Content-Type': 'application/json',
                'X-Event-Count': str(len(events))
            }
            
            if len(compressed_data) < len(json_data):
                headers['Content-Encoding'] = 'zstd'
            
            # Send with retry logic
            success = await self._send_with_retry(
                'POST',
                f"{self.endpoint}/events",
                data=compressed_data,
                headers=headers
            )
            
            if success:
                self.bytes_sent += len(compressed_data)
                self.requests_sent += 1
                return True, len(compressed_data)
            else:
                self.requests_failed += 1
                return False, 0
                
        except Exception as e:
            self.logger.error(f"Failed to send events: {e}")
            self.requests_failed += 1
            return False, 0
    
    async def send_heartbeat(self, status: Dict[str, Any]) -> bool:
        """Send heartbeat with agent status"""
        try:
            payload = {
                'agent_id': self.agent_id,
                'timestamp': time.time(),
                'type': 'heartbeat',
                'status': status
            }
            
            json_data = json.dumps(payload, default=str).encode('utf-8')
            compressed_data = self._compress_data(json_data)
            
            headers = {'Content-Type': 'application/json'}
            if len(compressed_data) < len(json_data):
                headers['Content-Encoding'] = 'zstd'
            
            success = await self._send_with_retry(
                'POST',
                f"{self.endpoint}/heartbeat",
                data=compressed_data,
                headers=headers
            )
            
            if success:
                self.bytes_sent += len(compressed_data)
            
            return success
            
        except Exception as e:
            self.logger.error(f"Failed to send heartbeat: {e}")
            return False
    
    async def _send_with_retry(self, method: str, url: str, **kwargs) -> bool:
        """Send HTTP request with retry logic"""
        last_exception = None
        
        for attempt in range(self.retry_config.max_attempts):
            try:
                async with self.session.request(method, url, **kwargs) as response:
                    if response.status == 200:
                        return True
                    elif response.status in (401, 403):
                        # Authentication/authorization errors - don't retry
                        raise AuthenticationError(f"Authentication failed: {response.status}")
                    elif response.status >= 500:
                        # Server errors - retry
                        raise TransportError(f"Server error: {response.status}")
                    else:
                        # Client errors - don't retry
                        raise TransportError(f"Client error: {response.status}")
                        
            except (AuthenticationError, TransportError) as e:
                if isinstance(e, AuthenticationError):
                    # Don't retry auth errors
                    raise
                last_exception = e
                
            except Exception as e:
                last_exception = e
            
            # Calculate delay for next attempt
            if attempt < self.retry_config.max_attempts - 1:
                delay = min(
                    self.retry_config.base_delay * (self.retry_config.exponential_base ** attempt),
                    self.retry_config.max_delay
                )
                
                if self.retry_config.jitter:
                    import random
                    delay *= (0.5 + random.random() * 0.5)
                
                self.logger.warning(f"Request failed (attempt {attempt + 1}/{self.retry_config.max_attempts}), "
                                  f"retrying in {delay:.1f}s: {last_exception}")
                
                await asyncio.sleep(delay)
        
        self.logger.error(f"Request failed after {self.retry_config.max_attempts} attempts: {last_exception}")
        return False
    
    async def get_configuration_updates(self) -> Optional[Dict[str, Any]]:
        """Check for configuration updates from server"""
        try:
            url = f"{self.endpoint}/agents/{self.agent_id}/config"
            
            async with self.session.get(url) as response:
                if response.status == 200:
                    return await response.json()
                elif response.status == 304:
                    # No updates available
                    return None
                else:
                    self.logger.warning(f"Config update check failed: {response.status}")
                    return None
                    
        except Exception as e:
            self.logger.error(f"Failed to check for config updates: {e}")
            return None
    
    async def close(self) -> None:
        """Close transport connections"""
        try:
            self.logger.info("Closing transport connections")
            
            if self.websocket:
                await self.websocket.close()
            
            if self.session:
                await self.session.close()
            
            self.logger.info("Transport connections closed")
            
        except Exception as e:
            self.logger.error(f"Error closing transport: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get transport statistics"""
        return {
            'bytes_sent': self.bytes_sent,
            'bytes_received': self.bytes_received,
            'requests_sent': self.requests_sent,
            'requests_failed': self.requests_failed,
            'success_rate': (
                self.requests_sent / (self.requests_sent + self.requests_failed)
                if (self.requests_sent + self.requests_failed) > 0 else 0
            ),
            'cert_expiry_check_time': self.cert_expiry_check_time,
            'compression_enabled': self.compression_config.enabled
        }


class WebSocketTransport:
    """
    WebSocket-based transport for real-time communication
    """
    
    def __init__(self, endpoint: str, ssl_context: ssl.SSLContext, agent_id: str):
        self.endpoint = endpoint.replace('https://', 'wss://').replace('http://', 'ws://')
        self.ssl_context = ssl_context
        self.agent_id = agent_id
        self.logger = logging.getLogger(f"securewatch.websocket.{agent_id}")
        
        self.websocket: Optional[websockets.WebSocketServerProtocol] = None
        self.running = False
        self.reconnect_delay = 5.0
    
    async def connect(self) -> None:
        """Connect to WebSocket endpoint"""
        try:
            headers = {
                'X-Agent-ID': self.agent_id,
                'User-Agent': f'SecureWatch-Agent/{self.agent_id}'
            }
            
            self.websocket = await websockets.connect(
                f"{self.endpoint}/ws",
                ssl=self.ssl_context,
                extra_headers=headers,
                ping_interval=30,
                ping_timeout=10
            )
            
            self.logger.info("WebSocket connected successfully")
            
        except Exception as e:
            self.logger.error(f"WebSocket connection failed: {e}")
            raise TransportError(f"WebSocket connection failed: {e}") from e
    
    async def listen(self) -> None:
        """Listen for messages from server"""
        self.running = True
        
        while self.running:
            try:
                if not self.websocket:
                    await self.connect()
                
                async for message in self.websocket:
                    try:
                        data = json.loads(message)
                        await self._handle_message(data)
                    except json.JSONDecodeError as e:
                        self.logger.error(f"Invalid JSON received: {e}")
                    except Exception as e:
                        self.logger.error(f"Message handling error: {e}")
                        
            except websockets.exceptions.ConnectionClosed:
                self.logger.warning("WebSocket connection closed, reconnecting...")
                self.websocket = None
                await asyncio.sleep(self.reconnect_delay)
                
            except Exception as e:
                self.logger.error(f"WebSocket error: {e}")
                self.websocket = None
                await asyncio.sleep(self.reconnect_delay)
    
    async def _handle_message(self, data: Dict[str, Any]) -> None:
        """Handle incoming WebSocket message"""
        message_type = data.get('type')
        
        if message_type == 'config_update':
            self.logger.info("Received configuration update")
            # Handle configuration update
            
        elif message_type == 'command':
            command = data.get('command')
            self.logger.info(f"Received command: {command}")
            # Handle remote commands
            
        elif message_type == 'ping':
            # Respond to ping
            await self.send_message({'type': 'pong', 'timestamp': time.time()})
            
        else:
            self.logger.warning(f"Unknown message type: {message_type}")
    
    async def send_message(self, data: Dict[str, Any]) -> bool:
        """Send message via WebSocket"""
        try:
            if not self.websocket:
                return False
            
            message = json.dumps(data, default=str)
            await self.websocket.send(message)
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to send WebSocket message: {e}")
            return False
    
    async def close(self) -> None:
        """Close WebSocket connection"""
        self.running = False
        if self.websocket:
            await self.websocket.close()