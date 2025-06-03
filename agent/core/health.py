"""
SecureWatch Agent - Health Monitoring and Diagnostics
Comprehensive health monitoring system for agent components
"""

import asyncio
import json
import logging
import time
import psutil
import platform
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import deque
import threading

from .exceptions import HealthMonitorError


@dataclass
class HealthMetric:
    """Individual health metric"""
    name: str
    value: float
    unit: str
    timestamp: float
    status: str  # 'healthy', 'warning', 'critical'
    threshold_warning: Optional[float] = None
    threshold_critical: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ComponentHealth:
    """Health status for a component"""
    name: str
    status: str  # 'healthy', 'degraded', 'unhealthy', 'unknown'
    last_check: datetime
    metrics: Dict[str, HealthMetric] = field(default_factory=dict)
    errors: List[str] = field(default_factory=list)
    uptime: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SystemMetrics:
    """System-level metrics"""
    cpu_percent: float
    memory_percent: float
    memory_available_mb: float
    disk_usage_percent: float
    disk_free_mb: float
    network_connections: int
    open_files: int
    load_average: List[float]
    boot_time: float
    timestamp: float


class HealthChecker:
    """Base class for health checkers"""
    
    def __init__(self, name: str, check_interval: int = 30):
        self.name = name
        self.check_interval = check_interval
        self.logger = logging.getLogger(f"securewatch.health.{name}")
        
        self.last_check: Optional[datetime] = None
        self.last_status = "unknown"
        self.error_count = 0
        self.consecutive_failures = 0
    
    async def check_health(self) -> ComponentHealth:
        """Perform health check and return status"""
        try:
            self.last_check = datetime.now()
            
            # Perform actual health check
            metrics = await self._perform_check()
            
            # Determine overall status
            status = self._determine_status(metrics)
            
            # Reset failure count on success
            if status in ['healthy', 'warning']:
                self.consecutive_failures = 0
            else:
                self.consecutive_failures += 1
            
            self.last_status = status
            
            return ComponentHealth(
                name=self.name,
                status=status,
                last_check=self.last_check,
                metrics=metrics,
                errors=[],
                uptime=time.time() - psutil.boot_time()
            )
            
        except Exception as e:
            self.error_count += 1
            self.consecutive_failures += 1
            self.logger.error(f"Health check failed: {e}")
            
            return ComponentHealth(
                name=self.name,
                status="unhealthy",
                last_check=datetime.now(),
                metrics={},
                errors=[str(e)],
                uptime=0.0
            )
    
    async def _perform_check(self) -> Dict[str, HealthMetric]:
        """Override this method to implement specific health checks"""
        raise NotImplementedError
    
    def _determine_status(self, metrics: Dict[str, HealthMetric]) -> str:
        """Determine overall status based on metrics"""
        if not metrics:
            return "unknown"
        
        has_critical = any(m.status == "critical" for m in metrics.values())
        has_warning = any(m.status == "warning" for m in metrics.values())
        
        if has_critical:
            return "unhealthy"
        elif has_warning:
            return "degraded"
        else:
            return "healthy"


class SystemHealthChecker(HealthChecker):
    """System-level health checker"""
    
    def __init__(self, check_interval: int = 30):
        super().__init__("system", check_interval)
        
        # Thresholds
        self.cpu_warning_threshold = 70.0
        self.cpu_critical_threshold = 90.0
        self.memory_warning_threshold = 80.0
        self.memory_critical_threshold = 95.0
        self.disk_warning_threshold = 85.0
        self.disk_critical_threshold = 95.0
    
    async def _perform_check(self) -> Dict[str, HealthMetric]:
        """Perform system health checks"""
        metrics = {}
        current_time = time.time()
        
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=0.1)
        metrics['cpu_usage'] = HealthMetric(
            name="cpu_usage",
            value=cpu_percent,
            unit="percent",
            timestamp=current_time,
            status=self._get_threshold_status(
                cpu_percent, self.cpu_warning_threshold, self.cpu_critical_threshold
            ),
            threshold_warning=self.cpu_warning_threshold,
            threshold_critical=self.cpu_critical_threshold
        )
        
        # Memory usage
        memory = psutil.virtual_memory()
        metrics['memory_usage'] = HealthMetric(
            name="memory_usage",
            value=memory.percent,
            unit="percent",
            timestamp=current_time,
            status=self._get_threshold_status(
                memory.percent, self.memory_warning_threshold, self.memory_critical_threshold
            ),
            threshold_warning=self.memory_warning_threshold,
            threshold_critical=self.memory_critical_threshold,
            metadata={'available_mb': memory.available / 1024 / 1024}
        )
        
        # Disk usage
        try:
            disk = psutil.disk_usage('/')
            disk_percent = (disk.used / disk.total) * 100
            metrics['disk_usage'] = HealthMetric(
                name="disk_usage",
                value=disk_percent,
                unit="percent",
                timestamp=current_time,
                status=self._get_threshold_status(
                    disk_percent, self.disk_warning_threshold, self.disk_critical_threshold
                ),
                threshold_warning=self.disk_warning_threshold,
                threshold_critical=self.disk_critical_threshold,
                metadata={'free_mb': disk.free / 1024 / 1024}
            )
        except Exception as e:
            self.logger.warning(f"Could not get disk usage: {e}")
        
        # Load average (Unix-like systems)
        try:
            if hasattr(psutil, 'getloadavg'):
                load_avg = psutil.getloadavg()
                cpu_count = psutil.cpu_count()
                load_percent = (load_avg[0] / cpu_count) * 100 if cpu_count else 0
                
                metrics['load_average'] = HealthMetric(
                    name="load_average",
                    value=load_percent,
                    unit="percent",
                    timestamp=current_time,
                    status=self._get_threshold_status(load_percent, 80.0, 95.0),
                    threshold_warning=80.0,
                    threshold_critical=95.0,
                    metadata={'load_1min': load_avg[0], 'cpu_count': cpu_count}
                )
        except (AttributeError, OSError):
            # Not available on Windows
            pass
        
        # Network connections
        try:
            connections = len(psutil.net_connections())
            metrics['network_connections'] = HealthMetric(
                name="network_connections",
                value=connections,
                unit="count",
                timestamp=current_time,
                status=self._get_threshold_status(connections, 1000, 2000),
                threshold_warning=1000,
                threshold_critical=2000
            )
        except (psutil.AccessDenied, OSError):
            # May require elevated privileges
            pass
        
        # Open file descriptors
        try:
            process = psutil.Process()
            open_files = len(process.open_files())
            metrics['open_files'] = HealthMetric(
                name="open_files",
                value=open_files,
                unit="count",
                timestamp=current_time,
                status=self._get_threshold_status(open_files, 800, 950),
                threshold_warning=800,
                threshold_critical=950
            )
        except (psutil.AccessDenied, OSError):
            pass
        
        return metrics
    
    def _get_threshold_status(self, value: float, warning: float, critical: float) -> str:
        """Determine status based on thresholds"""
        if value >= critical:
            return "critical"
        elif value >= warning:
            return "warning"
        else:
            return "healthy"


class AgentComponentHealthChecker(HealthChecker):
    """Health checker for agent components"""
    
    def __init__(self, component_name: str, check_interval: int = 30):
        super().__init__(component_name, check_interval)
        self.component_stats: Dict[str, Any] = {}
        self.error_log: deque = deque(maxlen=100)
    
    def update_stats(self, stats: Dict[str, Any]) -> None:
        """Update component statistics"""
        self.component_stats = stats
        self.component_stats['last_updated'] = time.time()
    
    def record_error(self, error: str) -> None:
        """Record an error for this component"""
        self.error_log.append({
            'timestamp': time.time(),
            'error': error
        })
        self.error_count += 1
    
    async def _perform_check(self) -> Dict[str, HealthMetric]:
        """Perform component-specific health checks"""
        metrics = {}
        current_time = time.time()
        
        # Check if component is responsive
        last_updated = self.component_stats.get('last_updated', 0)
        age = current_time - last_updated
        
        metrics['responsiveness'] = HealthMetric(
            name="responsiveness",
            value=age,
            unit="seconds",
            timestamp=current_time,
            status=self._get_age_status(age),
            threshold_warning=60.0,
            threshold_critical=300.0
        )
        
        # Error rate
        recent_errors = sum(
            1 for error in self.error_log
            if current_time - error['timestamp'] < 300  # Last 5 minutes
        )
        
        metrics['error_rate'] = HealthMetric(
            name="error_rate",
            value=recent_errors,
            unit="errors/5min",
            timestamp=current_time,
            status=self._get_threshold_status(recent_errors, 5, 15),
            threshold_warning=5,
            threshold_critical=15
        )
        
        # Component-specific metrics
        if self.name == "transport":
            success_rate = self.component_stats.get('success_rate', 0)
            metrics['success_rate'] = HealthMetric(
                name="success_rate",
                value=success_rate * 100,
                unit="percent",
                timestamp=current_time,
                status=self._get_inverted_threshold_status(success_rate * 100, 95.0, 80.0),
                threshold_warning=95.0,
                threshold_critical=80.0
            )
        
        elif self.name == "buffer":
            utilization = self.component_stats.get('buffer_utilization', 0)
            metrics['buffer_utilization'] = HealthMetric(
                name="buffer_utilization",
                value=utilization * 100,
                unit="percent",
                timestamp=current_time,
                status=self._get_threshold_status(utilization * 100, 80.0, 95.0),
                threshold_warning=80.0,
                threshold_critical=95.0
            )
        
        return metrics
    
    def _get_age_status(self, age: float) -> str:
        """Get status based on age of last update"""
        if age > 300:  # 5 minutes
            return "critical"
        elif age > 60:  # 1 minute
            return "warning"
        else:
            return "healthy"
    
    def _get_inverted_threshold_status(self, value: float, warning: float, critical: float) -> str:
        """Get status where lower values are worse"""
        if value <= critical:
            return "critical"
        elif value <= warning:
            return "warning"
        else:
            return "healthy"


class HealthMonitor:
    """
    Main health monitoring system for SecureWatch agent
    """
    
    def __init__(self, agent_id: str, check_interval: int = 30, metrics_retention: int = 86400):
        self.agent_id = agent_id
        self.check_interval = check_interval
        self.metrics_retention = metrics_retention
        
        self.logger = logging.getLogger(f"securewatch.health.{agent_id}")
        
        # Health checkers
        self.checkers: Dict[str, HealthChecker] = {}
        self.health_status: Dict[str, ComponentHealth] = {}
        
        # Metrics storage
        self.metrics_history: Dict[str, deque] = {}
        self.alerts: List[Dict[str, Any]] = []
        
        # Monitoring state
        self.running = False
        self.monitoring_task: Optional[asyncio.Task] = None
        self.start_time = time.time()
        
        # System metrics
        self.system_metrics: Optional[SystemMetrics] = None
        
        # Setup default checkers
        self._setup_default_checkers()
    
    def _setup_default_checkers(self) -> None:
        """Setup default health checkers"""
        self.checkers['system'] = SystemHealthChecker()
        self.checkers['transport'] = AgentComponentHealthChecker('transport')
        self.checkers['buffer'] = AgentComponentHealthChecker('buffer')
        self.checkers['collectors'] = AgentComponentHealthChecker('collectors')
    
    async def initialize(self) -> None:
        """Initialize health monitoring"""
        try:
            self.logger.info("Initializing health monitoring system")
            
            # Initialize metrics storage
            for checker_name in self.checkers:
                self.metrics_history[checker_name] = deque(maxlen=self.metrics_retention // self.check_interval)
            
            # Perform initial health checks
            await self._perform_all_checks()
            
            self.logger.info("Health monitoring initialized")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize health monitoring: {e}")
            raise HealthMonitorError(f"Health monitoring initialization failed: {e}") from e
    
    async def start(self, agent_reference: Any) -> None:
        """Start health monitoring"""
        if self.running:
            return
        
        self.running = True
        self.agent_reference = agent_reference
        
        # Start monitoring task
        self.monitoring_task = asyncio.create_task(self._monitoring_loop())
        
        self.logger.info("Health monitoring started")
    
    async def stop(self) -> None:
        """Stop health monitoring"""
        self.running = False
        
        if self.monitoring_task:
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                pass
        
        self.logger.info("Health monitoring stopped")
    
    async def _monitoring_loop(self) -> None:
        """Main monitoring loop"""
        while self.running:
            try:
                await self._perform_all_checks()
                await self._collect_system_metrics()
                await self._check_for_alerts()
                await self._cleanup_old_metrics()
                
                await asyncio.sleep(self.check_interval)
                
            except Exception as e:
                self.logger.error(f"Monitoring loop error: {e}")
                await asyncio.sleep(self.check_interval)
    
    async def _perform_all_checks(self) -> None:
        """Perform health checks for all components"""
        check_tasks = []
        
        for name, checker in self.checkers.items():
            task = asyncio.create_task(self._perform_check(name, checker))
            check_tasks.append(task)
        
        # Wait for all checks to complete
        results = await asyncio.gather(*check_tasks, return_exceptions=True)
        
        for name, result in zip(self.checkers.keys(), results):
            if isinstance(result, Exception):
                self.logger.error(f"Health check failed for {name}: {result}")
            else:
                self.health_status[name] = result
                self.metrics_history[name].append({
                    'timestamp': time.time(),
                    'health': result
                })
    
    async def _perform_check(self, name: str, checker: HealthChecker) -> ComponentHealth:
        """Perform individual health check"""
        return await checker.check_health()
    
    async def _collect_system_metrics(self) -> None:
        """Collect system-level metrics"""
        try:
            # CPU and memory
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory()
            
            # Disk usage
            disk = psutil.disk_usage('/')
            disk_usage_percent = (disk.used / disk.total) * 100
            disk_free_mb = disk.free / 1024 / 1024
            
            # Network and files
            try:
                network_connections = len(psutil.net_connections())
            except (psutil.AccessDenied, OSError):
                network_connections = 0
            
            try:
                open_files = len(psutil.Process().open_files())
            except (psutil.AccessDenied, OSError):
                open_files = 0
            
            # Load average
            try:
                load_average = list(psutil.getloadavg()) if hasattr(psutil, 'getloadavg') else [0, 0, 0]
            except (AttributeError, OSError):
                load_average = [0, 0, 0]
            
            self.system_metrics = SystemMetrics(
                cpu_percent=cpu_percent,
                memory_percent=memory.percent,
                memory_available_mb=memory.available / 1024 / 1024,
                disk_usage_percent=disk_usage_percent,
                disk_free_mb=disk_free_mb,
                network_connections=network_connections,
                open_files=open_files,
                load_average=load_average,
                boot_time=psutil.boot_time(),
                timestamp=time.time()
            )
            
        except Exception as e:
            self.logger.error(f"Failed to collect system metrics: {e}")
    
    async def _check_for_alerts(self) -> None:
        """Check for alert conditions"""
        current_time = time.time()
        
        for component_name, health in self.health_status.items():
            if health.status in ['unhealthy', 'degraded']:
                # Check if we already have a recent alert for this component
                recent_alert = any(
                    alert['component'] == component_name and
                    current_time - alert['timestamp'] < 300  # 5 minutes
                    for alert in self.alerts
                )
                
                if not recent_alert:
                    alert = {
                        'timestamp': current_time,
                        'component': component_name,
                        'status': health.status,
                        'message': f"Component {component_name} is {health.status}",
                        'metrics': {name: metric.value for name, metric in health.metrics.items()},
                        'errors': health.errors
                    }
                    
                    self.alerts.append(alert)
                    self.logger.warning(f"Health alert: {alert['message']}")
        
        # Cleanup old alerts
        cutoff_time = current_time - 3600  # 1 hour
        self.alerts = [alert for alert in self.alerts if alert['timestamp'] > cutoff_time]
    
    async def _cleanup_old_metrics(self) -> None:
        """Clean up old metrics to manage memory"""
        cutoff_time = time.time() - self.metrics_retention
        
        for component_name, history in self.metrics_history.items():
            # Remove old entries
            while history and history[0]['timestamp'] < cutoff_time:
                history.popleft()
    
    async def record_error(self, component: str, error: str) -> None:
        """Record an error for a specific component"""
        if component in self.checkers and isinstance(self.checkers[component], AgentComponentHealthChecker):
            self.checkers[component].record_error(error)
        
        self.logger.warning(f"Error recorded for {component}: {error}")
    
    def update_component_stats(self, component: str, stats: Dict[str, Any]) -> None:
        """Update statistics for a component"""
        if component in self.checkers and isinstance(self.checkers[component], AgentComponentHealthChecker):
            self.checkers[component].update_stats(stats)
    
    def get_status(self) -> Dict[str, Any]:
        """Get overall health status"""
        overall_status = "healthy"
        
        # Determine overall status
        for health in self.health_status.values():
            if health.status == "unhealthy":
                overall_status = "unhealthy"
                break
            elif health.status == "degraded" and overall_status == "healthy":
                overall_status = "degraded"
        
        return {
            'overall_status': overall_status,
            'uptime': time.time() - self.start_time,
            'components': {
                name: {
                    'status': health.status,
                    'last_check': health.last_check.isoformat() if health.last_check else None,
                    'error_count': len(health.errors),
                    'metrics': {
                        metric_name: {
                            'value': metric.value,
                            'unit': metric.unit,
                            'status': metric.status
                        }
                        for metric_name, metric in health.metrics.items()
                    }
                }
                for name, health in self.health_status.items()
            },
            'system_metrics': {
                'cpu_percent': self.system_metrics.cpu_percent if self.system_metrics else 0,
                'memory_percent': self.system_metrics.memory_percent if self.system_metrics else 0,
                'disk_usage_percent': self.system_metrics.disk_usage_percent if self.system_metrics else 0,
                'network_connections': self.system_metrics.network_connections if self.system_metrics else 0
            } if self.system_metrics else {},
            'recent_alerts': len([a for a in self.alerts if time.time() - a['timestamp'] < 3600]),
            'agent_id': self.agent_id
        }
    
    def get_metrics_history(self, component: str, hours: int = 24) -> List[Dict[str, Any]]:
        """Get metrics history for a component"""
        if component not in self.metrics_history:
            return []
        
        cutoff_time = time.time() - (hours * 3600)
        
        return [
            entry for entry in self.metrics_history[component]
            if entry['timestamp'] > cutoff_time
        ]
    
    def get_alerts(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Get recent alerts"""
        cutoff_time = time.time() - (hours * 3600)
        
        return [
            alert for alert in self.alerts
            if alert['timestamp'] > cutoff_time
        ]


# Utility functions for health monitoring

def get_system_info() -> Dict[str, Any]:
    """Get comprehensive system information"""
    try:
        return {
            'platform': platform.platform(),
            'architecture': platform.architecture(),
            'processor': platform.processor(),
            'python_version': platform.python_version(),
            'cpu_count': psutil.cpu_count(),
            'memory_total_mb': psutil.virtual_memory().total / 1024 / 1024,
            'disk_total_gb': psutil.disk_usage('/').total / 1024 / 1024 / 1024,
            'boot_time': psutil.boot_time(),
            'hostname': platform.node()
        }
    except Exception as e:
        return {'error': str(e)}


async def perform_connectivity_check(endpoint: str, timeout: float = 10.0) -> Dict[str, Any]:
    """Perform connectivity check to an endpoint"""
    import aiohttp
    
    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=timeout)) as session:
            start_time = time.time()
            async with session.get(f"{endpoint}/health") as response:
                latency = time.time() - start_time
                
                return {
                    'success': True,
                    'status_code': response.status,
                    'latency': latency,
                    'endpoint': endpoint
                }
                
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'endpoint': endpoint
        }