"""
SecureWatch Agent Core
Main agent package with all core components
"""

from .agent import SecureWatchAgent
from .config import AgentConfig, ConfigManager
from .transport import SecureTransport
from .buffer import EventBuffer
from .health import HealthMonitor
from .resource_manager import ResourceManager
from .exceptions import *

__version__ = "1.0.0"
__author__ = "SecureWatch Team"

__all__ = [
    'SecureWatchAgent',
    'AgentConfig',
    'ConfigManager', 
    'SecureTransport',
    'EventBuffer',
    'HealthMonitor',
    'ResourceManager',
    'AgentError',
    'ConfigurationError',
    'TransportError',
    'AuthenticationError',
    'BufferError',
    'CollectorError',
    'HealthMonitorError',
    'ResourceLimitError'
]