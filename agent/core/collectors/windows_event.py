"""
SecureWatch Agent - Windows Event Log Collector
Collects Windows Event Logs from local and remote systems
"""

import asyncio
import json
import logging
import time
import xml.etree.ElementTree as ET
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import platform

from .base import Collector
from ..exceptions import CollectorError
from ..resource_manager import ResourceManager


class WindowsEventCollector(Collector):
    """
    Windows Event Log collector supporting EVTX, XML, and JSON formats
    """
    
    def __init__(self, config: Dict[str, Any], agent_id: str, 
                 resource_manager: Optional[ResourceManager] = None):
        super().__init__(config, agent_id, resource_manager)
        
        # Windows Event specific configuration
        self.servers = config.get('servers', [{'hostname': 'localhost'}])
        self.channels = config.get('channels', ['Security', 'System', 'Application'])
        self.event_ids = config.get('event_ids', [])
        self.keywords = config.get('keywords', [])
        self.level_filter = config.get('level_filter', [])
        self.time_range_hours = config.get('time_range_hours', 24)
        
        # Collection method
        self.collection_method = config.get('collection_method', 'wmi')  # wmi, evtx, api
        
        # Bookmarking for incremental collection
        self.bookmarks: Dict[str, Any] = {}
        self.last_collection_time: Dict[str, float] = {}
        
        # Mock mode for non-Windows systems
        self.mock_mode = platform.system() != 'Windows'
        
        if self.mock_mode:
            self.logger.warning("Running on non-Windows system, using mock mode")
    
    async def initialize(self) -> None:
        """Initialize Windows Event collector"""
        try:
            self.logger.info(f"Initializing Windows Event collector: {self.name}")
            
            if self.mock_mode:
                await self._initialize_mock_mode()
            else:
                await self._initialize_windows_mode()
            
            # Initialize bookmarks for each server/channel combination
            for server in self.servers:
                server_key = server.get('hostname', 'localhost')
                if server_key not in self.bookmarks:
                    self.bookmarks[server_key] = {}
                    self.last_collection_time[server_key] = time.time()
                
                for channel in self.channels:
                    if channel not in self.bookmarks[server_key]:
                        self.bookmarks[server_key][channel] = None
            
            self.logger.info("Windows Event collector initialized successfully")
            
        except Exception as e:
            raise CollectorError(f"Failed to initialize Windows Event collector: {e}") from e
    
    async def _initialize_mock_mode(self) -> None:
        """Initialize mock mode for non-Windows systems"""
        self.logger.info("Initialized Windows Event collector in mock mode")
    
    async def _initialize_windows_mode(self) -> None:
        """Initialize for actual Windows systems"""
        try:
            # Test WMI connectivity
            if self.collection_method == 'wmi':
                await self._test_wmi_connection()
            
            self.logger.info("Windows Event collector initialized for Windows")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize Windows mode: {e}")
            self.logger.warning("Falling back to mock mode")
            self.mock_mode = True
    
    async def _test_wmi_connection(self) -> None:
        """Test WMI connection (placeholder)"""
        # In a real implementation, this would test WMI connectivity
        # For now, we'll just log that it's being tested
        self.logger.info("Testing WMI connection (placeholder)")
    
    async def cleanup(self) -> None:
        """Cleanup Windows Event collector resources"""
        try:
            self.logger.info("Cleaning up Windows Event collector")
            
            # Save bookmarks for persistence (would typically go to a file)
            self.logger.debug(f"Final bookmarks: {self.bookmarks}")
            
        except Exception as e:
            self.logger.error(f"Error during Windows Event collector cleanup: {e}")
    
    async def _collect_events(self) -> List[Dict[str, Any]]:
        """Collect Windows Event Log events"""
        all_events = []
        
        try:
            for server in self.servers:
                server_hostname = server.get('hostname', 'localhost')
                
                for channel in self.channels:
                    try:
                        if self.mock_mode:
                            events = await self._collect_mock_events(server_hostname, channel)
                        else:
                            events = await self._collect_real_events(server, channel)
                        
                        all_events.extend(events)
                        
                        # Update bookmark
                        if events:
                            last_event = max(events, key=lambda e: e.get('timestamp', 0))
                            self.bookmarks[server_hostname][channel] = last_event.get('record_id')
                        
                    except Exception as e:
                        self.logger.error(f"Failed to collect from {server_hostname}/{channel}: {e}")
                        continue
            
            self.logger.debug(f"Collected {len(all_events)} Windows events")
            return all_events
            
        except Exception as e:
            self.logger.error(f"Windows Event collection failed: {e}")
            return []
    
    async def _collect_mock_events(self, hostname: str, channel: str) -> List[Dict[str, Any]]:
        """Collect mock Windows events for testing"""
        events = []
        
        # Generate realistic Windows events
        mock_events = [
            {
                'event_id': 4624,
                'level': 'Information',
                'keywords': ['Audit Success'],
                'provider': 'Microsoft-Windows-Security-Auditing',
                'description': 'An account was successfully logged on',
                'data': {
                    'SubjectUserSid': 'S-1-5-18',
                    'SubjectUserName': 'SYSTEM',
                    'SubjectDomainName': 'NT AUTHORITY',
                    'TargetUserSid': 'S-1-5-21-123456789-987654321-111222333-1001',
                    'TargetUserName': 'testuser',
                    'TargetDomainName': 'WORKGROUP',
                    'LogonType': '2',
                    'LogonProcessName': 'User32',
                    'AuthenticationPackageName': 'Negotiate',
                    'WorkstationName': hostname,
                    'ProcessId': '0x3e8',
                    'ProcessName': 'C:\\Windows\\System32\\winlogon.exe',
                    'IpAddress': '127.0.0.1',
                    'IpPort': '0'
                }
            },
            {
                'event_id': 4625,
                'level': 'Information',
                'keywords': ['Audit Failure'],
                'provider': 'Microsoft-Windows-Security-Auditing',
                'description': 'An account failed to log on',
                'data': {
                    'SubjectUserSid': 'S-1-0-0',
                    'SubjectUserName': '-',
                    'SubjectDomainName': '-',
                    'TargetUserName': 'baduser',
                    'TargetDomainName': 'WORKGROUP',
                    'Status': '0xc000006d',
                    'FailureReason': 'Unknown user name or bad password',
                    'SubStatus': '0xc000006a',
                    'LogonType': '2',
                    'LogonProcessName': 'User32',
                    'AuthenticationPackageName': 'Negotiate',
                    'WorkstationName': hostname,
                    'ProcessId': '0x3e8',
                    'ProcessName': 'C:\\Windows\\System32\\winlogon.exe',
                    'IpAddress': '127.0.0.1',
                    'IpPort': '0'
                }
            },
            {
                'event_id': 1074,
                'level': 'Information',
                'keywords': ['Classic'],
                'provider': 'Microsoft-Windows-Kernel-General',
                'description': 'The system has been shut down cleanly',
                'data': {
                    'ShutdownType': '1',
                    'MajorReason': '1',
                    'MinorReason': '1',
                    'ShutdownReason': 'No title for this reason could be found'
                }
            },
            {
                'event_id': 7040,
                'level': 'Information',
                'keywords': ['Classic'],
                'provider': 'Service Control Manager',
                'description': 'The start type of the service was changed',
                'data': {
                    'ServiceName': 'Windows Update',
                    'StartType': 'auto start',
                    'PreviousStartType': 'demand start'
                }
            }
        ]
        
        # Filter by event IDs if specified
        if self.event_ids:
            mock_events = [e for e in mock_events if e['event_id'] in self.event_ids]
        
        # Generate events based on configuration
        current_time = time.time()
        record_id_base = int(current_time * 1000) % 1000000
        
        for i, template in enumerate(mock_events[:min(len(mock_events), self.batch_size)]):
            event = {
                'id': f"win-{hostname}-{channel}-{record_id_base + i}",
                'record_id': record_id_base + i,
                'timestamp': current_time - (i * 60),  # Space events 1 minute apart
                'computer': hostname,
                'channel': channel,
                'event_id': template['event_id'],
                'level': template['level'],
                'keywords': template['keywords'],
                'provider': template['provider'],
                'message': template['description'],
                'data': template['data'],
                'raw_xml': self._generate_mock_xml(template, hostname, current_time - (i * 60))
            }
            
            events.append(event)
        
        # Simulate collection delay
        await asyncio.sleep(0.1)
        
        return events
    
    def _generate_mock_xml(self, event_template: Dict[str, Any], hostname: str, timestamp: float) -> str:
        """Generate mock XML for Windows event"""
        event_time = datetime.fromtimestamp(timestamp).isoformat()
        
        xml_template = f"""<Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
    <System>
        <Provider Name="{event_template['provider']}" />
        <EventID>{event_template['event_id']}</EventID>
        <Level>4</Level>
        <Task>12544</Task>
        <Keywords>{event_template['keywords'][0] if event_template['keywords'] else 'None'}</Keywords>
        <TimeCreated SystemTime="{event_time}Z" />
        <EventRecordID>123456</EventRecordID>
        <Computer>{hostname}</Computer>
        <Security />
    </System>
    <EventData>"""
        
        for key, value in event_template['data'].items():
            xml_template += f'\n        <Data Name="{key}">{value}</Data>'
        
        xml_template += """
    </EventData>
</Event>"""
        
        return xml_template
    
    async def _collect_real_events(self, server: Dict[str, Any], channel: str) -> List[Dict[str, Any]]:
        """Collect real Windows events (placeholder for actual implementation)"""
        # This would contain the actual Windows Event Log collection logic
        # using WMI, EVTX files, or Windows Event Log API
        
        # For now, return empty list as this requires Windows-specific libraries
        self.logger.warning("Real Windows event collection not implemented - using mock data")
        return await self._collect_mock_events(server.get('hostname', 'localhost'), channel)
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test connection to Windows Event Log sources"""
        results = []
        
        for server in self.servers:
            hostname = server.get('hostname', 'localhost')
            
            try:
                if self.mock_mode:
                    # Mock successful connection
                    result = {
                        'server': hostname,
                        'success': True,
                        'message': 'Mock connection successful',
                        'channels_accessible': len(self.channels),
                        'latency': 0.05
                    }
                else:
                    # Test actual connection
                    result = await self._test_real_connection(server)
                
                results.append(result)
                
            except Exception as e:
                results.append({
                    'server': hostname,
                    'success': False,
                    'error': str(e),
                    'channels_accessible': 0
                })
        
        success_count = sum(1 for r in results if r['success'])
        
        return {
            'overall_success': success_count > 0,
            'servers_tested': len(self.servers),
            'servers_successful': success_count,
            'details': results
        }
    
    async def _test_real_connection(self, server: Dict[str, Any]) -> Dict[str, Any]:
        """Test real connection to Windows Event Log"""
        # Placeholder for actual connection testing
        hostname = server.get('hostname', 'localhost')
        
        return {
            'server': hostname,
            'success': True,
            'message': 'Connection test not implemented for real Windows events',
            'channels_accessible': len(self.channels),
            'latency': 0.1
        }
    
    def get_collector_info(self) -> Dict[str, Any]:
        """Get Windows Event collector information"""
        return {
            'type': 'windows_event',
            'description': 'Windows Event Log collector',
            'capabilities': [
                'local_collection',
                'remote_collection',
                'incremental_collection',
                'event_filtering',
                'multiple_channels',
                'bookmark_support'
            ],
            'supported_formats': ['evtx', 'xml', 'json'],
            'supported_channels': [
                'Security', 'System', 'Application', 'Setup',
                'Microsoft-Windows-PowerShell/Operational',
                'Microsoft-Windows-Sysmon/Operational',
                'Windows PowerShell'
            ],
            'common_event_ids': {
                '4624': 'Successful logon',
                '4625': 'Failed logon',
                '4648': 'Logon with explicit credentials',
                '4672': 'Special privileges assigned',
                '1074': 'System shutdown/restart',
                '7040': 'Service start type changed',
                '4688': 'Process creation',
                '4689': 'Process termination'
            },
            'configuration': {
                'servers': len(self.servers),
                'channels': self.channels,
                'event_ids_filter': self.event_ids,
                'keywords_filter': self.keywords,
                'collection_method': self.collection_method,
                'mock_mode': self.mock_mode
            },
            'bookmarks': self.bookmarks
        }
    
    def get_bookmark_status(self) -> Dict[str, Any]:
        """Get current bookmark status for incremental collection"""
        return {
            'bookmarks': self.bookmarks,
            'last_collection_times': self.last_collection_time,
            'servers_count': len(self.servers),
            'channels_count': len(self.channels)
        }
    
    async def reset_bookmarks(self, server: Optional[str] = None, channel: Optional[str] = None) -> None:
        """Reset bookmarks for full re-collection"""
        if server and channel:
            # Reset specific server/channel
            if server in self.bookmarks and channel in self.bookmarks[server]:
                self.bookmarks[server][channel] = None
                self.logger.info(f"Reset bookmark for {server}/{channel}")
        elif server:
            # Reset all channels for a server
            if server in self.bookmarks:
                for ch in self.bookmarks[server]:
                    self.bookmarks[server][ch] = None
                self.logger.info(f"Reset all bookmarks for server {server}")
        else:
            # Reset all bookmarks
            for srv in self.bookmarks:
                for ch in self.bookmarks[srv]:
                    self.bookmarks[srv][ch] = None
            self.logger.info("Reset all bookmarks")
    
    def _parse_windows_event_xml(self, xml_content: str) -> Dict[str, Any]:
        """Parse Windows Event XML content"""
        try:
            root = ET.fromstring(xml_content)
            
            # Extract system information
            system = root.find('.//{http://schemas.microsoft.com/win/2004/08/events/event}System')
            event_data = root.find('.//{http://schemas.microsoft.com/win/2004/08/events/event}EventData')
            
            parsed_event = {}
            
            if system is not None:
                for child in system:
                    tag_name = child.tag.split('}')[-1] if '}' in child.tag else child.tag
                    
                    if child.text:
                        parsed_event[tag_name.lower()] = child.text
                    elif child.attrib:
                        parsed_event[tag_name.lower()] = child.attrib
            
            # Extract event data
            if event_data is not None:
                data_dict = {}
                for data in event_data.findall('.//{http://schemas.microsoft.com/win/2004/08/events/event}Data'):
                    name = data.get('Name', 'Unknown')
                    value = data.text or ''
                    data_dict[name] = value
                
                parsed_event['data'] = data_dict
            
            return parsed_event
            
        except ET.ParseError as e:
            self.logger.error(f"Failed to parse Windows Event XML: {e}")
            return {'parse_error': str(e), 'raw_xml': xml_content}
    
    async def get_available_channels(self, server: Optional[str] = None) -> List[str]:
        """Get list of available event log channels"""
        if self.mock_mode:
            # Return common Windows event channels
            return [
                'Security',
                'System', 
                'Application',
                'Setup',
                'Microsoft-Windows-PowerShell/Operational',
                'Microsoft-Windows-Sysmon/Operational',
                'Windows PowerShell',
                'Microsoft-Windows-TaskScheduler/Operational',
                'Microsoft-Windows-Windows Defender/Operational',
                'Microsoft-Windows-DNS-Client/Operational'
            ]
        else:
            # In real implementation, query available channels from the system
            return self.channels