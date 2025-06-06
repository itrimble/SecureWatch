#!/usr/bin/env python3
"""
Comprehensive OTRF Security Datasets Testing Orchestrator

This script orchestrates comprehensive testing of SecureWatch platform using OTRF datasets,
including data ingestion, KQL validation, correlation engine testing, and analytics validation.

Author: SecureWatch Team
Version: 1.0.0
Date: June 2025
"""

import asyncio
import subprocess
import sys
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
import argparse
import requests

class OTRFTestOrchestrator:
    """Orchestrates comprehensive OTRF testing for SecureWatch"""
    
    def __init__(self, 
                 otrf_path: str = "/tmp/Security-Datasets",
                 securewatch_base_url: str = "http://localhost:4000",
                 parallel_execution: bool = True):
        self.otrf_path = otrf_path
        self.securewatch_base_url = securewatch_base_url
        self.parallel_execution = parallel_execution
        
        # Service URLs
        self.service_urls = {
            "frontend": "http://localhost:4000",
            "search_api": "http://localhost:4004", 
            "log_ingestion": "http://localhost:4002",
            "correlation_engine": "http://localhost:4005"
        }
        
        self.test_results = {
            "ingestion": None,
            "kql": None,
            "correlation": None,
            "analytics": None,
            "platform_validation": None
        }
        
        self.overall_start_time = None
        self.overall_end_time = None
        
    async def check_prerequisites(self) -> bool:
        """Check all prerequisites for OTRF testing"""
        print("🔍 Checking prerequisites for OTRF testing...")
        
        prerequisites_met = True
        
        # Check OTRF datasets directory
        if not Path(self.otrf_path).exists():
            print(f"❌ OTRF datasets not found at: {self.otrf_path}")
            print("   Run: git clone https://github.com/OTRF/Security-Datasets.git /tmp/Security-Datasets")
            prerequisites_met = False
        else:
            print(f"✅ OTRF datasets found at: {self.otrf_path}")
        
        # Check SecureWatch services
        for service, url in self.service_urls.items():
            try:
                response = requests.get(f"{url}/health", timeout=5)
                if response.status_code == 200:
                    print(f"✅ {service.title()} service is healthy")
                else:
                    print(f"⚠️  {service.title()} service returned {response.status_code}")
            except requests.exceptions.RequestException:
                print(f"❌ {service.title()} service is not responding at {url}")
                prerequisites_met = False
        
        # Check required Python packages
        required_packages = ["aiohttp", "asyncio", "requests"]
        for package in required_packages:
            try:
                __import__(package)
                print(f"✅ {package} package available")
            except ImportError:
                print(f"❌ {package} package not installed")
                prerequisites_met = False
        
        # Check available disk space
        try:
            import shutil
            total, used, free = shutil.disk_usage("/tmp")
            free_gb = free // (1024**3)
            if free_gb < 5:
                print(f"⚠️  Low disk space: {free_gb}GB free (recommend 5GB+)")
            else:
                print(f"✅ Sufficient disk space: {free_gb}GB free")
        except Exception:
            print("⚠️  Could not check disk space")
        
        return prerequisites_met
    
    async def run_ingestion_test(self, max_datasets: Optional[int] = None) -> Dict[str, Any]:
        """Run OTRF data ingestion test"""
        print("\n" + "="*60)
        print("📥 PHASE 1: OTRF DATA INGESTION TESTING")
        print("="*60)
        
        cmd = [
            sys.executable, "scripts/otrf_data_ingester.py",
            "--otrf-path", self.otrf_path,
            "--securewatch-url", self.service_urls["log_ingestion"]
        ]
        
        if max_datasets:
            cmd.extend(["--max-datasets", str(max_datasets)])
        
        try:
            print(f"🚀 Starting OTRF data ingestion...")
            start_time = time.time()
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            end_time = time.time()
            
            if process.returncode == 0:
                print("✅ Data ingestion completed successfully")
                
                # Try to parse the last JSON report file
                try:
                    report_files = list(Path(".").glob("otrf_test_report_*.json"))
                    if report_files:
                        latest_report = max(report_files, key=lambda p: p.stat().st_mtime)
                        with open(latest_report) as f:
                            result = json.load(f)
                            result["execution_time"] = end_time - start_time
                            result["stdout"] = stdout.decode()
                            return result
                except Exception as e:
                    print(f"⚠️  Could not parse ingestion report: {e}")
                
                return {
                    "status": "success",
                    "execution_time": end_time - start_time,
                    "stdout": stdout.decode(),
                    "stderr": stderr.decode()
                }
            else:
                print(f"❌ Data ingestion failed with return code {process.returncode}")
                return {
                    "status": "failed",
                    "return_code": process.returncode,
                    "execution_time": end_time - start_time,
                    "stdout": stdout.decode(),
                    "stderr": stderr.decode()
                }
                
        except Exception as e:
            print(f"❌ Error running ingestion test: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "execution_time": 0
            }
    
    async def run_kql_test(self) -> Dict[str, Any]:
        """Run KQL engine testing against OTRF data"""
        print("\n" + "="*60)
        print("🔍 PHASE 2: KQL ENGINE TESTING")
        print("="*60)
        
        cmd = [
            sys.executable, "scripts/test_kql_with_otrf.py",
            "--search-api-url", self.service_urls["search_api"]
        ]
        
        try:
            print(f"🚀 Starting KQL engine testing...")
            start_time = time.time()
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            end_time = time.time()
            
            if process.returncode == 0:
                print("✅ KQL testing completed successfully")
                
                # Try to parse the latest KQL test report
                try:
                    report_files = list(Path(".").glob("kql_otrf_test_report_*.json"))
                    if report_files:
                        latest_report = max(report_files, key=lambda p: p.stat().st_mtime)
                        with open(latest_report) as f:
                            result = json.load(f)
                            result["execution_time"] = end_time - start_time
                            result["stdout"] = stdout.decode()
                            return result
                except Exception as e:
                    print(f"⚠️  Could not parse KQL test report: {e}")
                
                return {
                    "status": "success",
                    "execution_time": end_time - start_time,
                    "stdout": stdout.decode(),
                    "stderr": stderr.decode()
                }
            else:
                print(f"❌ KQL testing failed with return code {process.returncode}")
                return {
                    "status": "failed",
                    "return_code": process.returncode,
                    "execution_time": end_time - start_time,
                    "stdout": stdout.decode(),
                    "stderr": stderr.decode()
                }
                
        except Exception as e:
            print(f"❌ Error running KQL test: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "execution_time": 0
            }
    
    async def run_correlation_test(self) -> Dict[str, Any]:
        """Run correlation engine testing"""
        print("\n" + "="*60)
        print("🎯 PHASE 3: CORRELATION ENGINE TESTING")
        print("="*60)
        
        cmd = [
            sys.executable, "scripts/test_correlation_with_otrf.py",
            "--correlation-api-url", self.service_urls["correlation_engine"],
            "--search-api-url", self.service_urls["search_api"]
        ]
        
        try:
            print(f"🚀 Starting correlation engine testing...")
            start_time = time.time()
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            end_time = time.time()
            
            if process.returncode == 0:
                print("✅ Correlation testing completed successfully")
                
                # Try to parse the latest correlation test report
                try:
                    report_files = list(Path(".").glob("correlation_otrf_test_report_*.json"))
                    if report_files:
                        latest_report = max(report_files, key=lambda p: p.stat().st_mtime)
                        with open(latest_report) as f:
                            result = json.load(f)
                            result["execution_time"] = end_time - start_time
                            result["stdout"] = stdout.decode()
                            return result
                except Exception as e:
                    print(f"⚠️  Could not parse correlation test report: {e}")
                
                return {
                    "status": "success",
                    "execution_time": end_time - start_time,
                    "stdout": stdout.decode(),
                    "stderr": stderr.decode()
                }
            else:
                print(f"❌ Correlation testing failed with return code {process.returncode}")
                return {
                    "status": "failed",
                    "return_code": process.returncode,
                    "execution_time": end_time - start_time,
                    "stdout": stdout.decode(),
                    "stderr": stderr.decode()
                }
                
        except Exception as e:
            print(f"❌ Error running correlation test: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "execution_time": 0
            }
    
    async def run_analytics_test(self) -> Dict[str, Any]:
        """Run analytics and visualization testing"""
        print("\n" + "="*60)
        print("📊 PHASE 4: ANALYTICS & VISUALIZATION TESTING")
        print("="*60)
        
        print("🚀 Starting analytics validation...")
        
        try:
            # Test various analytics endpoints
            analytics_tests = [
                ("event_timeline", "/api/analytics/timeline"),
                ("threat_heatmap", "/api/analytics/heatmap"),
                ("attack_patterns", "/api/analytics/patterns"),
                ("user_behavior", "/api/analytics/ueba"),
                ("network_correlation", "/api/analytics/network")
            ]
            
            results = {}
            start_time = time.time()
            
            for test_name, endpoint in analytics_tests:
                try:
                    url = f"{self.service_urls['search_api']}{endpoint}"
                    response = requests.get(url, timeout=30, params={
                        "time_range": "1h",
                        "data_source": "otrf_dataset"
                    })
                    
                    results[test_name] = {
                        "status": "success" if response.status_code == 200 else "failed",
                        "status_code": response.status_code,
                        "response_size": len(response.content),
                        "response_time_ms": response.elapsed.total_seconds() * 1000
                    }
                    
                    if response.status_code == 200:
                        print(f"✅ {test_name}: {response.status_code} ({len(response.content)} bytes)")
                    else:
                        print(f"❌ {test_name}: {response.status_code}")
                        
                except Exception as e:
                    results[test_name] = {
                        "status": "error",
                        "error": str(e)
                    }
                    print(f"❌ {test_name}: {str(e)}")
            
            end_time = time.time()
            
            successful_tests = len([r for r in results.values() if r.get("status") == "success"])
            success_rate = (successful_tests / len(analytics_tests)) * 100
            
            return {
                "status": "success" if success_rate > 50 else "failed",
                "execution_time": end_time - start_time,
                "success_rate": success_rate,
                "test_results": results,
                "total_tests": len(analytics_tests),
                "successful_tests": successful_tests
            }
            
        except Exception as e:
            print(f"❌ Error running analytics test: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "execution_time": 0
            }
    
    async def run_platform_validation(self) -> Dict[str, Any]:
        """Run overall platform validation"""
        print("\n" + "="*60)
        print("🔧 PHASE 5: PLATFORM INTEGRATION VALIDATION")
        print("="*60)
        
        print("🚀 Starting platform integration validation...")
        
        validation_results = {}
        start_time = time.time()
        
        try:
            # Test end-to-end data flow
            print("📡 Testing end-to-end data flow...")
            
            # 1. Test data ingestion health
            try:
                response = requests.get(f"{self.service_urls['log_ingestion']}/health")
                validation_results["ingestion_health"] = {
                    "status": "healthy" if response.status_code == 200 else "unhealthy",
                    "status_code": response.status_code
                }
            except Exception as e:
                validation_results["ingestion_health"] = {"status": "error", "error": str(e)}
            
            # 2. Test search API with OTRF data
            try:
                response = requests.post(
                    f"{self.service_urls['search_api']}/api/query/execute",
                    json={
                        "query": "* | where tags has 'otrf_dataset' | take 10",
                        "timeRange": "1d"
                    },
                    timeout=30
                )
                
                if response.status_code == 200:
                    data = response.json()
                    result_count = len(data.get("results", []))
                    validation_results["otrf_data_query"] = {
                        "status": "success",
                        "result_count": result_count,
                        "has_otrf_data": result_count > 0
                    }
                else:
                    validation_results["otrf_data_query"] = {
                        "status": "failed",
                        "status_code": response.status_code
                    }
            except Exception as e:
                validation_results["otrf_data_query"] = {"status": "error", "error": str(e)}
            
            # 3. Test correlation engine with OTRF incidents
            try:
                response = requests.get(
                    f"{self.service_urls['correlation_engine']}/api/incidents",
                    params={"time_range": "1h", "source": "otrf"},
                    timeout=30
                )
                
                if response.status_code == 200:
                    data = response.json()
                    incident_count = len(data.get("incidents", []))
                    validation_results["otrf_correlation"] = {
                        "status": "success",
                        "incident_count": incident_count,
                        "has_incidents": incident_count > 0
                    }
                else:
                    validation_results["otrf_correlation"] = {
                        "status": "failed",
                        "status_code": response.status_code
                    }
            except Exception as e:
                validation_results["otrf_correlation"] = {"status": "error", "error": str(e)}
            
            # 4. Test frontend dashboard access
            try:
                response = requests.get(f"{self.service_urls['frontend']}/", timeout=30)
                validation_results["frontend_access"] = {
                    "status": "accessible" if response.status_code == 200 else "inaccessible",
                    "status_code": response.status_code
                }
            except Exception as e:
                validation_results["frontend_access"] = {"status": "error", "error": str(e)}
            
            # 5. Test OpenSearch integration (if available)
            try:
                response = requests.get("https://localhost:9200/_cluster/health", 
                                      verify=False, auth=("admin", "admin"), timeout=10)
                if response.status_code == 200:
                    cluster_data = response.json()
                    validation_results["opensearch_cluster"] = {
                        "status": "healthy",
                        "cluster_status": cluster_data.get("status", "unknown"),
                        "number_of_nodes": cluster_data.get("number_of_nodes", 0)
                    }
                else:
                    validation_results["opensearch_cluster"] = {"status": "unavailable"}
            except Exception:
                validation_results["opensearch_cluster"] = {"status": "not_configured"}
            
            end_time = time.time()
            
            # Calculate overall health score
            health_checks = [
                validation_results.get("ingestion_health", {}).get("status") == "healthy",
                validation_results.get("otrf_data_query", {}).get("has_otrf_data", False),
                validation_results.get("otrf_correlation", {}).get("status") == "success",
                validation_results.get("frontend_access", {}).get("status") == "accessible"
            ]
            
            health_score = (sum(health_checks) / len(health_checks)) * 100
            
            print(f"📊 Platform Health Score: {health_score:.1f}%")
            
            for check, result in validation_results.items():
                status = result.get("status", "unknown")
                icon = "✅" if status in ["healthy", "success", "accessible"] else "❌"
                print(f"   {icon} {check}: {status}")
            
            return {
                "status": "success" if health_score >= 75 else "degraded",
                "execution_time": end_time - start_time,
                "health_score": health_score,
                "validation_results": validation_results
            }
            
        except Exception as e:
            print(f"❌ Error during platform validation: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "execution_time": time.time() - start_time
            }
    
    async def run_comprehensive_test(self, 
                                   max_datasets: Optional[int] = None,
                                   skip_phases: Optional[List[str]] = None) -> Dict[str, Any]:
        """Run comprehensive OTRF testing"""
        
        print("🚀 STARTING COMPREHENSIVE OTRF SECURITY DATASETS TESTING")
        print("="*80)
        print(f"📅 Test Start Time: {datetime.now().isoformat()}")
        print(f"📂 OTRF Path: {self.otrf_path}")
        print(f"🌐 SecureWatch URL: {self.securewatch_base_url}")
        if max_datasets:
            print(f"📊 Max Datasets: {max_datasets}")
        if skip_phases:
            print(f"⏭️  Skipping Phases: {skip_phases}")
        print("="*80)
        
        self.overall_start_time = time.time()
        skip_phases = skip_phases or []
        
        # Phase 1: Prerequisites check
        print("\n🔍 Checking prerequisites...")
        if not await self.check_prerequisites():
            print("❌ Prerequisites not met. Please resolve issues before running tests.")
            return {"status": "failed", "error": "Prerequisites not met"}
        
        # Phase 2: Data Ingestion
        if "ingestion" not in skip_phases:
            self.test_results["ingestion"] = await self.run_ingestion_test(max_datasets)
        else:
            print("\n⏭️  Skipping ingestion phase")
        
        # Phase 3: KQL Testing  
        if "kql" not in skip_phases:
            self.test_results["kql"] = await self.run_kql_test()
        else:
            print("\n⏭️  Skipping KQL testing phase")
        
        # Phase 4: Correlation Testing
        if "correlation" not in skip_phases:
            self.test_results["correlation"] = await self.run_correlation_test()
        else:
            print("\n⏭️  Skipping correlation testing phase")
        
        # Phase 5: Analytics Testing
        if "analytics" not in skip_phases:
            self.test_results["analytics"] = await self.run_analytics_test()
        else:
            print("\n⏭️  Skipping analytics testing phase")
        
        # Phase 6: Platform Validation
        if "platform" not in skip_phases:
            self.test_results["platform_validation"] = await self.run_platform_validation()
        else:
            print("\n⏭️  Skipping platform validation phase")
        
        self.overall_end_time = time.time()
        
        # Generate comprehensive report
        report = self._generate_comprehensive_report()
        
        # Save results
        self._save_comprehensive_results(report)
        
        # Print final summary
        self._print_final_summary(report)
        
        return report
    
    def _generate_comprehensive_report(self) -> Dict[str, Any]:
        """Generate comprehensive test report"""
        
        total_time = self.overall_end_time - self.overall_start_time
        
        # Calculate overall success metrics
        phase_results = []
        for phase, result in self.test_results.items():
            if result:
                status = result.get("status", "unknown")
                phase_results.append({
                    "phase": phase,
                    "status": status,
                    "execution_time": result.get("execution_time", 0),
                    "success": status in ["success", "healthy", "passed"]
                })
        
        successful_phases = len([p for p in phase_results if p["success"]])
        total_phases = len([p for p in phase_results if p])
        success_rate = (successful_phases / total_phases) * 100 if total_phases > 0 else 0
        
        return {
            "test_metadata": {
                "test_start_time": datetime.fromtimestamp(self.overall_start_time).isoformat(),
                "test_end_time": datetime.fromtimestamp(self.overall_end_time).isoformat(),
                "total_execution_time": total_time,
                "otrf_path": self.otrf_path,
                "securewatch_base_url": self.securewatch_base_url,
                "test_version": "1.0.0"
            },
            "overall_results": {
                "success_rate": success_rate,
                "total_phases": total_phases,
                "successful_phases": successful_phases,
                "failed_phases": total_phases - successful_phases,
                "overall_status": "success" if success_rate >= 80 else "failed"
            },
            "phase_results": phase_results,
            "detailed_results": self.test_results,
            "recommendations": self._generate_comprehensive_recommendations(),
            "next_steps": self._generate_next_steps()
        }
    
    def _generate_comprehensive_recommendations(self) -> List[str]:
        """Generate comprehensive recommendations"""
        recommendations = []
        
        # Check ingestion results
        if self.test_results.get("ingestion"):
            ingestion = self.test_results["ingestion"]
            if ingestion.get("status") != "success":
                recommendations.append("Fix data ingestion issues to ensure OTRF datasets are properly processed")
        
        # Check KQL results
        if self.test_results.get("kql"):
            kql = self.test_results["kql"]
            if kql.get("test_summary", {}).get("success_rate", 0) < 80:
                recommendations.append("Improve KQL engine performance and query accuracy")
        
        # Check correlation results
        if self.test_results.get("correlation"):
            correlation = self.test_results["correlation"]
            if correlation.get("correlation_effectiveness", {}).get("detection_rate", 0) < 70:
                recommendations.append("Enhance correlation rules to improve threat detection rates")
        
        # Check analytics results
        if self.test_results.get("analytics"):
            analytics = self.test_results["analytics"]
            if analytics.get("success_rate", 0) < 70:
                recommendations.append("Fix analytics endpoints and visualization components")
        
        # Check platform validation
        if self.test_results.get("platform_validation"):
            platform = self.test_results["platform_validation"]
            if platform.get("health_score", 0) < 80:
                recommendations.append("Address platform integration issues to improve overall health")
        
        return recommendations
    
    def _generate_next_steps(self) -> List[str]:
        """Generate next steps based on results"""
        next_steps = []
        
        overall_success = self._calculate_overall_success()
        
        if overall_success >= 90:
            next_steps.extend([
                "Consider implementing continuous OTRF dataset testing in CI/CD pipeline",
                "Expand testing to include additional attack scenarios and techniques",
                "Set up automated performance monitoring and alerting"
            ])
        elif overall_success >= 70:
            next_steps.extend([
                "Address failing test cases to improve platform reliability",
                "Optimize performance bottlenecks identified during testing",
                "Review and update correlation rules based on test results"
            ])
        else:
            next_steps.extend([
                "Prioritize fixing critical failures in data ingestion and core functionality",
                "Conduct detailed analysis of failed test cases",
                "Consider reviewing platform architecture and implementation"
            ])
        
        return next_steps
    
    def _calculate_overall_success(self) -> float:
        """Calculate overall success percentage"""
        phase_results = []
        for result in self.test_results.values():
            if result:
                status = result.get("status", "unknown")
                if status in ["success", "passed"]:
                    phase_results.append(100)
                elif status == "degraded":
                    phase_results.append(50)
                else:
                    phase_results.append(0)
        
        return sum(phase_results) / len(phase_results) if phase_results else 0
    
    def _save_comprehensive_results(self, report: Dict[str, Any]) -> None:
        """Save comprehensive test results"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"comprehensive_otrf_test_report_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        print(f"\n📄 Comprehensive test report saved to: {filename}")
    
    def _print_final_summary(self, report: Dict[str, Any]) -> None:
        """Print final test summary"""
        print("\n" + "="*80)
        print("🎯 COMPREHENSIVE OTRF TESTING - FINAL SUMMARY")
        print("="*80)
        
        overall = report["overall_results"]
        metadata = report["test_metadata"]
        
        print(f"📅 Test Duration: {metadata['total_execution_time']:.1f} seconds")
        print(f"📊 Overall Success Rate: {overall['success_rate']:.1f}%")
        print(f"✅ Successful Phases: {overall['successful_phases']}/{overall['total_phases']}")
        print(f"🎯 Overall Status: {overall['overall_status'].upper()}")
        
        print(f"\n📋 Phase Results:")
        for phase_result in report["phase_results"]:
            status_icon = "✅" if phase_result["success"] else "❌"
            print(f"   {status_icon} {phase_result['phase'].title()}: {phase_result['status']} ({phase_result['execution_time']:.1f}s)")
        
        if report["recommendations"]:
            print(f"\n💡 Recommendations:")
            for i, rec in enumerate(report["recommendations"], 1):
                print(f"   {i}. {rec}")
        
        if report["next_steps"]:
            print(f"\n🚀 Next Steps:")
            for i, step in enumerate(report["next_steps"], 1):
                print(f"   {i}. {step}")
        
        print("\n" + "="*80)
        if overall["success_rate"] >= 80:
            print("🎉 OTRF testing completed successfully! SecureWatch is ready for production.")
        else:
            print("⚠️  OTRF testing identified issues. Please review and address recommendations.")
        print("="*80)

async def main():
    """Main execution function"""
    parser = argparse.ArgumentParser(description="Comprehensive OTRF Security Datasets Testing for SecureWatch")
    parser.add_argument("--otrf-path", default="/tmp/Security-Datasets",
                       help="Path to OTRF Security-Datasets repository")
    parser.add_argument("--securewatch-url", default="http://localhost:4000",
                       help="SecureWatch platform base URL")
    parser.add_argument("--max-datasets", type=int,
                       help="Maximum number of datasets to process in ingestion phase")
    parser.add_argument("--skip-phases", nargs="+", 
                       choices=["ingestion", "kql", "correlation", "analytics", "platform"],
                       help="Skip specific testing phases")
    parser.add_argument("--parallel", action="store_true", default=True,
                       help="Enable parallel execution where possible")
    
    args = parser.parse_args()
    
    # Initialize orchestrator
    orchestrator = OTRFTestOrchestrator(
        otrf_path=args.otrf_path,
        securewatch_base_url=args.securewatch_url,
        parallel_execution=args.parallel
    )
    
    try:
        # Run comprehensive test
        report = await orchestrator.run_comprehensive_test(
            max_datasets=args.max_datasets,
            skip_phases=args.skip_phases
        )
        
        # Exit with appropriate code
        if report["overall_results"]["overall_status"] == "success":
            sys.exit(0)
        else:
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n🛑 Testing interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"❌ Critical error during testing: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())