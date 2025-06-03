"""
SecureWatch Agent - Event Buffer
SQLite-based local event buffering with retry logic
"""

import asyncio
import aiosqlite
import json
import time
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
import uuid

from .exceptions import BufferError


@dataclass
class BufferConfig:
    """Event buffer configuration"""
    db_path: str
    max_size: int = 100000  # Maximum number of events
    batch_size: int = 1000  # Events per batch
    retention_hours: int = 168  # 7 days
    cleanup_interval: int = 3600  # 1 hour
    sync_interval: int = 5  # WAL sync interval in seconds


class EventBuffer:
    """
    SQLite-based event buffer for reliable local storage
    with retry logic and automatic cleanup
    """
    
    def __init__(self, db_path: str, max_size: int = 100000,
                 batch_size: int = 1000, retention_hours: int = 168,
                 agent_id: str = "unknown"):
        self.db_path = Path(db_path)
        self.max_size = max_size
        self.batch_size = batch_size
        self.retention_hours = retention_hours
        self.agent_id = agent_id
        
        self.logger = logging.getLogger(f"securewatch.buffer.{agent_id}")
        
        # Database connection
        self.db: Optional[aiosqlite.Connection] = None
        
        # Statistics
        self.events_added = 0
        self.events_sent = 0
        self.events_failed = 0
        self.events_expired = 0
        
        # Background tasks
        self.cleanup_task: Optional[asyncio.Task] = None
        self.running = False
    
    async def initialize(self) -> None:
        """Initialize the event buffer"""
        try:
            self.logger.info(f"Initializing event buffer: {self.db_path}")
            
            # Create directory if it doesn't exist
            self.db_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Connect to database
            self.db = await aiosqlite.connect(str(self.db_path))
            
            # Configure SQLite for performance and reliability
            await self._configure_database()
            
            # Create tables
            await self._create_tables()
            
            # Clean up old events
            await self._cleanup_expired_events()
            
            # Start background cleanup task
            self.running = True
            self.cleanup_task = asyncio.create_task(self._cleanup_loop())
            
            # Log initial statistics
            stats = await self.get_stats()
            self.logger.info(f"Buffer initialized with {stats['total_events']} existing events")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize buffer: {e}")
            raise BufferError(f"Buffer initialization failed: {e}") from e
    
    async def _configure_database(self) -> None:
        """Configure SQLite database settings"""
        await self.db.execute("PRAGMA journal_mode=WAL")  # Write-Ahead Logging
        await self.db.execute("PRAGMA synchronous=NORMAL")  # Balance safety and performance
        await self.db.execute("PRAGMA cache_size=10000")  # 10MB cache
        await self.db.execute("PRAGMA temp_store=memory")  # Use memory for temp storage
        await self.db.execute("PRAGMA mmap_size=268435456")  # 256MB memory map
        await self.db.execute("PRAGMA page_size=4096")  # 4KB page size
        
        # Enable foreign keys
        await self.db.execute("PRAGMA foreign_keys=ON")
    
    async def _create_tables(self) -> None:
        """Create database tables"""
        
        # Events table
        await self.db.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id TEXT PRIMARY KEY,
                agent_id TEXT NOT NULL,
                timestamp REAL NOT NULL,
                event_data TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                retry_count INTEGER NOT NULL DEFAULT 0,
                created_at REAL NOT NULL,
                sent_at REAL NULL,
                size_bytes INTEGER NOT NULL
            )
        """)
        
        # Create indexes for performance
        await self.db.execute("""
            CREATE INDEX IF NOT EXISTS idx_events_status 
            ON events(status, timestamp)
        """)
        
        await self.db.execute("""
            CREATE INDEX IF NOT EXISTS idx_events_agent_created 
            ON events(agent_id, created_at)
        """)
        
        await self.db.execute("""
            CREATE INDEX IF NOT EXISTS idx_events_timestamp 
            ON events(timestamp)
        """)
        
        # Retry tracking table
        await self.db.execute("""
            CREATE TABLE IF NOT EXISTS retry_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id TEXT NOT NULL,
                attempt_number INTEGER NOT NULL,
                attempted_at REAL NOT NULL,
                error_message TEXT,
                FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
            )
        """)
        
        # Buffer statistics table
        await self.db.execute("""
            CREATE TABLE IF NOT EXISTS buffer_stats (
                id INTEGER PRIMARY KEY,
                agent_id TEXT NOT NULL,
                events_added INTEGER DEFAULT 0,
                events_sent INTEGER DEFAULT 0,
                events_failed INTEGER DEFAULT 0,
                events_expired INTEGER DEFAULT 0,
                last_updated REAL NOT NULL
            )
        """)
        
        # Initialize stats record
        await self.db.execute("""
            INSERT OR IGNORE INTO buffer_stats (id, agent_id, last_updated) 
            VALUES (1, ?, ?)
        """, (self.agent_id, time.time()))
        
        await self.db.commit()
    
    async def add_event(self, event_data: Dict[str, Any]) -> str:
        """Add an event to the buffer"""
        try:
            # Generate unique event ID
            event_id = str(uuid.uuid4())
            
            # Serialize event data
            serialized_data = json.dumps(event_data, default=str)
            size_bytes = len(serialized_data.encode('utf-8'))
            
            current_time = time.time()
            
            # Check buffer size limit
            await self._enforce_size_limit()
            
            # Insert event
            await self.db.execute("""
                INSERT INTO events (id, agent_id, timestamp, event_data, 
                                  created_at, size_bytes)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (event_id, self.agent_id, current_time, serialized_data,
                  current_time, size_bytes))
            
            await self.db.commit()
            
            # Update statistics
            self.events_added += 1
            await self._update_stats('events_added', self.events_added)
            
            self.logger.debug(f"Added event {event_id} ({size_bytes} bytes)")
            
            return event_id
            
        except Exception as e:
            self.logger.error(f"Failed to add event: {e}")
            raise BufferError(f"Failed to add event: {e}") from e
    
    async def add_events_batch(self, events: List[Dict[str, Any]]) -> List[str]:
        """Add multiple events to the buffer efficiently"""
        try:
            event_ids = []
            current_time = time.time()
            
            # Check buffer size limit
            await self._enforce_size_limit()
            
            # Prepare batch insert data
            batch_data = []
            total_size = 0
            
            for event_data in events:
                event_id = str(uuid.uuid4())
                serialized_data = json.dumps(event_data, default=str)
                size_bytes = len(serialized_data.encode('utf-8'))
                
                batch_data.append((
                    event_id, self.agent_id, current_time, serialized_data,
                    current_time, size_bytes
                ))
                
                event_ids.append(event_id)
                total_size += size_bytes
            
            # Execute batch insert
            await self.db.executemany("""
                INSERT INTO events (id, agent_id, timestamp, event_data, 
                                  created_at, size_bytes)
                VALUES (?, ?, ?, ?, ?, ?)
            """, batch_data)
            
            await self.db.commit()
            
            # Update statistics
            self.events_added += len(events)
            await self._update_stats('events_added', self.events_added)
            
            self.logger.debug(f"Added {len(events)} events ({total_size} bytes)")
            
            return event_ids
            
        except Exception as e:
            self.logger.error(f"Failed to add events batch: {e}")
            raise BufferError(f"Failed to add events batch: {e}") from e
    
    async def get_batch(self, batch_size: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get a batch of pending events"""
        try:
            if batch_size is None:
                batch_size = self.batch_size
            
            cursor = await self.db.execute("""
                SELECT id, event_data FROM events 
                WHERE status = 'pending' 
                ORDER BY timestamp ASC 
                LIMIT ?
            """, (batch_size,))
            
            rows = await cursor.fetchall()
            await cursor.close()
            
            events = []
            for row in rows:
                event_id, event_data = row
                try:
                    parsed_data = json.loads(event_data)
                    parsed_data['_buffer_id'] = event_id  # Add buffer ID for tracking
                    events.append(parsed_data)
                except json.JSONDecodeError as e:
                    self.logger.error(f"Failed to parse event {event_id}: {e}")
                    # Mark event as failed
                    await self._mark_event_failed(event_id, f"JSON decode error: {e}")
            
            return events
            
        except Exception as e:
            self.logger.error(f"Failed to get event batch: {e}")
            return []
    
    async def mark_sent(self, event_ids: List[str]) -> None:
        """Mark events as successfully sent"""
        try:
            if not event_ids:
                return
            
            current_time = time.time()
            
            # Build placeholders for IN clause
            placeholders = ','.join('?' * len(event_ids))
            
            # Update events status
            cursor = await self.db.execute(f"""
                UPDATE events 
                SET status = 'sent', sent_at = ? 
                WHERE id IN ({placeholders})
            """, [current_time] + event_ids)
            
            updated_count = cursor.rowcount
            await cursor.close()
            await self.db.commit()
            
            # Update statistics
            self.events_sent += updated_count
            await self._update_stats('events_sent', self.events_sent)
            
            self.logger.debug(f"Marked {updated_count} events as sent")
            
        except Exception as e:
            self.logger.error(f"Failed to mark events as sent: {e}")
            raise BufferError(f"Failed to mark events as sent: {e}") from e
    
    async def mark_failed(self, event_ids: List[str], error_message: str = "") -> None:
        """Mark events as failed and increment retry count"""
        try:
            if not event_ids:
                return
            
            current_time = time.time()
            failed_count = 0
            
            for event_id in event_ids:
                # Get current retry count
                cursor = await self.db.execute("""
                    SELECT retry_count FROM events WHERE id = ?
                """, (event_id,))
                
                row = await cursor.fetchone()
                await cursor.close()
                
                if row:
                    retry_count = row[0] + 1
                    
                    # Update event
                    await self.db.execute("""
                        UPDATE events 
                        SET retry_count = ?, status = 'failed' 
                        WHERE id = ?
                    """, (retry_count, event_id))
                    
                    # Log retry attempt
                    await self.db.execute("""
                        INSERT INTO retry_log (event_id, attempt_number, attempted_at, error_message)
                        VALUES (?, ?, ?, ?)
                    """, (event_id, retry_count, current_time, error_message))
                    
                    failed_count += 1
            
            await self.db.commit()
            
            # Update statistics
            self.events_failed += failed_count
            await self._update_stats('events_failed', self.events_failed)
            
            self.logger.debug(f"Marked {failed_count} events as failed")
            
        except Exception as e:
            self.logger.error(f"Failed to mark events as failed: {e}")
    
    async def _mark_event_failed(self, event_id: str, error_message: str) -> None:
        """Mark a single event as failed"""
        await self.mark_failed([event_id], error_message)
    
    async def reset_failed_events(self, max_retries: int = 3) -> int:
        """Reset failed events to pending if they haven't exceeded max retries"""
        try:
            cursor = await self.db.execute("""
                UPDATE events 
                SET status = 'pending' 
                WHERE status = 'failed' AND retry_count < ?
            """, (max_retries,))
            
            reset_count = cursor.rowcount
            await cursor.close()
            await self.db.commit()
            
            if reset_count > 0:
                self.logger.info(f"Reset {reset_count} failed events to pending")
            
            return reset_count
            
        except Exception as e:
            self.logger.error(f"Failed to reset failed events: {e}")
            return 0
    
    async def _enforce_size_limit(self) -> None:
        """Enforce maximum buffer size by removing oldest events"""
        try:
            # Count current events
            cursor = await self.db.execute("SELECT COUNT(*) FROM events")
            count = (await cursor.fetchone())[0]
            await cursor.close()
            
            if count >= self.max_size:
                # Remove oldest events to make room
                events_to_remove = count - self.max_size + self.batch_size
                
                cursor = await self.db.execute("""
                    DELETE FROM events 
                    WHERE id IN (
                        SELECT id FROM events 
                        ORDER BY created_at ASC 
                        LIMIT ?
                    )
                """, (events_to_remove,))
                
                removed_count = cursor.rowcount
                await cursor.close()
                await self.db.commit()
                
                self.logger.warning(f"Removed {removed_count} old events due to size limit")
                
        except Exception as e:
            self.logger.error(f"Failed to enforce size limit: {e}")
    
    async def _cleanup_expired_events(self) -> None:
        """Remove events older than retention period"""
        try:
            cutoff_time = time.time() - (self.retention_hours * 3600)
            
            cursor = await self.db.execute("""
                DELETE FROM events WHERE created_at < ?
            """, (cutoff_time,))
            
            removed_count = cursor.rowcount
            await cursor.close()
            await self.db.commit()
            
            if removed_count > 0:
                self.events_expired += removed_count
                await self._update_stats('events_expired', self.events_expired)
                self.logger.info(f"Cleaned up {removed_count} expired events")
            
        except Exception as e:
            self.logger.error(f"Failed to cleanup expired events: {e}")
    
    async def _cleanup_loop(self) -> None:
        """Background cleanup task"""
        while self.running:
            try:
                await asyncio.sleep(3600)  # Run every hour
                await self._cleanup_expired_events()
                
                # Vacuum database periodically
                await self.db.execute("PRAGMA optimize")
                
            except Exception as e:
                self.logger.error(f"Cleanup loop error: {e}")
    
    async def _update_stats(self, field: str, value: int) -> None:
        """Update buffer statistics"""
        try:
            await self.db.execute(f"""
                UPDATE buffer_stats 
                SET {field} = ?, last_updated = ? 
                WHERE id = 1
            """, (value, time.time()))
            
            await self.db.commit()
            
        except Exception as e:
            self.logger.error(f"Failed to update stats: {e}")
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get buffer statistics"""
        try:
            # Get event counts by status
            cursor = await self.db.execute("""
                SELECT status, COUNT(*), SUM(size_bytes) 
                FROM events 
                GROUP BY status
            """)
            
            status_stats = {}
            total_events = 0
            total_size = 0
            
            async for row in cursor:
                status, count, size = row
                status_stats[status] = {'count': count, 'size_bytes': size or 0}
                total_events += count
                total_size += size or 0
            
            await cursor.close()
            
            # Get overall statistics
            cursor = await self.db.execute("""
                SELECT events_added, events_sent, events_failed, events_expired, last_updated
                FROM buffer_stats WHERE id = 1
            """)
            
            row = await cursor.fetchone()
            await cursor.close()
            
            if row:
                db_added, db_sent, db_failed, db_expired, last_updated = row
            else:
                db_added = db_sent = db_failed = db_expired = last_updated = 0
            
            return {
                'total_events': total_events,
                'total_size_bytes': total_size,
                'status_breakdown': status_stats,
                'events_added': self.events_added,
                'events_sent': self.events_sent,
                'events_failed': self.events_failed,
                'events_expired': self.events_expired,
                'db_events_added': db_added,
                'db_events_sent': db_sent,
                'db_events_failed': db_failed,
                'db_events_expired': db_expired,
                'last_updated': last_updated,
                'buffer_utilization': total_events / self.max_size if self.max_size > 0 else 0
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get stats: {e}")
            return {}
    
    async def get_retry_info(self) -> List[Dict[str, Any]]:
        """Get information about failed events and retry attempts"""
        try:
            cursor = await self.db.execute("""
                SELECT e.id, e.retry_count, e.created_at, 
                       r.attempt_number, r.attempted_at, r.error_message
                FROM events e
                LEFT JOIN retry_log r ON e.id = r.event_id
                WHERE e.status = 'failed'
                ORDER BY e.created_at DESC, r.attempt_number DESC
            """)
            
            retry_info = []
            async for row in cursor:
                retry_info.append({
                    'event_id': row[0],
                    'retry_count': row[1],
                    'created_at': row[2],
                    'attempt_number': row[3],
                    'attempted_at': row[4],
                    'error_message': row[5]
                })
            
            await cursor.close()
            return retry_info
            
        except Exception as e:
            self.logger.error(f"Failed to get retry info: {e}")
            return []
    
    async def close(self) -> None:
        """Close the event buffer"""
        try:
            self.logger.info("Closing event buffer")
            
            # Stop background tasks
            self.running = False
            if self.cleanup_task:
                self.cleanup_task.cancel()
                try:
                    await self.cleanup_task
                except asyncio.CancelledError:
                    pass
            
            # Close database connection
            if self.db:
                await self.db.close()
            
            self.logger.info("Event buffer closed")
            
        except Exception as e:
            self.logger.error(f"Error closing buffer: {e}")


# Utility functions for buffer management

async def create_buffer_tables(db_path: str) -> None:
    """Create buffer tables in an existing database"""
    buffer = EventBuffer(db_path)
    await buffer.initialize()
    await buffer.close()


async def migrate_buffer_schema(db_path: str, from_version: int, to_version: int) -> None:
    """Migrate buffer schema between versions"""
    # This would contain schema migration logic
    pass


async def repair_buffer(db_path: str) -> Dict[str, Any]:
    """Repair corrupted buffer database"""
    try:
        async with aiosqlite.connect(db_path) as db:
            # Check database integrity
            cursor = await db.execute("PRAGMA integrity_check")
            integrity_result = await cursor.fetchall()
            await cursor.close()
            
            if integrity_result[0][0] != 'ok':
                # Attempt to repair
                await db.execute("PRAGMA quick_check")
                await db.execute("REINDEX")
                await db.execute("VACUUM")
            
            return {
                'status': 'repaired',
                'integrity_check': integrity_result
            }
            
    except Exception as e:
        return {
            'status': 'failed',
            'error': str(e)
        }