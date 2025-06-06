#!/usr/bin/env python3
"""
Correlation Engine Testing Against OTRF Security Datasets

This script validates SecureWatch correlation engine functionality using real attack scenarios
from OTRF datasets to ensure accurate threat detection and incident generation.

Author: SecureWatch Team
Version: 1.0.0
Date: June 2025
"""

import asyncio
import aiohttp
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

@dataclass
class CorrelationTestCase:
    """Correlation rule test case definition"""
    name: str
    description: str
    attack_scenario: str
    rule_definition: Dict[str, Any]
    expected_incidents: int
    expected_severity: str
    expected_techniques: List[str]
    time_window: str = "1h"
    test_data_requirements: Optional[Dict] = None

class CorrelationOTRFTester:
    """Correlation engine testing framework using OTRF datasets"""
    
    def __init__(self, 
                 correlation_api_url: str = "http://localhost:4005",
                 search_api_url: str = "http://localhost:4004"):
        self.correlation_api_url = correlation_api_url
        self.search_api_url = search_api_url
        self.test_results = []
        
    def get_correlation_test_cases(self) -> List[CorrelationTestCase]:
        """Define comprehensive correlation test cases for OTRF attack scenarios"""
        
        return [
            # Credential Dumping Attack Chain
            CorrelationTestCase(
                name="mimikatz_credential_dumping",
                description="Detect Mimikatz credential dumping attack chain",
                attack_scenario="Empire Mimikatz logonpasswords execution",
                rule_definition={
                    "name": "Mimikatz Credential Dumping",
                    "description": "Detects Mimikatz credential extraction activities",
                    "severity": "high",
                    "mitre_techniques": ["T1003.001"],
                    "conditions": [
                        {
                            "type": "process_creation",
                            "process_name": "powershell.exe",
                            "command_line": ["mimikatz", "logonpasswords", "sekurlsa"]
                        },
                        {
                            "type": "process_access",
                            "target_process": "lsass.exe",
                            "access_mask": ["0x1010", "0x1410"]
                        }
                    ],
                    "correlation_logic": "any_of_conditions_within_timeframe",
                    "time_window": "5m",
                    "minimum_events": 1
                },
                expected_incidents=1,
                expected_severity="high",
                expected_techniques=["T1003.001"],
                test_data_requirements={"content": "mimikatz"}
            ),
            
            # DCSync Attack Detection
            CorrelationTestCase(
                name="dcsync_attack_detection",
                description="Detect DCSync replication attack",
                attack_scenario="Empire DCSync DRSUAPI attack",
                rule_definition={
                    "name": "DCSync Attack",
                    "description": "Detects DCSync directory replication abuse",
                    "severity": "critical",
                    "mitre_techniques": ["T1003.006"],
                    "conditions": [
                        {
                            "type": "directory_service_access",
                            "object_type": "domainDNS",
                            "access_mask": ["0x100", "0x40000"]
                        },
                        {
                            "type": "network_connection",
                            "destination_port": 135,
                            "protocol": "tcp"
                        }
                    ],
                    "correlation_logic": "all_conditions_within_timeframe",
                    "time_window": "10m",
                    "minimum_events": 2
                },
                expected_incidents=1,
                expected_severity="critical",
                expected_techniques=["T1003.006"],
                test_data_requirements={"content": "dcsync"}
            ),
            
            # Lateral Movement via PsExec
            CorrelationTestCase(
                name="psexec_lateral_movement",
                description="Detect PsExec-based lateral movement",
                attack_scenario="PsExec remote execution and credential dumping",
                rule_definition={
                    "name": "PsExec Lateral Movement",
                    "description": "Detects lateral movement using PsExec",
                    "severity": "high",
                    "mitre_techniques": ["T1021.002"],
                    "conditions": [
                        {
                            "type": "network_logon",
                            "logon_type": 3,
                            "process_name": "psexec"
                        },
                        {
                            "type": "process_creation",
                            "parent_process": "psexec",
                            "command_line": ["cmd.exe", "powershell.exe"]
                        },
                        {
                            "type": "network_connection",
                            "destination_port": 445,
                            "protocol": "tcp"
                        }
                    ],
                    "correlation_logic": "sequential_within_timeframe",
                    "time_window": "15m",
                    "minimum_events": 2
                },
                expected_incidents=1,
                expected_severity="high",
                expected_techniques=["T1021.002"],
                test_data_requirements={"content": "psexec"}
            ),
            
            # Empire PowerShell Framework
            CorrelationTestCase(
                name="empire_framework_detection",
                description="Detect Empire PowerShell framework usage",
                attack_scenario="Empire agent execution and C2 communication",
                rule_definition={
                    "name": "Empire Framework Activity",
                    "description": "Detects Empire PowerShell framework indicators",
                    "severity": "high",
                    "mitre_techniques": ["T1059.001", "T1055"],
                    "conditions": [
                        {
                            "type": "process_creation",
                            "process_name": "powershell.exe",
                            "command_line": ["empire", "invoke-", "Get-System"]
                        },
                        {
                            "type": "network_connection",
                            "destination_port": [80, 443, 8080],
                            "initiated": True
                        },
                        {
                            "type": "registry_modification",
                            "key_path": "CurrentVersion\\Run",
                            "operation": "create"
                        }
                    ],
                    "correlation_logic": "pattern_based",
                    "time_window": "30m",
                    "minimum_events": 2
                },
                expected_incidents=1,
                expected_severity="high",
                expected_techniques=["T1059.001", "T1055"],
                test_data_requirements={"content": "empire"}
            ),
            
            # Golden Ticket Attack
            CorrelationTestCase(
                name="golden_ticket_attack",
                description="Detect Kerberos Golden Ticket attack",
                attack_scenario="Rubeus Golden Ticket creation and usage",
                rule_definition={
                    "name": "Golden Ticket Attack",
                    "description": "Detects Kerberos Golden Ticket abuse",
                    "severity": "critical",
                    "mitre_techniques": ["T1558.001"],
                    "conditions": [
                        {
                            "type": "process_creation",
                            "process_name": "rubeus.exe",
                            "command_line": ["golden", "ptt", "asktgt"]
                        },
                        {
                            "type": "kerberos_ticket_request",
                            "ticket_type": "TGT",
                            "encryption_type": "rc4_hmac"
                        },
                        {
                            "type": "authentication_success",
                            "logon_type": 3,
                            "authentication_package": "Kerberos"
                        }
                    ],
                    "correlation_logic": "sequential_within_timeframe",
                    "time_window": "20m",
                    "minimum_events": 2
                },
                expected_incidents=1,
                expected_severity="critical",
                expected_techniques=["T1558.001"],
                test_data_requirements={"content": "rubeus"}
            ),
            
            # LSASS Memory Dump
            CorrelationTestCase(
                name="lsass_memory_dump",
                description="Detect LSASS memory dumping activities",
                attack_scenario="LSASS process memory dump for credential extraction",
                rule_definition={
                    "name": "LSASS Memory Dump",
                    "description": "Detects LSASS process memory dumping",
                    "severity": "high",
                    "mitre_techniques": ["T1003.001"],
                    "conditions": [
                        {
                            "type": "process_access",
                            "target_process": "lsass.exe",
                            "access_mask": ["0x1010", "0x1410", "0x1438"]
                        },
                        {
                            "type": "file_creation",
                            "file_extension": [".dmp", ".mdmp"],
                            "file_size": ">10MB"
                        }
                    ],
                    "correlation_logic": "all_conditions_within_timeframe",
                    "time_window": "5m",
                    "minimum_events": 1
                },
                expected_incidents=1,
                expected_severity="high",
                expected_techniques=["T1003.001"],
                test_data_requirements={"content": "lsass"}
            ),
            
            # APT29 Attack Simulation
            CorrelationTestCase(
                name="apt29_attack_simulation",
                description="Detect APT29 attack patterns",
                attack_scenario="APT29 evaluation simulation",
                rule_definition={
                    "name": "APT29 Attack Pattern",
                    "description": "Detects APT29-style attack progression",
                    "severity": "critical",
                    "mitre_techniques": ["T1566.001", "T1059.001", "T1055", "T1003.001"],
                    "conditions": [
                        {
                            "type": "email_attachment_execution",
                            "file_extension": [".doc", ".docx", ".xls"],
                            "macro_enabled": True
                        },
                        {
                            "type": "process_creation",
                            "process_name": "powershell.exe",
                            "parent_process": ["winword.exe", "excel.exe"]
                        },
                        {
                            "type": "network_connection",
                            "destination_external": True,
                            "protocol": "https"
                        },
                        {
                            "type": "credential_access",
                            "method": ["mimikatz", "comsvcs"]
                        }
                    ],
                    "correlation_logic": "kill_chain_progression",
                    "time_window": "2h",
                    "minimum_events": 3
                },
                expected_incidents=1,
                expected_severity="critical",
                expected_techniques=["T1566.001", "T1059.001", "T1055", "T1003.001"],
                test_data_requirements={"dataset_type": "compound", "campaign": "apt29"}
            ),
            
            # Cobalt Strike Detection
            CorrelationTestCase(
                name="cobalt_strike_beacon",
                description="Detect Cobalt Strike beacon activity",
                attack_scenario="Cobalt Strike beacon C2 communication",
                rule_definition={
                    "name": "Cobalt Strike Beacon",
                    "description": "Detects Cobalt Strike beacon indicators",
                    "severity": "high",
                    "mitre_techniques": ["T1071.001", "T1573"],
                    "conditions": [
                        {
                            "type": "network_connection",
                            "user_agent": ["Mozilla/4.0", "Mozilla/5.0"],
                            "beacon_pattern": True
                        },
                        {
                            "type": "process_injection",
                            "technique": "process_hollowing",
                            "target_process": ["explorer.exe", "svchost.exe"]
                        },
                        {
                            "type": "named_pipe_creation",
                            "pipe_name": ["msagent_*", "postex_*"]
                        }
                    ],
                    "correlation_logic": "any_of_conditions_within_timeframe",
                    "time_window": "1h",
                    "minimum_events": 2
                },
                expected_incidents=1,
                expected_severity="high",
                expected_techniques=["T1071.001", "T1573"]
            ),
            
            # Persistence via Registry
            CorrelationTestCase(
                name="registry_persistence_detection",
                description="Detect persistence via registry modifications",
                attack_scenario="Registry-based persistence establishment",
                rule_definition={
                    "name": "Registry Persistence",
                    "description": "Detects persistence via registry run keys",
                    "severity": "medium",
                    "mitre_techniques": ["T1547.001"],
                    "conditions": [
                        {
                            "type": "registry_modification",
                            "key_path": [
                                "CurrentVersion\\Run",
                                "CurrentVersion\\RunOnce",
                                "Winlogon\\Shell",
                                "Winlogon\\Userinit"
                            ],
                            "operation": "create"
                        },
                        {
                            "type": "file_creation",
                            "file_path": ["C:\\Windows\\System32\\", "C:\\Windows\\SysWOW64\\"],
                            "file_extension": [".exe", ".dll"]
                        }
                    ],
                    "correlation_logic": "all_conditions_within_timeframe",
                    "time_window": "10m",
                    "minimum_events": 1
                },
                expected_incidents=1,
                expected_severity="medium",
                expected_techniques=["T1547.001"]
            ),
            
            # Log4Shell Exploitation
            CorrelationTestCase(
                name="log4shell_exploitation",
                description="Detect Log4Shell (CVE-2021-44228) exploitation",
                attack_scenario="Log4Shell JNDI injection attack",
                rule_definition={
                    "name": "Log4Shell Exploitation",
                    "description": "Detects Log4Shell JNDI injection exploitation",
                    "severity": "critical",
                    "mitre_techniques": ["T1190", "T1059.004"],
                    "conditions": [
                        {
                            "type": "web_request",
                            "uri_contains": ["${jndi:", "${ldap:", "${rmi:"]
                        },
                        {
                            "type": "dns_query",
                            "query_type": "A",
                            "suspicious_domain": True
                        },
                        {
                            "type": "process_creation",
                            "process_name": "java.exe",
                            "command_line": ["jndi", "ldap://", "rmi://"]
                        }
                    ],
                    "correlation_logic": "sequential_within_timeframe",
                    "time_window": "15m",
                    "minimum_events": 2
                },
                expected_incidents=1,
                expected_severity="critical",
                expected_techniques=["T1190", "T1059.004"],
                test_data_requirements={"content": "log4shell"}
            )
        ]
    
    async def setup_correlation_rule(self, rule_definition: Dict[str, Any]) -> bool:
        """Setup correlation rule in the engine"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.correlation_api_url}/api/rules",
                    json=rule_definition,
                    headers={'Content-Type': 'application/json'}
                ) as response:
                    return response.status in [200, 201]
        except Exception as e:
            print(f"❌ Error setting up rule: {str(e)}")
            return False
    
    async def execute_correlation_test(self, test_case: CorrelationTestCase) -> Dict[str, Any]:
        """Execute a single correlation test case"""
        
        print(f"🔍 Testing: {test_case.name}")
        print(f"   Scenario: {test_case.attack_scenario}")
        
        try:
            # Setup correlation rule
            rule_setup_success = await self.setup_correlation_rule(test_case.rule_definition)
            if not rule_setup_success:
                return {
                    "test_name": test_case.name,
                    "status": "failed",
                    "error": "Failed to setup correlation rule"
                }
            
            # Wait for rule activation
            await asyncio.sleep(2)
            
            # Check for incidents generated by this rule
            start_time = datetime.now()
            incidents = await self._query_incidents(test_case)
            execution_time = datetime.now() - start_time
            
            # Validate results
            validation_result = self._validate_correlation_results(test_case, incidents)
            
            test_result = {
                "test_name": test_case.name,
                "status": "passed" if validation_result["valid"] else "failed",
                "description": test_case.description,
                "attack_scenario": test_case.attack_scenario,
                "execution_time_ms": execution_time.total_seconds() * 1000,
                "incidents_generated": len(incidents),
                "expected_incidents": test_case.expected_incidents,
                "expected_severity": test_case.expected_severity,
                "expected_techniques": test_case.expected_techniques,
                "validation": validation_result,
                "rule_definition": test_case.rule_definition,
                "incidents_details": incidents[:5]  # Limit details for report size
            }
            
            # Log result
            status_icon = "✅" if test_result["status"] == "passed" else "❌"
            print(f"   {status_icon} Status: {test_result['status']}")
            print(f"   📊 Incidents: {test_result['incidents_generated']} (expected: {test_case.expected_incidents})")
            print(f"   ⏱️  Execution: {test_result['execution_time_ms']:.1f}ms")
            
            if test_result["status"] == "failed":
                print(f"   ⚠️  Issues: {validation_result['issues']}")
            
            return test_result
            
        except Exception as e:
            return {
                "test_name": test_case.name,
                "status": "error",
                "error": str(e),
                "execution_time_ms": 0
            }
    
    async def _query_incidents(self, test_case: CorrelationTestCase) -> List[Dict[str, Any]]:
        """Query correlation engine for incidents"""
        try:
            async with aiohttp.ClientSession() as session:
                params = {
                    "rule_name": test_case.rule_definition["name"],
                    "time_range": test_case.time_window,
                    "severity": test_case.expected_severity,
                    "limit": 100
                }
                
                async with session.get(
                    f"{self.correlation_api_url}/api/incidents",
                    params=params
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        return result.get("incidents", [])
                    else:
                        print(f"⚠️  Failed to query incidents: HTTP {response.status}")
                        return []
                        
        except Exception as e:
            print(f"⚠️  Error querying incidents: {str(e)}")
            return []
    
    def _validate_correlation_results(self, test_case: CorrelationTestCase, incidents: List[Dict]) -> Dict[str, Any]:
        """Validate correlation test results"""
        
        validation = {
            "valid": True,
            "issues": []
        }
        
        incidents_count = len(incidents)
        
        # Check incident count
        if incidents_count < test_case.expected_incidents:
            validation["valid"] = False
            validation["issues"].append(
                f"Insufficient incidents: got {incidents_count}, expected ≥ {test_case.expected_incidents}"
            )
        elif incidents_count == 0:
            validation["valid"] = False
            validation["issues"].append("No incidents generated - possible rule configuration issue")
        
        # Validate incident properties
        if incidents:
            for incident in incidents:
                # Check severity
                if incident.get("severity") != test_case.expected_severity:
                    validation["issues"].append(
                        f"Severity mismatch: got '{incident.get('severity')}', expected '{test_case.expected_severity}'"
                    )
                
                # Check MITRE techniques
                incident_techniques = incident.get("mitre_techniques", [])
                expected_techniques = set(test_case.expected_techniques)
                found_techniques = set(incident_techniques)
                
                missing_techniques = expected_techniques - found_techniques
                if missing_techniques:
                    validation["issues"].append(
                        f"Missing techniques in incident: {list(missing_techniques)}"
                    )
                
                # Check incident structure
                required_fields = ["id", "rule_name", "timestamp", "severity", "description"]
                missing_fields = [field for field in required_fields if field not in incident]
                if missing_fields:
                    validation["issues"].append(f"Missing incident fields: {missing_fields}")
        
        return validation
    
    async def run_comprehensive_correlation_test(self) -> Dict[str, Any]:
        """Run comprehensive correlation engine testing"""
        
        print("🚀 Starting comprehensive correlation engine testing with OTRF datasets...")
        
        test_cases = self.get_correlation_test_cases()
        start_time = datetime.now()
        
        # Execute all test cases
        for i, test_case in enumerate(test_cases, 1):
            print(f"\n[{i}/{len(test_cases)}] Executing correlation test...")
            result = await self.execute_correlation_test(test_case)
            self.test_results.append(result)
            
            # Small delay between tests
            await asyncio.sleep(1)
        
        end_time = datetime.now()
        total_time = end_time - start_time
        
        # Generate summary report
        report = self._generate_correlation_report(total_time)
        
        # Save results
        self._save_correlation_results(report)
        
        return report
    
    def _generate_correlation_report(self, total_time: timedelta) -> Dict[str, Any]:
        """Generate comprehensive correlation test report"""
        
        passed_tests = [r for r in self.test_results if r["status"] == "passed"]
        failed_tests = [r for r in self.test_results if r["status"] == "failed"]
        error_tests = [r for r in self.test_results if r["status"] == "error"]
        
        total_incidents = sum(r.get("incidents_generated", 0) for r in self.test_results)
        avg_execution_time = sum(r.get("execution_time_ms", 0) for r in self.test_results) / len(self.test_results)
        
        return {
            "test_summary": {
                "total_tests": len(self.test_results),
                "passed_tests": len(passed_tests),
                "failed_tests": len(failed_tests),
                "error_tests": len(error_tests),
                "success_rate": (len(passed_tests) / len(self.test_results)) * 100,
                "total_execution_time": total_time.total_seconds(),
                "average_test_time_ms": avg_execution_time,
                "total_incidents_generated": total_incidents,
                "test_timestamp": datetime.now().isoformat()
            },
            "correlation_effectiveness": {
                "detection_rate": self._calculate_detection_rate(),
                "false_positive_rate": self._calculate_false_positive_rate(),
                "technique_coverage": self._analyze_technique_coverage(),
                "severity_distribution": self._analyze_severity_distribution()
            },
            "rule_performance": {
                "fastest_rule_ms": min(r.get("execution_time_ms", 0) for r in self.test_results),
                "slowest_rule_ms": max(r.get("execution_time_ms", 0) for r in self.test_results),
                "rules_under_1s": len([r for r in self.test_results if r.get("execution_time_ms", 0) < 1000]),
                "rules_over_10s": len([r for r in self.test_results if r.get("execution_time_ms", 0) > 10000])
            },
            "detailed_results": self.test_results,
            "recommendations": self._generate_correlation_recommendations()
        }
    
    def _calculate_detection_rate(self) -> float:
        """Calculate overall detection rate"""
        successful_detections = len([r for r in self.test_results if r["status"] == "passed" and r.get("incidents_generated", 0) > 0])
        return (successful_detections / len(self.test_results)) * 100 if self.test_results else 0
    
    def _calculate_false_positive_rate(self) -> float:
        """Calculate false positive rate (simplified)"""
        # For this test, we assume excess incidents beyond expected are false positives
        excess_incidents = 0
        total_expected = 0
        
        for result in self.test_results:
            if result["status"] == "passed":
                generated = result.get("incidents_generated", 0)
                expected = result.get("expected_incidents", 0)
                total_expected += expected
                if generated > expected:
                    excess_incidents += (generated - expected)
        
        return (excess_incidents / total_expected) * 100 if total_expected > 0 else 0
    
    def _analyze_technique_coverage(self) -> Dict[str, Any]:
        """Analyze MITRE ATT&CK technique coverage"""
        all_expected_techniques = set()
        detected_techniques = set()
        
        for result in self.test_results:
            all_expected_techniques.update(result.get("expected_techniques", []))
            if result["status"] == "passed" and result.get("incidents_generated", 0) > 0:
                detected_techniques.update(result.get("expected_techniques", []))
        
        return {
            "total_techniques_tested": len(all_expected_techniques),
            "techniques_detected": len(detected_techniques),
            "coverage_percentage": (len(detected_techniques) / len(all_expected_techniques)) * 100 if all_expected_techniques else 0,
            "missing_techniques": list(all_expected_techniques - detected_techniques),
            "detected_techniques": list(detected_techniques)
        }
    
    def _analyze_severity_distribution(self) -> Dict[str, int]:
        """Analyze severity distribution of generated incidents"""
        severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        
        for result in self.test_results:
            if result["status"] == "passed":
                severity = result.get("expected_severity", "unknown")
                if severity in severity_counts:
                    severity_counts[severity] += result.get("incidents_generated", 0)
        
        return severity_counts
    
    def _generate_correlation_recommendations(self) -> List[str]:
        """Generate recommendations based on correlation test results"""
        recommendations = []
        
        # Detection rate recommendations
        detection_rate = self._calculate_detection_rate()
        if detection_rate < 80:
            recommendations.append(f"Low detection rate ({detection_rate:.1f}%) - review and tune correlation rules")
        
        # False positive recommendations
        fp_rate = self._calculate_false_positive_rate()
        if fp_rate > 10:
            recommendations.append(f"High false positive rate ({fp_rate:.1f}%) - refine rule conditions")
        
        # Performance recommendations
        slow_rules = [r for r in self.test_results if r.get("execution_time_ms", 0) > 5000]
        if slow_rules:
            recommendations.append(f"Optimize {len(slow_rules)} slow-performing correlation rules")
        
        # Coverage recommendations
        failed_tests = [r for r in self.test_results if r["status"] == "failed"]
        if failed_tests:
            recommendations.append(f"Fix {len(failed_tests)} failed correlation rules to improve coverage")
        
        # Technique coverage
        technique_coverage = self._analyze_technique_coverage()
        if technique_coverage["coverage_percentage"] < 70:
            recommendations.append("Expand correlation rules to cover missing MITRE ATT&CK techniques")
        
        return recommendations
    
    def _save_correlation_results(self, report: Dict[str, Any]) -> None:
        """Save correlation test results to file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"correlation_otrf_test_report_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        print(f"\n📄 Correlation test report saved to: {filename}")

async def main():
    """Main execution function"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Correlation Engine Testing with OTRF Security Datasets")
    parser.add_argument("--correlation-api-url", default="http://localhost:4005",
                       help="SecureWatch Correlation Engine API URL")
    parser.add_argument("--search-api-url", default="http://localhost:4004",
                       help="SecureWatch Search API URL")
    
    args = parser.parse_args()
    
    # Initialize tester
    tester = CorrelationOTRFTester(
        correlation_api_url=args.correlation_api_url,
        search_api_url=args.search_api_url
    )
    
    try:
        # Run comprehensive test
        report = await tester.run_comprehensive_correlation_test()
        
        # Print summary
        print("\n" + "="*60)
        print("🎯 CORRELATION ENGINE TESTING WITH OTRF - SUMMARY")
        print("="*60)
        print(f"Total Tests: {report['test_summary']['total_tests']}")
        print(f"Passed: {report['test_summary']['passed_tests']}")
        print(f"Failed: {report['test_summary']['failed_tests']}")
        print(f"Errors: {report['test_summary']['error_tests']}")
        print(f"Success Rate: {report['test_summary']['success_rate']:.1f}%")
        print(f"Detection Rate: {report['correlation_effectiveness']['detection_rate']:.1f}%")
        print(f"False Positive Rate: {report['correlation_effectiveness']['false_positive_rate']:.1f}%")
        print(f"Technique Coverage: {report['correlation_effectiveness']['technique_coverage']['coverage_percentage']:.1f}%")
        print(f"Total Incidents: {report['test_summary']['total_incidents_generated']}")
        
        if report['recommendations']:
            print(f"\n📋 Recommendations:")
            for i, rec in enumerate(report['recommendations'], 1):
                print(f"{i}. {rec}")
        
        print("\n✅ Correlation engine testing completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during correlation testing: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())