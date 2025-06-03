"""
SecureWatch Agent - Resource Manager
Implements resource usage controls and throttling
"""

import asyncio
import logging
import psutil
import time
import threading
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import deque
import gc
import os
import signal

from .exceptions import ResourceLimitError


@dataclass
class ResourceLimits:
    """Resource limits configuration"""
    max_memory_mb: int = 512
    max_cpu_percent: float = 50.0
    max_disk_mb: int = 1024
    max_file_handles: int = 1024
    max_network_connections: int = 100
    max_threads: int = 50
    max_event_rate: int = 10000  # events per minute


@dataclass
class ResourceUsage:
    """Current resource usage"""
    memory_mb: float
    memory_percent: float
    cpu_percent: float
    disk_mb: float
    file_handles: int
    network_connections: int
    threads: int
    event_rate: int
    timestamp: float


@dataclass
class ThrottleState:
    """Throttling state for a component"""
    component: str
    active: bool = False
    level: float = 1.0  # 0.0 = fully throttled, 1.0 = no throttling
    reason: str = ""
    started_at: Optional[float] = None
    auto_recover: bool = True


class ResourceMonitor:
    """Monitor resource usage and enforce limits"""
    
    def __init__(self, limits: ResourceLimits, check_interval: float = 5.0):
        self.limits = limits
        self.check_interval = check_interval
        self.logger = logging.getLogger("securewatch.resource_monitor")
        
        # Current process
        self.process = psutil.Process()
        
        # Usage history
        self.usage_history: deque = deque(maxlen=60)  # Keep 5 minutes of data
        
        # Event rate tracking
        self.event_timestamps: deque = deque(maxlen=10000)
        
        # Monitoring state
        self.running = False
        self.monitoring_task: Optional[asyncio.Task] = None
        
        # Callbacks for limit violations
        self.violation_callbacks: List[Callable[[str, ResourceUsage], None]] = []
    
    async def start_monitoring(self) -> None:
        """Start resource monitoring"""
        if self.running:
            return
        
        self.running = True
        self.monitoring_task = asyncio.create_task(self._monitoring_loop())
        self.logger.info("Resource monitoring started")
    
    async def stop_monitoring(self) -> None:
        """Stop resource monitoring"""
        self.running = False
        
        if self.monitoring_task:
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                pass
        
        self.logger.info("Resource monitoring stopped")
    
    async def _monitoring_loop(self) -> None:
        """Main monitoring loop"""
        while self.running:
            try:
                usage = await self._collect_usage()
                self.usage_history.append(usage)
                
                # Check for violations
                violations = self._check_violations(usage)
                
                if violations:
                    for violation in violations:
                        self.logger.warning(f"Resource limit violation: {violation}")
                        await self._handle_violation(violation, usage)
                
                await asyncio.sleep(self.check_interval)
                
            except Exception as e:
                self.logger.error(f"Resource monitoring error: {e}")
                await asyncio.sleep(self.check_interval)
    
    async def _collect_usage(self) -> ResourceUsage:
        """Collect current resource usage"""
        try:
            # Memory usage
            memory_info = self.process.memory_info()
            memory_mb = memory_info.rss / 1024 / 1024
            
            # System memory for percentage
            system_memory = psutil.virtual_memory()
            memory_percent = (memory_info.rss / system_memory.total) * 100
            
            # CPU usage
            cpu_percent = self.process.cpu_percent()
            
            # Disk usage (approximate based on current working directory)
            try:
                disk_usage = psutil.disk_usage(os.getcwd())
                # This is a rough estimate - in practice you'd track actual disk usage
                disk_mb = 0  # Would need to track actual file creation/deletion
            except:
                disk_mb = 0
            
            # File handles
            try:
                file_handles = len(self.process.open_files())
            except (psutil.AccessDenied, psutil.NoSuchProcess):
                file_handles = 0
            
            # Network connections
            try:
                network_connections = len(self.process.connections())
            except (psutil.AccessDenied, psutil.NoSuchProcess):
                network_connections = 0
            
            # Thread count
            try:
                threads = self.process.num_threads()
            except (psutil.AccessDenied, psutil.NoSuchProcess):
                threads = 0
            
            # Event rate (events per minute)
            current_time = time.time()
            one_minute_ago = current_time - 60
            
            # Clean old events
            while self.event_timestamps and self.event_timestamps[0] < one_minute_ago:
                self.event_timestamps.popleft()
            
            event_rate = len(self.event_timestamps)
            
            return ResourceUsage(
                memory_mb=memory_mb,
                memory_percent=memory_percent,
                cpu_percent=cpu_percent,
                disk_mb=disk_mb,
                file_handles=file_handles,
                network_connections=network_connections,
                threads=threads,
                event_rate=event_rate,
                timestamp=current_time
            )
            
        except Exception as e:
            self.logger.error(f"Failed to collect resource usage: {e}")
            return ResourceUsage(0, 0, 0, 0, 0, 0, 0, 0, time.time())
    
    def _check_violations(self, usage: ResourceUsage) -> List[str]:
        """Check for resource limit violations"""
        violations = []
        
        if usage.memory_mb > self.limits.max_memory_mb:
            violations.append(f"Memory usage ({usage.memory_mb:.1f}MB) exceeds limit ({self.limits.max_memory_mb}MB)")
        
        if usage.cpu_percent > self.limits.max_cpu_percent:
            violations.append(f"CPU usage ({usage.cpu_percent:.1f}%) exceeds limit ({self.limits.max_cpu_percent}%)")
        
        if usage.disk_mb > self.limits.max_disk_mb:
            violations.append(f"Disk usage ({usage.disk_mb:.1f}MB) exceeds limit ({self.limits.max_disk_mb}MB)")
        
        if usage.file_handles > self.limits.max_file_handles:
            violations.append(f"File handles ({usage.file_handles}) exceed limit ({self.limits.max_file_handles})")
        
        if usage.network_connections > self.limits.max_network_connections:
            violations.append(f"Network connections ({usage.network_connections}) exceed limit ({self.limits.max_network_connections})")
        
        if usage.threads > self.limits.max_threads:
            violations.append(f"Thread count ({usage.threads}) exceeds limit ({self.limits.max_threads})")
        
        if usage.event_rate > self.limits.max_event_rate:
            violations.append(f"Event rate ({usage.event_rate}/min) exceeds limit ({self.limits.max_event_rate}/min)")
        
        return violations
    
    async def _handle_violation(self, violation: str, usage: ResourceUsage) -> None:
        """Handle resource limit violation"""
        # Notify callbacks
        for callback in self.violation_callbacks:
            try:
                callback(violation, usage)
            except Exception as e:
                self.logger.error(f"Violation callback error: {e}")
        
        # Emergency memory cleanup
        if "Memory usage" in violation:
            gc.collect()
    
    def record_event(self) -> None:
        """Record an event for rate limiting"""
        self.event_timestamps.append(time.time())
    
    def add_violation_callback(self, callback: Callable[[str, ResourceUsage], None]) -> None:
        """Add callback for resource violations"""
        self.violation_callbacks.append(callback)
    
    def get_current_usage(self) -> Optional[ResourceUsage]:
        """Get most recent resource usage"""
        return self.usage_history[-1] if self.usage_history else None
    
    def get_usage_history(self, minutes: int = 5) -> List[ResourceUsage]:
        """Get usage history for the specified time period"""
        cutoff_time = time.time() - (minutes * 60)
        return [usage for usage in self.usage_history if usage.timestamp > cutoff_time]


class ResourceThrottler:
    """Throttles agent components based on resource usage"""
    
    def __init__(self, resource_monitor: ResourceMonitor):
        self.resource_monitor = resource_monitor
        self.logger = logging.getLogger("securewatch.throttler")
        
        # Throttle states for different components
        self.throttle_states: Dict[str, ThrottleState] = {}
        
        # Throttling thresholds (percentage of limits)
        self.warning_threshold = 0.8  # 80% of limit
        self.critical_threshold = 0.95  # 95% of limit
        
        # Recovery settings
        self.recovery_threshold = 0.7  # 70% of limit
        self.recovery_check_interval = 30.0  # seconds
        
        # Setup violation callback
        self.resource_monitor.add_violation_callback(self._handle_resource_violation)
        
        # Recovery task
        self.recovery_task: Optional[asyncio.Task] = None
        self.running = False
    
    async def start(self) -> None:
        """Start throttling system"""
        if self.running:
            return
        
        self.running = True
        self.recovery_task = asyncio.create_task(self._recovery_loop())
        self.logger.info("Resource throttling started")
    
    async def stop(self) -> None:
        """Stop throttling system"""
        self.running = False
        
        if self.recovery_task:
            self.recovery_task.cancel()
            try:
                await self.recovery_task
            except asyncio.CancelledError:
                pass
        
        self.logger.info("Resource throttling stopped")
    
    def _handle_resource_violation(self, violation: str, usage: ResourceUsage) -> None:
        """Handle resource violation by throttling appropriate components"""
        try:
            if "Memory usage" in violation or "CPU usage" in violation:
                # Throttle collectors first
                self._apply_throttle("collectors", 0.5, f"High resource usage: {violation}")
            
            if "Event rate" in violation:
                # Throttle event processing
                self._apply_throttle("event_processing", 0.3, f"High event rate: {violation}")
            
            if "Network connections" in violation:
                # Throttle transport
                self._apply_throttle("transport", 0.7, f"High network usage: {violation}")
            
            if "File handles" in violation:
                # Throttle buffer operations
                self._apply_throttle("buffer", 0.6, f"High file handle usage: {violation}")
        
        except Exception as e:
            self.logger.error(f"Error handling resource violation: {e}")
    
    def _apply_throttle(self, component: str, level: float, reason: str) -> None:
        """Apply throttling to a component"""
        current_state = self.throttle_states.get(component)
        
        # Only increase throttling (decrease level)
        if current_state is None or level < current_state.level:
            self.throttle_states[component] = ThrottleState(
                component=component,
                active=True,
                level=level,
                reason=reason,
                started_at=time.time(),
                auto_recover=True
            )
            
            self.logger.warning(f"Applied throttling to {component}: level={level:.2f}, reason={reason}")
    
    async def _recovery_loop(self) -> None:
        """Check for throttle recovery conditions"""
        while self.running:
            try:
                await asyncio.sleep(self.recovery_check_interval)
                
                current_usage = self.resource_monitor.get_current_usage()
                if not current_usage:
                    continue
                
                # Check if resources are back to normal
                if self._should_recover(current_usage):
                    await self._attempt_recovery(current_usage)
                
            except Exception as e:
                self.logger.error(f"Recovery loop error: {e}")
    
    def _should_recover(self, usage: ResourceUsage) -> bool:
        """Check if resource usage is low enough for recovery"""
        limits = self.resource_monitor.limits
        
        return (
            usage.memory_mb < limits.max_memory_mb * self.recovery_threshold and
            usage.cpu_percent < limits.max_cpu_percent * self.recovery_threshold and
            usage.event_rate < limits.max_event_rate * self.recovery_threshold and
            usage.network_connections < limits.max_network_connections * self.recovery_threshold
        )
    
    async def _attempt_recovery(self, usage: ResourceUsage) -> None:
        """Attempt to recover from throttling"""
        recovered_components = []
        
        for component, state in list(self.throttle_states.items()):
            if state.auto_recover and state.active:
                # Gradual recovery
                new_level = min(1.0, state.level + 0.2)
                
                if new_level >= 1.0:
                    # Full recovery
                    del self.throttle_states[component]
                    recovered_components.append(component)
                    self.logger.info(f"Throttling recovered for {component}")
                else:
                    # Partial recovery
                    state.level = new_level
                    self.logger.info(f"Partial throttling recovery for {component}: level={new_level:.2f}")
        
        if recovered_components:
            self.logger.info(f"Components recovered from throttling: {recovered_components}")
    
    def get_throttle_level(self, component: str) -> float:
        """Get current throttle level for a component (0.0-1.0)"""
        state = self.throttle_states.get(component)
        return state.level if state and state.active else 1.0
    
    def is_throttled(self, component: str) -> bool:
        """Check if a component is currently throttled"""
        state = self.throttle_states.get(component)
        return state is not None and state.active and state.level < 1.0
    
    def manually_throttle(self, component: str, level: float, reason: str, auto_recover: bool = True) -> None:
        """Manually apply throttling to a component"""
        self.throttle_states[component] = ThrottleState(
            component=component,
            active=True,
            level=max(0.0, min(1.0, level)),
            reason=reason,
            started_at=time.time(),
            auto_recover=auto_recover
        )
        
        self.logger.info(f"Manual throttling applied to {component}: level={level:.2f}")
    
    def remove_throttle(self, component: str) -> None:
        """Remove throttling from a component"""
        if component in self.throttle_states:
            del self.throttle_states[component]
            self.logger.info(f"Throttling removed from {component}")
    
    def get_throttle_status(self) -> Dict[str, Any]:
        """Get current throttling status"""
        return {
            'active_throttles': len(self.throttle_states),
            'components': {
                component: {
                    'level': state.level,
                    'reason': state.reason,
                    'duration': time.time() - state.started_at if state.started_at else 0,
                    'auto_recover': state.auto_recover
                }
                for component, state in self.throttle_states.items()
                if state.active
            }
        }


class ResourceManager:
    """
    Main resource management system combining monitoring and throttling
    """
    
    def __init__(self, max_memory_mb: int = 512, max_cpu_percent: float = 50.0, 
                 max_disk_mb: int = 1024, check_interval: float = 5.0):
        
        self.limits = ResourceLimits(
            max_memory_mb=max_memory_mb,
            max_cpu_percent=max_cpu_percent,
            max_disk_mb=max_disk_mb
        )
        
        self.logger = logging.getLogger("securewatch.resource_manager")
        
        # Initialize components
        self.monitor = ResourceMonitor(self.limits, check_interval)
        self.throttler = ResourceThrottler(self.monitor)
        
        # Emergency shutdown callback
        self.emergency_shutdown_callback: Optional[Callable[[], None]] = None
        
        # Add emergency handler
        self.monitor.add_violation_callback(self._check_emergency_conditions)
    
    async def start_monitoring(self) -> None:
        """Start resource monitoring and throttling"""
        await self.monitor.start_monitoring()
        await self.throttler.start()
        self.logger.info("Resource management started")
    
    async def stop(self) -> None:
        """Stop resource management"""
        await self.throttler.stop()
        await self.monitor.stop_monitoring()
        self.logger.info("Resource management stopped")
    
    async def check_resources(self) -> bool:
        """Check if resources are within acceptable limits"""
        usage = self.monitor.get_current_usage()
        if not usage:
            return True
        
        # Check critical thresholds
        critical_violations = []
        
        if usage.memory_mb > self.limits.max_memory_mb * 1.1:  # 110% of limit
            critical_violations.append("memory")
        
        if usage.cpu_percent > self.limits.max_cpu_percent * 1.2:  # 120% of limit
            critical_violations.append("cpu")
        
        if critical_violations:
            self.logger.error(f"Critical resource violations: {critical_violations}")
            return False
        
        return True
    
    def _check_emergency_conditions(self, violation: str, usage: ResourceUsage) -> None:
        """Check for emergency shutdown conditions"""
        emergency_conditions = []
        
        # Extremely high memory usage (150% of limit)
        if usage.memory_mb > self.limits.max_memory_mb * 1.5:
            emergency_conditions.append("extreme_memory_usage")
        
        # Sustained high CPU (over 95% for extended period)
        if usage.cpu_percent > 95:
            recent_usage = self.monitor.get_usage_history(minutes=2)
            if len(recent_usage) >= 5 and all(u.cpu_percent > 95 for u in recent_usage[-5:]):
                emergency_conditions.append("sustained_high_cpu")
        
        if emergency_conditions and self.emergency_shutdown_callback:
            self.logger.critical(f"Emergency conditions detected: {emergency_conditions}")
            try:
                self.emergency_shutdown_callback()
            except Exception as e:
                self.logger.error(f"Emergency shutdown callback failed: {e}")
    
    def record_event(self) -> None:
        """Record an event for rate limiting"""
        self.monitor.record_event()
    
    def get_throttle_level(self, component: str) -> float:
        """Get throttle level for a component"""
        return self.throttler.get_throttle_level(component)
    
    def is_throttled(self, component: str) -> bool:
        """Check if component is throttled"""
        return self.throttler.is_throttled(component)
    
    def set_emergency_shutdown_callback(self, callback: Callable[[], None]) -> None:
        """Set callback for emergency shutdown"""
        self.emergency_shutdown_callback = callback
    
    def get_usage(self) -> Dict[str, Any]:
        """Get current resource usage and throttling status"""
        usage = self.monitor.get_current_usage()
        throttle_status = self.throttler.get_throttle_status()
        
        return {
            'current_usage': {
                'memory_mb': usage.memory_mb if usage else 0,
                'memory_percent': usage.memory_percent if usage else 0,
                'cpu_percent': usage.cpu_percent if usage else 0,
                'disk_mb': usage.disk_mb if usage else 0,
                'file_handles': usage.file_handles if usage else 0,
                'network_connections': usage.network_connections if usage else 0,
                'threads': usage.threads if usage else 0,
                'event_rate': usage.event_rate if usage else 0
            } if usage else {},
            'limits': {
                'memory_mb': self.limits.max_memory_mb,
                'cpu_percent': self.limits.max_cpu_percent,
                'disk_mb': self.limits.max_disk_mb,
                'file_handles': self.limits.max_file_handles,
                'network_connections': self.limits.max_network_connections,
                'threads': self.limits.max_threads,
                'event_rate': self.limits.max_event_rate
            },
            'utilization': {
                'memory': (usage.memory_mb / self.limits.max_memory_mb) if usage else 0,
                'cpu': (usage.cpu_percent / self.limits.max_cpu_percent) if usage else 0,
                'event_rate': (usage.event_rate / self.limits.max_event_rate) if usage else 0
            } if usage else {},
            'throttling': throttle_status
        }


# Utility functions

async def get_process_resource_usage(pid: Optional[int] = None) -> Dict[str, Any]:
    """Get resource usage for a specific process"""
    try:
        process = psutil.Process(pid) if pid else psutil.Process()
        
        memory_info = process.memory_info()
        
        return {
            'pid': process.pid,
            'name': process.name(),
            'memory_rss_mb': memory_info.rss / 1024 / 1024,
            'memory_vms_mb': memory_info.vms / 1024 / 1024,
            'cpu_percent': process.cpu_percent(),
            'num_threads': process.num_threads(),
            'num_fds': len(process.open_files()),
            'num_connections': len(process.connections()),
            'create_time': process.create_time(),
            'status': process.status()
        }
        
    except (psutil.NoSuchProcess, psutil.AccessDenied) as e:
        return {'error': str(e)}


def optimize_memory_usage() -> Dict[str, Any]:
    """Attempt to optimize memory usage"""
    import gc
    
    # Force garbage collection
    before_gc = psutil.Process().memory_info().rss / 1024 / 1024
    
    # Collect garbage
    collected = gc.collect()
    
    after_gc = psutil.Process().memory_info().rss / 1024 / 1024
    freed_mb = before_gc - after_gc
    
    return {
        'objects_collected': collected,
        'memory_freed_mb': max(0, freed_mb),
        'before_gc_mb': before_gc,
        'after_gc_mb': after_gc
    }