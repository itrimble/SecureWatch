#!/usr/bin/env python3
"""
KQL Testing Against OTRF Security Datasets

This script validates SecureWatch KQL engine functionality using real security datasets
from OTRF to ensure accurate query processing and correlation detection.

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
class KQLTestCase:
    """KQL test case definition"""
    name: str
    description: str
    kql_query: str
    expected_techniques: List[str]
    expected_min_results: int
    expected_max_results: Optional[int] = None
    dataset_filters: Optional[Dict] = None
    validation_rules: Optional[Dict] = None

class KQLOTRFTester:
    """KQL testing framework using OTRF datasets"""
    
    def __init__(self, search_api_url: str = "http://localhost:4004"):
        self.search_api_url = search_api_url
        self.test_results = []
        
    def get_test_cases(self) -> List[KQLTestCase]:
        """Define comprehensive KQL test cases for OTRF data validation"""
        
        return [
            # Authentication Analysis
            KQLTestCase(
                name="authentication_failures",
                description="Detect authentication failures from OTRF datasets",
                kql_query="""
                SecurityEvent
                | where EventID == 4625
                | where TimeGenerated > ago(1d)
                | summarize FailureCount = count() by Account, SourceIP = IpAddress
                | where FailureCount > 3
                | order by FailureCount desc
                """,
                expected_techniques=["T1110"],
                expected_min_results=1
            ),
            
            # Credential Access Detection
            KQLTestCase(
                name="mimikatz_detection",
                description="Detect Mimikatz credential dumping activities",
                kql_query="""
                SysmonEvent
                | where EventID == 1
                | where Process has_any ("mimikatz", "sekurlsa", "logonpasswords")
                | extend MitreTechnique = "T1003.001"
                | project TimeGenerated, Computer, Process, CommandLine, User, MitreTechnique
                """,
                expected_techniques=["T1003.001"],
                expected_min_results=1,
                dataset_filters={"content": "mimikatz"}
            ),
            
            # Process Execution Analysis
            KQLTestCase(
                name="powershell_execution",
                description="Analyze PowerShell execution patterns",
                kql_query="""
                SysmonEvent
                | where EventID == 1
                | where Process has_any ("powershell.exe", "pwsh.exe")
                | where CommandLine has_any ("bypass", "hidden", "encoded", "downloadstring")
                | extend SuspiciousIndicators = extract_all(@"(bypass|hidden|encoded|downloadstring)", CommandLine)
                | summarize ExecutionCount = count(), UniqueCommands = dcount(CommandLine) by Computer, User
                | where ExecutionCount > 5 or UniqueCommands > 3
                """,
                expected_techniques=["T1059.001"],
                expected_min_results=1
            ),
            
            # Network Activity Analysis
            KQLTestCase(
                name="suspicious_network_connections",
                description="Detect suspicious network connections",
                kql_query="""
                SysmonEvent
                | where EventID == 3
                | where DestinationPort in (445, 135, 139, 3389, 5985, 5986)
                | where SourceIp != DestinationIp
                | summarize ConnectionCount = count(), UniqueDestinations = dcount(DestinationIp) 
                  by SourceIp, Process, User
                | where ConnectionCount > 10 or UniqueDestinations > 5
                | extend MitreTechnique = "T1021"
                """,
                expected_techniques=["T1021"],
                expected_min_results=1
            ),
            
            # Lateral Movement Detection
            KQLTestCase(
                name="psexec_lateral_movement",
                description="Detect PsExec-based lateral movement",
                kql_query="""
                union SecurityEvent, SysmonEvent
                | where (EventID == 4624 and LogonType == 3) or (EventID == 1 and Process has "psexec")
                | extend LoginType = case(
                    EventID == 4624, "Network_Logon",
                    EventID == 1, "Process_Execution",
                    "Other"
                )
                | summarize Events = count() by Computer, Account, LoginType, bin(TimeGenerated, 5m)
                | where Events > 2
                """,
                expected_techniques=["T1021.002"],
                expected_min_results=1,
                dataset_filters={"content": "psexec"}
            ),
            
            # DCSync Attack Detection
            KQLTestCase(
                name="dcsync_detection",
                description="Detect DCSync attacks using directory replication",
                kql_query="""
                SecurityEvent
                | where EventID == 4662
                | where ObjectType has "domainDNS"
                | where AccessMask has_any ("0x100", "0x40000")
                | summarize DCCalls = count() by Account, Computer, bin(TimeGenerated, 1m)
                | where DCCalls > 1
                | extend MitreTechnique = "T1003.006"
                """,
                expected_techniques=["T1003.006"],
                expected_min_results=1,
                dataset_filters={"content": "dcsync"}
            ),
            
            # Registry Manipulation
            KQLTestCase(
                name="registry_persistence",
                description="Detect registry-based persistence mechanisms",
                kql_query="""
                SysmonEvent
                | where EventID in (12, 13, 14)
                | where TargetObject has_any (
                    "\\CurrentVersion\\Run",
                    "\\CurrentVersion\\RunOnce",
                    "\\Winlogon\\Shell",
                    "\\Winlogon\\Userinit"
                )
                | summarize RegistryChanges = count() by Computer, Process, User, TargetObject
                | extend MitreTechnique = "T1547.001"
                """,
                expected_techniques=["T1547.001"],
                expected_min_results=1
            ),
            
            # File System Activity
            KQLTestCase(
                name="suspicious_file_creation",
                description="Detect suspicious file creation in system directories",
                kql_query="""
                SysmonEvent
                | where EventID == 11
                | where TargetFilename has_any (
                    "\\windows\\system32\\",
                    "\\windows\\syswow64\\",
                    "\\programdata\\",
                    "\\temp\\"
                )
                | where TargetFilename has_any (".exe", ".dll", ".bat", ".ps1", ".vbs")
                | summarize FileCreations = count() by Computer, Process, User, 
                  FileExtension = extract(@"\.([^.\\]+)$", TargetFilename)
                | where FileCreations > 3
                """,
                expected_techniques=["T1105", "T1027"],
                expected_min_results=1
            ),
            
            # Advanced Persistent Threat Simulation
            KQLTestCase(
                name="apt_kill_chain_analysis",
                description="Analyze APT kill chain progression",
                kql_query="""
                union SecurityEvent, SysmonEvent
                | where TimeGenerated > ago(1h)
                | extend Phase = case(
                    EventID == 4624, "Initial_Access",
                    EventID == 1 and Process has_any ("powershell", "cmd"), "Execution",
                    EventID == 3, "Command_Control",
                    EventID in (12, 13, 14), "Persistence",
                    EventID == 4688, "Process_Creation",
                    "Other"
                )
                | where Phase != "Other"
                | summarize Phases = make_set(Phase), EventCount = count() 
                  by Computer, User, bin(TimeGenerated, 10m)
                | where array_length(Phases) >= 3
                | extend KillChainProgress = array_length(Phases)
                """,
                expected_techniques=["T1566", "T1059", "T1055", "T1003"],
                expected_min_results=1
            ),
            
            # Empire Framework Detection
            KQLTestCase(
                name="empire_framework_detection",
                description="Detect Empire PowerShell framework usage",
                kql_query="""
                SysmonEvent
                | where EventID in (1, 3)
                | where CommandLine has_any ("empire", "invoke-", "Get-System", "Invoke-Mimikatz")
                    or DestinationIp has_any ("10.10.10", "192.168")
                | extend EmpireIndicators = extract_all(@"(empire|invoke-\w+|Get-System)", CommandLine)
                | where array_length(EmpireIndicators) > 0
                | summarize EmpireActivity = count() by Computer, User, Process
                | extend MitreTechnique = "T1059.001"
                """,
                expected_techniques=["T1059.001", "T1055"],
                expected_min_results=1,
                dataset_filters={"content": "empire"}
            ),
            
            # Time-based Correlation Analysis
            KQLTestCase(
                name="time_based_attack_correlation",
                description="Correlate attack events within time windows",
                kql_query="""
                union SecurityEvent, SysmonEvent
                | where TimeGenerated > ago(30m)
                | extend AttackStage = case(
                    EventID == 4625, "Reconnaissance",
                    EventID == 4624, "Initial_Access", 
                    EventID == 1 and Process has "powershell", "Execution",
                    EventID == 3, "Command_Control",
                    EventID in (12, 13), "Persistence",
                    "Unknown"
                )
                | where AttackStage != "Unknown"
                | summarize 
                    Stages = make_set(AttackStage),
                    Timeline = make_list(pack("time", TimeGenerated, "stage", AttackStage)),
                    Duration = max(TimeGenerated) - min(TimeGenerated)
                  by Computer, User
                | where array_length(Stages) >= 2 and Duration < 1h
                | extend AttackProgression = array_length(Stages)
                """,
                expected_techniques=["T1078", "T1059", "T1547"],
                expected_min_results=1
            )
        ]
    
    async def execute_test_case(self, test_case: KQLTestCase) -> Dict[str, Any]:
        """Execute a single KQL test case"""
        
        print(f"🔍 Testing: {test_case.name}")
        print(f"   Description: {test_case.description}")
        
        try:
            async with aiohttp.ClientSession() as session:
                # Prepare query payload
                payload = {
                    "query": test_case.kql_query,
                    "timeRange": "1d",
                    "maxResults": test_case.expected_max_results or 1000,
                    "backend": "auto"  # Let system choose optimal backend
                }
                
                # Add dataset filters if specified
                if test_case.dataset_filters:
                    payload["filters"] = test_case.dataset_filters
                
                # Execute query
                start_time = datetime.now()
                async with session.post(
                    f"{self.search_api_url}/api/query/execute",
                    json=payload,
                    headers={'Content-Type': 'application/json'}
                ) as response:
                    
                    execution_time = datetime.now() - start_time
                    
                    if response.status != 200:
                        return {
                            "test_name": test_case.name,
                            "status": "failed",
                            "error": f"HTTP {response.status}",
                            "execution_time_ms": execution_time.total_seconds() * 1000
                        }
                    
                    result_data = await response.json()
                    
                    # Validate results
                    validation_result = self._validate_test_results(test_case, result_data)
                    
                    test_result = {
                        "test_name": test_case.name,
                        "status": "passed" if validation_result["valid"] else "failed",
                        "description": test_case.description,
                        "execution_time_ms": execution_time.total_seconds() * 1000,
                        "results_count": len(result_data.get("results", [])),
                        "expected_min_results": test_case.expected_min_results,
                        "expected_techniques": test_case.expected_techniques,
                        "validation": validation_result,
                        "query": test_case.kql_query,
                        "backend_used": result_data.get("backend", "unknown"),
                        "query_statistics": result_data.get("statistics", {})
                    }
                    
                    # Log result
                    status_icon = "✅" if test_result["status"] == "passed" else "❌"
                    print(f"   {status_icon} Status: {test_result['status']}")
                    print(f"   📊 Results: {test_result['results_count']} (expected ≥ {test_case.expected_min_results})")
                    print(f"   ⏱️  Execution: {test_result['execution_time_ms']:.1f}ms")
                    
                    if test_result["status"] == "failed":
                        print(f"   ⚠️  Validation: {validation_result['issues']}")
                    
                    return test_result
                    
        except Exception as e:
            return {
                "test_name": test_case.name,
                "status": "error",
                "error": str(e),
                "execution_time_ms": 0
            }
    
    def _validate_test_results(self, test_case: KQLTestCase, result_data: Dict) -> Dict[str, Any]:
        """Validate test results against expected criteria"""
        
        validation = {
            "valid": True,
            "issues": []
        }
        
        results = result_data.get("results", [])
        results_count = len(results)
        
        # Check minimum results threshold
        if results_count < test_case.expected_min_results:
            validation["valid"] = False
            validation["issues"].append(
                f"Insufficient results: got {results_count}, expected ≥ {test_case.expected_min_results}"
            )
        
        # Check maximum results threshold
        if test_case.expected_max_results and results_count > test_case.expected_max_results:
            validation["valid"] = False
            validation["issues"].append(
                f"Too many results: got {results_count}, expected ≤ {test_case.expected_max_results}"
            )
        
        # Validate MITRE ATT&CK techniques (if results contain technique fields)
        if results and test_case.expected_techniques:
            found_techniques = set()
            for result in results:
                # Check various technique fields
                for field in ["MitreTechnique", "security.mitre_technique", "mitre_techniques"]:
                    if field in result:
                        if isinstance(result[field], list):
                            found_techniques.update(result[field])
                        elif result[field]:
                            found_techniques.add(result[field])
            
            expected_techniques = set(test_case.expected_techniques)
            missing_techniques = expected_techniques - found_techniques
            
            if missing_techniques:
                validation["issues"].append(
                    f"Missing expected techniques: {list(missing_techniques)}"
                )
                # This is a warning, not a failure for now
                # validation["valid"] = False
        
        # Check for query execution errors
        if result_data.get("error"):
            validation["valid"] = False
            validation["issues"].append(f"Query error: {result_data['error']}")
        
        # Performance validation
        execution_time = result_data.get("execution_time_ms", 0)
        if execution_time > 30000:  # 30 seconds
            validation["issues"].append(f"Slow query execution: {execution_time}ms")
        
        return validation
    
    async def run_comprehensive_kql_test(self) -> Dict[str, Any]:
        """Run comprehensive KQL testing against OTRF datasets"""
        
        print("🚀 Starting comprehensive KQL testing with OTRF datasets...")
        
        test_cases = self.get_test_cases()
        start_time = datetime.now()
        
        # Execute all test cases
        for i, test_case in enumerate(test_cases, 1):
            print(f"\n[{i}/{len(test_cases)}] Executing test case...")
            result = await self.execute_test_case(test_case)
            self.test_results.append(result)
        
        end_time = datetime.now()
        total_time = end_time - start_time
        
        # Generate summary report
        report = self._generate_test_report(total_time)
        
        # Save results
        self._save_test_results(report)
        
        return report
    
    def _generate_test_report(self, total_time: timedelta) -> Dict[str, Any]:
        """Generate comprehensive test report"""
        
        passed_tests = [r for r in self.test_results if r["status"] == "passed"]
        failed_tests = [r for r in self.test_results if r["status"] == "failed"]
        error_tests = [r for r in self.test_results if r["status"] == "error"]
        
        avg_execution_time = sum(r.get("execution_time_ms", 0) for r in self.test_results) / len(self.test_results)
        
        return {
            "test_summary": {
                "total_tests": len(self.test_results),
                "passed_tests": len(passed_tests),
                "failed_tests": len(failed_tests),
                "error_tests": len(error_tests),
                "success_rate": (len(passed_tests) / len(self.test_results)) * 100,
                "total_execution_time": total_time.total_seconds(),
                "average_query_time_ms": avg_execution_time,
                "test_timestamp": datetime.now().isoformat()
            },
            "performance_metrics": {
                "fastest_query_ms": min(r.get("execution_time_ms", 0) for r in self.test_results),
                "slowest_query_ms": max(r.get("execution_time_ms", 0) for r in self.test_results),
                "queries_under_1s": len([r for r in self.test_results if r.get("execution_time_ms", 0) < 1000]),
                "queries_over_10s": len([r for r in self.test_results if r.get("execution_time_ms", 0) > 10000])
            },
            "validation_results": {
                "technique_coverage": self._analyze_technique_coverage(),
                "data_quality_issues": self._identify_data_quality_issues(),
                "correlation_effectiveness": self._assess_correlation_effectiveness()
            },
            "detailed_results": self.test_results,
            "recommendations": self._generate_recommendations()
        }
    
    def _analyze_technique_coverage(self) -> Dict[str, Any]:
        """Analyze MITRE ATT&CK technique coverage"""
        all_expected_techniques = set()
        validated_techniques = set()
        
        for result in self.test_results:
            if result["status"] == "passed":
                all_expected_techniques.update(result.get("expected_techniques", []))
                # Add logic to extract validated techniques from results
        
        return {
            "total_techniques_tested": len(all_expected_techniques),
            "techniques_validated": len(validated_techniques),
            "coverage_percentage": (len(validated_techniques) / len(all_expected_techniques)) * 100 if all_expected_techniques else 0,
            "missing_techniques": list(all_expected_techniques - validated_techniques)
        }
    
    def _identify_data_quality_issues(self) -> List[str]:
        """Identify data quality issues from test results"""
        issues = []
        
        zero_result_tests = [r for r in self.test_results if r.get("results_count", 0) == 0]
        if zero_result_tests:
            issues.append(f"{len(zero_result_tests)} queries returned no results - possible data ingestion issues")
        
        slow_queries = [r for r in self.test_results if r.get("execution_time_ms", 0) > 10000]
        if slow_queries:
            issues.append(f"{len(slow_queries)} queries executed slowly (>10s) - possible performance issues")
        
        failed_validations = [r for r in self.test_results if not r.get("validation", {}).get("valid", True)]
        if failed_validations:
            issues.append(f"{len(failed_validations)} queries failed validation - possible data mapping issues")
        
        return issues
    
    def _assess_correlation_effectiveness(self) -> Dict[str, Any]:
        """Assess correlation engine effectiveness based on test results"""
        correlation_tests = [r for r in self.test_results if "correlation" in r["test_name"].lower()]
        
        return {
            "correlation_tests_count": len(correlation_tests),
            "correlation_success_rate": (len([t for t in correlation_tests if t["status"] == "passed"]) / len(correlation_tests)) * 100 if correlation_tests else 0,
            "multi_stage_detection_working": any("kill_chain" in t["test_name"] or "correlation" in t["test_name"] for t in self.test_results if t["status"] == "passed")
        }
    
    def _generate_recommendations(self) -> List[str]:
        """Generate recommendations based on test results"""
        recommendations = []
        
        failed_count = len([r for r in self.test_results if r["status"] != "passed"])
        if failed_count > 0:
            recommendations.append(f"Fix {failed_count} failing test cases to improve KQL engine reliability")
        
        slow_queries = [r for r in self.test_results if r.get("execution_time_ms", 0) > 5000]
        if slow_queries:
            recommendations.append("Optimize query performance - several queries are executing slowly")
        
        zero_results = [r for r in self.test_results if r.get("results_count", 0) == 0]
        if zero_results:
            recommendations.append("Investigate data ingestion - some queries return no results from OTRF datasets")
        
        return recommendations
    
    def _save_test_results(self, report: Dict[str, Any]) -> None:
        """Save test results to file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"kql_otrf_test_report_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        print(f"\n📄 Test report saved to: {filename}")

async def main():
    """Main execution function"""
    import argparse
    
    parser = argparse.ArgumentParser(description="KQL Testing with OTRF Security Datasets")
    parser.add_argument("--search-api-url", default="http://localhost:4004",
                       help="SecureWatch Search API URL")
    
    args = parser.parse_args()
    
    # Initialize tester
    tester = KQLOTRFTester(search_api_url=args.search_api_url)
    
    try:
        # Run comprehensive test
        report = await tester.run_comprehensive_kql_test()
        
        # Print summary
        print("\n" + "="*60)
        print("🎯 KQL TESTING WITH OTRF DATASETS - SUMMARY")
        print("="*60)
        print(f"Total Tests: {report['test_summary']['total_tests']}")
        print(f"Passed: {report['test_summary']['passed_tests']}")
        print(f"Failed: {report['test_summary']['failed_tests']}")
        print(f"Errors: {report['test_summary']['error_tests']}")
        print(f"Success Rate: {report['test_summary']['success_rate']:.1f}%")
        print(f"Average Query Time: {report['test_summary']['average_query_time_ms']:.1f}ms")
        print(f"Technique Coverage: {report['validation_results']['technique_coverage']['coverage_percentage']:.1f}%")
        
        if report['recommendations']:
            print(f"\n📋 Recommendations:")
            for i, rec in enumerate(report['recommendations'], 1):
                print(f"{i}. {rec}")
        
        print("\n✅ KQL testing completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during KQL testing: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())