"""
SecureWatch Agent Collectors
Collection of log collectors for various sources
"""

from .base import Collector, MockCollector
from .windows_event import WindowsEventCollector
from .syslog import SyslogCollector
from .file import FileCollector

__all__ = [
    'Collector',
    'MockCollector',
    'WindowsEventCollector', 
    'SyslogCollector',
    'FileCollector'
]