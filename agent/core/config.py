"""
SecureWatch Agent - Configuration Management
Handles agent configuration loading, validation, and updates
"""

import asyncio
import json
import logging
import os
import hashlib
from pathlib import Path
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict, field
import jsonschema
from datetime import datetime, timedelta

from .exceptions import ConfigurationError


@dataclass
class LoggingConfig:
    """Logging configuration"""
    level: str = "INFO"
    file_path: Optional[str] = None
    max_size_mb: int = 100
    backup_count: int = 5
    format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"


@dataclass
class CollectorConfig:
    """Individual collector configuration"""
    name: str
    type: str
    enabled: bool = True
    required: bool = False
    config: Dict[str, Any] = field(default_factory=dict)
    filters: List[Dict[str, Any]] = field(default_factory=list)
    batch_size: int = 100
    poll_interval: float = 30.0


@dataclass
class BufferConfig:
    """Event buffer configuration"""
    db_path: str = "/var/lib/securewatch/events.db"
    max_size: int = 100000
    batch_size: int = 1000
    retention_hours: int = 168  # 7 days
    cleanup_interval: int = 3600  # 1 hour


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
    algorithm: str = "zstd"
    level: int = 3
    min_size: int = 1024


@dataclass
class RetryConfig:
    """Retry configuration"""
    max_attempts: int = 3
    base_delay: float = 1.0
    max_delay: float = 60.0
    exponential_base: float = 2.0
    jitter: bool = True


@dataclass
class TransportConfig:
    """Transport configuration"""
    endpoint: str
    auth: AuthConfig
    compression: CompressionConfig = field(default_factory=CompressionConfig)
    retry: RetryConfig = field(default_factory=RetryConfig)
    batch_size: int = 1000
    timeout: float = 30.0
    websocket_enabled: bool = False


@dataclass
class HealthConfig:
    """Health monitoring configuration"""
    check_interval: int = 30
    heartbeat_interval: int = 300  # 5 minutes
    metrics_retention: int = 86400  # 24 hours
    disk_usage_threshold: float = 0.9
    memory_usage_threshold: float = 0.8
    cpu_usage_threshold: float = 0.8


@dataclass
class ResourceLimits:
    """Resource usage limits"""
    max_memory_mb: int = 512
    max_cpu_percent: float = 50.0
    max_disk_mb: int = 1024
    max_file_handles: int = 1024
    max_network_connections: int = 100


@dataclass
class SecurityConfig:
    """Security configuration"""
    allowed_commands: List[str] = field(default_factory=list)
    blocked_processes: List[str] = field(default_factory=list)
    sandbox_enabled: bool = True
    privilege_escalation: bool = False
    network_restrictions: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AgentConfig:
    """Complete agent configuration"""
    agent_id: Optional[str] = None
    version: str = "1.0.0"
    
    # Core configuration
    logging: LoggingConfig = field(default_factory=LoggingConfig)
    collectors: List[CollectorConfig] = field(default_factory=list)
    buffer: BufferConfig = field(default_factory=BufferConfig)
    transport: TransportConfig = field(default_factory=lambda: TransportConfig(
        endpoint="https://siem.company.com",
        auth=AuthConfig(
            client_cert_path="/etc/securewatch/client.crt",
            client_key_path="/etc/securewatch/client.key",
            ca_cert_path="/etc/securewatch/ca.crt"
        )
    ))
    health: HealthConfig = field(default_factory=HealthConfig)
    resource_limits: ResourceLimits = field(default_factory=ResourceLimits)
    security: SecurityConfig = field(default_factory=SecurityConfig)
    
    # Advanced settings
    config_update_interval: int = 300  # 5 minutes
    auto_update_enabled: bool = True
    debug_mode: bool = False
    telemetry_enabled: bool = True


class ConfigManager:
    """
    Configuration manager for SecureWatch agent
    Handles loading, validation, and automatic updates
    """
    
    # JSON Schema for configuration validation
    CONFIG_SCHEMA = {
        "type": "object",
        "properties": {
            "agent_id": {"type": ["string", "null"]},
            "version": {"type": "string"},
            "logging": {
                "type": "object",
                "properties": {
                    "level": {"type": "string", "enum": ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]},
                    "file_path": {"type": ["string", "null"]},
                    "max_size_mb": {"type": "integer", "minimum": 1},
                    "backup_count": {"type": "integer", "minimum": 0},
                    "format": {"type": "string"}
                }
            },
            "collectors": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "type": {"type": "string", "enum": ["windows_event", "syslog", "file", "registry", "process"]},
                        "enabled": {"type": "boolean"},
                        "required": {"type": "boolean"},
                        "config": {"type": "object"},
                        "filters": {"type": "array"},
                        "batch_size": {"type": "integer", "minimum": 1},
                        "poll_interval": {"type": "number", "minimum": 0.1}
                    },
                    "required": ["name", "type"]
                }
            },
            "buffer": {
                "type": "object",
                "properties": {
                    "db_path": {"type": "string"},
                    "max_size": {"type": "integer", "minimum": 1000},
                    "batch_size": {"type": "integer", "minimum": 1},
                    "retention_hours": {"type": "integer", "minimum": 1},
                    "cleanup_interval": {"type": "integer", "minimum": 60}
                }
            },
            "transport": {
                "type": "object",
                "properties": {
                    "endpoint": {"type": "string", "format": "uri"},
                    "auth": {
                        "type": "object",
                        "properties": {
                            "client_cert_path": {"type": "string"},
                            "client_key_path": {"type": "string"},
                            "ca_cert_path": {"type": "string"},
                            "cert_rotation_days": {"type": "integer", "minimum": 1},
                            "verify_hostname": {"type": "boolean"}
                        },
                        "required": ["client_cert_path", "client_key_path", "ca_cert_path"]
                    },
                    "compression": {
                        "type": "object",
                        "properties": {
                            "enabled": {"type": "boolean"},
                            "algorithm": {"type": "string", "enum": ["zstd", "gzip", "lz4"]},
                            "level": {"type": "integer", "minimum": 1, "maximum": 22},
                            "min_size": {"type": "integer", "minimum": 0}
                        }
                    },
                    "batch_size": {"type": "integer", "minimum": 1},
                    "timeout": {"type": "number", "minimum": 1.0},
                    "websocket_enabled": {"type": "boolean"}
                },
                "required": ["endpoint", "auth"]
            },
            "health": {
                "type": "object",
                "properties": {
                    "check_interval": {"type": "integer", "minimum": 5},
                    "heartbeat_interval": {"type": "integer", "minimum": 30},
                    "metrics_retention": {"type": "integer", "minimum": 3600}
                }
            },
            "resource_limits": {
                "type": "object",
                "properties": {
                    "max_memory_mb": {"type": "integer", "minimum": 64},
                    "max_cpu_percent": {"type": "number", "minimum": 1.0, "maximum": 100.0},
                    "max_disk_mb": {"type": "integer", "minimum": 100}
                }
            }
        },
        "required": ["transport"]
    }
    
    def __init__(self, config_path: Union[str, Path]):
        self.config_path = Path(config_path)
        self.logger = logging.getLogger("securewatch.config")
        
        # Configuration state
        self.current_config: Optional[AgentConfig] = None
        self.config_hash: Optional[str] = None
        self.last_check_time: float = 0
        
        # Remote configuration
        self.remote_config_url: Optional[str] = None
        self.remote_config_enabled: bool = False
    
    async def load_config(self, validate: bool = True) -> AgentConfig:
        """Load configuration from file"""
        try:
            self.logger.info(f"Loading configuration from {self.config_path}")
            
            if not self.config_path.exists():
                self.logger.warning("Configuration file not found, creating default")
                await self._create_default_config()
            
            # Read configuration file
            with open(self.config_path, 'r') as f:
                config_data = json.load(f)
            
            # Validate configuration
            if validate:
                await self._validate_config(config_data)
            
            # Convert to dataclass
            config = await self._dict_to_config(config_data)
            
            # Calculate configuration hash
            self.config_hash = self._calculate_config_hash(config_data)
            
            # Store current configuration
            self.current_config = config
            
            self.logger.info("Configuration loaded successfully")
            return config
            
        except Exception as e:
            self.logger.error(f"Failed to load configuration: {e}")
            raise ConfigurationError(f"Configuration loading failed: {e}") from e
    
    async def _create_default_config(self) -> None:
        """Create default configuration file"""
        default_config = AgentConfig()
        
        # Add default collectors
        default_config.collectors = [
            CollectorConfig(
                name="windows_security",
                type="windows_event",
                enabled=True,
                required=True,
                config={
                    "channels": ["Security"],
                    "event_ids": [4624, 4625, 4648, 4672],
                    "servers": ["localhost"]
                }
            ),
            CollectorConfig(
                name="syslog_receiver",
                type="syslog",
                enabled=True,
                config={
                    "protocol": "udp",
                    "port": 514,
                    "bind_address": "0.0.0.0"
                }
            )
        ]
        
        await self.save_config(default_config)
    
    async def save_config(self, config: AgentConfig) -> None:
        """Save configuration to file"""
        try:
            # Convert to dictionary
            config_dict = asdict(config)
            
            # Create directory if it doesn't exist
            self.config_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Write configuration file
            with open(self.config_path, 'w') as f:
                json.dump(config_dict, f, indent=2, default=str)
            
            # Update hash
            self.config_hash = self._calculate_config_hash(config_dict)
            
            self.logger.info("Configuration saved successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to save configuration: {e}")
            raise ConfigurationError(f"Configuration saving failed: {e}") from e
    
    async def _validate_config(self, config_data: Dict[str, Any]) -> None:
        """Validate configuration against schema"""
        try:
            jsonschema.validate(config_data, self.CONFIG_SCHEMA)
            
            # Additional validation
            await self._validate_paths(config_data)
            await self._validate_collectors(config_data.get('collectors', []))
            await self._validate_transport(config_data.get('transport', {}))
            
        except jsonschema.ValidationError as e:
            raise ConfigurationError(f"Configuration validation failed: {e.message}")
        except Exception as e:
            raise ConfigurationError(f"Configuration validation error: {e}")
    
    async def _validate_paths(self, config_data: Dict[str, Any]) -> None:
        """Validate file paths in configuration"""
        transport = config_data.get('transport', {})
        auth = transport.get('auth', {})
        
        # Check certificate files exist
        for cert_type, path_key in [
            ('client certificate', 'client_cert_path'),
            ('client key', 'client_key_path'),
            ('CA certificate', 'ca_cert_path')
        ]:
            path = auth.get(path_key)
            if path and not Path(path).exists():
                self.logger.warning(f"{cert_type} not found: {path}")
        
        # Check buffer directory is writable
        buffer_path = config_data.get('buffer', {}).get('db_path')
        if buffer_path:
            buffer_dir = Path(buffer_path).parent
            if not buffer_dir.exists():
                try:
                    buffer_dir.mkdir(parents=True, exist_ok=True)
                except PermissionError:
                    raise ConfigurationError(f"Cannot create buffer directory: {buffer_dir}")
    
    async def _validate_collectors(self, collectors: List[Dict[str, Any]]) -> None:
        """Validate collector configurations"""
        collector_names = set()
        
        for collector in collectors:
            name = collector.get('name')
            if not name:
                raise ConfigurationError("Collector missing name")
            
            if name in collector_names:
                raise ConfigurationError(f"Duplicate collector name: {name}")
            collector_names.add(name)
            
            # Validate collector type
            collector_type = collector.get('type')
            if collector_type not in ['windows_event', 'syslog', 'file', 'registry', 'process']:
                raise ConfigurationError(f"Invalid collector type: {collector_type}")
    
    async def _validate_transport(self, transport: Dict[str, Any]) -> None:
        """Validate transport configuration"""
        endpoint = transport.get('endpoint', '')
        if not endpoint.startswith(('http://', 'https://')):
            raise ConfigurationError("Transport endpoint must be HTTP/HTTPS URL")
    
    async def _dict_to_config(self, config_data: Dict[str, Any]) -> AgentConfig:
        """Convert dictionary to AgentConfig dataclass"""
        try:
            # Handle nested objects
            if 'logging' in config_data:
                config_data['logging'] = LoggingConfig(**config_data['logging'])
            
            if 'collectors' in config_data:
                config_data['collectors'] = [
                    CollectorConfig(**collector) for collector in config_data['collectors']
                ]
            
            if 'buffer' in config_data:
                config_data['buffer'] = BufferConfig(**config_data['buffer'])
            
            if 'transport' in config_data:
                transport_data = config_data['transport']
                
                if 'auth' in transport_data:
                    transport_data['auth'] = AuthConfig(**transport_data['auth'])
                
                if 'compression' in transport_data:
                    transport_data['compression'] = CompressionConfig(**transport_data['compression'])
                
                if 'retry' in transport_data:
                    transport_data['retry'] = RetryConfig(**transport_data['retry'])
                
                config_data['transport'] = TransportConfig(**transport_data)
            
            if 'health' in config_data:
                config_data['health'] = HealthConfig(**config_data['health'])
            
            if 'resource_limits' in config_data:
                config_data['resource_limits'] = ResourceLimits(**config_data['resource_limits'])
            
            if 'security' in config_data:
                config_data['security'] = SecurityConfig(**config_data['security'])
            
            return AgentConfig(**config_data)
            
        except TypeError as e:
            raise ConfigurationError(f"Invalid configuration structure: {e}")
    
    def _calculate_config_hash(self, config_data: Dict[str, Any]) -> str:
        """Calculate hash of configuration for change detection"""
        config_str = json.dumps(config_data, sort_keys=True, default=str)
        return hashlib.sha256(config_str.encode()).hexdigest()
    
    async def check_for_updates(self) -> bool:
        """Check if configuration has been updated"""
        try:
            if not self.config_path.exists():
                return False
            
            # Check file modification time
            current_mtime = self.config_path.stat().st_mtime
            if current_mtime <= self.last_check_time:
                return False
            
            # Check if file content has changed
            with open(self.config_path, 'r') as f:
                config_data = json.load(f)
            
            new_hash = self._calculate_config_hash(config_data)
            
            if new_hash != self.config_hash:
                self.last_check_time = current_mtime
                return True
            
            return False
            
        except Exception as e:
            self.logger.error(f"Failed to check for config updates: {e}")
            return False
    
    async def reload_config(self) -> Optional[AgentConfig]:
        """Reload configuration if it has changed"""
        if await self.check_for_updates():
            return await self.load_config()
        return None
    
    async def update_collector_config(self, collector_name: str, new_config: Dict[str, Any]) -> None:
        """Update a specific collector's configuration"""
        if not self.current_config:
            raise ConfigurationError("No configuration loaded")
        
        # Find and update collector
        for collector in self.current_config.collectors:
            if collector.name == collector_name:
                collector.config.update(new_config)
                break
        else:
            raise ConfigurationError(f"Collector not found: {collector_name}")
        
        # Save updated configuration
        await self.save_config(self.current_config)
    
    async def add_collector(self, collector_config: CollectorConfig) -> None:
        """Add a new collector to configuration"""
        if not self.current_config:
            raise ConfigurationError("No configuration loaded")
        
        # Check for duplicate names
        existing_names = {c.name for c in self.current_config.collectors}
        if collector_config.name in existing_names:
            raise ConfigurationError(f"Collector name already exists: {collector_config.name}")
        
        self.current_config.collectors.append(collector_config)
        await self.save_config(self.current_config)
    
    async def remove_collector(self, collector_name: str) -> None:
        """Remove a collector from configuration"""
        if not self.current_config:
            raise ConfigurationError("No configuration loaded")
        
        original_count = len(self.current_config.collectors)
        self.current_config.collectors = [
            c for c in self.current_config.collectors if c.name != collector_name
        ]
        
        if len(self.current_config.collectors) == original_count:
            raise ConfigurationError(f"Collector not found: {collector_name}")
        
        await self.save_config(self.current_config)
    
    async def get_collector_config(self, collector_name: str) -> Optional[CollectorConfig]:
        """Get configuration for a specific collector"""
        if not self.current_config:
            return None
        
        for collector in self.current_config.collectors:
            if collector.name == collector_name:
                return collector
        
        return None
    
    def get_config_summary(self) -> Dict[str, Any]:
        """Get a summary of current configuration"""
        if not self.current_config:
            return {}
        
        return {
            'agent_id': self.current_config.agent_id,
            'version': self.current_config.version,
            'collectors_count': len(self.current_config.collectors),
            'collectors': [
                {
                    'name': c.name,
                    'type': c.type,
                    'enabled': c.enabled,
                    'required': c.required
                }
                for c in self.current_config.collectors
            ],
            'transport_endpoint': self.current_config.transport.endpoint,
            'buffer_path': self.current_config.buffer.db_path,
            'logging_level': self.current_config.logging.level,
            'config_hash': self.config_hash,
            'last_check_time': self.last_check_time
        }


async def validate_config_file(config_path: str) -> Dict[str, Any]:
    """Validate a configuration file and return validation results"""
    try:
        config_manager = ConfigManager(config_path)
        config = await config_manager.load_config()
        
        return {
            'valid': True,
            'config_summary': config_manager.get_config_summary(),
            'warnings': []
        }
        
    except ConfigurationError as e:
        return {
            'valid': False,
            'error': str(e),
            'warnings': []
        }
    except Exception as e:
        return {
            'valid': False,
            'error': f"Unexpected error: {e}",
            'warnings': []
        }