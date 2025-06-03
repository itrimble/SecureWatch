"""
SecureWatch Agent - File Collector
Collects log events from files with tail functionality and rotation support
"""

import asyncio
import json
import logging
import os
import time
import re
from pathlib import Path
from typing import Dict, List, Optional, Any, Set
from datetime import datetime
import hashlib
import glob

from .base import Collector
from ..exceptions import CollectorError
from ..resource_manager import ResourceManager


class FileWatcher:
    """Watches a file for changes and tracks position"""
    
    def __init__(self, file_path: str, start_position: int = 0):
        self.file_path = Path(file_path)
        self.position = start_position
        self.inode = None
        self.size = 0
        self.last_modified = 0
        self.file_handle: Optional[asyncio.StreamReader] = None
        self.encoding = 'utf-8'
        self.logger = logging.getLogger(f"file_watcher.{self.file_path.name}")
        
        # Track file identity for rotation detection
        self._update_file_stats()
    
    def _update_file_stats(self) -> None:
        """Update file statistics for rotation detection"""
        try:
            if self.file_path.exists():
                stat = self.file_path.stat()
                self.inode = stat.st_ino
                self.size = stat.st_size
                self.last_modified = stat.st_mtime
        except (OSError, IOError):
            self.inode = None
            self.size = 0
            self.last_modified = 0
    
    def has_rotated(self) -> bool:
        """Check if file has been rotated"""
        try:
            if not self.file_path.exists():
                return True
            
            stat = self.file_path.stat()
            
            # Check if inode changed (Unix) or size decreased (Windows/cross-platform)
            if self.inode is not None and stat.st_ino != self.inode:
                return True
            
            if stat.st_size < self.size:
                return True
            
            return False
            
        except (OSError, IOError):
            return True
    
    async def read_new_lines(self) -> List[str]:
        """Read new lines from the file"""
        lines = []
        
        try:
            if not self.file_path.exists():
                return lines
            
            # Check for rotation
            if self.has_rotated():
                self.logger.info(f"File rotation detected: {self.file_path}")
                self.position = 0
                self._update_file_stats()
            
            # Open file and seek to position
            with open(self.file_path, 'r', encoding=self.encoding, errors='replace') as f:
                f.seek(self.position)
                
                # Read new lines
                for line in f:
                    lines.append(line.rstrip('\n\r'))
                
                # Update position
                self.position = f.tell()
            
            # Update file stats
            self._update_file_stats()
            
        except (OSError, IOError, UnicodeDecodeError) as e:
            self.logger.error(f"Error reading file {self.file_path}: {e}")
        
        return lines
    
    def reset_position(self, position: int = 0) -> None:
        """Reset file position"""
        self.position = position
        self.logger.info(f"Reset position to {position} for {self.file_path}")


class LogLineParser:
    """Parses log lines using various patterns"""
    
    # Common log patterns
    PATTERNS = {
        'apache_combined': re.compile(
            r'(?P<remote_addr>\S+) \S+ (?P<remote_user>\S+) \[(?P<timestamp>[^\]]+)\] '
            r'"(?P<method>\S+) (?P<url>\S+) (?P<protocol>\S+)" (?P<status>\d+) '
            r'(?P<bytes_sent>\S+) "(?P<referer>[^"]*)" "(?P<user_agent>[^"]*)"'
        ),
        'apache_common': re.compile(
            r'(?P<remote_addr>\S+) \S+ (?P<remote_user>\S+) \[(?P<timestamp>[^\]]+)\] '
            r'"(?P<method>\S+) (?P<url>\S+) (?P<protocol>\S+)" (?P<status>\d+) (?P<bytes_sent>\S+)'
        ),
        'nginx': re.compile(
            r'(?P<remote_addr>\S+) - (?P<remote_user>\S+) \[(?P<timestamp>[^\]]+)\] '
            r'"(?P<method>\S+) (?P<url>\S+) (?P<protocol>\S+)" (?P<status>\d+) '
            r'(?P<bytes_sent>\S+) "(?P<referer>[^"]*)" "(?P<user_agent>[^"]*)"'
        ),
        'syslog': re.compile(
            r'(?P<timestamp>\w+\s+\d+\s+\d+:\d+:\d+) (?P<hostname>\S+) '
            r'(?P<process>\S+?)(?:\[(?P<pid>\d+)\])?: (?P<message>.*)'
        ),
        'json': re.compile(r'^{.*}$'),
        'csv': re.compile(r'^[^,]+(?:,[^,]*)*$'),
        'timestamp_message': re.compile(
            r'(?P<timestamp>\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?) '
            r'(?P<level>\w+)?\s*(?P<message>.*)'
        )
    }
    
    @classmethod
    def parse_line(cls, line: str, pattern_name: Optional[str] = None) -> Dict[str, Any]:
        """Parse a log line using specified or auto-detected pattern"""
        if not line.strip():
            return {}
        
        # Try specific pattern first
        if pattern_name and pattern_name in cls.PATTERNS:
            match = cls.PATTERNS[pattern_name].match(line)
            if match:
                return match.groupdict()
        
        # Auto-detect pattern
        for name, pattern in cls.PATTERNS.items():
            match = pattern.match(line)
            if match:
                result = match.groupdict()
                result['_pattern'] = name
                return result
        
        # If no pattern matches, return basic structure
        return {
            'message': line,
            'raw_line': line,
            '_pattern': 'unknown'
        }
    
    @classmethod
    def parse_json_line(cls, line: str) -> Dict[str, Any]:
        """Parse JSON log line"""
        try:
            return json.loads(line)
        except json.JSONDecodeError:
            return {'message': line, 'parse_error': 'invalid_json'}
    
    @classmethod
    def parse_csv_line(cls, line: str, headers: Optional[List[str]] = None) -> Dict[str, Any]:
        """Parse CSV log line"""
        try:
            import csv
            import io
            
            reader = csv.reader(io.StringIO(line))
            values = next(reader)
            
            if headers and len(headers) == len(values):
                return dict(zip(headers, values))
            else:
                return {f'field_{i}': value for i, value in enumerate(values)}
                
        except Exception:
            return {'message': line, 'parse_error': 'invalid_csv'}


class FileCollector(Collector):
    """
    File-based log collector with tail functionality and rotation support
    """
    
    def __init__(self, config: Dict[str, Any], agent_id: str, 
                 resource_manager: Optional[ResourceManager] = None):
        super().__init__(config, agent_id, resource_manager)
        
        # File configuration
        self.file_patterns = config.get('file_patterns', [])
        self.directory_paths = config.get('directory_paths', [])
        self.recursive = config.get('recursive', False)
        self.exclude_patterns = config.get('exclude_patterns', [])
        
        # Parsing configuration
        self.log_format = config.get('log_format', 'auto')  # auto, json, csv, apache, etc.
        self.csv_headers = config.get('csv_headers', [])
        self.multiline_pattern = config.get('multiline_pattern')
        self.multiline_negate = config.get('multiline_negate', False)
        
        # File handling
        self.encoding = config.get('encoding', 'utf-8')
        self.start_position = config.get('start_position', 'end')  # start, end, or specific position
        self.ignore_older_than = config.get('ignore_older_than', 86400)  # seconds
        
        # State tracking
        self.watchers: Dict[str, FileWatcher] = {}
        self.discovered_files: Set[str] = set()
        self.last_discovery_time = 0
        self.discovery_interval = config.get('discovery_interval', 300)  # 5 minutes
        
        # Multiline handling
        self.multiline_buffer: Dict[str, List[str]] = {}
        self.multiline_timeout = config.get('multiline_timeout', 5.0)
        
        # Statistics
        self.files_watched = 0
        self.lines_processed = 0
        self.multiline_events = 0
        self.discovery_runs = 0
    
    async def initialize(self) -> None:
        """Initialize File collector"""
        try:
            self.logger.info(f"Initializing File collector: {self.name}")
            
            # Discover initial files
            await self._discover_files()
            
            # Initialize file watchers
            await self._initialize_watchers()
            
            self.logger.info(f"File collector initialized, watching {len(self.watchers)} files")
            
        except Exception as e:
            raise CollectorError(f"Failed to initialize File collector: {e}") from e
    
    async def cleanup(self) -> None:
        """Cleanup File collector resources"""
        try:
            self.logger.info("Cleaning up File collector")
            
            # Close all file watchers
            for watcher in self.watchers.values():
                if watcher.file_handle:
                    watcher.file_handle.close()
            
            self.watchers.clear()
            
        except Exception as e:
            self.logger.error(f"Error during File collector cleanup: {e}")
    
    async def _collect_events(self) -> List[Dict[str, Any]]:
        """Collect events from watched files"""
        events = []
        
        try:
            # Periodic file discovery
            current_time = time.time()
            if current_time - self.last_discovery_time > self.discovery_interval:
                await self._discover_files()
                await self._initialize_watchers()
                self.last_discovery_time = current_time
                self.discovery_runs += 1
            
            # Read from all watched files
            for file_path, watcher in self.watchers.items():
                try:
                    lines = await watcher.read_new_lines()
                    
                    for line in lines:
                        if line.strip():  # Skip empty lines
                            event = await self._process_line(line, file_path)
                            if event:
                                events.append(event)
                                self.lines_processed += 1
                
                except Exception as e:
                    self.logger.error(f"Error reading from {file_path}: {e}")
                    continue
            
            # Process multiline timeouts
            await self._process_multiline_timeouts()
            
            return events
            
        except Exception as e:
            self.logger.error(f"Failed to collect file events: {e}")
            return []
    
    async def _discover_files(self) -> None:
        """Discover files based on patterns and directories"""
        newly_discovered = set()
        
        try:
            # Process file patterns (glob patterns)
            for pattern in self.file_patterns:
                try:
                    matches = glob.glob(pattern, recursive=self.recursive)
                    for match in matches:
                        file_path = Path(match).resolve()
                        if self._should_watch_file(file_path):
                            newly_discovered.add(str(file_path))
                except Exception as e:
                    self.logger.error(f"Error processing file pattern {pattern}: {e}")
            
            # Process directory paths
            for dir_path in self.directory_paths:
                try:
                    directory = Path(dir_path)
                    if directory.exists() and directory.is_dir():
                        pattern = "**/*" if self.recursive else "*"
                        for file_path in directory.glob(pattern):
                            if file_path.is_file() and self._should_watch_file(file_path):
                                newly_discovered.add(str(file_path.resolve()))
                except Exception as e:
                    self.logger.error(f"Error processing directory {dir_path}: {e}")
            
            # Update discovered files
            new_files = newly_discovered - self.discovered_files
            removed_files = self.discovered_files - newly_discovered
            
            if new_files:
                self.logger.info(f"Discovered {len(new_files)} new files: {list(new_files)[:5]}...")
            
            if removed_files:
                self.logger.info(f"Removed {len(removed_files)} files: {list(removed_files)[:5]}...")
                # Remove watchers for removed files
                for file_path in removed_files:
                    if file_path in self.watchers:
                        del self.watchers[file_path]
            
            self.discovered_files = newly_discovered
            self.files_watched = len(self.discovered_files)
            
        except Exception as e:
            self.logger.error(f"File discovery failed: {e}")
    
    def _should_watch_file(self, file_path: Path) -> bool:
        """Check if a file should be watched"""
        try:
            # Check if file exists and is readable
            if not file_path.exists() or not file_path.is_file():
                return False
            
            # Check if file is too old
            if self.ignore_older_than > 0:
                age = time.time() - file_path.stat().st_mtime
                if age > self.ignore_older_than:
                    return False
            
            # Check exclude patterns
            file_str = str(file_path)
            for exclude_pattern in self.exclude_patterns:
                try:
                    if re.search(exclude_pattern, file_str):
                        return False
                except re.error:
                    # Invalid regex, treat as literal string
                    if exclude_pattern in file_str:
                        return False
            
            return True
            
        except Exception:
            return False
    
    async def _initialize_watchers(self) -> None:
        """Initialize file watchers for discovered files"""
        for file_path in self.discovered_files:
            if file_path not in self.watchers:
                try:
                    # Determine starting position
                    start_pos = 0
                    if self.start_position == 'end':
                        try:
                            start_pos = Path(file_path).stat().st_size
                        except OSError:
                            start_pos = 0
                    elif isinstance(self.start_position, int):
                        start_pos = self.start_position
                    
                    # Create watcher
                    watcher = FileWatcher(file_path, start_pos)
                    watcher.encoding = self.encoding
                    self.watchers[file_path] = watcher
                    
                    self.logger.debug(f"Initialized watcher for {file_path} at position {start_pos}")
                    
                except Exception as e:
                    self.logger.error(f"Failed to initialize watcher for {file_path}: {e}")
    
    async def _process_line(self, line: str, file_path: str) -> Optional[Dict[str, Any]]:
        """Process a single log line"""
        try:
            # Handle multiline processing
            if self.multiline_pattern:
                return await self._handle_multiline(line, file_path)
            
            # Parse the line
            parsed_data = self._parse_line(line)
            
            # Create event
            event = {
                'id': self._generate_event_id(line, file_path),
                'timestamp': time.time(),
                'message': line,
                'source_file': file_path,
                'source_type': 'file',
                **parsed_data
            }
            
            # Add file metadata
            event['file_metadata'] = self._get_file_metadata(file_path)
            
            return event
            
        except Exception as e:
            self.logger.error(f"Error processing line from {file_path}: {e}")
            return None
    
    def _parse_line(self, line: str) -> Dict[str, Any]:
        """Parse a log line based on configured format"""
        if self.log_format == 'json':
            return LogLineParser.parse_json_line(line)
        elif self.log_format == 'csv':
            return LogLineParser.parse_csv_line(line, self.csv_headers)
        elif self.log_format == 'auto':
            return LogLineParser.parse_line(line)
        else:
            return LogLineParser.parse_line(line, self.log_format)
    
    async def _handle_multiline(self, line: str, file_path: str) -> Optional[Dict[str, Any]]:
        """Handle multiline log processing"""
        try:
            # Check if line matches multiline pattern
            pattern_match = re.search(self.multiline_pattern, line) is not None
            
            # Apply negate logic
            if self.multiline_negate:
                pattern_match = not pattern_match
            
            # Initialize buffer for file if not exists
            if file_path not in self.multiline_buffer:
                self.multiline_buffer[file_path] = []
            
            if pattern_match:
                # Start of new event - flush previous if exists
                if self.multiline_buffer[file_path]:
                    event = await self._create_multiline_event(file_path)
                    self.multiline_buffer[file_path] = [line]
                    return event
                else:
                    self.multiline_buffer[file_path] = [line]
            else:
                # Continuation line
                if self.multiline_buffer[file_path]:
                    self.multiline_buffer[file_path].append(line)
                else:
                    # Orphaned continuation line - treat as single event
                    return await self._process_line(line, file_path)
            
            return None
            
        except Exception as e:
            self.logger.error(f"Multiline processing error for {file_path}: {e}")
            return None
    
    async def _create_multiline_event(self, file_path: str) -> Dict[str, Any]:
        """Create event from multiline buffer"""
        lines = self.multiline_buffer[file_path]
        combined_message = '\n'.join(lines)
        
        # Parse the combined message
        parsed_data = self._parse_line(combined_message)
        
        event = {
            'id': self._generate_event_id(combined_message, file_path),
            'timestamp': time.time(),
            'message': combined_message,
            'line_count': len(lines),
            'multiline': True,
            'source_file': file_path,
            'source_type': 'file',
            **parsed_data
        }
        
        # Add file metadata
        event['file_metadata'] = self._get_file_metadata(file_path)
        
        self.multiline_events += 1
        return event
    
    async def _process_multiline_timeouts(self) -> None:
        """Process multiline buffers that have timed out"""
        current_time = time.time()
        
        for file_path in list(self.multiline_buffer.keys()):
            if self.multiline_buffer[file_path]:
                # For simplicity, we'll timeout after the configured interval
                # In a real implementation, you'd track last update time per buffer
                pass
    
    def _generate_event_id(self, content: str, file_path: str) -> str:
        """Generate unique event ID"""
        content_hash = hashlib.md5(content.encode()).hexdigest()[:8]
        file_hash = hashlib.md5(file_path.encode()).hexdigest()[:8]
        timestamp = int(time.time() * 1000)
        return f"file-{file_hash}-{timestamp}-{content_hash}"
    
    def _get_file_metadata(self, file_path: str) -> Dict[str, Any]:
        """Get metadata about the file"""
        try:
            path = Path(file_path)
            stat = path.stat()
            
            return {
                'file_name': path.name,
                'file_size': stat.st_size,
                'modified_time': stat.st_mtime,
                'created_time': stat.st_ctime,
                'directory': str(path.parent),
                'extension': path.suffix
            }
        except Exception:
            return {'file_name': Path(file_path).name}
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test file collector functionality"""
        try:
            accessible_files = 0
            inaccessible_files = []
            
            # Test discovered files
            for file_path in self.discovered_files:
                try:
                    path = Path(file_path)
                    if path.exists() and path.is_file():
                        # Try to read a small portion
                        with open(path, 'r', encoding=self.encoding, errors='replace') as f:
                            f.read(1024)
                        accessible_files += 1
                    else:
                        inaccessible_files.append(f"{file_path} (not found)")
                except Exception as e:
                    inaccessible_files.append(f"{file_path} ({e})")
            
            return {
                'success': accessible_files > 0,
                'total_files': len(self.discovered_files),
                'accessible_files': accessible_files,
                'inaccessible_files': len(inaccessible_files),
                'details': {
                    'patterns': self.file_patterns,
                    'directories': self.directory_paths,
                    'inaccessible_details': inaccessible_files[:5]  # Limit output
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Connection test failed: {e}'
            }
    
    def get_collector_info(self) -> Dict[str, Any]:
        """Get File collector information"""
        return {
            'type': 'file',
            'description': 'File-based log collector with tail functionality',
            'capabilities': [
                'file_tailing',
                'rotation_detection',
                'multiline_support',
                'pattern_matching',
                'auto_discovery',
                'multiple_formats'
            ],
            'supported_formats': ['text', 'json', 'csv', 'apache', 'nginx', 'syslog'],
            'configuration': {
                'file_patterns': self.file_patterns,
                'directory_paths': self.directory_paths,
                'log_format': self.log_format,
                'encoding': self.encoding,
                'recursive': self.recursive,
                'multiline_enabled': bool(self.multiline_pattern),
                'start_position': self.start_position
            },
            'statistics': {
                'files_watched': self.files_watched,
                'lines_processed': self.lines_processed,
                'multiline_events': self.multiline_events,
                'discovery_runs': self.discovery_runs,
                'watchers_active': len(self.watchers)
            },
            'watched_files': list(self.discovered_files)
        }
    
    async def reload_files(self) -> Dict[str, Any]:
        """Force reload of file discovery"""
        try:
            old_count = len(self.discovered_files)
            await self._discover_files()
            await self._initialize_watchers()
            new_count = len(self.discovered_files)
            
            return {
                'success': True,
                'old_file_count': old_count,
                'new_file_count': new_count,
                'files_added': new_count - old_count
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_file_positions(self) -> Dict[str, int]:
        """Get current read positions for all watched files"""
        return {
            file_path: watcher.position
            for file_path, watcher in self.watchers.items()
        }
    
    def reset_file_position(self, file_path: str, position: int = 0) -> bool:
        """Reset position for a specific file"""
        try:
            if file_path in self.watchers:
                self.watchers[file_path].reset_position(position)
                return True
            return False
        except Exception as e:
            self.logger.error(f"Failed to reset position for {file_path}: {e}")
            return False