#!/usr/bin/env python3
"""
Comprehensive test suite for Enhanced EVTX Parser against EVTX-ATTACK-SAMPLES
Tests attack pattern detection, MITRE ATT&CK mapping, and risk scoring
"""

import asyncio
import json
import os
import sys
import logging
from pathlib import Path
from typing import Dict, List, Any
from dataclasses import asdict
import argparse

# Add scripts directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from evtx_parser_enhanced import EnhancedEVTXParser, EnhancedWindowsEventLog

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class EVTXAttackSamplesTestSuite:
    """Test suite for validating enhanced EVTX parser against attack samples"""
    
    def __init__(self, samples_path: str):
        self.samples_path = Path(samples_path)
        self.results = {
            'total_files': 0,
            'processed_files': 0,
            'failed_files': 0,
            'total_events': 0,
            'attack_events': 0,
            'high_risk_events': 0,
            'mitre_techniques': set(),
            'attack_categories': {},
            'file_results': [],
            'top_risks': [],
            'failed_files_list': []
        }
        
    async def run_comprehensive_test(self, max_files: int = None) -> Dict[str, Any]:
        """Run comprehensive test against EVTX-ATTACK-SAMPLES"""
        logger.info(f"Starting comprehensive EVTX attack samples test: {self.samples_path}")
        
        # Find all EVTX files
        evtx_files = list(self.samples_path.rglob("*.evtx"))
        self.results['total_files'] = len(evtx_files)
        
        if max_files:
            evtx_files = evtx_files[:max_files]
            logger.info(f"Limited test to {max_files} files")
        
        logger.info(f"Found {len(evtx_files)} EVTX files to test")
        
        async with EnhancedEVTXParser() as parser:
            for file_path in evtx_files:
                try:
                    logger.info(f"Testing file: {file_path.relative_to(self.samples_path)}")
                    result = await self._test_single_file(parser, file_path)
                    self.results['file_results'].append(result)
                    self._update_aggregate_results(result)
                    self.results['processed_files'] += 1
                    
                except Exception as e:
                    logger.error(f"Failed to process {file_path}: {e}")
                    self.results['failed_files'] += 1
                    self.results['failed_files_list'].append({
                        'file': str(file_path.relative_to(self.samples_path)),
                        'error': str(e)
                    })
        
        # Finalize results
        self._finalize_results()
        
        logger.info(f"Test complete: {self.results['processed_files']}/{self.results['total_files']} files processed")
        return self.results
    
    async def _test_single_file(self, parser: EnhancedEVTXParser, file_path: Path) -> Dict[str, Any]:
        """Test a single EVTX file"""
        try:
            # Parse the file (dry run - no ingestion)
            events = parser.parse_evtx_file(str(file_path))
            
            # Analyze results
            attack_events = [e for e in events if e.attack_indicators]
            high_risk_events = [e for e in events if e.risk_score >= 80]
            
            # Extract attack categories from file path
            attack_category = self._extract_attack_category(file_path)
            
            # Get MITRE techniques found
            mitre_techniques = set()
            for event in events:
                mitre_techniques.update(event.mitre_techniques)
            
            # Find highest risk event
            highest_risk_event = max(events, key=lambda e: e.risk_score) if events else None
            
            result = {
                'file_path': str(file_path.relative_to(self.samples_path)),
                'attack_category': attack_category,
                'total_events': len(events),
                'attack_events': len(attack_events),
                'high_risk_events': len(high_risk_events),
                'mitre_techniques': list(mitre_techniques),
                'highest_risk_score': highest_risk_event.risk_score if highest_risk_event else 0,
                'highest_risk_event': asdict(highest_risk_event) if highest_risk_event and highest_risk_event.risk_score >= 70 else None,
                'event_id_distribution': self._get_event_id_distribution(events),
                'attack_indicators_summary': self._summarize_attack_indicators(attack_events)
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Error testing file {file_path}: {e}")
            raise
    
    def _extract_attack_category(self, file_path: Path) -> str:
        """Extract attack category from file path"""
        path_parts = file_path.parts
        
        # Look for MITRE ATT&CK tactic directories
        tactics = [
            'initial-access', 'execution', 'persistence', 'privilege-escalation',
            'defense-evasion', 'credential-access', 'discovery', 'lateral-movement',
            'collection', 'command-and-control', 'exfiltration', 'impact'
        ]
        
        for part in path_parts:
            part_lower = part.lower().replace('_', '-')
            if part_lower in tactics:
                return part_lower
        
        # Fallback to parent directory
        return file_path.parent.name.lower()
    
    def _get_event_id_distribution(self, events: List[EnhancedWindowsEventLog]) -> Dict[str, int]:
        """Get distribution of Event IDs in the file"""
        distribution = {}
        for event in events:
            event_id = str(event.event_id)
            distribution[event_id] = distribution.get(event_id, 0) + 1
        return distribution
    
    def _summarize_attack_indicators(self, attack_events: List[EnhancedWindowsEventLog]) -> Dict[str, Any]:
        """Summarize attack indicators found"""
        if not attack_events:
            return {}
        
        techniques = {}
        tactics = {}
        confidence_scores = []
        
        for event in attack_events:
            for indicator in event.attack_indicators:
                # Count techniques
                tech_id = indicator.technique_id
                techniques[tech_id] = techniques.get(tech_id, 0) + 1
                
                # Count tactics
                tactic = indicator.tactic
                tactics[tactic] = tactics.get(tactic, 0) + 1
                
                # Collect confidence scores
                confidence_scores.append(indicator.confidence)
        
        return {
            'total_indicators': sum(len(e.attack_indicators) for e in attack_events),
            'unique_techniques': len(techniques),
            'techniques': techniques,
            'tactics': tactics,
            'avg_confidence': sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0,
            'max_confidence': max(confidence_scores) if confidence_scores else 0
        }
    
    def _update_aggregate_results(self, file_result: Dict[str, Any]):
        """Update aggregate results with file result"""
        self.results['total_events'] += file_result['total_events']
        self.results['attack_events'] += file_result['attack_events']
        self.results['high_risk_events'] += file_result['high_risk_events']
        self.results['mitre_techniques'].update(file_result['mitre_techniques'])
        
        # Update attack categories
        category = file_result['attack_category']
        if category not in self.results['attack_categories']:
            self.results['attack_categories'][category] = {
                'files': 0,
                'events': 0,
                'attack_events': 0,
                'techniques': set()
            }
        
        self.results['attack_categories'][category]['files'] += 1
        self.results['attack_categories'][category]['events'] += file_result['total_events']
        self.results['attack_categories'][category]['attack_events'] += file_result['attack_events']
        self.results['attack_categories'][category]['techniques'].update(file_result['mitre_techniques'])
        
        # Track top risk events
        if file_result['highest_risk_event']:
            self.results['top_risks'].append({
                'file': file_result['file_path'],
                'risk_score': file_result['highest_risk_score'],
                'event': file_result['highest_risk_event']
            })
    
    def _finalize_results(self):
        """Finalize and clean up results"""
        # Convert sets to lists for JSON serialization
        self.results['mitre_techniques'] = list(self.results['mitre_techniques'])
        
        for category_data in self.results['attack_categories'].values():
            category_data['techniques'] = list(category_data['techniques'])
        
        # Sort top risks by score
        self.results['top_risks'].sort(key=lambda x: x['risk_score'], reverse=True)
        self.results['top_risks'] = self.results['top_risks'][:10]  # Keep top 10
        
        # Calculate summary statistics
        self.results['detection_rate'] = (
            self.results['attack_events'] / self.results['total_events'] 
            if self.results['total_events'] > 0 else 0
        )
        
        self.results['high_risk_rate'] = (
            self.results['high_risk_events'] / self.results['total_events']
            if self.results['total_events'] > 0 else 0
        )

async def test_specific_attack_samples():
    """Test specific high-value attack samples"""
    samples_base = "/Users/ian/Downloads/EVTX-ATTACK-SAMPLES-master"
    
    # High-value test files to prioritize
    priority_samples = [
        "Execution/CommandLineInterface/cmd.evtx",
        "CredentialAccess/CredentialDumping/mimikatz.evtx", 
        "DefenseEvasion/UACBypass/fodhelper.evtx",
        "Persistence/RegistryRunKeys/runkeys.evtx",
        "LateralMovement/PSExec/psexec.evtx"
    ]
    
    logger.info("Testing priority attack samples...")
    
    async with EnhancedEVTXParser() as parser:
        for sample_path in priority_samples:
            full_path = Path(samples_base) / sample_path
            if full_path.exists():
                logger.info(f"Testing priority sample: {sample_path}")
                try:
                    events = parser.parse_evtx_file(str(full_path))
                    attack_events = [e for e in events if e.attack_indicators]
                    
                    print(f"\n=== {sample_path} ===")
                    print(f"Total events: {len(events)}")
                    print(f"Attack events: {len(attack_events)}")
                    
                    if attack_events:
                        highest_risk = max(attack_events, key=lambda e: e.risk_score)
                        print(f"Highest risk score: {highest_risk.risk_score}")
                        print(f"MITRE techniques: {highest_risk.mitre_techniques}")
                        print(f"Attack indicators: {len(highest_risk.attack_indicators)}")
                        
                        for indicator in highest_risk.attack_indicators[:3]:  # Show top 3
                            print(f"  - {indicator.technique_id}: {indicator.description} (confidence: {indicator.confidence:.2f})")
                
                except Exception as e:
                    logger.error(f"Failed to test {sample_path}: {e}")
            else:
                logger.warning(f"Sample not found: {sample_path}")

async def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Test Enhanced EVTX Parser against EVTX-ATTACK-SAMPLES')
    parser.add_argument('--samples-path', '-s', 
                       default='/Users/ian/Downloads/EVTX-ATTACK-SAMPLES-master',
                       help='Path to EVTX-ATTACK-SAMPLES directory')
    parser.add_argument('--output', '-o', help='Output JSON file for results')
    parser.add_argument('--max-files', '-m', type=int, help='Maximum number of files to test')
    parser.add_argument('--priority-only', '-p', action='store_true', help='Test only priority samples')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.samples_path):
        logger.error(f"EVTX-ATTACK-SAMPLES path not found: {args.samples_path}")
        sys.exit(1)
    
    if args.priority_only:
        await test_specific_attack_samples()
        return
    
    # Run comprehensive test
    test_suite = EVTXAttackSamplesTestSuite(args.samples_path)
    results = await test_suite.run_comprehensive_test(args.max_files)
    
    # Output results
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        logger.info(f"Results written to {args.output}")
    
    # Print summary
    print("\n" + "="*60)
    print("EVTX ATTACK SAMPLES TEST RESULTS")
    print("="*60)
    print(f"Files processed: {results['processed_files']}/{results['total_files']}")
    print(f"Total events: {results['total_events']:,}")
    print(f"Attack events detected: {results['attack_events']:,} ({results['detection_rate']:.1%})")
    print(f"High-risk events: {results['high_risk_events']:,} ({results['high_risk_rate']:.1%})")
    print(f"MITRE techniques identified: {len(results['mitre_techniques'])}")
    print(f"Attack categories tested: {len(results['attack_categories'])}")
    
    print(f"\nTop Attack Categories:")
    for category, data in sorted(results['attack_categories'].items(), 
                                key=lambda x: x[1]['attack_events'], reverse=True)[:5]:
        print(f"  {category}: {data['attack_events']} attack events in {data['files']} files")
    
    print(f"\nTop MITRE Techniques:")
    technique_counts = {}
    for file_result in results['file_results']:
        for technique in file_result['mitre_techniques']:
            technique_counts[technique] = technique_counts.get(technique, 0) + 1
    
    for technique, count in sorted(technique_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"  {technique}: {count} detections")
    
    if results['failed_files_list']:
        print(f"\nFailed files ({len(results['failed_files_list'])}):")
        for failed in results['failed_files_list'][:5]:
            print(f"  {failed['file']}: {failed['error']}")

if __name__ == '__main__':
    asyncio.run(main())