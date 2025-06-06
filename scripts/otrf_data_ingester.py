#!/usr/bin/env python3
"""
OTRF Security Datasets Ingestion Pipeline for SecureWatch

This script processes OTRF Security-Datasets and ingests them into SecureWatch
for comprehensive testing of correlation engine, KQL queries, and analytics.

Author: SecureWatch Team
Version: 1.0.0
Date: June 2025
"""

import json
import os
import sys
import zipfile
import requests
import argparse
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional
import hashlib
import asyncio
import aiohttp
from dataclasses import dataclass

@dataclass
class DatasetMetadata:
    """Metadata for OTRF datasets"""
    name: str
    path: str
    attack_techniques: List[str]
    event_count: int
    size_mb: float
    platforms: List[str]
    dataset_type: str  # atomic, compound
    ingestion_status: str = "pending"
    ingestion_timestamp: Optional[str] = None
    validation_results: Optional[Dict] = None

class OTRFDataIngester:
    """OTRF Security-Datasets ingestion pipeline for SecureWatch"""
    
    def __init__(self, 
                 securewatch_base_url: str = "http://localhost:4002",
                 otrf_datasets_path: str = "/tmp/Security-Datasets",
                 batch_size: int = 100):
        self.securewatch_url = securewatch_base_url
        self.otrf_path = Path(otrf_datasets_path)
        self.batch_size = batch_size
        self.ingestion_log = []
        self.processed_datasets = []
        
        # Initialize statistics
        self.stats = {
            'total_datasets': 0,
            'processed_datasets': 0,
            'failed_datasets': 0,
            'total_events': 0,
            'processing_start_time': None,
            'processing_end_time': None,
            'attack_techniques_covered': set(),
            'platforms_tested': set(),
            'correlation_rules_triggered': [],
            'validation_errors': []
        }
        
    def discover_datasets(self) -> List[DatasetMetadata]:
        """Discover all available OTRF datasets"""
        datasets = []
        
        print("🔍 Discovering OTRF datasets...")
        
        # Scan atomic datasets
        atomic_path = self.otrf_path / "datasets" / "atomic"
        if atomic_path.exists():
            datasets.extend(self._scan_atomic_datasets(atomic_path))
            
        # Scan compound datasets
        compound_path = self.otrf_path / "datasets" / "compound"
        if compound_path.exists():
            datasets.extend(self._scan_compound_datasets(compound_path))
            
        self.stats['total_datasets'] = len(datasets)
        print(f"📊 Discovered {len(datasets)} datasets")
        
        return datasets
    
    def _scan_atomic_datasets(self, atomic_path: Path) -> List[DatasetMetadata]:
        """Scan atomic datasets directory"""
        datasets = []
        
        for platform_dir in atomic_path.iterdir():
            if not platform_dir.is_dir() or platform_dir.name.startswith('_'):
                continue
                
            platform = platform_dir.name
            for technique_dir in platform_dir.iterdir():
                if not technique_dir.is_dir():
                    continue
                    
                technique = technique_dir.name
                for host_net_dir in technique_dir.iterdir():
                    if not host_net_dir.is_dir():
                        continue
                        
                    # Find ZIP files in this directory
                    for zip_file in host_net_dir.glob("*.zip"):
                        dataset_name = zip_file.stem
                        
                        # Extract attack techniques from filename/path
                        attack_techniques = self._extract_attack_techniques(
                            dataset_name, technique, platform
                        )
                        
                        # Get file size
                        size_mb = zip_file.stat().st_size / (1024 * 1024)
                        
                        dataset = DatasetMetadata(
                            name=dataset_name,
                            path=str(zip_file),
                            attack_techniques=attack_techniques,
                            event_count=0,  # Will be determined during extraction
                            size_mb=size_mb,
                            platforms=[platform],
                            dataset_type="atomic"
                        )
                        
                        datasets.append(dataset)
        
        return datasets
    
    def _scan_compound_datasets(self, compound_path: Path) -> List[DatasetMetadata]:
        """Scan compound datasets directory"""
        datasets = []
        
        for campaign_dir in compound_path.iterdir():
            if not campaign_dir.is_dir() or campaign_dir.name.startswith('_'):
                continue
                
            campaign = campaign_dir.name
            
            # Find ZIP files in campaign directory
            for zip_file in campaign_dir.glob("*.zip"):
                dataset_name = f"{campaign}_{zip_file.stem}"
                
                # Extract attack techniques from campaign name
                attack_techniques = self._extract_campaign_techniques(campaign)
                
                # Get file size
                size_mb = zip_file.stat().st_size / (1024 * 1024)
                
                dataset = DatasetMetadata(
                    name=dataset_name,
                    path=str(zip_file),
                    attack_techniques=attack_techniques,
                    event_count=0,
                    size_mb=size_mb,
                    platforms=["windows"],  # Most compound datasets are Windows
                    dataset_type="compound"
                )
                
                datasets.append(dataset)
        
        return datasets
    
    def _extract_attack_techniques(self, name: str, technique: str, platform: str) -> List[str]:
        """Extract MITRE ATT&CK techniques from dataset metadata"""
        techniques = []
        
        # Common technique mappings
        technique_map = {
            'credential_access': ['T1003', 'T1558', 'T1110', 'T1555'],
            'execution': ['T1059', 'T1203', 'T1204', 'T1053'],
            'persistence': ['T1547', 'T1053', 'T1136', 'T1505'],
            'privilege_escalation': ['T1055', 'T1068', 'T1134', 'T1548'],
            'defense_evasion': ['T1055', 'T1027', 'T1070', 'T1562'],
            'lateral_movement': ['T1021', 'T1570', 'T1550', 'T1563'],
            'discovery': ['T1033', 'T1057', 'T1083', 'T1135'],
            'collection': ['T1005', 'T1039', 'T1074', 'T1560']
        }
        
        if technique in technique_map:
            techniques.extend(technique_map[technique])
            
        # Extract specific techniques from filenames
        if 'mimikatz' in name.lower():
            techniques.extend(['T1003.001', 'T1558.003'])
        if 'dcsync' in name.lower():
            techniques.append('T1003.006')
        if 'empire' in name.lower():
            techniques.extend(['T1059.001', 'T1055'])
        if 'psexec' in name.lower():
            techniques.append('T1021.002')
        if 'rubeus' in name.lower():
            techniques.extend(['T1558', 'T1550.003'])
            
        return list(set(techniques))
    
    def _extract_campaign_techniques(self, campaign: str) -> List[str]:
        """Extract techniques from compound campaign names"""
        techniques = []
        
        campaign_map = {
            'apt29': ['T1566.001', 'T1059.001', 'T1055', 'T1003.001', 'T1021.002'],
            'apt3': ['T1566.002', 'T1059.003', 'T1070.004', 'T1003.002'],
            'LSASS_campaign': ['T1003.001', 'T1558.003', 'T1134.001'],
            'GoldenSAMLADFSMailAccess': ['T1606.002', 'T1114.002'],
            'Log4Shell': ['T1190', 'T1059.004', 'T1105']
        }
        
        for key, techs in campaign_map.items():
            if key.lower() in campaign.lower():
                techniques.extend(techs)
                
        return techniques
    
    async def process_dataset(self, dataset: DatasetMetadata) -> bool:
        """Process and ingest a single dataset"""
        try:
            print(f"📦 Processing: {dataset.name}")
            
            # Extract dataset
            extracted_data = self._extract_dataset(dataset)
            if not extracted_data:
                return False
                
            dataset.event_count = len(extracted_data)
            
            # Transform to SecureWatch format
            transformed_events = self._transform_events(extracted_data, dataset)
            
            # Ingest into SecureWatch
            success = await self._ingest_events(transformed_events, dataset)
            
            if success:
                dataset.ingestion_status = "completed"
                dataset.ingestion_timestamp = datetime.now(timezone.utc).isoformat()
                self.stats['processed_datasets'] += 1
                self.stats['total_events'] += dataset.event_count
                self.stats['attack_techniques_covered'].update(dataset.attack_techniques)
                self.stats['platforms_tested'].update(dataset.platforms)
                
                # Validate correlation rules
                await self._validate_correlation_rules(dataset)
                
                print(f"✅ Successfully processed {dataset.name} ({dataset.event_count} events)")
                return True
            else:
                dataset.ingestion_status = "failed"
                self.stats['failed_datasets'] += 1
                return False
                
        except Exception as e:
            print(f"❌ Error processing {dataset.name}: {str(e)}")
            dataset.ingestion_status = "failed"
            self.stats['failed_datasets'] += 1
            self.stats['validation_errors'].append({
                'dataset': dataset.name,
                'error': str(e),
                'timestamp': datetime.now(timezone.utc).isoformat()
            })
            return False
    
    def _extract_dataset(self, dataset: DatasetMetadata) -> List[Dict]:
        """Extract events from ZIP file"""
        try:
            events = []
            
            with zipfile.ZipFile(dataset.path, 'r') as zip_file:
                for file_info in zip_file.filelist:
                    if file_info.filename.endswith('.json'):
                        with zip_file.open(file_info.filename) as json_file:
                            content = json_file.read().decode('utf-8')
                            
                            # Handle JSONL format (one JSON object per line)
                            for line in content.strip().split('\n'):
                                if line.strip():
                                    try:
                                        event = json.loads(line)
                                        events.append(event)
                                    except json.JSONDecodeError:
                                        continue
            
            return events
            
        except Exception as e:
            print(f"⚠️  Error extracting {dataset.name}: {str(e)}")
            return []
    
    def _transform_events(self, events: List[Dict], dataset: DatasetMetadata) -> List[Dict]:
        """Transform OTRF events to SecureWatch format"""
        transformed = []
        
        for event in events:
            try:
                # Convert to SecureWatch normalized format
                normalized_event = {
                    'timestamp': self._parse_timestamp(event),
                    'source_type': 'otrf_dataset',
                    'source_host': event.get('Hostname', event.get('host', 'unknown')),
                    'event_id': str(event.get('EventID', event.get('event_id', '0'))),
                    'raw_message': event.get('Message', json.dumps(event)),
                    'severity': self._map_severity(event),
                    'event_type': event.get('EventType', 'INFO'),
                    'category': self._categorize_event(event),
                    'subcategory': dataset.attack_techniques[0] if dataset.attack_techniques else 'unknown',
                    
                    # User information
                    'user': {
                        'name': event.get('User', event.get('AccountName', 'unknown')),
                        'id': event.get('UserID', ''),
                        'domain': event.get('Domain', ''),
                    },
                    
                    # Process information
                    'process': {
                        'name': self._extract_process_name(event),
                        'pid': int(event.get('ProcessId', event.get('ProcessID', 0))),
                        'command_line': event.get('CommandLine', ''),
                        'executable': event.get('Image', event.get('Application', '')),
                        'parent': {
                            'name': event.get('ParentImage', ''),
                            'pid': int(event.get('ParentProcessId', 0))
                        }
                    },
                    
                    # Network information
                    'network': {
                        'source_ip': event.get('SourceIp', event.get('SourceAddress', '')),
                        'source_port': int(event.get('SourcePort', 0)),
                        'destination_ip': event.get('DestinationIp', event.get('DestAddress', '')),
                        'destination_port': int(event.get('DestinationPort', event.get('DestPort', 0))),
                        'protocol': event.get('Protocol', ''),
                    },
                    
                    # Security context
                    'security': {
                        'action': event.get('EventType', 'unknown'),
                        'outcome': 'success' if 'SUCCESS' in event.get('EventType', '') else 'failure',
                        'mitre_technique': dataset.attack_techniques,
                        'threat_indicators': self._extract_threat_indicators(event)
                    },
                    
                    # Metadata
                    'metadata': {
                        'dataset_name': dataset.name,
                        'dataset_type': dataset.dataset_type,
                        'ingestion_timestamp': datetime.now(timezone.utc).isoformat(),
                        'original_event': event
                    },
                    
                    'tags': ['otrf_dataset', dataset.dataset_type] + dataset.attack_techniques
                }
                
                transformed.append(normalized_event)
                
            except Exception as e:
                print(f"⚠️  Error transforming event: {str(e)}")
                continue
        
        return transformed
    
    def _parse_timestamp(self, event: Dict) -> str:
        """Parse timestamp from various formats"""
        timestamp_fields = ['@timestamp', 'EventTime', 'UtcTime', 'timestamp']
        
        for field in timestamp_fields:
            if field in event:
                ts = event[field]
                try:
                    # Try parsing ISO format
                    if isinstance(ts, str):
                        if 'T' in ts:
                            return ts
                        else:
                            # Parse custom format
                            dt = datetime.strptime(ts, '%Y-%m-%d %H:%M:%S')
                            return dt.replace(tzinfo=timezone.utc).isoformat()
                except:
                    continue
        
        # Default to current time if no valid timestamp found
        return datetime.now(timezone.utc).isoformat()
    
    def _map_severity(self, event: Dict) -> str:
        """Map event severity to standardized levels"""
        severity_map = {
            'AUDIT_SUCCESS': 'low',
            'AUDIT_FAILURE': 'medium',
            'INFO': 'low',
            'WARNING': 'medium',
            'ERROR': 'high',
            'CRITICAL': 'critical'
        }
        
        event_type = event.get('EventType', 'INFO')
        return severity_map.get(event_type, 'low')
    
    def _categorize_event(self, event: Dict) -> str:
        """Categorize events based on content"""
        event_id = str(event.get('EventID', ''))
        message = event.get('Message', '').lower()
        
        # Windows Event ID mappings
        if event_id in ['4624', '4625', '4634', '4647']:
            return 'authentication'
        elif event_id in ['4688', '4689']:
            return 'process_execution'
        elif event_id in ['5156', '5158']:
            return 'network_activity'
        elif event_id in ['4698', '4699', '4700', '4701']:
            return 'scheduled_task'
        elif event_id in ['1', '3', '7', '8', '10', '11', '12', '13']:
            return 'sysmon_activity'
        
        # Content-based categorization
        if any(keyword in message for keyword in ['mimikatz', 'credential', 'password']):
            return 'credential_access'
        elif any(keyword in message for keyword in ['powershell', 'cmd', 'execute']):
            return 'execution'
        elif any(keyword in message for keyword in ['network', 'connection', 'tcp', 'udp']):
            return 'network_activity'
        elif any(keyword in message for keyword in ['registry', 'file', 'create']):
            return 'system_modification'
        
        return 'general'
    
    def _extract_process_name(self, event: Dict) -> str:
        """Extract process name from various fields"""
        image = event.get('Image', event.get('Application', ''))
        if image:
            return Path(image).name
        return event.get('ProcessName', 'unknown')
    
    def _extract_threat_indicators(self, event: Dict) -> List[str]:
        """Extract threat indicators from event content"""
        indicators = []
        message = event.get('Message', '').lower()
        
        # Common threat indicators
        threat_keywords = [
            'mimikatz', 'empire', 'covenant', 'metasploit', 'powersploit',
            'bloodhound', 'sharphound', 'rubeus', 'kerberoast', 'asreproast',
            'dcsync', 'golden ticket', 'silver ticket', 'pass the hash',
            'pass the ticket', 'lateral movement', 'privilege escalation'
        ]
        
        for keyword in threat_keywords:
            if keyword in message:
                indicators.append(keyword.replace(' ', '_'))
        
        return indicators
    
    async def _ingest_events(self, events: List[Dict], dataset: DatasetMetadata) -> bool:
        """Ingest events into SecureWatch"""
        try:
            # Process in batches
            for i in range(0, len(events), self.batch_size):
                batch = events[i:i + self.batch_size]
                
                async with aiohttp.ClientSession() as session:
                    payload = {
                        'events': batch,
                        'source': 'otrf_ingester',
                        'dataset_metadata': {
                            'name': dataset.name,
                            'type': dataset.dataset_type,
                            'techniques': dataset.attack_techniques
                        }
                    }
                    
                    async with session.post(
                        f"{self.securewatch_url}/api/logs/batch",
                        json=payload,
                        headers={'Content-Type': 'application/json'}
                    ) as response:
                        if response.status != 200:
                            print(f"❌ Failed to ingest batch {i//self.batch_size + 1}: {response.status}")
                            return False
                        
                        print(f"📊 Ingested batch {i//self.batch_size + 1}/{(len(events)-1)//self.batch_size + 1}")
            
            return True
            
        except Exception as e:
            print(f"❌ Ingestion error: {str(e)}")
            return False
    
    async def _validate_correlation_rules(self, dataset: DatasetMetadata) -> None:
        """Validate correlation engine against dataset"""
        try:
            # Query correlation engine for incidents related to this dataset
            async with aiohttp.ClientSession() as session:
                params = {
                    'dataset_name': dataset.name,
                    'techniques': ','.join(dataset.attack_techniques),
                    'time_range': '1h'
                }
                
                async with session.get(
                    f"http://localhost:4005/api/incidents",
                    params=params
                ) as response:
                    if response.status == 200:
                        incidents = await response.json()
                        
                        if incidents:
                            self.stats['correlation_rules_triggered'].extend([
                                {
                                    'dataset': dataset.name,
                                    'incident_id': incident.get('id'),
                                    'rule_name': incident.get('rule_name'),
                                    'severity': incident.get('severity'),
                                    'techniques': incident.get('mitre_techniques', [])
                                }
                                for incident in incidents
                            ])
                            
                            print(f"🎯 {len(incidents)} correlation incidents triggered for {dataset.name}")
                        else:
                            print(f"⚠️  No correlation rules triggered for {dataset.name}")
                            
        except Exception as e:
            print(f"⚠️  Correlation validation error: {str(e)}")
    
    async def run_comprehensive_test(self, 
                                   dataset_filters: Optional[Dict] = None,
                                   max_datasets: Optional[int] = None) -> Dict[str, Any]:
        """Run comprehensive testing against OTRF datasets"""
        
        print("🚀 Starting OTRF Security Datasets comprehensive testing...")
        self.stats['processing_start_time'] = datetime.now(timezone.utc).isoformat()
        
        # Discover datasets
        datasets = self.discover_datasets()
        
        # Apply filters
        if dataset_filters:
            datasets = self._apply_filters(datasets, dataset_filters)
        
        # Limit dataset count if specified
        if max_datasets:
            datasets = datasets[:max_datasets]
        
        print(f"📋 Processing {len(datasets)} datasets...")
        
        # Process datasets
        for i, dataset in enumerate(datasets, 1):
            print(f"\n[{i}/{len(datasets)}] Processing {dataset.name}")
            success = await self.process_dataset(dataset)
            self.processed_datasets.append(dataset)
            
            if not success:
                print(f"❌ Failed to process {dataset.name}")
        
        self.stats['processing_end_time'] = datetime.now(timezone.utc).isoformat()
        
        # Generate comprehensive report
        report = self._generate_test_report()
        
        # Save results
        self._save_results(report)
        
        return report
    
    def _apply_filters(self, datasets: List[DatasetMetadata], filters: Dict) -> List[DatasetMetadata]:
        """Apply filters to dataset list"""
        filtered = datasets
        
        if 'platforms' in filters:
            platforms = filters['platforms']
            filtered = [d for d in filtered if any(p in d.platforms for p in platforms)]
        
        if 'techniques' in filters:
            techniques = filters['techniques']
            filtered = [d for d in filtered if any(t in d.attack_techniques for t in techniques)]
        
        if 'dataset_type' in filters:
            dataset_type = filters['dataset_type']
            filtered = [d for d in filtered if d.dataset_type == dataset_type]
        
        if 'max_size_mb' in filters:
            max_size = filters['max_size_mb']
            filtered = [d for d in filtered if d.size_mb <= max_size]
        
        return filtered
    
    def _generate_test_report(self) -> Dict[str, Any]:
        """Generate comprehensive test report"""
        return {
            'test_summary': {
                'execution_time': self.stats['processing_end_time'],
                'total_datasets_discovered': self.stats['total_datasets'],
                'datasets_processed': self.stats['processed_datasets'],
                'datasets_failed': self.stats['failed_datasets'],
                'success_rate': (self.stats['processed_datasets'] / self.stats['total_datasets']) * 100,
                'total_events_ingested': self.stats['total_events'],
                'attack_techniques_covered': len(self.stats['attack_techniques_covered']),
                'platforms_tested': list(self.stats['platforms_tested'])
            },
            'correlation_validation': {
                'rules_triggered': len(self.stats['correlation_rules_triggered']),
                'incidents_generated': self.stats['correlation_rules_triggered'],
                'coverage_percentage': self._calculate_coverage_percentage()
            },
            'dataset_details': [
                {
                    'name': d.name,
                    'type': d.dataset_type,
                    'status': d.ingestion_status,
                    'event_count': d.event_count,
                    'size_mb': d.size_mb,
                    'techniques': d.attack_techniques,
                    'platforms': d.platforms
                }
                for d in self.processed_datasets
            ],
            'validation_errors': self.stats['validation_errors'],
            'recommendations': self._generate_recommendations()
        }
    
    def _calculate_coverage_percentage(self) -> float:
        """Calculate MITRE ATT&CK technique coverage"""
        total_techniques = len(self.stats['attack_techniques_covered'])
        triggered_techniques = len(set(
            technique
            for incident in self.stats['correlation_rules_triggered']
            for technique in incident.get('techniques', [])
        ))
        
        return (triggered_techniques / total_techniques) * 100 if total_techniques > 0 else 0
    
    def _generate_recommendations(self) -> List[str]:
        """Generate recommendations based on test results"""
        recommendations = []
        
        # Coverage recommendations
        coverage = self._calculate_coverage_percentage()
        if coverage < 50:
            recommendations.append(
                "Low correlation rule coverage detected. Consider creating additional "
                "correlation rules for uncovered MITRE ATT&CK techniques."
            )
        
        # Performance recommendations
        if self.stats['failed_datasets'] > 0:
            recommendations.append(
                f"{self.stats['failed_datasets']} datasets failed to process. "
                "Review ingestion pipeline for error handling improvements."
            )
        
        # Data quality recommendations
        if len(self.stats['validation_errors']) > 0:
            recommendations.append(
                "Data validation errors detected. Consider implementing more robust "
                "data transformation and validation logic."
            )
        
        return recommendations
    
    def _save_results(self, report: Dict[str, Any]) -> None:
        """Save test results to files"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save comprehensive report
        report_file = f"otrf_test_report_{timestamp}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        print(f"📄 Test report saved to: {report_file}")
        
        # Save dataset metadata
        metadata_file = f"otrf_datasets_metadata_{timestamp}.json"
        metadata = [
            {
                'name': d.name,
                'path': d.path,
                'type': d.dataset_type,
                'status': d.ingestion_status,
                'event_count': d.event_count,
                'techniques': d.attack_techniques,
                'platforms': d.platforms,
                'ingestion_timestamp': d.ingestion_timestamp
            }
            for d in self.processed_datasets
        ]
        
        with open(metadata_file, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"📋 Dataset metadata saved to: {metadata_file}")

async def main():
    """Main execution function"""
    parser = argparse.ArgumentParser(description="OTRF Security Datasets Ingestion for SecureWatch")
    parser.add_argument("--otrf-path", default="/tmp/Security-Datasets", 
                       help="Path to OTRF Security-Datasets repository")
    parser.add_argument("--securewatch-url", default="http://localhost:4002",
                       help="SecureWatch ingestion service URL")
    parser.add_argument("--max-datasets", type=int, 
                       help="Maximum number of datasets to process")
    parser.add_argument("--platforms", nargs="+", choices=["windows", "linux", "aws"],
                       help="Filter by platforms")
    parser.add_argument("--dataset-type", choices=["atomic", "compound"],
                       help="Filter by dataset type")
    parser.add_argument("--techniques", nargs="+",
                       help="Filter by MITRE ATT&CK techniques")
    parser.add_argument("--batch-size", type=int, default=100,
                       help="Batch size for event ingestion")
    
    args = parser.parse_args()
    
    # Build filters
    filters = {}
    if args.platforms:
        filters['platforms'] = args.platforms
    if args.dataset_type:
        filters['dataset_type'] = args.dataset_type
    if args.techniques:
        filters['techniques'] = args.techniques
    
    # Initialize ingester
    ingester = OTRFDataIngester(
        securewatch_base_url=args.securewatch_url,
        otrf_datasets_path=args.otrf_path,
        batch_size=args.batch_size
    )
    
    try:
        # Run comprehensive test
        report = await ingester.run_comprehensive_test(
            dataset_filters=filters if filters else None,
            max_datasets=args.max_datasets
        )
        
        # Print summary
        print("\n" + "="*60)
        print("🎯 OTRF DATASETS TESTING SUMMARY")
        print("="*60)
        print(f"Datasets Processed: {report['test_summary']['datasets_processed']}")
        print(f"Events Ingested: {report['test_summary']['total_events_ingested']:,}")
        print(f"Success Rate: {report['test_summary']['success_rate']:.1f}%")
        print(f"ATT&CK Techniques Covered: {report['test_summary']['attack_techniques_covered']}")
        print(f"Correlation Rules Triggered: {report['correlation_validation']['rules_triggered']}")
        print(f"Coverage Percentage: {report['correlation_validation']['coverage_percentage']:.1f}%")
        
        if report['recommendations']:
            print(f"\n📋 Recommendations:")
            for i, rec in enumerate(report['recommendations'], 1):
                print(f"{i}. {rec}")
        
        print("\n✅ OTRF testing completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during OTRF testing: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())