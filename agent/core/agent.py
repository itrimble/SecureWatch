"""
SecureWatch Agent Core
Main agent architecture with asyncio-based event loop
"""

import asyncio
import json
import logging
import signal
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from contextlib import asynccontextmanager

from .config import AgentConfig, ConfigManager
from .buffer import EventBuffer
from .transport import SecureTransport
from .persistent_queue import PersistentQueue, QueueConfig
from .health import HealthMonitor
from .collectors.base import Collector
from .collectors.windows_event import WindowsEventCollector
from .collectors.syslog import SyslogCollector
from .collectors.file import FileCollector
from .resource_manager import ResourceManager
from .exceptions import AgentError, ConfigurationError


@dataclass
class AgentStats:
    """Agent runtime statistics"""
    start_time: float
    events_collected: int = 0
    events_sent: int = 0
    events_failed: int = 0
    bytes_sent: int = 0
    last_heartbeat: Optional[float] = None
    errors: List[str] = None
    
    def __post_init__(self):
        if self.errors is None:
            self.errors = []


class SecureWatchAgent:
    """
    Main SecureWatch Agent class responsible for coordinating
    log collection, buffering, and secure transmission
    """
    
    def __init__(self, config_path: str, agent_id: Optional[str] = None):
        self.config_path = Path(config_path)
        self.agent_id = agent_id or self._generate_agent_id()
        self.config: Optional[AgentConfig] = None
        self.config_manager: Optional[ConfigManager] = None
        
        # Core components
        self.collectors: List[Collector] = []
        self.buffer: Optional[EventBuffer] = None
        self.transport: Optional[SecureTransport] = None
        self.persistent_queue: Optional[PersistentQueue] = None
        self.health_monitor: Optional[HealthMonitor] = None
        self.resource_manager: Optional[ResourceManager] = None
        
        # Runtime state
        self.running = False
        self.stats = AgentStats(start_time=time.time())
        self.shutdown_event = asyncio.Event()
        
        # Setup logging
        self.logger = self._setup_logging()
        
        # Setup signal handlers
        self._setup_signal_handlers()
    
    def _generate_agent_id(self) -> str:
        """Generate unique agent ID"""
        import uuid
        import platform
        hostname = platform.node()
        return f"{hostname}-{uuid.uuid4().hex[:8]}"
    
    def _setup_logging(self) -> logging.Logger:
        """Setup agent logging"""
        logger = logging.getLogger(f"securewatch.agent.{self.agent_id}")
        
        # Configure console handler
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        
        return logger
    
    def _setup_signal_handlers(self):
        """Setup graceful shutdown signal handlers"""
        def signal_handler(signum, frame):
            self.logger.info(f"Received signal {signum}, initiating graceful shutdown")
            asyncio.create_task(self.stop())
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
    
    async def initialize(self) -> None:
        """Initialize agent components"""
        try:
            self.logger.info(f"Initializing SecureWatch Agent {self.agent_id}")
            
            # Load and validate configuration
            await self._load_configuration()
            
            # Initialize resource manager
            self.resource_manager = ResourceManager(
                max_memory_mb=self.config.resource_limits.max_memory_mb,
                max_cpu_percent=self.config.resource_limits.max_cpu_percent,
                max_disk_mb=self.config.resource_limits.max_disk_mb
            )
            
            # Initialize event buffer
            self.buffer = EventBuffer(
                db_path=self.config.buffer.db_path,
                max_size=self.config.buffer.max_size,
                batch_size=self.config.buffer.batch_size,
                retention_hours=self.config.buffer.retention_hours,
                agent_id=self.agent_id
            )
            await self.buffer.initialize()
            
            # Initialize persistent queue for reliable delivery
            queue_config = QueueConfig(
                db_path=str(Path(self.config.buffer.db_path).parent / "persistent_queue.db"),
                max_size=50000,  # 50k events max
                max_age_hours=72,  # 3 days retention
                compression_threshold=2048,  # Compress events > 2KB
                batch_size=100,  # Process 100 events at a time
                retry_delays=[30, 300, 1800, 7200],  # 30s, 5m, 30m, 2h
                cleanup_interval=3600  # Cleanup hourly
            )
            
            self.persistent_queue = PersistentQueue(queue_config)
            await self.persistent_queue.initialize()
            
            # Initialize secure transport
            self.transport = SecureTransport(
                endpoint=self.config.transport.endpoint,
                auth_config=self.config.transport.auth,
                compression_config=self.config.transport.compression,
                retry_config=self.config.transport.retry,
                agent_id=self.agent_id
            )
            await self.transport.initialize()
            
            # Initialize health monitor
            self.health_monitor = HealthMonitor(
                agent_id=self.agent_id,
                check_interval=self.config.health.check_interval,
                metrics_retention=self.config.health.metrics_retention
            )
            await self.health_monitor.initialize()
            
            # Initialize collectors
            await self._initialize_collectors()
            
            self.logger.info("Agent initialization completed successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize agent: {e}")
            raise AgentError(f"Initialization failed: {e}") from e
    
    async def _load_configuration(self) -> None:
        """Load and validate agent configuration"""
        try:
            self.config_manager = ConfigManager(self.config_path)
            self.config = await self.config_manager.load_config()
            
            # Update logging level if specified in config
            if self.config.logging.level:
                self.logger.setLevel(getattr(logging, self.config.logging.level.upper()))
            
            self.logger.info("Configuration loaded successfully")
            
        except Exception as e:
            raise ConfigurationError(f"Failed to load configuration: {e}") from e
    
    async def _initialize_collectors(self) -> None:
        """Initialize log collectors based on configuration"""
        self.collectors = []
        
        for collector_config in self.config.collectors:
            try:
                collector = await self._create_collector(collector_config)
                self.collectors.append(collector)
                self.logger.info(f"Initialized collector: {collector_config.name} ({collector_config.type})")
                
            except Exception as e:
                self.logger.error(f"Failed to initialize collector {collector_config.name}: {e}")
                if collector_config.required:
                    raise AgentError(f"Required collector failed to initialize: {collector_config.name}")
    
    async def _create_collector(self, config: Dict[str, Any]) -> Collector:
        """Create collector instance based on configuration"""
        collector_type = config.type
        
        if collector_type == 'windows_event':
            return WindowsEventCollector(
                config=config,
                agent_id=self.agent_id,
                resource_manager=self.resource_manager
            )
        elif collector_type == 'syslog':
            return SyslogCollector(
                config=config,
                agent_id=self.agent_id,
                resource_manager=self.resource_manager
            )
        elif collector_type == 'file':
            return FileCollector(
                config=config,
                agent_id=self.agent_id,
                resource_manager=self.resource_manager
            )
        else:
            raise ValueError(f"Unknown collector type: {collector_type}")
    
    async def start(self) -> None:
        """Start the agent and all its components"""
        try:
            if self.running:
                self.logger.warning("Agent is already running")
                return
            
            await self.initialize()
            
            self.running = True
            self.stats.start_time = time.time()
            
            self.logger.info("Starting SecureWatch Agent")
            
            # Start health monitoring
            health_task = asyncio.create_task(self.health_monitor.start(self))
            
            # Start resource monitoring
            resource_task = asyncio.create_task(self.resource_manager.start_monitoring())
            
            # Start all collectors
            collector_tasks = []
            for collector in self.collectors:
                task = asyncio.create_task(self._collector_wrapper(collector))
                collector_tasks.append(task)
            
            # Start transport loop
            transport_task = asyncio.create_task(self._transport_loop())
            
            # Start heartbeat task
            heartbeat_task = asyncio.create_task(self._heartbeat_loop())
            
            # Start configuration update monitoring
            config_task = asyncio.create_task(self._config_update_loop())
            
            # Gather all tasks
            all_tasks = [
                health_task,
                resource_task,
                transport_task,
                heartbeat_task,
                config_task,
                *collector_tasks
            ]
            
            self.logger.info(f"Agent started with {len(self.collectors)} collectors")
            
            # Wait for shutdown or task completion
            await asyncio.wait([
                asyncio.create_task(self.shutdown_event.wait()),
                *all_tasks
            ], return_when=asyncio.FIRST_COMPLETED)
            
        except Exception as e:
            self.logger.error(f"Agent start failed: {e}")
            raise
        finally:
            await self._cleanup()
    
    async def _collector_wrapper(self, collector: Collector) -> None:
        """Wrapper for collector execution with error handling"""
        try:
            self.logger.info(f"Starting collector: {collector.name}")
            await collector.start(self.buffer, self.health_monitor)
            
        except Exception as e:
            self.logger.error(f"Collector {collector.name} failed: {e}")
            self.stats.errors.append(f"Collector {collector.name}: {e}")
            await self.health_monitor.record_error(f"collector.{collector.name}", str(e))
            
            # If this is a required collector, shutdown the agent
            if collector.config.get('required', False):
                self.logger.critical(f"Required collector {collector.name} failed, shutting down agent")
                await self.stop()
    
    async def _transport_loop(self) -> None:
        """Enhanced transport loop with persistent queue and retry logic"""
        self.logger.info("Starting enhanced transport loop with persistent queue")
        
        # Start two parallel tasks: buffer to queue, and queue to transport
        buffer_task = asyncio.create_task(self._buffer_to_queue_loop())
        queue_task = asyncio.create_task(self._queue_to_transport_loop())
        
        try:
            await asyncio.gather(buffer_task, queue_task)
        except Exception as e:
            self.logger.error(f"Transport loop error: {e}")
            buffer_task.cancel()
            queue_task.cancel()
    
    async def _buffer_to_queue_loop(self) -> None:
        """Move events from buffer to persistent queue"""
        while self.running:
            try:
                # Check resource usage
                if not await self.resource_manager.check_resources():
                    await asyncio.sleep(5)
                    continue
                
                # Get events from buffer
                events = await self.buffer.get_batch(self.config.transport.batch_size)
                
                if events:
                    # Queue each event in persistent queue
                    queued_events = []
                    for event in events:
                        try:
                            event_id = await self.persistent_queue.enqueue(
                                payload=event,
                                priority=event.get('priority', 0)
                            )
                            queued_events.append(event['id'])
                            self.logger.debug(f"Event {event['id']} queued as {event_id}")
                            
                        except Exception as e:
                            self.logger.error(f"Failed to queue event {event['id']}: {e}")
                            self.stats.events_failed += 1
                    
                    # Mark events as processed in buffer
                    if queued_events:
                        await self.buffer.mark_sent(queued_events)
                        self.logger.debug(f"Moved {len(queued_events)} events to persistent queue")
                else:
                    await asyncio.sleep(1)
                    
            except Exception as e:
                self.logger.error(f"Buffer to queue loop error: {e}")
                await asyncio.sleep(5)
    
    async def _queue_to_transport_loop(self) -> None:
        """Send events from persistent queue to transport"""
        while self.running:
            try:
                # Check if there are pending events
                pending_count = await self.persistent_queue.get_pending_count()
                if pending_count == 0:
                    await asyncio.sleep(2)
                    continue
                
                # Get batch of events from queue
                queued_events = await self.persistent_queue.dequeue_batch()
                
                if queued_events:
                    # Extract payloads for transport
                    event_payloads = [qe.payload for qe in queued_events]
                    
                    try:
                        # Send events via transport
                        success, bytes_sent = await self.transport.send_events(event_payloads)
                        
                        if success:
                            # Mark events as completed in queue
                            completed_ids = [qe.id for qe in queued_events]
                            await self.persistent_queue.mark_completed(completed_ids)
                            
                            # Update statistics
                            self.stats.events_sent += len(event_payloads)
                            self.stats.bytes_sent += bytes_sent
                            
                            self.logger.debug(f"Successfully sent {len(event_payloads)} events ({bytes_sent} bytes)")
                            
                        else:
                            # Mark events as failed for retry
                            for qe in queued_events:
                                await self.persistent_queue.mark_failed(
                                    qe.id, 
                                    "Transport send failed - will retry"
                                )
                            
                            self.logger.warning(f"Failed to send {len(event_payloads)} events, queued for retry")
                            
                    except Exception as transport_error:
                        # Handle transport errors
                        for qe in queued_events:
                            await self.persistent_queue.mark_failed(
                                qe.id, 
                                f"Transport error: {str(transport_error)}"
                            )
                        
                        self.logger.error(f"Transport error for {len(queued_events)} events: {transport_error}")
                        await self.health_monitor.record_error('transport', str(transport_error))
                        
                        # Back off on transport errors
                        await asyncio.sleep(self.config.transport.retry.base_delay)
                else:
                    await asyncio.sleep(1)
                    
            except Exception as e:
                self.logger.error(f"Queue to transport loop error: {e}")
                await asyncio.sleep(5)
    
    async def _heartbeat_loop(self) -> None:
        """Send periodic heartbeats to the server"""
        interval = self.config.health.heartbeat_interval
        
        while self.running:
            try:
                success = await self.transport.send_heartbeat(self.get_status())
                if success:
                    self.stats.last_heartbeat = time.time()
                    self.logger.debug("Heartbeat sent successfully")
                else:
                    self.logger.warning("Failed to send heartbeat")
                
            except Exception as e:
                self.logger.error(f"Heartbeat error: {e}")
                await self.health_monitor.record_error('heartbeat', str(e))
            
            await asyncio.sleep(interval)
    
    async def _config_update_loop(self) -> None:
        """Monitor for configuration updates"""
        while self.running:
            try:
                if await self.config_manager.check_for_updates():
                    self.logger.info("Configuration update detected")
                    await self._reload_configuration()
                
            except Exception as e:
                self.logger.error(f"Config update check failed: {e}")
            
            await asyncio.sleep(self.config.config_update_interval)
    
    async def _reload_configuration(self) -> None:
        """Reload configuration and restart affected components"""
        try:
            self.logger.info("Reloading configuration")
            
            new_config = await self.config_manager.load_config()
            
            # Compare configurations and restart components as needed
            # This is a simplified implementation - in production, you'd want
            # more granular component restart logic
            
            self.config = new_config
            self.logger.info("Configuration reloaded successfully")
            
        except Exception as e:
            self.logger.error(f"Configuration reload failed: {e}")
    
    async def stop(self) -> None:
        """Stop the agent gracefully"""
        if not self.running:
            return
        
        self.logger.info("Stopping SecureWatch Agent")
        self.running = False
        self.shutdown_event.set()
    
    async def _cleanup(self) -> None:
        """Clean up agent resources"""
        self.logger.info("Cleaning up agent resources")
        
        # Stop collectors
        for collector in self.collectors:
            try:
                await collector.stop()
            except Exception as e:
                self.logger.error(f"Error stopping collector {collector.name}: {e}")
        
        # Close transport
        if self.transport:
            try:
                await self.transport.close()
            except Exception as e:
                self.logger.error(f"Error closing transport: {e}")
        
        # Close buffer
        if self.buffer:
            try:
                await self.buffer.close()
            except Exception as e:
                self.logger.error(f"Error closing buffer: {e}")
        
        # Close persistent queue
        if self.persistent_queue:
            try:
                await self.persistent_queue.close()
            except Exception as e:
                self.logger.error(f"Error closing persistent queue: {e}")
        
        # Stop health monitor
        if self.health_monitor:
            try:
                await self.health_monitor.stop()
            except Exception as e:
                self.logger.error(f"Error stopping health monitor: {e}")
        
        # Stop resource manager
        if self.resource_manager:
            try:
                await self.resource_manager.stop()
            except Exception as e:
                self.logger.error(f"Error stopping resource manager: {e}")
        
        self.logger.info("Agent cleanup completed")
    
    def get_status(self) -> Dict[str, Any]:
        """Get current agent status"""
        uptime = time.time() - self.stats.start_time if self.stats.start_time else 0
        
        status = {
            'agent_id': self.agent_id,
            'status': 'running' if self.running else 'stopped',
            'uptime': uptime,
            'version': '1.0.0',  # Should be loaded from package metadata
            'collectors': [
                {
                    'name': collector.name,
                    'type': collector.collector_type,
                    'status': collector.status,
                    'events_collected': collector.events_collected
                }
                for collector in self.collectors
            ],
            'stats': {
                'events_collected': self.stats.events_collected,
                'events_sent': self.stats.events_sent,
                'events_failed': self.stats.events_failed,
                'bytes_sent': self.stats.bytes_sent,
                'last_heartbeat': self.stats.last_heartbeat
            },
            'health': self.health_monitor.get_status() if self.health_monitor else None,
            'resources': self.resource_manager.get_usage() if self.resource_manager else None
        }
        
        # Add queue statistics if available
        if self.persistent_queue:
            try:
                # Get queue stats synchronously (will be async in real implementation)
                import asyncio
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    # Create a task to get stats
                    queue_stats_task = asyncio.create_task(self.persistent_queue.get_stats())
                    # Note: In real implementation, you'd want to cache these stats
                    # or make the status method async
                    status['queue'] = {'stats_pending': True}
                else:
                    queue_stats = loop.run_until_complete(self.persistent_queue.get_stats())
                    status['queue'] = queue_stats
            except Exception as e:
                status['queue'] = {'error': str(e)}
        
        return status
    
    @asynccontextmanager
    async def run_context(self):
        """Context manager for running the agent"""
        try:
            await self.start()
            yield self
        finally:
            await self.stop()


async def main():
    """Main entry point for the agent"""
    import argparse
    
    parser = argparse.ArgumentParser(description='SecureWatch Agent')
    parser.add_argument('--config', '-c', default='/etc/securewatch/agent.json',
                       help='Path to agent configuration file')
    parser.add_argument('--agent-id', help='Override agent ID')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Enable verbose logging')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    agent = SecureWatchAgent(args.config, args.agent_id)
    
    try:
        async with agent.run_context():
            # Keep running until interrupted
            await asyncio.Event().wait()
    except KeyboardInterrupt:
        pass
    except Exception as e:
        logging.error(f"Agent failed: {e}")
        sys.exit(1)


if __name__ == '__main__':
    asyncio.run(main())