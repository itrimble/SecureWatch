"""
SecureWatch Agent - Persistent Queue System
Provides reliable event queuing with disk persistence and retry logic
"""

import asyncio
import json
import sqlite3
import threading
import time
import uuid
import zlib
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import logging

from .exceptions import QueueError


class EventStatus(Enum):
    """Event status in the queue"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    EXPIRED = "expired"


@dataclass
class QueuedEvent:
    """Represents an event in the persistent queue"""
    id: str
    payload: Dict[str, Any]
    status: EventStatus
    created_at: datetime
    updated_at: datetime
    attempts: int = 0
    max_attempts: int = 3
    next_retry: Optional[datetime] = None
    error_message: Optional[str] = None
    priority: int = 0  # Higher number = higher priority
    compressed: bool = False


@dataclass
class QueueConfig:
    """Configuration for persistent queue"""
    db_path: str
    max_size: int = 100000  # Maximum number of events
    max_age_hours: int = 72  # Maximum age before expiration
    compression_threshold: int = 1024  # Compress events larger than this
    batch_size: int = 50  # Events to process in one batch
    retry_delays: List[int] = None  # Retry delays in seconds
    cleanup_interval: int = 3600  # Cleanup old events every hour


class PersistentQueue:
    """
    Persistent event queue with SQLite backend
    Provides reliable queuing with retry logic and disk persistence
    """
    
    def __init__(self, config: QueueConfig):
        self.config = config
        if self.config.retry_delays is None:
            self.config.retry_delays = [30, 300, 1800, 7200]  # 30s, 5m, 30m, 2h
            
        self.logger = logging.getLogger("securewatch.queue")
        self.db_path = Path(config.db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Threading support
        self._lock = threading.RLock()
        self._initialized = False
        
        # Statistics
        self.stats = {
            'events_queued': 0,
            'events_processed': 0,
            'events_failed': 0,
            'events_expired': 0,
            'current_size': 0,
            'compressed_events': 0,
            'total_retries': 0
        }
        
        # Background cleanup task
        self._cleanup_task: Optional[asyncio.Task] = None
        self._running = False
    
    async def initialize(self) -> None:
        """Initialize the persistent queue"""
        with self._lock:
            if self._initialized:
                return
                
            try:
                self._create_tables()
                await self._load_stats()
                self._initialized = True
                
                # Start background cleanup
                self._running = True
                self._cleanup_task = asyncio.create_task(self._background_cleanup())
                
                self.logger.info(f"Persistent queue initialized: {self.config.db_path}")
                self.logger.info(f"Current queue size: {self.stats['current_size']} events")
                
            except Exception as e:
                self.logger.error(f"Failed to initialize queue: {e}")
                raise QueueError(f"Queue initialization failed: {e}") from e
    
    def _create_tables(self) -> None:
        """Create SQLite tables for the queue"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS events (
                    id TEXT PRIMARY KEY,
                    payload_data BLOB NOT NULL,
                    compressed INTEGER DEFAULT 0,
                    status TEXT NOT NULL,
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL,
                    attempts INTEGER DEFAULT 0,
                    max_attempts INTEGER DEFAULT 3,
                    next_retry REAL,
                    error_message TEXT,
                    priority INTEGER DEFAULT 0
                )
            """)
            
            # Create indexes for performance
            conn.execute("CREATE INDEX IF NOT EXISTS idx_status ON events(status)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_next_retry ON events(next_retry)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_priority ON events(priority DESC)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_created_at ON events(created_at)")
            
            conn.commit()
    
    async def _load_stats(self) -> None:
        """Load current statistics from database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute("SELECT COUNT(*) FROM events")
                self.stats['current_size'] = cursor.fetchone()[0]
                
                cursor = conn.execute("SELECT COUNT(*) FROM events WHERE compressed = 1")
                self.stats['compressed_events'] = cursor.fetchone()[0]
                
                cursor = conn.execute("SELECT SUM(attempts) FROM events WHERE attempts > 0")
                result = cursor.fetchone()[0]
                self.stats['total_retries'] = result if result else 0
                
        except Exception as e:
            self.logger.warning(f"Failed to load queue stats: {e}")
    
    def _compress_payload(self, payload: Dict[str, Any]) -> Tuple[bytes, bool]:
        """Compress payload if it exceeds threshold"""
        json_data = json.dumps(payload, default=str).encode('utf-8')
        
        if len(json_data) > self.config.compression_threshold:
            try:
                compressed = zlib.compress(json_data, level=6)
                if len(compressed) < len(json_data):
                    return compressed, True
            except Exception as e:
                self.logger.warning(f"Compression failed: {e}")
        
        return json_data, False
    
    def _decompress_payload(self, data: bytes, compressed: bool) -> Dict[str, Any]:
        """Decompress payload if compressed"""
        try:
            if compressed:
                json_data = zlib.decompress(data)
            else:
                json_data = data
            
            return json.loads(json_data.decode('utf-8'))
            
        except Exception as e:
            self.logger.error(f"Failed to decompress payload: {e}")
            raise QueueError(f"Payload decompression failed: {e}") from e
    
    async def enqueue(self, payload: Dict[str, Any], priority: int = 0, 
                     max_attempts: int = None) -> str:
        """
        Add an event to the queue
        Returns the event ID
        """
        if not self._initialized:
            await self.initialize()
        
        # Check queue size limit
        if self.stats['current_size'] >= self.config.max_size:
            await self._cleanup_expired()
            if self.stats['current_size'] >= self.config.max_size:
                raise QueueError(f"Queue size limit exceeded: {self.config.max_size}")
        
        event_id = str(uuid.uuid4())
        now = datetime.now()
        
        # Compress payload if needed
        payload_data, compressed = self._compress_payload(payload)
        
        if max_attempts is None:
            max_attempts = self.config.retry_delays.__len__() + 1
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT INTO events (
                        id, payload_data, compressed, status, created_at, updated_at,
                        attempts, max_attempts, priority
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    event_id,
                    payload_data,
                    1 if compressed else 0,
                    EventStatus.PENDING.value,
                    now.timestamp(),
                    now.timestamp(),
                    0,
                    max_attempts,
                    priority
                ))
                conn.commit()
            
            # Update statistics
            self.stats['events_queued'] += 1
            self.stats['current_size'] += 1
            if compressed:
                self.stats['compressed_events'] += 1
            
            self.logger.debug(f"Event queued: {event_id} (priority: {priority}, compressed: {compressed})")
            return event_id
            
        except Exception as e:
            self.logger.error(f"Failed to enqueue event: {e}")
            raise QueueError(f"Failed to enqueue event: {e}") from e
    
    async def dequeue_batch(self, batch_size: int = None) -> List[QueuedEvent]:
        """
        Get a batch of events ready for processing
        Returns events ordered by priority and retry time
        """
        if not self._initialized:
            await self.initialize()
        
        if batch_size is None:
            batch_size = self.config.batch_size
        
        now = datetime.now()
        events = []
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                # Get pending events or failed events ready for retry
                cursor = conn.execute("""
                    SELECT id, payload_data, compressed, status, created_at, updated_at,
                           attempts, max_attempts, next_retry, error_message, priority
                    FROM events
                    WHERE (status = ? OR (status = ? AND next_retry <= ?))
                    ORDER BY priority DESC, created_at ASC
                    LIMIT ?
                """, (
                    EventStatus.PENDING.value,
                    EventStatus.FAILED.value,
                    now.timestamp(),
                    batch_size
                ))
                
                for row in cursor.fetchall():
                    (event_id, payload_data, compressed, status, created_at, updated_at,
                     attempts, max_attempts, next_retry, error_message, priority) = row
                    
                    try:
                        payload = self._decompress_payload(payload_data, bool(compressed))
                        
                        event = QueuedEvent(
                            id=event_id,
                            payload=payload,
                            status=EventStatus(status),
                            created_at=datetime.fromtimestamp(created_at),
                            updated_at=datetime.fromtimestamp(updated_at),
                            attempts=attempts,
                            max_attempts=max_attempts,
                            next_retry=datetime.fromtimestamp(next_retry) if next_retry else None,
                            error_message=error_message,
                            priority=priority,
                            compressed=bool(compressed)
                        )
                        
                        events.append(event)
                        
                        # Mark as processing
                        conn.execute("""
                            UPDATE events SET status = ?, updated_at = ?
                            WHERE id = ?
                        """, (EventStatus.PROCESSING.value, now.timestamp(), event_id))
                        
                    except Exception as e:
                        self.logger.error(f"Failed to deserialize event {event_id}: {e}")
                        # Mark as failed
                        conn.execute("""
                            UPDATE events SET status = ?, error_message = ?, updated_at = ?
                            WHERE id = ?
                        """, (EventStatus.FAILED.value, str(e), now.timestamp(), event_id))
                
                conn.commit()
            
            if events:
                self.logger.debug(f"Dequeued {len(events)} events for processing")
            
            return events
            
        except Exception as e:
            self.logger.error(f"Failed to dequeue events: {e}")
            raise QueueError(f"Failed to dequeue events: {e}") from e
    
    async def mark_completed(self, event_ids: List[str]) -> None:
        """Mark events as successfully processed"""
        if not event_ids:
            return
        
        now = datetime.now()
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                placeholders = ','.join('?' * len(event_ids))
                conn.execute(f"""
                    UPDATE events 
                    SET status = ?, updated_at = ?
                    WHERE id IN ({placeholders})
                """, [EventStatus.COMPLETED.value, now.timestamp()] + event_ids)
                
                conn.commit()
            
            self.stats['events_processed'] += len(event_ids)
            self.logger.debug(f"Marked {len(event_ids)} events as completed")
            
        except Exception as e:
            self.logger.error(f"Failed to mark events as completed: {e}")
            raise QueueError(f"Failed to mark events as completed: {e}") from e
    
    async def mark_failed(self, event_id: str, error_message: str) -> None:
        """Mark an event as failed and schedule retry if possible"""
        now = datetime.now()
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                # Get current attempt count
                cursor = conn.execute("""
                    SELECT attempts, max_attempts FROM events WHERE id = ?
                """, (event_id,))
                
                row = cursor.fetchone()
                if not row:
                    self.logger.warning(f"Event not found for marking failed: {event_id}")
                    return
                
                attempts, max_attempts = row
                new_attempts = attempts + 1
                
                # Determine if we should retry
                if new_attempts < max_attempts and new_attempts <= len(self.config.retry_delays):
                    # Schedule retry
                    delay_seconds = self.config.retry_delays[new_attempts - 1]
                    next_retry = now + timedelta(seconds=delay_seconds)
                    status = EventStatus.FAILED.value
                    
                    self.logger.info(f"Event {event_id} failed (attempt {new_attempts}/{max_attempts}), "
                                   f"retrying in {delay_seconds}s")
                    
                    conn.execute("""
                        UPDATE events 
                        SET status = ?, attempts = ?, error_message = ?, 
                            next_retry = ?, updated_at = ?
                        WHERE id = ?
                    """, (status, new_attempts, error_message, 
                          next_retry.timestamp(), now.timestamp(), event_id))
                    
                    self.stats['total_retries'] += 1
                    
                else:
                    # Max attempts reached
                    conn.execute("""
                        UPDATE events 
                        SET status = ?, attempts = ?, error_message = ?, updated_at = ?
                        WHERE id = ?
                    """, (EventStatus.FAILED.value, new_attempts, error_message, 
                          now.timestamp(), event_id))
                    
                    self.stats['events_failed'] += 1
                    self.logger.warning(f"Event {event_id} permanently failed after {new_attempts} attempts: {error_message}")
                
                conn.commit()
                
        except Exception as e:
            self.logger.error(f"Failed to mark event as failed: {e}")
            raise QueueError(f"Failed to mark event as failed: {e}") from e
    
    async def get_pending_count(self) -> int:
        """Get count of pending events (including failed events ready for retry)"""
        now = datetime.now()
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute("""
                    SELECT COUNT(*) FROM events
                    WHERE status = ? OR (status = ? AND next_retry <= ?)
                """, (EventStatus.PENDING.value, EventStatus.FAILED.value, now.timestamp()))
                
                return cursor.fetchone()[0]
                
        except Exception as e:
            self.logger.error(f"Failed to get pending count: {e}")
            return 0
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get queue statistics"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                # Get current counts by status
                cursor = conn.execute("""
                    SELECT status, COUNT(*) FROM events GROUP BY status
                """)
                
                status_counts = {status.value: 0 for status in EventStatus}
                for status, count in cursor.fetchall():
                    status_counts[status] = count
                
                # Get age statistics
                cursor = conn.execute("""
                    SELECT MIN(created_at), MAX(created_at), AVG(created_at) FROM events
                """)
                
                min_age, max_age, avg_age = cursor.fetchone()
                now = time.time()
                
                age_stats = {}
                if min_age:
                    age_stats = {
                        'oldest_event_age_seconds': now - min_age,
                        'newest_event_age_seconds': now - max_age,
                        'average_event_age_seconds': now - avg_age
                    }
            
            return {
                **self.stats,
                'status_counts': status_counts,
                'age_statistics': age_stats,
                'config': {
                    'max_size': self.config.max_size,
                    'max_age_hours': self.config.max_age_hours,
                    'batch_size': self.config.batch_size,
                    'compression_threshold': self.config.compression_threshold
                }
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get queue stats: {e}")
            return self.stats.copy()
    
    async def _cleanup_expired(self) -> int:
        """Clean up expired and completed events"""
        now = datetime.now()
        cutoff_time = now - timedelta(hours=self.config.max_age_hours)
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                # Mark old events as expired
                cursor = conn.execute("""
                    UPDATE events 
                    SET status = ?, updated_at = ?
                    WHERE created_at < ? AND status != ?
                """, (EventStatus.EXPIRED.value, now.timestamp(), 
                      cutoff_time.timestamp(), EventStatus.COMPLETED.value))
                
                expired_count = cursor.rowcount
                
                # Delete old completed and expired events
                cursor = conn.execute("""
                    DELETE FROM events 
                    WHERE created_at < ? AND status IN (?, ?)
                """, (cutoff_time.timestamp(), EventStatus.COMPLETED.value, EventStatus.EXPIRED.value))
                
                deleted_count = cursor.rowcount
                conn.commit()
                
                # Update current size
                cursor = conn.execute("SELECT COUNT(*) FROM events")
                self.stats['current_size'] = cursor.fetchone()[0]
                self.stats['events_expired'] += expired_count
                
                if deleted_count > 0:
                    self.logger.info(f"Cleaned up {deleted_count} old events, marked {expired_count} as expired")
                
                return deleted_count
                
        except Exception as e:
            self.logger.error(f"Failed to cleanup expired events: {e}")
            return 0
    
    async def _background_cleanup(self) -> None:
        """Background task for periodic cleanup"""
        while self._running:
            try:
                await asyncio.sleep(self.config.cleanup_interval)
                if self._running:
                    await self._cleanup_expired()
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Background cleanup error: {e}")
    
    async def purge_failed(self, older_than_hours: int = 24) -> int:
        """Purge permanently failed events older than specified hours"""
        cutoff_time = datetime.now() - timedelta(hours=older_than_hours)
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute("""
                    DELETE FROM events 
                    WHERE status = ? AND updated_at < ?
                """, (EventStatus.FAILED.value, cutoff_time.timestamp()))
                
                deleted_count = cursor.rowcount
                conn.commit()
                
                # Update current size
                cursor = conn.execute("SELECT COUNT(*) FROM events")
                self.stats['current_size'] = cursor.fetchone()[0]
                
                if deleted_count > 0:
                    self.logger.info(f"Purged {deleted_count} permanently failed events")
                
                return deleted_count
                
        except Exception as e:
            self.logger.error(f"Failed to purge failed events: {e}")
            return 0
    
    async def close(self) -> None:
        """Close the queue and cleanup resources"""
        try:
            self._running = False
            
            if self._cleanup_task:
                self._cleanup_task.cancel()
                try:
                    await self._cleanup_task
                except asyncio.CancelledError:
                    pass
            
            # Final cleanup
            if self._initialized:
                await self._cleanup_expired()
            
            self.logger.info("Persistent queue closed")
            
        except Exception as e:
            self.logger.error(f"Error closing queue: {e}")