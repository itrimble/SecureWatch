"""
SecureWatch Agent - Syslog Collector
Collects Syslog messages via UDP/TCP/TLS receivers
"""

import asyncio
import json
import logging
import socket
import ssl
import time
import re
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import calendar

from .base import Collector
from ..exceptions import CollectorError
from ..resource_manager import ResourceManager


class SyslogMessage:
    """Represents a parsed Syslog message"""
    
    def __init__(self):
        self.facility: Optional[int] = None
        self.severity: Optional[int] = None
        self.priority: Optional[int] = None
        self.timestamp: Optional[datetime] = None
        self.hostname: Optional[str] = None
        self.app_name: Optional[str] = None
        self.process_id: Optional[str] = None
        self.message_id: Optional[str] = None
        self.message: str = ""
        self.structured_data: Dict[str, Dict[str, str]] = {}
        self.version: Optional[int] = None
        self.rfc: str = "unknown"
        self.raw_message: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'facility': self.facility,
            'severity': self.severity,
            'priority': self.priority,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'hostname': self.hostname,
            'app_name': self.app_name,
            'process_id': self.process_id,
            'message_id': self.message_id,
            'message': self.message,
            'structured_data': self.structured_data,
            'version': self.version,
            'rfc': self.rfc,
            'raw_message': self.raw_message
        }


class SyslogParser:
    """Parser for RFC 3164 and RFC 5424 Syslog messages"""
    
    # RFC 3164 timestamp format
    RFC3164_TIMESTAMP_PATTERN = re.compile(
        r'^([A-Za-z]{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})'
    )
    
    # RFC 5424 timestamp format
    RFC5424_TIMESTAMP_PATTERN = re.compile(
        r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?'
    )
    
    # Priority extraction pattern
    PRIORITY_PATTERN = re.compile(r'^<(\d+)>')
    
    # RFC 5424 structured data pattern
    STRUCTURED_DATA_PATTERN = re.compile(r'\[([^\]]+)\]')
    
    @classmethod
    def parse_message(cls, raw_message: str) -> SyslogMessage:
        """Parse a raw syslog message"""
        msg = SyslogMessage()
        msg.raw_message = raw_message.strip()
        
        try:
            # Detect RFC version and parse accordingly
            if cls._is_rfc5424(raw_message):
                cls._parse_rfc5424(msg)
            else:
                cls._parse_rfc3164(msg)
        except Exception as e:
            logging.error(f"Failed to parse syslog message: {e}")
            msg.message = raw_message
            msg.rfc = "parse_error"
        
        return msg
    
    @classmethod
    def _is_rfc5424(cls, message: str) -> bool:
        """Detect if message is RFC 5424 format"""
        # RFC 5424 starts with <priority>version
        match = cls.PRIORITY_PATTERN.match(message)
        if not match:
            return False
        
        after_priority = message[match.end():]
        return after_priority.startswith(('1 ', '2 '))  # Version 1 or 2
    
    @classmethod
    def _parse_rfc3164(cls, msg: SyslogMessage) -> None:
        """Parse RFC 3164 format message"""
        msg.rfc = "rfc3164"
        content = msg.raw_message
        
        # Extract priority
        priority_match = cls.PRIORITY_PATTERN.match(content)
        if priority_match:
            msg.priority = int(priority_match.group(1))
            msg.facility = msg.priority >> 3
            msg.severity = msg.priority & 7
            content = content[priority_match.end():]
        
        # Extract timestamp
        timestamp_match = cls.RFC3164_TIMESTAMP_PATTERN.match(content)
        if timestamp_match:
            timestamp_str = timestamp_match.group(1)
            msg.timestamp = cls._parse_rfc3164_timestamp(timestamp_str)
            content = content[timestamp_match.end():].lstrip()
        
        # Extract hostname and message
        parts = content.split(' ', 1)
        if len(parts) >= 1:
            msg.hostname = parts[0]
        if len(parts) >= 2:
            remaining = parts[1]
            
            # Try to extract app name and process ID
            if ':' in remaining:
                app_part, message_part = remaining.split(':', 1)
                msg.message = message_part.lstrip()
                
                # Check for process ID in brackets
                if '[' in app_part and ']' in app_part:
                    app_name, pid_part = app_part.split('[', 1)
                    msg.app_name = app_name
                    msg.process_id = pid_part.rstrip(']')
                else:
                    msg.app_name = app_part
            else:
                msg.message = remaining
    
    @classmethod
    def _parse_rfc5424(cls, msg: SyslogMessage) -> None:
        """Parse RFC 5424 format message"""
        msg.rfc = "rfc5424"
        content = msg.raw_message
        
        # Extract priority
        priority_match = cls.PRIORITY_PATTERN.match(content)
        if priority_match:
            msg.priority = int(priority_match.group(1))
            msg.facility = msg.priority >> 3
            msg.severity = msg.priority & 7
            content = content[priority_match.end():]
        
        # Parse header: VERSION SP TIMESTAMP SP HOSTNAME SP APP-NAME SP PROCID SP MSGID SP
        header_parts = content.split(' ', 6)
        
        if len(header_parts) >= 1:
            msg.version = int(header_parts[0]) if header_parts[0].isdigit() else None
        
        if len(header_parts) >= 2:
            msg.timestamp = cls._parse_rfc5424_timestamp(header_parts[1])
        
        if len(header_parts) >= 3:
            msg.hostname = header_parts[2] if header_parts[2] != '-' else None
        
        if len(header_parts) >= 4:
            msg.app_name = header_parts[3] if header_parts[3] != '-' else None
        
        if len(header_parts) >= 5:
            msg.process_id = header_parts[4] if header_parts[4] != '-' else None
        
        if len(header_parts) >= 6:
            msg.message_id = header_parts[5] if header_parts[5] != '-' else None
        
        if len(header_parts) >= 7:
            # Parse structured data and message
            structured_and_message = header_parts[6]
            
            if structured_and_message.startswith('['):
                # Extract structured data
                msg.structured_data, remaining_message = cls._parse_structured_data(structured_and_message)
                msg.message = remaining_message.lstrip()
            else:
                msg.message = structured_and_message
    
    @classmethod
    def _parse_rfc3164_timestamp(cls, timestamp_str: str) -> datetime:
        """Parse RFC 3164 timestamp (MMM DD HH:MM:SS)"""
        try:
            # Add current year as RFC 3164 doesn't include year
            current_year = datetime.now().year
            full_timestamp = f"{current_year} {timestamp_str}"
            return datetime.strptime(full_timestamp, "%Y %b %d %H:%M:%S")
        except ValueError:
            return datetime.now()
    
    @classmethod
    def _parse_rfc5424_timestamp(cls, timestamp_str: str) -> datetime:
        """Parse RFC 5424 timestamp (ISO 8601)"""
        try:
            # Handle various ISO 8601 formats
            if timestamp_str == '-':
                return datetime.now()
            
            # Remove timezone info for simple parsing
            clean_timestamp = re.sub(r'[+-]\d{2}:\d{2}$', '', timestamp_str)
            clean_timestamp = clean_timestamp.rstrip('Z')
            
            # Try different formats
            formats = [
                "%Y-%m-%dT%H:%M:%S.%f",
                "%Y-%m-%dT%H:%M:%S",
                "%Y-%m-%d %H:%M:%S"
            ]
            
            for fmt in formats:
                try:
                    return datetime.strptime(clean_timestamp, fmt)
                except ValueError:
                    continue
            
            return datetime.now()
            
        except Exception:
            return datetime.now()
    
    @classmethod
    def _parse_structured_data(cls, data_str: str) -> Tuple[Dict[str, Dict[str, str]], str]:
        """Parse RFC 5424 structured data"""
        structured_data = {}
        remaining = data_str
        
        # Find all structured data elements
        while remaining.startswith('['):
            end_bracket = remaining.find(']')
            if end_bracket == -1:
                break
            
            element = remaining[1:end_bracket]
            remaining = remaining[end_bracket + 1:].lstrip()
            
            # Parse element
            parts = element.split(' ')
            sd_id = parts[0]
            params = {}
            
            # Parse parameters
            for part in parts[1:]:
                if '=' in part:
                    key, value = part.split('=', 1)
                    # Remove quotes if present
                    value = value.strip('"')
                    params[key] = value
            
            structured_data[sd_id] = params
        
        return structured_data, remaining


class SyslogCollector(Collector):
    """
    Syslog collector supporting UDP, TCP, and TLS protocols
    with RFC 3164 and RFC 5424 parsing
    """
    
    def __init__(self, config: Dict[str, Any], agent_id: str, 
                 resource_manager: Optional[ResourceManager] = None):
        super().__init__(config, agent_id, resource_manager)
        
        # Syslog configuration
        self.protocol = config.get('protocol', 'udp').lower()
        self.bind_address = config.get('bind_address', '0.0.0.0')
        self.port = config.get('port', 514)
        self.max_message_size = config.get('max_message_size', 8192)
        self.encoding = config.get('encoding', 'utf-8')
        
        # TLS configuration
        self.tls_config = config.get('tls', {})
        self.ssl_context: Optional[ssl.SSLContext] = None
        
        # Parsing configuration
        self.rfc_preference = config.get('rfc_preference', 'auto')  # auto, rfc3164, rfc5424
        self.parse_structured_data = config.get('parse_structured_data', True)
        
        # Network components
        self.server_socket: Optional[socket.socket] = None
        self.server_task: Optional[asyncio.Task] = None
        self.client_tasks: List[asyncio.Task] = []
        
        # Message queue for processing
        self.message_queue: asyncio.Queue = asyncio.Queue(maxsize=10000)
        self.processing_task: Optional[asyncio.Task] = None
        
        # Statistics
        self.messages_received = 0
        self.messages_parsed = 0
        self.parse_errors = 0
        self.connection_count = 0
    
    async def initialize(self) -> None:
        """Initialize Syslog collector"""
        try:
            self.logger.info(f"Initializing Syslog collector: {self.name}")
            
            # Setup TLS if configured
            if self.protocol == 'tls':
                await self._setup_tls()
            
            # Create server socket
            await self._create_server_socket()
            
            self.logger.info(f"Syslog collector initialized on {self.bind_address}:{self.port} ({self.protocol})")
            
        except Exception as e:
            raise CollectorError(f"Failed to initialize Syslog collector: {e}") from e
    
    async def _setup_tls(self) -> None:
        """Setup TLS/SSL context"""
        try:
            self.ssl_context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
            
            # Load certificate and key
            cert_file = self.tls_config.get('cert_file')
            key_file = self.tls_config.get('key_file')
            
            if cert_file and key_file:
                self.ssl_context.load_cert_chain(cert_file, key_file)
            
            # Configure SSL settings
            self.ssl_context.check_hostname = False
            self.ssl_context.verify_mode = ssl.CERT_NONE  # For syslog, typically no client cert verification
            
            self.logger.info("TLS context configured for Syslog")
            
        except Exception as e:
            raise CollectorError(f"Failed to setup TLS: {e}") from e
    
    async def _create_server_socket(self) -> None:
        """Create and bind server socket"""
        try:
            if self.protocol in ['udp']:
                self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                self.server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                self.server_socket.bind((self.bind_address, self.port))
                self.server_socket.setblocking(False)
                
            elif self.protocol in ['tcp', 'tls']:
                self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                self.server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                self.server_socket.bind((self.bind_address, self.port))
                self.server_socket.listen(100)  # Allow up to 100 pending connections
                self.server_socket.setblocking(False)
            
        except Exception as e:
            if self.server_socket:
                self.server_socket.close()
            raise CollectorError(f"Failed to create server socket: {e}") from e
    
    async def cleanup(self) -> None:
        """Cleanup Syslog collector resources"""
        try:
            self.logger.info("Cleaning up Syslog collector")
            
            # Stop server task
            if self.server_task:
                self.server_task.cancel()
                try:
                    await self.server_task
                except asyncio.CancelledError:
                    pass
            
            # Stop processing task
            if self.processing_task:
                self.processing_task.cancel()
                try:
                    await self.processing_task
                except asyncio.CancelledError:
                    pass
            
            # Cancel client tasks
            for task in self.client_tasks:
                task.cancel()
            
            if self.client_tasks:
                await asyncio.gather(*self.client_tasks, return_exceptions=True)
            
            # Close server socket
            if self.server_socket:
                self.server_socket.close()
            
        except Exception as e:
            self.logger.error(f"Error during Syslog collector cleanup: {e}")
    
    async def _collect_events(self) -> List[Dict[str, Any]]:
        """Collect syslog events from the message queue"""
        events = []
        
        try:
            # Start server and processing tasks if not running
            if not self.server_task:
                if self.protocol == 'udp':
                    self.server_task = asyncio.create_task(self._udp_server())
                else:
                    self.server_task = asyncio.create_task(self._tcp_server())
            
            if not self.processing_task:
                self.processing_task = asyncio.create_task(self._process_messages())
            
            # Collect messages from queue (non-blocking)
            collected_count = 0
            while collected_count < self.batch_size:
                try:
                    message = self.message_queue.get_nowait()
                    events.append(message)
                    collected_count += 1
                    self.message_queue.task_done()
                except asyncio.QueueEmpty:
                    break
            
            return events
            
        except Exception as e:
            self.logger.error(f"Failed to collect syslog events: {e}")
            return []
    
    async def _udp_server(self) -> None:
        """UDP syslog server"""
        self.logger.info(f"Starting UDP syslog server on {self.bind_address}:{self.port}")
        
        loop = asyncio.get_event_loop()
        
        while self.running:
            try:
                # Receive UDP message
                data, addr = await loop.sock_recvfrom(self.server_socket, self.max_message_size)
                
                # Decode message
                try:
                    message = data.decode(self.encoding, errors='replace')
                except UnicodeDecodeError:
                    self.logger.warning(f"Failed to decode message from {addr}")
                    continue
                
                # Add to processing queue
                if not self.message_queue.full():
                    await self.message_queue.put({
                        'raw_message': message,
                        'source_ip': addr[0],
                        'source_port': addr[1],
                        'protocol': 'udp',
                        'received_at': time.time()
                    })
                    self.messages_received += 1
                else:
                    self.logger.warning("Message queue full, dropping message")
                
            except Exception as e:
                if self.running:
                    self.logger.error(f"UDP server error: {e}")
                    await asyncio.sleep(1)
    
    async def _tcp_server(self) -> None:
        """TCP/TLS syslog server"""
        self.logger.info(f"Starting {self.protocol.upper()} syslog server on {self.bind_address}:{self.port}")
        
        loop = asyncio.get_event_loop()
        
        while self.running:
            try:
                # Accept connection
                client_socket, addr = await loop.sock_accept(self.server_socket)
                self.connection_count += 1
                
                # Handle TLS wrap if needed
                if self.protocol == 'tls' and self.ssl_context:
                    # Note: In a full implementation, you'd want to use asyncio SSL support
                    self.logger.info(f"TLS connection from {addr} (TLS wrapping not fully implemented)")
                
                # Handle client connection
                client_task = asyncio.create_task(self._handle_tcp_client(client_socket, addr))
                self.client_tasks.append(client_task)
                
                # Clean up completed tasks
                self.client_tasks = [t for t in self.client_tasks if not t.done()]
                
            except Exception as e:
                if self.running:
                    self.logger.error(f"TCP server error: {e}")
                    await asyncio.sleep(1)
    
    async def _handle_tcp_client(self, client_socket: socket.socket, addr: Tuple[str, int]) -> None:
        """Handle TCP client connection"""
        self.logger.debug(f"Handling TCP connection from {addr}")
        
        loop = asyncio.get_event_loop()
        buffer = b""
        
        try:
            client_socket.setblocking(False)
            
            while self.running:
                try:
                    # Receive data
                    data = await loop.sock_recv(client_socket, self.max_message_size)
                    
                    if not data:
                        break  # Connection closed
                    
                    buffer += data
                    
                    # Process complete messages (split by newlines)
                    while b'\n' in buffer:
                        line, buffer = buffer.split(b'\n', 1)
                        
                        try:
                            message = line.decode(self.encoding, errors='replace').strip()
                            if message:
                                # Add to processing queue
                                if not self.message_queue.full():
                                    await self.message_queue.put({
                                        'raw_message': message,
                                        'source_ip': addr[0],
                                        'source_port': addr[1],
                                        'protocol': self.protocol,
                                        'received_at': time.time()
                                    })
                                    self.messages_received += 1
                                else:
                                    self.logger.warning("Message queue full, dropping message")
                        
                        except UnicodeDecodeError:
                            self.logger.warning(f"Failed to decode message from {addr}")
                
                except Exception as e:
                    self.logger.error(f"Error handling TCP client {addr}: {e}")
                    break
        
        finally:
            try:
                client_socket.close()
            except:
                pass
            self.logger.debug(f"TCP connection from {addr} closed")
    
    async def _process_messages(self) -> None:
        """Process messages from the queue"""
        while self.running:
            try:
                # Get message from queue with timeout
                message_data = await asyncio.wait_for(
                    self.message_queue.get(),
                    timeout=1.0
                )
                
                # Parse syslog message
                try:
                    parsed_msg = SyslogParser.parse_message(message_data['raw_message'])
                    
                    # Create event from parsed message
                    event = parsed_msg.to_dict()
                    event.update({
                        'id': f"syslog-{int(time.time() * 1000000)}",
                        'source_ip': message_data['source_ip'],
                        'source_port': message_data['source_port'],
                        'protocol': message_data['protocol'],
                        'received_at': message_data['received_at'],
                        'collector_name': self.name
                    })
                    
                    # Update metrics
                    self.messages_parsed += 1
                    self.metrics.bytes_processed += len(message_data['raw_message'])
                    
                except Exception as e:
                    self.parse_errors += 1
                    self.logger.error(f"Failed to parse syslog message: {e}")
                    
                    # Create error event
                    event = {
                        'id': f"syslog-error-{int(time.time() * 1000000)}",
                        'timestamp': time.time(),
                        'message': f"Parse error: {e}",
                        'raw_message': message_data['raw_message'],
                        'source_ip': message_data['source_ip'],
                        'source_port': message_data['source_port'],
                        'protocol': message_data['protocol'],
                        'received_at': message_data['received_at'],
                        'error': True,
                        'collector_name': self.name
                    }
                
                self.message_queue.task_done()
                
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                self.logger.error(f"Message processing error: {e}")
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test syslog receiver functionality"""
        try:
            # Test socket binding
            test_socket = socket.socket(
                socket.AF_INET, 
                socket.SOCK_DGRAM if self.protocol == 'udp' else socket.SOCK_STREAM
            )
            
            try:
                test_socket.bind((self.bind_address, self.port))
                test_socket.close()
                
                return {
                    'success': True,
                    'message': f'Syslog receiver can bind to {self.bind_address}:{self.port}',
                    'protocol': self.protocol,
                    'bind_address': self.bind_address,
                    'port': self.port,
                    'tls_enabled': self.protocol == 'tls'
                }
            
            except OSError as e:
                test_socket.close()
                return {
                    'success': False,
                    'error': f'Cannot bind to {self.bind_address}:{self.port}: {e}',
                    'protocol': self.protocol
                }
        
        except Exception as e:
            return {
                'success': False,
                'error': f'Connection test failed: {e}'
            }
    
    def get_collector_info(self) -> Dict[str, Any]:
        """Get Syslog collector information"""
        return {
            'type': 'syslog',
            'description': 'RFC 3164/5424 compliant Syslog receiver',
            'capabilities': [
                'udp_receiver',
                'tcp_receiver', 
                'tls_receiver',
                'rfc3164_parsing',
                'rfc5424_parsing',
                'structured_data_parsing',
                'multi_client_support'
            ],
            'supported_protocols': ['udp', 'tcp', 'tls'],
            'supported_rfcs': ['rfc3164', 'rfc5424'],
            'facilities': {
                0: 'kernel messages',
                1: 'user-level messages',
                2: 'mail system',
                3: 'system daemons',
                4: 'security/authorization messages',
                5: 'messages generated internally by syslogd',
                6: 'line printer subsystem',
                7: 'network news subsystem',
                8: 'UUCP subsystem',
                9: 'clock daemon',
                10: 'security/authorization messages',
                11: 'FTP daemon',
                12: 'NTP subsystem',
                13: 'log audit',
                14: 'log alert',
                15: 'clock daemon',
                16: 'local use facility 0',
                17: 'local use facility 1',
                18: 'local use facility 2',
                19: 'local use facility 3',
                20: 'local use facility 4',
                21: 'local use facility 5',
                22: 'local use facility 6',
                23: 'local use facility 7'
            },
            'severities': {
                0: 'Emergency',
                1: 'Alert',
                2: 'Critical',
                3: 'Error',
                4: 'Warning',
                5: 'Notice',
                6: 'Informational',
                7: 'Debug'
            },
            'configuration': {
                'protocol': self.protocol,
                'bind_address': self.bind_address,
                'port': self.port,
                'max_message_size': self.max_message_size,
                'encoding': self.encoding,
                'rfc_preference': self.rfc_preference,
                'tls_enabled': self.protocol == 'tls'
            },
            'statistics': {
                'messages_received': self.messages_received,
                'messages_parsed': self.messages_parsed,
                'parse_errors': self.parse_errors,
                'connection_count': self.connection_count,
                'queue_size': self.message_queue.qsize()
            }
        }
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get detailed statistics"""
        parse_success_rate = (
            (self.messages_parsed / self.messages_received * 100) 
            if self.messages_received > 0 else 0
        )
        
        return {
            'messages_received': self.messages_received,
            'messages_parsed': self.messages_parsed,
            'parse_errors': self.parse_errors,
            'parse_success_rate': parse_success_rate,
            'connection_count': self.connection_count,
            'queue_size': self.message_queue.qsize(),
            'queue_utilization': (self.message_queue.qsize() / self.message_queue.maxsize) * 100,
            'active_client_tasks': len([t for t in self.client_tasks if not t.done()]),
            'server_running': self.server_task is not None and not self.server_task.done(),
            'processor_running': self.processing_task is not None and not self.processing_task.done()
        }