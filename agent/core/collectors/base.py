"""
SecureWatch Agent - Base Collector
Abstract base class for all log collectors
"""

import asyncio
import logging
import time
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, AsyncGenerator
from dataclasses import dataclass
from datetime import datetime

from ..exceptions import CollectorError
from ..buffer import EventBuffer
from ..health import HealthMonitor
from ..resource_manager import ResourceManager


@dataclass
class CollectorMetrics:
    """Metrics for a collector"""
    events_collected: int = 0
    events_processed: int = 0
    events_failed: int = 0
    bytes_processed: int = 0
    last_collection_time: Optional[float] = None
    collection_errors: int = 0
    avg_processing_time_ms: float = 0.0


class Collector(ABC):
    """
    Abstract base class for all log collectors
    """
    
    def __init__(self, config: Dict[str, Any], agent_id: str, 
                 resource_manager: Optional[ResourceManager] = None):
        self.config = config
        self.agent_id = agent_id
        self.resource_manager = resource_manager
        
        # Basic properties
        self.name = config.get('name', 'unknown')
        self.collector_type = config.get('type', 'unknown')
        self.enabled = config.get('enabled', True)
        self.required = config.get('required', False)
        
        # Timing configuration
        self.poll_interval = config.get('poll_interval', 30.0)
        self.batch_size = config.get('batch_size', 100)
        self.timeout = config.get('timeout', 30.0)
        
        # State
        self.running = False
        self.status = 'initialized'
        self.last_error: Optional[str] = None
        
        # Metrics
        self.metrics = CollectorMetrics()
        
        # Components
        self.buffer: Optional[EventBuffer] = None
        self.health_monitor: Optional[HealthMonitor] = None
        
        # Tasks
        self.collection_task: Optional[asyncio.Task] = None
        
        # Setup logging
        self.logger = logging.getLogger(f"securewatch.collector.{self.name}")
        
        # Filters
        self.filters = config.get('filters', [])
    
    async def start(self, buffer: EventBuffer, health_monitor: HealthMonitor) -> None:
        """Start the collector"""
        if self.running:
            return
        
        if not self.enabled:
            self.logger.info(f"Collector {self.name} is disabled, skipping start")
            return
        
        try:
            self.buffer = buffer
            self.health_monitor = health_monitor
            
            self.logger.info(f"Starting collector: {self.name} ({self.collector_type})")
            
            # Initialize collector-specific components
            await self.initialize()
            
            # Start collection
            self.running = True
            self.status = 'running'
            self.collection_task = asyncio.create_task(self._collection_loop())
            
            self.logger.info(f"Collector {self.name} started successfully")
            
        except Exception as e:
            self.status = 'failed'
            self.last_error = str(e)
            self.logger.error(f"Failed to start collector {self.name}: {e}")
            raise CollectorError(f"Collector {self.name} failed to start: {e}") from e
    
    async def stop(self) -> None:
        """Stop the collector"""
        if not self.running:
            return
        
        self.logger.info(f"Stopping collector: {self.name}")
        
        self.running = False
        self.status = 'stopping'
        
        # Cancel collection task
        if self.collection_task:
            self.collection_task.cancel()
            try:
                await self.collection_task
            except asyncio.CancelledError:
                pass
        
        # Cleanup collector-specific resources
        try:
            await self.cleanup()
        except Exception as e:
            self.logger.error(f"Error during cleanup for {self.name}: {e}")
        
        self.status = 'stopped'
        self.logger.info(f"Collector {self.name} stopped")
    
    async def _collection_loop(self) -> None:
        """Main collection loop"""
        while self.running:
            try:
                # Check if we should throttle
                if self.resource_manager:
                    throttle_level = self.resource_manager.get_throttle_level('collectors')
                    if throttle_level < 1.0:
                        # Apply throttling by adjusting sleep time
                        adjusted_interval = self.poll_interval / throttle_level
                        self.logger.debug(f"Throttling active: {throttle_level:.2f}, "
                                        f"interval adjusted to {adjusted_interval:.1f}s")
                        await asyncio.sleep(adjusted_interval)
                        continue
                
                # Record resource usage
                if self.resource_manager:
                    self.resource_manager.record_event()
                
                # Collect events
                start_time = time.time()
                
                try:
                    events = await self._collect_events()
                    
                    if events:
                        # Apply filters
                        filtered_events = await self._apply_filters(events)
                        
                        if filtered_events:
                            # Process and buffer events
                            await self._process_and_buffer_events(filtered_events)
                            
                            # Update metrics
                            self.metrics.events_collected += len(events)
                            self.metrics.events_processed += len(filtered_events)
                    
                    # Update timing metrics
                    processing_time = (time.time() - start_time) * 1000
                    self._update_processing_time(processing_time)
                    self.metrics.last_collection_time = time.time()
                    
                except Exception as e:
                    self.metrics.collection_errors += 1
                    self.last_error = str(e)
                    self.logger.error(f"Collection error in {self.name}: {e}")
                    
                    # Report error to health monitor
                    if self.health_monitor:
                        await self.health_monitor.record_error(f"collector.{self.name}", str(e))
                
                # Wait for next collection
                await asyncio.sleep(self.poll_interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Unexpected error in collection loop for {self.name}: {e}")
                await asyncio.sleep(self.poll_interval)
    
    async def _process_and_buffer_events(self, events: List[Dict[str, Any]]) -> None:
        """Process events and add them to the buffer"""
        try:
            processed_events = []
            
            for event in events:
                # Enrich event with collector metadata
                enriched_event = await self._enrich_event(event)
                processed_events.append(enriched_event)
            
            # Add to buffer
            if self.buffer:
                await self.buffer.add_events_batch(processed_events)
            
        except Exception as e:
            self.metrics.events_failed += len(events)
            raise CollectorError(f"Failed to process and buffer events: {e}") from e
    
    async def _enrich_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Enrich event with collector metadata"""
        enriched = event.copy()
        
        # Add collector metadata
        enriched['_collector'] = {
            'name': self.name,
            'type': self.collector_type,
            'agent_id': self.agent_id,
            'collected_at': time.time()
        }
        
        # Ensure required fields
        if 'timestamp' not in enriched:
            enriched['timestamp'] = time.time()
        
        if 'id' not in enriched:
            import uuid
            enriched['id'] = str(uuid.uuid4())
        
        return enriched
    
    async def _apply_filters(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Apply configured filters to events"""
        if not self.filters:
            return events
        
        filtered_events = []
        
        for event in events:
            if await self._event_passes_filters(event):
                filtered_events.append(event)
        
        return filtered_events
    
    async def _event_passes_filters(self, event: Dict[str, Any]) -> bool:
        """Check if event passes all configured filters"""
        for filter_config in self.filters:
            if not await self._apply_single_filter(event, filter_config):
                return False
        return True
    
    async def _apply_single_filter(self, event: Dict[str, Any], filter_config: Dict[str, Any]) -> bool:
        """Apply a single filter to an event"""
        filter_type = filter_config.get('type', 'include')
        field = filter_config.get('field')
        operation = filter_config.get('operation', 'equals')
        value = filter_config.get('value')
        
        if not field or value is None:
            return True
        
        # Get field value from event
        event_value = self._get_nested_value(event, field)
        
        # Apply operation
        result = False
        
        if operation == 'equals':
            result = event_value == value
        elif operation == 'not_equals':
            result = event_value != value
        elif operation == 'contains':
            result = str(value) in str(event_value) if event_value else False
        elif operation == 'not_contains':
            result = str(value) not in str(event_value) if event_value else True
        elif operation == 'regex':
            import re
            result = bool(re.search(str(value), str(event_value))) if event_value else False
        elif operation == 'greater_than':
            try:
                result = float(event_value) > float(value)
            except (ValueError, TypeError):
                result = False
        elif operation == 'less_than':
            try:
                result = float(event_value) < float(value)
            except (ValueError, TypeError):
                result = False
        elif operation == 'in':
            if isinstance(value, list):
                result = event_value in value
            else:
                result = event_value == value
        elif operation == 'not_in':
            if isinstance(value, list):
                result = event_value not in value
            else:
                result = event_value != value
        
        # Handle include/exclude logic
        if filter_type == 'exclude':
            result = not result
        
        return result
    
    def _get_nested_value(self, obj: Dict[str, Any], path: str) -> Any:
        """Get nested value using dot notation"""
        keys = path.split('.')
        current = obj
        
        for key in keys:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return None
        
        return current
    
    def _update_processing_time(self, processing_time_ms: float) -> None:
        """Update average processing time"""
        if self.metrics.avg_processing_time_ms == 0:
            self.metrics.avg_processing_time_ms = processing_time_ms
        else:
            # Exponential moving average
            alpha = 0.1
            self.metrics.avg_processing_time_ms = (
                alpha * processing_time_ms + 
                (1 - alpha) * self.metrics.avg_processing_time_ms
            )
    
    def get_status(self) -> Dict[str, Any]:
        """Get collector status"""
        return {
            'name': self.name,
            'type': self.collector_type,
            'status': self.status,
            'enabled': self.enabled,
            'required': self.required,
            'running': self.running,
            'last_error': self.last_error,
            'metrics': {
                'events_collected': self.metrics.events_collected,
                'events_processed': self.metrics.events_processed,
                'events_failed': self.metrics.events_failed,
                'bytes_processed': self.metrics.bytes_processed,
                'collection_errors': self.metrics.collection_errors,
                'avg_processing_time_ms': self.metrics.avg_processing_time_ms,
                'last_collection_time': self.metrics.last_collection_time
            },
            'config': {
                'poll_interval': self.poll_interval,
                'batch_size': self.batch_size,
                'timeout': self.timeout,
                'filters_count': len(self.filters)
            }
        }
    
    @property
    def events_collected(self) -> int:
        """Get total events collected"""
        return self.metrics.events_collected
    
    # Abstract methods that must be implemented by subclasses
    
    @abstractmethod
    async def initialize(self) -> None:
        """Initialize collector-specific components"""
        pass
    
    @abstractmethod
    async def cleanup(self) -> None:
        """Cleanup collector-specific resources"""
        pass
    
    @abstractmethod
    async def _collect_events(self) -> List[Dict[str, Any]]:
        """Collect events from the source"""
        pass
    
    @abstractmethod
    async def test_connection(self) -> Dict[str, Any]:
        """Test connection to the log source"""
        pass
    
    @abstractmethod
    def get_collector_info(self) -> Dict[str, Any]:
        """Get collector-specific information"""
        pass


class MockCollector(Collector):
    """Mock collector for testing purposes"""
    
    def __init__(self, config: Dict[str, Any], agent_id: str, 
                 resource_manager: Optional[ResourceManager] = None):
        super().__init__(config, agent_id, resource_manager)
        self.event_count = 0
    
    async def initialize(self) -> None:
        """Initialize mock collector"""
        self.logger.info("Mock collector initialized")
    
    async def cleanup(self) -> None:
        """Cleanup mock collector"""
        self.logger.info("Mock collector cleaned up")
    
    async def _collect_events(self) -> List[Dict[str, Any]]:
        """Generate mock events"""
        events = []
        
        for i in range(min(self.batch_size, 5)):  # Generate up to 5 events per collection
            self.event_count += 1
            events.append({
                'id': f"mock-{self.event_count}",
                'timestamp': time.time(),
                'message': f"Mock event {self.event_count} from {self.name}",
                'level': 'info',
                'source': 'mock',
                'event_id': 1000 + (self.event_count % 10)
            })
        
        await asyncio.sleep(0.1)  # Simulate collection time
        return events
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test mock connection"""
        return {
            'success': True,
            'message': 'Mock connection test successful',
            'latency': 0.1
        }
    
    def get_collector_info(self) -> Dict[str, Any]:
        """Get mock collector info"""
        return {
            'type': 'mock',
            'description': 'Mock collector for testing',
            'capabilities': ['event_generation', 'filtering', 'batching'],
            'supported_formats': ['json'],
            'mock_event_count': self.event_count
        }