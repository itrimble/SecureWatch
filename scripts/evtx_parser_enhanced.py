#!/usr/bin/env python3
"""
Enhanced EVTX Parser Service for SecureWatch SIEM
Comprehensive Windows Event Log parser with MITRE ATT&CK detection and Sysmon support
Designed to handle EVTX-ATTACK-SAMPLES and comprehensive attack pattern recognition
"""

import json
import os
import sys
import logging
import argparse
import re
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Set, Tuple
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
class AttackIndicator:
    """Attack indicator detected in event log"""
    technique_id: str
    technique_name: str
    tactic: str
    confidence: float
    evidence: Dict[str, Any]
    description: str

@dataclass
class EnhancedWindowsEventLog:
    """Enhanced Windows Event Log structure with attack detection"""
    # Original fields
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
    
    # Enhanced fields
    risk_score: int
    attack_indicators: List[AttackIndicator]
    mitre_techniques: List[str]
    sysmon_event_type: Optional[str]
    process_name: Optional[str]
    parent_process: Optional[str]
    command_line: Optional[str]
    file_hash: Optional[str]
    network_destination: Optional[str]
    registry_key: Optional[str]
    service_name: Optional[str]
    logon_type: Optional[str]
    failure_reason: Optional[str]
    target_user: Optional[str]
    source_ip: Optional[str]
    destination_ip: Optional[str]
    port: Optional[str]
    protocol: Optional[str]

class EnhancedEVTXParser:
    """Enhanced EVTX parser with comprehensive attack detection and Sysmon support"""
    
    def __init__(self, log_ingestion_url: str = "http://localhost:4002"):
        self.log_ingestion_url = log_ingestion_url
        self.session = None
        self.stats = {
            'total_events': 0,
            'processed_events': 0,
            'failed_events': 0,
            'attack_indicators': 0,
            'high_risk_events': 0,
            'mitre_techniques': set(),
            'event_id_distribution': {},
            'start_time': None,
            'end_time': None
        }
        
        # Load attack patterns and MITRE mappings
        self.attack_patterns = self._load_attack_patterns()
        self.mitre_mappings = self._load_mitre_mappings()
        self.sysmon_events = self._load_sysmon_events()
        
    def _load_attack_patterns(self) -> Dict[str, Any]:
        """Load comprehensive attack patterns for detection"""
        return {
            # Credential Access
            "credential_dumping": {
                "techniques": ["T1003", "T1558", "T1552"],
                "indicators": [
                    r"mimikatz|sekurlsa|lsadump|dcsync",
                    r"procdump.*lsass",
                    r"comsvcs.*minidum",
                    r"rundll32.*comsvcs",
                    r"ntdsutil.*snapshot"
                ]
            },
            
            # Defense Evasion
            "uac_bypass": {
                "techniques": ["T1548.002"],
                "indicators": [
                    r"fodhelper\.exe",
                    r"computerdefaults\.exe",
                    r"sdclt\.exe.*\/kickoffelev",
                    r"eventvwr\.exe.*msc",
                    r"CompMgmtLauncher\.exe"
                ]
            },
            
            # Persistence
            "registry_persistence": {
                "techniques": ["T1547.001", "T1543.003"],
                "indicators": [
                    r"HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                    r"HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                    r"HKLM\\System\\CurrentControlSet\\Services",
                    r"winlogon.*userinit",
                    r"winlogon.*shell"
                ]
            },
            
            # Lateral Movement
            "lateral_movement": {
                "techniques": ["T1021", "T1570", "T1534"],
                "indicators": [
                    r"psexec|schtasks.*\/create.*\/s:",
                    r"wmic.*\/node:|at \\\\",
                    r"net use.*\$|copy.*c\$",
                    r"winrs.*-r:",
                    r"invoke-command.*-computername"
                ]
            },
            
            # Command and Control
            "c2_communication": {
                "techniques": ["T1071", "T1095", "T1102"],
                "indicators": [
                    r"powershell.*downloadstring|invoke-webrequest",
                    r"certutil.*urlcache.*split",
                    r"bitsadmin.*transfer",
                    r"regsvr32.*\/s.*\/u.*\/i:",
                    r"rundll32.*javascript:|vbscript:"
                ]
            },
            
            # Execution
            "malicious_execution": {
                "techniques": ["T1059", "T1218", "T1204"],
                "indicators": [
                    r"powershell.*-enc.*|-e\s+[A-Za-z0-9+/=]{20,}",
                    r"cmd.*\/c.*echo.*\|",
                    r"wscript.*\/e:|cscript.*\/e:",
                    r"mshta.*vbscript:|javascript:",
                    r"regsvr32.*\/s.*\/n.*\/u.*\/i:"
                ]
            }
        }
    
    def _load_mitre_mappings(self) -> Dict[int, List[str]]:
        """Load MITRE ATT&CK technique mappings for Windows Event IDs"""
        return {
            # Authentication Events
            4624: ["T1078"],  # Successful logon
            4625: ["T1110", "T1078"],  # Failed logon
            4648: ["T1134"],  # Logon with explicit credentials
            4672: ["T1078.002"],  # Special privileges assigned
            
            # Process Execution
            4688: ["T1059", "T1204"],  # Process creation
            4689: ["T1070.001"],  # Process termination
            
            # Object Access
            4663: ["T1005", "T1083"],  # Object access attempt
            4656: ["T1083"],  # Handle to object requested
            
            # Privilege Use
            4673: ["T1134"],  # Privileged service called
            4674: ["T1134"],  # Operation attempted on privileged object
            
            # Logon/Logoff
            4634: ["T1078"],  # Account logged off
            4647: ["T1078"],  # User initiated logoff
            
            # Account Management
            4720: ["T1136.001"],  # User account created
            4722: ["T1098"],  # User account enabled
            4724: ["T1531"],  # Password reset attempt
            4738: ["T1098"],  # User account changed
            4740: ["T1110"],  # User account locked
            4767: ["T1531"],  # User account unlocked
            
            # Policy Change
            4719: ["T1562.002"],  # System audit policy changed
            4739: ["T1098"],  # Domain policy changed
            
            # System Events
            1102: ["T1070.001"],  # Audit log cleared
            7045: ["T1543.003"],  # Service installed
            
            # PowerShell Events
            4103: ["T1059.001"],  # PowerShell module logging
            4104: ["T1059.001"],  # PowerShell script block logging
            
            # WMI Events
            5857: ["T1047"],  # WMI activity
            5858: ["T1047"],  # WMI activity
            
            # File Share Access
            5145: ["T1039"],  # Network share object accessed
            5140: ["T1021.002"],  # Network share object accessed
            
            # Registry Events
            4657: ["T1112"],  # Registry value modified
            
            # Scheduled Tasks
            4698: ["T1053.005"],  # Scheduled task created
            4699: ["T1053.005"],  # Scheduled task deleted
            4700: ["T1053.005"],  # Scheduled task enabled
            4701: ["T1053.005"],  # Scheduled task disabled
            4702: ["T1053.005"],  # Scheduled task updated
        }
    
    def _load_sysmon_events(self) -> Dict[int, str]:
        """Load Sysmon event type mappings"""
        return {
            1: "Process creation",
            2: "File creation time changed",
            3: "Network connection",
            4: "Sysmon service state changed",
            5: "Process terminated",
            6: "Driver loaded",
            7: "Image loaded",
            8: "CreateRemoteThread",
            9: "RawAccessRead",
            10: "ProcessAccess",
            11: "FileCreate",
            12: "RegistryEvent (Object create and delete)",
            13: "RegistryEvent (Value Set)",
            14: "RegistryEvent (Key and Value Rename)",
            15: "FileCreateStreamHash",
            16: "ServiceConfigurationChange",
            17: "PipeEvent (Pipe Created)",
            18: "PipeEvent (Pipe Connected)",
            19: "WmiEvent (WmiEventFilter activity detected)",
            20: "WmiEvent (WmiEventConsumer activity detected)",
            21: "WmiEvent (WmiEventConsumerToFilter activity detected)",
            22: "DNSEvent (DNS query)",
            23: "FileDelete (File Delete archived)",
            24: "ClipboardChange (New content in the clipboard)",
            25: "ProcessTampering (Process image change)",
            26: "FileDeleteDetected (File Delete logged)",
            27: "FileBlockExecutable",
            28: "FileBlockShredding",
            29: "FileExecutableDetected"
        }
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    def parse_evtx_file(self, evtx_file_path: str) -> List[EnhancedWindowsEventLog]:
        """Parse EVTX file and return list of enhanced normalized events"""
        logger.info(f"Parsing EVTX file with enhanced detection: {evtx_file_path}")
        events = []
        
        try:
            with open(evtx_file_path, 'rb') as f:
                data = f.read()
                
            fh = FileHeader(data, 0x0)
            
            for xml, record in evtx_file_xml_view(fh):
                    try:
                        event = self._parse_enhanced_event_xml(xml, evtx_file_path)
                        if event:
                            events.append(event)
                            self.stats['processed_events'] += 1
                            
                            # Update statistics
                            if event.attack_indicators:
                                self.stats['attack_indicators'] += len(event.attack_indicators)
                            if event.risk_score >= 80:
                                self.stats['high_risk_events'] += 1
                            if event.mitre_techniques:
                                self.stats['mitre_techniques'].update(event.mitre_techniques)
                            
                            # Track event ID distribution
                            event_id = event.event_id
                            self.stats['event_id_distribution'][event_id] = \
                                self.stats['event_id_distribution'].get(event_id, 0) + 1
                        
                        self.stats['total_events'] += 1
                    except Exception as e:
                        logger.error(f"Failed to parse event record {record}: {e}")
                        self.stats['failed_events'] += 1
                        continue
                        
        except Exception as e:
            logger.error(f"Failed to open EVTX file {evtx_file_path}: {e}")
            raise
        
        logger.info(f"Enhanced parsing complete: {len(events)} events, "
                   f"{self.stats['attack_indicators']} attack indicators, "
                   f"{self.stats['high_risk_events']} high-risk events")
        return events
    
    def _parse_enhanced_event_xml(self, xml_content: str, source_file: str) -> Optional[EnhancedWindowsEventLog]:
        """Parse individual event XML into enhanced normalized structure"""
        try:
            root = ET.fromstring(xml_content)
            
            # Extract basic event information (same as original parser)
            system = root.find('.//{http://schemas.microsoft.com/win/2004/08/events/event}System')
            if system is None:
                return None
            
            # Parse basic fields
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
            
            # Parse security and execution information
            security = system.find('.//{http://schemas.microsoft.com/win/2004/08/events/event}Security')
            security_user_id = security.get('UserID') if security is not None else None
            
            execution = system.find('.//{http://schemas.microsoft.com/win/2004/08/events/event}Execution')
            execution_process_id = None
            execution_thread_id = None
            if execution is not None:
                execution_process_id = int(execution.get('ProcessID', 0)) or None
                execution_thread_id = int(execution.get('ThreadID', 0)) or None
            
            # Parse event record and correlation information
            event_record_id = system.find('.//{http://schemas.microsoft.com/win/2004/08/events/event}EventRecordID')
            record_id = int(event_record_id.text) if event_record_id is not None else 0
            
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
            system_data = self._parse_system_data(system)
            
            # Enhanced parsing for specific event types
            enhanced_fields = self._extract_enhanced_fields(event_id, event_data, channel)
            
            # Detect attack indicators
            attack_indicators = self._detect_attack_indicators(event_id, event_data, enhanced_fields, xml_content)
            
            # Calculate risk score
            risk_score = self._calculate_risk_score(event_id, attack_indicators, enhanced_fields)
            
            # Get MITRE techniques
            mitre_techniques = self.mitre_mappings.get(event_id, [])
            if attack_indicators:
                for indicator in attack_indicators:
                    if indicator.technique_id not in mitre_techniques:
                        mitre_techniques.append(indicator.technique_id)
            
            # Determine Sysmon event type
            sysmon_event_type = None
            if channel == "Microsoft-Windows-Sysmon/Operational":
                sysmon_event_type = self.sysmon_events.get(event_id)
            
            # Create enhanced event
            event = EnhancedWindowsEventLog(
                # Original fields
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
                correlation_id=activity_id,
                execution_process_id=execution_process_id,
                execution_thread_id=execution_thread_id,
                security_user_id=security_user_id,
                event_data=event_data,
                system_data=system_data,
                raw_xml=xml_content,
                source_file=os.path.basename(source_file),
                parsed_timestamp=datetime.now().isoformat(),
                
                # Enhanced fields
                risk_score=risk_score,
                attack_indicators=attack_indicators,
                mitre_techniques=mitre_techniques,
                sysmon_event_type=sysmon_event_type,
                **enhanced_fields
            )
            
            return event
            
        except Exception as e:
            logger.error(f"Error parsing enhanced event XML: {e}")
            return None
    
    def _extract_enhanced_fields(self, event_id: int, event_data: Dict[str, Any], channel: str) -> Dict[str, Optional[str]]:
        """Extract enhanced fields based on event type"""
        fields = {
            'process_name': None,
            'parent_process': None,
            'command_line': None,
            'file_hash': None,
            'network_destination': None,
            'registry_key': None,
            'service_name': None,
            'logon_type': None,
            'failure_reason': None,
            'target_user': None,
            'source_ip': None,
            'destination_ip': None,
            'port': None,
            'protocol': None
        }
        
        # Process creation (4688, Sysmon 1)
        if event_id in [4688, 1]:
            fields['process_name'] = event_data.get('NewProcessName') or event_data.get('Image')
            fields['parent_process'] = event_data.get('ParentProcessName') or event_data.get('ParentImage')
            fields['command_line'] = event_data.get('CommandLine')
            fields['file_hash'] = event_data.get('Hashes', '').split('=')[-1] if event_data.get('Hashes') else None
        
        # Network connection (Sysmon 3)
        elif event_id == 3:
            fields['source_ip'] = event_data.get('SourceIp')
            fields['destination_ip'] = event_data.get('DestinationIp')
            fields['port'] = event_data.get('DestinationPort')
            fields['protocol'] = event_data.get('Protocol')
            fields['process_name'] = event_data.get('Image')
        
        # Registry events (4657, Sysmon 12/13/14)
        elif event_id in [4657, 12, 13, 14]:
            fields['registry_key'] = event_data.get('ObjectName') or event_data.get('TargetObject')
            fields['process_name'] = event_data.get('ProcessName') or event_data.get('Image')
        
        # Service events (7045, Sysmon 16)
        elif event_id in [7045, 16]:
            fields['service_name'] = event_data.get('ServiceName')
        
        # Logon events (4624, 4625, 4648)
        elif event_id in [4624, 4625, 4648]:
            fields['logon_type'] = event_data.get('LogonType')
            fields['target_user'] = event_data.get('TargetUserName')
            fields['source_ip'] = event_data.get('IpAddress')
            if event_id == 4625:
                fields['failure_reason'] = event_data.get('FailureReason')
        
        # File events (Sysmon 11)
        elif event_id == 11:
            fields['process_name'] = event_data.get('Image')
            fields['file_hash'] = event_data.get('Hashes', '').split('=')[-1] if event_data.get('Hashes') else None
        
        return fields
    
    def _detect_attack_indicators(self, event_id: int, event_data: Dict[str, Any], 
                                enhanced_fields: Dict[str, Any], xml_content: str) -> List[AttackIndicator]:
        """Detect attack indicators in event data"""
        indicators = []
        
        # First check for explicit MITRE technique in Sysmon RuleName
        rule_name = event_data.get('RuleName', '')
        if 'technique_id=' in rule_name:
            technique_match = re.search(r'technique_id=([^,]+)', rule_name)
            if technique_match:
                technique_id = technique_match.group(1)
                technique_name_match = re.search(r'technique_name=([^,]+)', rule_name)
                technique_name = technique_name_match.group(1) if technique_name_match else self._get_technique_name(technique_id)
                
                indicators.append(AttackIndicator(
                    technique_id=technique_id,
                    technique_name=technique_name,
                    tactic=self._get_tactic_for_technique(technique_id),
                    confidence=0.9,  # High confidence for explicit Sysmon tagging
                    evidence={
                        "sysmon_rule": rule_name,
                        "event_id": event_id,
                        "event_data": {k: v for k, v in event_data.items() if v and k != 'RuleName'}
                    },
                    description=f"MITRE technique {technique_id} detected via Sysmon rule"
                ))
        
        # Combine all text data for pattern matching
        search_text = " ".join([
            str(v) for v in event_data.values() if v is not None
        ] + [
            str(v) for v in enhanced_fields.values() if v is not None
        ])
        
        # Check each attack pattern
        for attack_type, pattern_data in self.attack_patterns.items():
            for pattern in pattern_data["indicators"]:
                if re.search(pattern, search_text, re.IGNORECASE):
                    for technique in pattern_data["techniques"]:
                        # Skip if already detected via Sysmon rule
                        if any(ind.technique_id == technique for ind in indicators):
                            continue
                            
                        # Calculate confidence based on pattern specificity and event context
                        confidence = self._calculate_confidence(pattern, event_id, search_text)
                        
                        indicator = AttackIndicator(
                            technique_id=technique,
                            technique_name=self._get_technique_name(technique),
                            tactic=self._get_tactic_for_technique(technique),
                            confidence=confidence,
                            evidence={
                                "pattern": pattern,
                                "matched_text": search_text[:200],
                                "event_id": event_id,
                                "event_data": {k: v for k, v in event_data.items() if v}
                            },
                            description=f"{attack_type.replace('_', ' ').title()} detected via {pattern}"
                        )
                        indicators.append(indicator)
        
        # Additional specific detections
        indicators.extend(self._detect_specific_attacks(event_id, event_data, enhanced_fields))
        
        return indicators
    
    def _detect_specific_attacks(self, event_id: int, event_data: Dict[str, Any], 
                               enhanced_fields: Dict[str, Any]) -> List[AttackIndicator]:
        """Detect specific attack patterns based on event ID and context"""
        indicators = []
        
        # PowerShell obfuscation (Events 4103, 4104)
        if event_id in [4103, 4104]:
            script_text = event_data.get('ScriptBlockText', '')
            if re.search(r'-enc\s+[A-Za-z0-9+/=]{20,}|[A-Za-z0-9+/=]{100,}', script_text):
                indicators.append(AttackIndicator(
                    technique_id="T1059.001",
                    technique_name="PowerShell",
                    tactic="Execution",
                    confidence=0.8,
                    evidence={"encoded_content": script_text[:100]},
                    description="Base64 encoded PowerShell detected"
                ))
        
        # Suspicious process creation (Event 4688, Sysmon 1)
        elif event_id in [4688, 1]:
            process_name = enhanced_fields.get('process_name', '').lower()
            command_line = enhanced_fields.get('command_line', '').lower()
            
            # Living off the land binaries
            lolbins = ['rundll32', 'regsvr32', 'mshta', 'certutil', 'bitsadmin']
            for lolbin in lolbins:
                if lolbin in process_name and any(susp in command_line for susp in ['http', 'download', 'javascript']):
                    indicators.append(AttackIndicator(
                        technique_id="T1218",
                        technique_name="Signed Binary Proxy Execution",
                        tactic="Defense Evasion",
                        confidence=0.7,
                        evidence={"process": process_name, "command": command_line},
                        description=f"Suspicious {lolbin} usage detected"
                    ))
        
        # Failed logon patterns (Event 4625)
        elif event_id == 4625:
            # Multiple failed logons could indicate brute force
            if event_data.get('LogonType') == '3':  # Network logon
                indicators.append(AttackIndicator(
                    technique_id="T1110",
                    technique_name="Brute Force",
                    tactic="Credential Access",
                    confidence=0.6,
                    evidence={"logon_type": "Network", "failure": event_data.get('FailureReason')},
                    description="Network logon failure - potential brute force"
                ))
        
        return indicators
    
    def _calculate_confidence(self, pattern: str, event_id: int, search_text: str) -> float:
        """Calculate confidence score for attack indicator"""
        base_confidence = 0.5
        
        # Higher confidence for specific patterns
        if len(pattern) > 30:
            base_confidence += 0.2
        
        # Higher confidence for critical event IDs
        critical_events = [4624, 4625, 4688, 1102, 4698, 4699]
        if event_id in critical_events:
            base_confidence += 0.1
        
        # Higher confidence for exact matches
        if pattern.lower() in search_text.lower():
            base_confidence += 0.2
        
        return min(1.0, base_confidence)
    
    def _calculate_risk_score(self, event_id: int, attack_indicators: List[AttackIndicator], 
                            enhanced_fields: Dict[str, Any]) -> int:
        """Calculate risk score (0-100) for the event"""
        score = 0
        
        # Base score by event ID criticality
        critical_events = {
            1102: 90,  # Audit log cleared
            4625: 60,  # Failed logon
            4688: 40,  # Process creation
            4698: 70,  # Scheduled task created
            7045: 80,  # Service installed
        }
        score += critical_events.get(event_id, 20)
        
        # Add score for attack indicators
        for indicator in attack_indicators:
            score += int(indicator.confidence * 30)
        
        # Reduce score for common/benign processes
        process_name = enhanced_fields.get('process_name', '').lower()
        benign_processes = ['explorer.exe', 'svchost.exe', 'winlogon.exe']
        if any(proc in process_name for proc in benign_processes):
            score = max(0, score - 20)
        
        return min(100, score)
    
    def _get_technique_name(self, technique_id: str) -> str:
        """Get MITRE technique name from ID"""
        technique_names = {
            "T1003": "OS Credential Dumping",
            "T1059": "Command and Scripting Interpreter",
            "T1078": "Valid Accounts",
            "T1110": "Brute Force",
            "T1112": "Modify Registry",
            "T1134": "Access Token Manipulation",
            "T1218": "Signed Binary Proxy Execution",
            "T1547": "Boot or Logon Autostart Execution",
            "T1548": "Abuse Elevation Control Mechanism",
            "T1543": "Create or Modify System Process",
            "T1558": "Steal or Forge Kerberos Tickets",
            "T1562": "Impair Defenses",
            # Add more as needed
        }
        return technique_names.get(technique_id, technique_id)
    
    def _get_tactic_for_technique(self, technique_id: str) -> str:
        """Get MITRE tactic for technique"""
        tactic_mappings = {
            "T1003": "Credential Access",
            "T1059": "Execution",
            "T1078": "Defense Evasion",
            "T1110": "Credential Access",
            "T1112": "Defense Evasion",
            "T1134": "Defense Evasion",
            "T1218": "Defense Evasion",
            "T1547": "Persistence",
            "T1548": "Privilege Escalation",
            "T1543": "Persistence",
            "T1558": "Credential Access",
            "T1562": "Defense Evasion",
            # Add more as needed
        }
        return tactic_mappings.get(technique_id, "Unknown")
    
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
    
    async def send_to_ingestion(self, events: List[EnhancedWindowsEventLog]) -> bool:
        """Send enhanced parsed events to SecureWatch log ingestion service"""
        if not self.session:
            logger.error("HTTP session not initialized")
            return False
        
        try:
            # Convert events to SecureWatch format with enhanced fields
            securewatch_events = []
            for event in events:
                securewatch_event = {
                    "timestamp": event.timestamp,
                    "source": "windows_evtx_enhanced",
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
                    
                    # Enhanced fields
                    "risk_score": event.risk_score,
                    "mitre_techniques": event.mitre_techniques,
                    "sysmon_event_type": event.sysmon_event_type,
                    "process_name": event.process_name,
                    "parent_process": event.parent_process,
                    "command_line": event.command_line,
                    "file_hash": event.file_hash,
                    "network_destination": event.network_destination,
                    "registry_key": event.registry_key,
                    "service_name": event.service_name,
                    "logon_type": event.logon_type,
                    "failure_reason": event.failure_reason,
                    "target_user": event.target_user,
                    "source_ip": event.source_ip,
                    "destination_ip": event.destination_ip,
                    "port": event.port,
                    "protocol": event.protocol,
                    
                    # Attack indicators
                    "attack_indicators": [asdict(indicator) for indicator in event.attack_indicators],
                    
                    "event_data": event.event_data,
                    "system_data": event.system_data,
                    "raw_xml": event.raw_xml,
                    "metadata": {
                        "parser": "evtx_parser_enhanced",
                        "version": "2.0",
                        "source_type": "windows_evtx_enhanced",
                        "attack_detection": True
                    }
                }
                securewatch_events.append(securewatch_event)
            
            # Send to ingestion service
            url = f"{self.log_ingestion_url}/api/logs/batch"
            async with self.session.post(url, json={"events": securewatch_events}) as response:
                if response.status == 200:
                    logger.info(f"Successfully sent {len(events)} enhanced events to ingestion service")
                    return True
                else:
                    error_text = await response.text()
                    logger.error(f"Failed to send events to ingestion: {response.status} - {error_text}")
                    return False
                    
        except Exception as e:
            logger.error(f"Error sending enhanced events to ingestion service: {e}")
            return False
    
    async def process_evtx_file(self, evtx_file_path: str, batch_size: int = 100) -> Dict[str, Any]:
        """Process EVTX file with enhanced detection and send to SecureWatch"""
        self.stats['start_time'] = datetime.now()
        logger.info(f"Starting enhanced EVTX processing: {evtx_file_path}")
        
        try:
            # Parse EVTX file with enhanced detection
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
                'attack_indicators': self.stats['attack_indicators'],
                'high_risk_events': self.stats['high_risk_events'],
                'unique_mitre_techniques': len(self.stats['mitre_techniques']),
                'mitre_techniques': list(self.stats['mitre_techniques']),
                'event_id_distribution': self.stats['event_id_distribution'],
                'duration_seconds': duration,
                'events_per_second': self.stats['processed_events'] / duration if duration > 0 else 0,
                'source_file': evtx_file_path
            }
            
            logger.info(f"Enhanced EVTX processing complete: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Enhanced EVTX processing failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'source_file': evtx_file_path
            }

async def main():
    """Main function for command line usage"""
    parser = argparse.ArgumentParser(description='Enhanced EVTX Parser for SecureWatch SIEM with MITRE ATT&CK detection')
    parser.add_argument('evtx_file', help='Path to EVTX file to parse')
    parser.add_argument('--output', '-o', help='Output JSON file (optional)')
    parser.add_argument('--batch-size', '-b', type=int, default=100, help='Batch size for ingestion (default: 100)')
    parser.add_argument('--ingestion-url', '-u', default='http://localhost:4002', help='Log ingestion service URL')
    parser.add_argument('--dry-run', '-d', action='store_true', help='Parse only, do not send to ingestion')
    parser.add_argument('--attack-only', '-a', action='store_true', help='Only show events with attack indicators')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.evtx_file):
        logger.error(f"EVTX file not found: {args.evtx_file}")
        sys.exit(1)
    
    async with EnhancedEVTXParser(args.ingestion_url) as parser:
        if args.dry_run:
            # Parse only
            events = parser.parse_evtx_file(args.evtx_file)
            
            if args.attack_only:
                events = [e for e in events if e.attack_indicators]
            
            result = {
                'total_events': len(events),
                'attack_events': len([e for e in events if e.attack_indicators]),
                'high_risk_events': len([e for e in events if e.risk_score >= 80]),
                'statistics': parser.stats,
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