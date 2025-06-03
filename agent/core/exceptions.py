"""
SecureWatch Agent - Exception Classes
Custom exception classes for agent components
"""


class AgentError(Exception):
    """Base exception for agent errors"""
    pass


class ConfigurationError(AgentError):
    """Configuration-related errors"""
    pass


class TransportError(AgentError):
    """Transport-related errors"""
    pass


class AuthenticationError(TransportError):
    """Authentication-related errors"""
    pass


class BufferError(AgentError):
    """Event buffer-related errors"""
    pass


class CollectorError(AgentError):
    """Collector-related errors"""
    pass


class HealthMonitorError(AgentError):
    """Health monitoring-related errors"""
    pass


class ResourceLimitError(AgentError):
    """Resource limit-related errors"""
    pass