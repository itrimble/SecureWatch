#!/usr/bin/env python3
"""
SecureWatch Test Tracker Management System
Provides programmatic access to test case tracking with JSON persistence.
Integrates with the existing bug tracking system.
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum

class TestStatus(Enum):
    PLANNED = "Planned"
    PASSING = "Passing"
    FAILING = "Failing"
    BLOCKED = "Blocked"
    SKIPPED = "Skipped"

class TestPriority(Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"

class TestType(Enum):
    UNIT = "Unit"
    E2E = "E2E"
    INTEGRATION = "Integration"
    API = "API"
    PERFORMANCE = "Performance"

@dataclass
class TestCase:
    id: str
    name: str
    description: str
    test_type: TestType
    module_path: str
    steps: List[str]
    expected_result: str
    actual_result: Optional[str]
    status: TestStatus
    priority: TestPriority
    environment: str
    date_created: str
    last_run: Optional[str] = None
    execution_time: Optional[float] = None
    related_bug_id: Optional[str] = None
    notes: Optional[str] = None
    tags: List[str] = None
    
    def __post_init__(self):
        if self.tags is None:
            self.tags = []

@dataclass
class TestSuite:
    id: str
    name: str
    description: str
    test_cases: List[str]  # List of test case IDs
    environment: str
    date_created: str
    last_run: Optional[str] = None
    total_tests: int = 0
    passing_tests: int = 0
    failing_tests: int = 0

class TestTracker:
    def __init__(self, data_file: str = "test_tracker.json"):
        self.data_file = data_file
        self.test_cases: List[TestCase] = []
        self.test_suites: List[TestSuite] = []
        self.load_data()
    
    def load_data(self):
        """Load test data from JSON file"""
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, 'r') as f:
                    data = json.load(f)
                    
                    # Load test cases
                    self.test_cases = []
                    for case_data in data.get('test_cases', []):
                        case_data['test_type'] = TestType(case_data['test_type'])
                        case_data['status'] = TestStatus(case_data['status'])
                        case_data['priority'] = TestPriority(case_data['priority'])
                        self.test_cases.append(TestCase(**case_data))
                    
                    # Load test suites
                    self.test_suites = []
                    for suite_data in data.get('test_suites', []):
                        self.test_suites.append(TestSuite(**suite_data))
                        
            except (FileNotFoundError, json.JSONDecodeError, KeyError) as e:
                print(f"Warning: Could not load test data from {self.data_file}: {e}")
                self.test_cases = []
                self.test_suites = []
    
    def save_data(self):
        """Save test data to JSON file"""
        try:
            # Convert objects to dictionaries
            test_cases_data = []
            for case in self.test_cases:
                case_dict = asdict(case)
                case_dict['test_type'] = case.test_type.value
                case_dict['status'] = case.status.value
                case_dict['priority'] = case.priority.value
                test_cases_data.append(case_dict)
            
            suites_data = [asdict(suite) for suite in self.test_suites]
            
            data = {
                'test_cases': test_cases_data,
                'test_suites': suites_data,
                'last_updated': datetime.now().isoformat()
            }
            
            with open(self.data_file, 'w') as f:
                json.dump(data, f, indent=2, default=str)
                
        except Exception as e:
            print(f"Error saving test data to {self.data_file}: {e}")
    
    def add_test_case(self, test_case: TestCase) -> bool:
        """Add a new test case"""
        # Check if test ID already exists
        if any(tc.id == test_case.id for tc in self.test_cases):
            print(f"Test case with ID {test_case.id} already exists")
            return False
        
        self.test_cases.append(test_case)
        self.save_data()
        print(f"Added test case {test_case.id}: {test_case.name}")
        return True
    
    def update_test_status(self, test_id: str, status: TestStatus, 
                          actual_result: str = None, execution_time: float = None) -> bool:
        """Update the status of a test case"""
        for test_case in self.test_cases:
            if test_case.id == test_id:
                old_status = test_case.status
                test_case.status = status
                test_case.last_run = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                
                if actual_result:
                    test_case.actual_result = actual_result
                if execution_time:
                    test_case.execution_time = execution_time
                
                self.save_data()
                print(f"Updated test {test_id} status: {old_status.value} → {status.value}")
                return True
        
        print(f"Test case {test_id} not found")
        return False
    
    def get_test_case(self, test_id: str) -> Optional[TestCase]:
        """Get a specific test case by ID"""
        for test_case in self.test_cases:
            if test_case.id == test_id:
                return test_case
        return None
    
    def list_test_cases(self, test_type: TestType = None, status: TestStatus = None, 
                       priority: TestPriority = None) -> List[TestCase]:
        """List test cases with optional filtering"""
        filtered_tests = self.test_cases
        
        if test_type:
            filtered_tests = [tc for tc in filtered_tests if tc.test_type == test_type]
        if status:
            filtered_tests = [tc for tc in filtered_tests if tc.status == status]
        if priority:
            filtered_tests = [tc for tc in filtered_tests if tc.priority == priority]
        
        return filtered_tests
    
    def get_test_summary(self) -> Dict[str, Any]:
        """Get test tracker summary statistics"""
        total_tests = len(self.test_cases)
        
        status_counts = {}
        for status in TestStatus:
            status_counts[status.value] = len([tc for tc in self.test_cases if tc.status == status])
        
        type_counts = {}
        for test_type in TestType:
            type_counts[test_type.value] = len([tc for tc in self.test_cases if tc.test_type == test_type])
        
        priority_counts = {}
        for priority in TestPriority:
            priority_counts[priority.value] = len([tc for tc in self.test_cases if tc.priority == priority])
        
        # Calculate success rate
        passing = status_counts.get("Passing", 0)
        executed = total_tests - status_counts.get("Planned", 0)
        success_rate = (passing / executed * 100) if executed > 0 else 0
        
        return {
            "total_tests": total_tests,
            "status_breakdown": status_counts,
            "type_breakdown": type_counts,
            "priority_breakdown": priority_counts,
            "success_rate": round(success_rate, 2),
            "executed_tests": executed
        }
    
    def generate_test_report(self) -> str:
        """Generate a detailed test report"""
        summary = self.get_test_summary()
        report = []
        
        report.append("=" * 60)
        report.append("SECUREWATCH TEST TRACKER REPORT")
        report.append("=" * 60)
        report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("")
        
        # Summary
        report.append("SUMMARY:")
        report.append(f"Total Test Cases: {summary['total_tests']}")
        report.append(f"Executed Tests: {summary['executed_tests']}")
        report.append(f"Success Rate: {summary['success_rate']}%")
        report.append("")
        
        # Status breakdown
        report.append("STATUS BREAKDOWN:")
        for status, count in summary['status_breakdown'].items():
            report.append(f"  {status}: {count}")
        report.append("")
        
        # Type breakdown
        report.append("TEST TYPE BREAKDOWN:")
        for test_type, count in summary['type_breakdown'].items():
            report.append(f"  {test_type}: {count}")
        report.append("")
        
        # Priority breakdown
        report.append("PRIORITY BREAKDOWN:")
        for priority, count in summary['priority_breakdown'].items():
            report.append(f"  {priority}: {count}")
        report.append("")
        
        # Test case details
        report.append("TEST CASE DETAILS:")
        report.append("-" * 60)
        
        for test_case in sorted(self.test_cases, key=lambda x: (x.test_type.value, x.priority.value)):
            status_icon = {
                "Passing": "✅",
                "Failing": "❌", 
                "Planned": "📋",
                "Blocked": "🚫",
                "Skipped": "⏭️"
            }.get(test_case.status.value, "❓")
            
            priority_icon = {
                "Critical": "🔴",
                "High": "🟡", 
                "Medium": "🟢",
                "Low": "🔵"
            }.get(test_case.priority.value, "⚪")
            
            report.append(f"{status_icon} {test_case.id}: {test_case.name} {priority_icon}")
            report.append(f"   Type: {test_case.test_type.value}")
            report.append(f"   Status: {test_case.status.value}")
            report.append(f"   Priority: {test_case.priority.value}")
            report.append(f"   Module: {test_case.module_path}")
            if test_case.last_run:
                report.append(f"   Last Run: {test_case.last_run}")
            if test_case.execution_time:
                report.append(f"   Execution Time: {test_case.execution_time}s")
            if test_case.related_bug_id:
                report.append(f"   Related Bug: {test_case.related_bug_id}")
            report.append("")
        
        return "\n".join(report)
    
    def run_test_suite(self, suite_id: str) -> Dict[str, Any]:
        """Simulate running a test suite and update results"""
        suite = next((s for s in self.test_suites if s.id == suite_id), None)
        if not suite:
            return {"error": f"Test suite {suite_id} not found"}
        
        # Update suite run time
        suite.last_run = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Count test results
        suite_tests = [tc for tc in self.test_cases if tc.id in suite.test_cases]
        suite.total_tests = len(suite_tests)
        suite.passing_tests = len([tc for tc in suite_tests if tc.status == TestStatus.PASSING])
        suite.failing_tests = len([tc for tc in suite_tests if tc.status == TestStatus.FAILING])
        
        self.save_data()
        
        return {
            "suite_id": suite_id,
            "total_tests": suite.total_tests,
            "passing_tests": suite.passing_tests,
            "failing_tests": suite.failing_tests,
            "success_rate": (suite.passing_tests / suite.total_tests * 100) if suite.total_tests > 0 else 0
        }

def create_sample_tests():
    """Create sample test cases for demonstration"""
    tracker = TestTracker()
    
    sample_tests = [
        TestCase(
            id="UT-001",
            name="log-search API Error Handling",
            description="Test graceful error handling when search API is unavailable",
            test_type=TestType.UNIT,
            module_path="frontend/components/log-search.tsx",
            steps=[
                "Mock fetch to throw TypeError",
                "Trigger search action", 
                "Verify error handling"
            ],
            expected_result="Graceful error message displayed to user",
            actual_result=None,
            status=TestStatus.PLANNED,
            priority=TestPriority.HIGH,
            environment="Jest + React Testing Library",
            date_created="2025-06-03",
            related_bug_id="BUG-001",
            tags=["frontend", "error-handling", "api"]
        ),
        TestCase(
            id="UT-002", 
            name="KQL Parser AST Generation",
            description="Test KQL query parsing into AST",
            test_type=TestType.UNIT,
            module_path="packages/kql-engine/src/parser/parser.ts",
            steps=[
                "Input valid KQL query",
                "Parse to AST",
                "Verify AST structure"
            ],
            expected_result="Correct AST object generated",
            actual_result=None,
            status=TestStatus.PLANNED,
            priority=TestPriority.MEDIUM,
            environment="Jest",
            date_created="2025-06-03",
            related_bug_id="BUG-002",
            tags=["kql-engine", "parser", "ast"]
        ),
        TestCase(
            id="E2E-001",
            name="Complete Search Flow",
            description="End-to-end test of search functionality",
            test_type=TestType.E2E,
            module_path="frontend/app/search",
            steps=[
                "Start all services (frontend, search-api, infrastructure)",
                "Navigate to search page",
                "Enter search query",
                "Submit search",
                "Verify results displayed"
            ],
            expected_result="Search results displayed correctly",
            actual_result=None,
            status=TestStatus.PLANNED,
            priority=TestPriority.CRITICAL,
            environment="Playwright + Docker Compose",
            date_created="2025-06-03",
            tags=["e2e", "search", "integration"]
        )
    ]
    
    for test in sample_tests:
        tracker.add_test_case(test)
    
    # Create a sample test suite
    sample_suite = TestSuite(
        id="SUITE-001",
        name="Core Functionality Suite",
        description="Tests for core search and display functionality",
        test_cases=["UT-001", "UT-002", "E2E-001"],
        environment="Full Stack",
        date_created="2025-06-03"
    )
    
    tracker.test_suites.append(sample_suite)
    tracker.save_data()
    
    return tracker

if __name__ == "__main__":
    print("Creating SecureWatch Test Tracker...")
    
    # Create sample data
    tracker = create_sample_tests()
    
    # Generate report
    print("\n" + tracker.generate_test_report())
    
    # Example of updating test status
    print("\nUpdating UT-001 to Passing...")
    tracker.update_test_status("UT-001", TestStatus.PASSING, 
                              "Error handling works correctly", 0.125)
    
    # Show updated summary
    summary = tracker.get_test_summary()
    print(f"\nUpdated Summary: {summary['success_rate']}% success rate, {summary['executed_tests']} executed")