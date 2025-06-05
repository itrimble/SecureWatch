#!/usr/bin/env python3
"""
EVTX Parser Service for SecureWatch SIEM
Converts Windows Event Log (EVTX) files to JSON format for ingestion
"""

import json
import os
import sys
import logging
import argparse
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
import asyncio
import aiohttp
from dataclasses import dataclass, asdict

try:
    from Evtx.Evtx import FileHeader
    from Evtx.Views import evtx_file_xml_view
except ImportError:
    print("ERROR: python-evtx library not installed. Run: pip install python-evtx")
    sys.exit(1)

import xml.etree.ElementTree as ET

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class WindowsEventLog:
    """Normalized Windows Event Log structure for SecureWatch"""
    timestamp: str
    event_id: int
    level: str
    channel: str
    computer: str
    user_id: Optional[str]
    process_id: Optional[int]
    thread_id: Optional[int]
    record_id: int
    activity_id: Optional[str]
    related_activity_id: Optional[str]
    keywords: Optional[str]
    task: Optional[str]
    opcode: Optional[str]
    correlation_id: Optional[str]
    execution_process_id: Optional[int]
    execution_thread_id: Optional[int]
    security_user_id: Optional[str]
    event_data: Dict[str, Any]
    system_data: Dict[str, Any]
    raw_xml: str
    source_file: str
    parsed_timestamp: str

class EVTXParser:
    """Windows EVTX file parser for SecureWatch SIEM"""
    
    def __init__(self, log_ingestion_url: str = "http://localhost:4002"):
        self.log_ingestion_url = log_ingestion_url
        self.session = None
        self.stats = {
            'total_events': 0,
            'processed_events': 0,
            'failed_events': 0,
            'start_time': None,
            'end_time': None
        }
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    def parse_evtx_file(self, evtx_file_path: str) -> List[WindowsEventLog]:
        """Parse EVTX file and return list of normalized events"""
        logger.info(f"Parsing EVTX file: {evtx_file_path}")
        events = []
        
        try:
            with open(evtx_file_path, 'rb') as f:
                fh = FileHeader(f)
                
                for xml, record in evtx_file_xml_view(fh):
                    try:
                        event = self._parse_event_xml(xml, evtx_file_path)
                        if event:
                            events.append(event)
                            self.stats['processed_events'] += 1
                        self.stats['total_events'] += 1
                    except Exception as e:
                        logger.error(f"Failed to parse event record {record}: {e}")
                        self.stats['failed_events'] += 1
                        continue
                        
        except Exception as e:
            logger.error(f"Failed to open EVTX file {evtx_file_path}: {e}")
            raise
        
        logger.info(f"Parsed {len(events)} events from {evtx_file_path}")
        return events
    
    def _parse_event_xml(self, xml_content: str, source_file: str) -> Optional[WindowsEventLog]:
        """Parse individual event XML into normalized structure"""
        try:
            root = ET.fromstring(xml_content)
            
            # Extract system information
            system = root.find('.//{http://schemas.microsoft.com/win/2004/08/events/event}System')
            if system is None:
                return None
            
            # Parse basic event information
            event_id_elem = system.find('.//{http://schemas.microsoft.com/win/2004/08/events/event}EventID')
            event_id = int(event_id_elem.text) if event_id_elem is not None else 0
            
            level_elem = system.find('.//{http://schemas.microsoft.com/win/2004/08/events/event}Level')
            level = self._get_level_name(int(level_elem.text)) if level_elem is not None else "Unknown"
            
            channel_elem = system.find('.//{http://schemas.microsoft.com/win/2004/08/events/event}Channel')
            channel = channel_elem.text if channel_elem is not None else "Unknown"
            
            computer_elem = system.find('.//{http://schemas.microsoft.com/win/2004/08/events/event}Computer')
            computer = computer_elem.text if computer_elem is not None else "Unknown"
            
            # Parse timestamp
            time_created = system.find('.//{http://schemas.microsoft.com/win/2004/08/events/event}TimeCreated')
            timestamp = time_created.get('SystemTime') if time_created is not None else datetime.now().isoformat()
            
            # Parse security information
            security = system.find('.//{http://schemas.microsoft.com/win/2004/08/events/event}Security')
            security_user_id = security.get('UserID') if security is not None else None
            
            # Parse execution information
            execution = system.find('.//{http://schemas.microsoft.com/win/2004/08/events/event}Execution')
            execution_process_id = None
            execution_thread_id = None
            if execution is not None:
                execution_process_id = int(execution.get('ProcessID', 0)) or None
                execution_thread_id = int(execution.get('ThreadID', 0)) or None
            
            # Parse event record information
            event_record_id = system.find('.//{http://schemas.microsoft.com/win/2004/08/events/event}EventRecordID')
            record_id = int(event_record_id.text) if event_record_id is not None else 0
            
            # Parse correlation information
            correlation = system.find('.//{http://schemas.microsoft.com/win/2004/08/events/event}Correlation')
            activity_id = correlation.get('ActivityID') if correlation is not None else None
            related_activity_id = correlation.get('RelatedActivityID') if correlation is not None else None
            
            # Parse keywords, task, opcode
            keywords_elem = system.find('.//{http://schemas.microsoft.com/win/2004/08/events/event}Keywords')
            keywords = keywords_elem.text if keywords_elem is not None else None
            
            task_elem = system.find('.//{http://schemas.microsoft.com/win/2004/08/events/event}Task')
            task = task_elem.text if task_elem is not None else None
            
            opcode_elem = system.find('.//{http://schemas.microsoft.com/win/2004/08/events/event}Opcode')
            opcode = opcode_elem.text if opcode_elem is not None else None
            
            # Parse event data
            event_data = self._parse_event_data(root)
            
            # Parse system data
            system_data = self._parse_system_data(system)
            
            # Create normalized event
            event = WindowsEventLog(
                timestamp=timestamp,
                event_id=event_id,
                level=level,
                channel=channel,
                computer=computer,
                user_id=security_user_id,
                process_id=execution_process_id,
                thread_id=execution_thread_id,
                record_id=record_id,
                activity_id=activity_id,
                related_activity_id=related_activity_id,
                keywords=keywords,
                task=task,
                opcode=opcode,
                correlation_id=activity_id,  # Use activity_id as correlation_id
                execution_process_id=execution_process_id,
                execution_thread_id=execution_thread_id,
                security_user_id=security_user_id,
                event_data=event_data,
                system_data=system_data,
                raw_xml=xml_content,
                source_file=os.path.basename(source_file),
                parsed_timestamp=datetime.now().isoformat()
            )
            
            return event
            
        except Exception as e:
            logger.error(f"Error parsing event XML: {e}")
            return None
    
    def _get_level_name(self, level_code: int) -> str:
        """Convert Windows event level code to name"""
        level_map = {
            0: "LogAlways",
            1: "Critical",
            2: "Error", 
            3: "Warning",
            4: "Information",
            5: "Verbose"
        }
        return level_map.get(level_code, f"Unknown({level_code})")
    
    def _parse_event_data(self, root: ET.Element) -> Dict[str, Any]:
        """Parse EventData section into key-value pairs"""
        event_data = {}
        
        # Parse EventData
        event_data_elem = root.find('.//{http://schemas.microsoft.com/win/2004/08/events/event}EventData')
        if event_data_elem is not None:
            for data in event_data_elem:
                name = data.get('Name')
                value = data.text
                if name:
                    event_data[name] = value
        
        # Parse UserData (alternative format)
        user_data_elem = root.find('.//{http://schemas.microsoft.com/win/2004/08/events/event}UserData')
        if user_data_elem is not None:
            for child in user_data_elem:
                for elem in child:
                    if elem.tag and elem.text:
                        # Remove namespace from tag
                        tag = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag
                        event_data[tag] = elem.text
        
        return event_data
    
    def _parse_system_data(self, system: ET.Element) -> Dict[str, Any]:
        """Parse System section into key-value pairs"""
        system_data = {}
        
        for elem in system:
            tag = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag
            if elem.text:
                system_data[tag] = elem.text
            elif elem.attrib:
                system_data[tag] = elem.attrib
        
        return system_data
    
    async def send_to_ingestion(self, events: List[WindowsEventLog]) -> bool:
        """Send parsed events to SecureWatch log ingestion service"""
        if not self.session:
            logger.error("HTTP session not initialized")
            return False
        
        try:
            # Convert events to SecureWatch format
            securewatch_events = []
            for event in events:
                securewatch_event = {
                    "timestamp": event.timestamp,
                    "source": "windows_evtx",
                    "level": event.level.lower(),
                    "message": f"Windows Event {event.event_id}",
                    "event_id": str(event.event_id),
                    "channel": event.channel,
                    "computer": event.computer,
                    "record_id": event.record_id,
                    "correlation_id": event.correlation_id,
                    "user_id": event.user_id,
                    "process_id": event.process_id,
                    "thread_id": event.thread_id,
                    "activity_id": event.activity_id,
                    "keywords": event.keywords,
                    "task": event.task,
                    "opcode": event.opcode,
                    "source_file": event.source_file,
                    "parsed_at": event.parsed_timestamp,
                    "event_data": event.event_data,
                    "system_data": event.system_data,
                    "raw_xml": event.raw_xml,
                    "metadata": {
                        "parser": "evtx_parser",
                        "version": "1.0",
                        "source_type": "windows_evtx"
                    }
                }
                securewatch_events.append(securewatch_event)
            
            # Send to ingestion service
            url = f"{self.log_ingestion_url}/api/logs/batch"
            async with self.session.post(url, json={"events": securewatch_events}) as response:
                if response.status == 200:
                    logger.info(f"Successfully sent {len(events)} events to ingestion service")
                    return True
                else:
                    error_text = await response.text()
                    logger.error(f"Failed to send events to ingestion: {response.status} - {error_text}")
                    return False
                    
        except Exception as e:
            logger.error(f"Error sending events to ingestion service: {e}")
            return False
    
    async def process_evtx_file(self, evtx_file_path: str, batch_size: int = 100) -> Dict[str, Any]:
        """Process EVTX file and send to SecureWatch"""
        self.stats['start_time'] = datetime.now()
        logger.info(f"Starting EVTX processing: {evtx_file_path}")
        
        try:
            # Parse EVTX file
            events = self.parse_evtx_file(evtx_file_path)
            
            # Send events in batches
            success_count = 0
            for i in range(0, len(events), batch_size):
                batch = events[i:i + batch_size]
                if await self.send_to_ingestion(batch):
                    success_count += len(batch)
                else:
                    logger.error(f"Failed to send batch {i//batch_size + 1}")
            
            self.stats['end_time'] = datetime.now()
            duration = (self.stats['end_time'] - self.stats['start_time']).total_seconds()
            
            result = {
                'success': True,
                'total_events': self.stats['total_events'],
                'processed_events': self.stats['processed_events'],
                'failed_events': self.stats['failed_events'],
                'sent_events': success_count,
                'duration_seconds': duration,
                'events_per_second': self.stats['processed_events'] / duration if duration > 0 else 0,
                'source_file': evtx_file_path
            }
            
            logger.info(f"EVTX processing complete: {result}")
            return result
            
        except Exception as e:
            logger.error(f"EVTX processing failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'source_file': evtx_file_path
            }

async def main():
    """Main function for command line usage"""
    parser = argparse.ArgumentParser(description='Parse Windows EVTX files for SecureWatch SIEM')
    parser.add_argument('evtx_file', help='Path to EVTX file to parse')
    parser.add_argument('--output', '-o', help='Output JSON file (optional)')
    parser.add_argument('--batch-size', '-b', type=int, default=100, help='Batch size for ingestion (default: 100)')
    parser.add_argument('--ingestion-url', '-u', default='http://localhost:4002', help='Log ingestion service URL')
    parser.add_argument('--dry-run', '-d', action='store_true', help='Parse only, do not send to ingestion')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.evtx_file):
        logger.error(f"EVTX file not found: {args.evtx_file}")
        sys.exit(1)
    
    async with EVTXParser(args.ingestion_url) as parser:
        if args.dry_run:
            # Parse only
            events = parser.parse_evtx_file(args.evtx_file)
            result = {
                'total_events': len(events),
                'sample_events': [asdict(events[0])] if events else []
            }
            
            if args.output:
                with open(args.output, 'w') as f:
                    json.dump(result, f, indent=2, default=str)
                logger.info(f"Results written to {args.output}")
            else:
                print(json.dumps(result, indent=2, default=str))
        else:
            # Parse and send to ingestion
            result = await parser.process_evtx_file(args.evtx_file, args.batch_size)
            print(json.dumps(result, indent=2, default=str))

if __name__ == '__main__':
    asyncio.run(main())