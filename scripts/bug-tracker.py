#!/usr/bin/env python3
"""
SecureWatch Bug Tracker Management System
Provides programmatic access to bug tracking with JSON persistence.
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum

class BugStatus(Enum):
    OPEN = "Open"
    IN_PROGRESS = "In Progress" 
    FIXED = "Fixed"
    CLOSED = "Closed"
    WONT_FIX = "Won't Fix"

class Priority(Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"

@dataclass
class Bug:
    id: str
    title: str
    description: str
    steps_to_reproduce: List[str]
    expected_result: str
    actual_result: str
    environment: str
    priority: Priority
    status: BugStatus
    component: str
    assigned_to: str
    date_reported: str
    date_resolved: Optional[str] = None
    fix_details: Optional[str] = None
    tags: List[str] = None
    
    def __post_init__(self):
        if self.tags is None:
            self.tags = []

class BugTracker:
    def __init__(self, data_file: str = "bug_tracker.json"):
        self.data_file = data_file
        self.bugs: List[Bug] = []
        self.load_bugs()
    
    def load_bugs(self):
        """Load bugs from JSON file"""
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, 'r') as f:
                    data = json.load(f)
                    self.bugs = []
                    for bug_data in data:
                        # Convert string enums back to enum objects
                        bug_data['priority'] = Priority(bug_data['priority'])
                        bug_data['status'] = BugStatus(bug_data['status'])
                        self.bugs.append(Bug(**bug_data))
            except (FileNotFoundError, json.JSONDecodeError, KeyError) as e:
                print(f"Warning: Could not load bugs from {self.data_file}: {e}")
                self.bugs = []
    
    def save_bugs(self):
        """Save bugs to JSON file"""
        try:
            # Convert Bug objects to dictionaries with enum values as strings
            data = []
            for bug in self.bugs:
                bug_dict = asdict(bug)
                bug_dict['priority'] = bug.priority.value
                bug_dict['status'] = bug.status.value
                data.append(bug_dict)
            
            with open(self.data_file, 'w') as f:
                json.dump(data, f, indent=2, default=str)
        except Exception as e:
            print(f"Error saving bugs to {self.data_file}: {e}")
    
    def add_bug(self, bug: Bug) -> bool:
        """Add a new bug to the tracker"""
        # Check if bug ID already exists
        if any(b.id == bug.id for b in self.bugs):
            print(f"Bug with ID {bug.id} already exists")
            return False
        
        self.bugs.append(bug)
        self.save_bugs()
        print(f"Added bug {bug.id}: {bug.title}")
        return True
    
    def update_bug_status(self, bug_id: str, status: BugStatus, fix_details: str = None) -> bool:
        """Update the status of a bug"""
        for bug in self.bugs:
            if bug.id == bug_id:
                old_status = bug.status
                bug.status = status
                
                if status == BugStatus.FIXED or status == BugStatus.CLOSED:
                    bug.date_resolved = datetime.now().strftime("%Y-%m-%d")
                    if fix_details:
                        bug.fix_details = fix_details
                
                self.save_bugs()
                print(f"Updated bug {bug_id} status: {old_status.value} → {status.value}")
                return True
        
        print(f"Bug {bug_id} not found")
        return False
    
    def get_bug(self, bug_id: str) -> Optional[Bug]:
        """Get a specific bug by ID"""
        for bug in self.bugs:
            if bug.id == bug_id:
                return bug
        return None
    
    def list_bugs(self, status: BugStatus = None, priority: Priority = None) -> List[Bug]:
        """List bugs with optional filtering"""
        filtered_bugs = self.bugs
        
        if status:
            filtered_bugs = [b for b in filtered_bugs if b.status == status]
        
        if priority:
            filtered_bugs = [b for b in filtered_bugs if b.priority == priority]
        
        return filtered_bugs
    
    def get_summary(self) -> Dict[str, Any]:
        """Get bug tracker summary statistics"""
        total = len(self.bugs)
        
        status_counts = {}
        for status in BugStatus:
            status_counts[status.value] = len([b for b in self.bugs if b.status == status])
        
        priority_counts = {}
        for priority in Priority:
            priority_counts[priority.value] = len([b for b in self.bugs if b.priority == priority])
        
        return {
            "total_bugs": total,
            "status_breakdown": status_counts,
            "priority_breakdown": priority_counts,
            "open_bugs": status_counts.get("Open", 0) + status_counts.get("In Progress", 0)
        }
    
    def generate_report(self) -> str:
        """Generate a text report of all bugs"""
        summary = self.get_summary()
        report = []
        
        report.append("=" * 50)
        report.append("SECUREWATCH BUG TRACKER REPORT")
        report.append("=" * 50)
        report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("")
        
        # Summary
        report.append("SUMMARY:")
        report.append(f"Total Bugs: {summary['total_bugs']}")
        report.append(f"Open Issues: {summary['open_bugs']}")
        report.append("")
        
        # Status breakdown
        report.append("STATUS BREAKDOWN:")
        for status, count in summary['status_breakdown'].items():
            report.append(f"  {status}: {count}")
        report.append("")
        
        # Priority breakdown
        report.append("PRIORITY BREAKDOWN:")
        for priority, count in summary['priority_breakdown'].items():
            report.append(f"  {priority}: {count}")
        report.append("")
        
        # Bug details
        report.append("BUG DETAILS:")
        report.append("-" * 50)
        
        for bug in sorted(self.bugs, key=lambda x: (x.priority.value, x.date_reported)):
            status_icon = "🔴" if bug.status == BugStatus.OPEN else "🔄" if bug.status == BugStatus.IN_PROGRESS else "✅"
            priority_icon = {"Critical": "🔴", "High": "🟡", "Medium": "🟢", "Low": "🔵"}[bug.priority.value]
            
            report.append(f"{status_icon} {bug.id}: {bug.title} {priority_icon}")
            report.append(f"   Status: {bug.status.value}")
            report.append(f"   Priority: {bug.priority.value}")
            report.append(f"   Component: {bug.component}")
            report.append(f"   Reported: {bug.date_reported}")
            if bug.date_resolved:
                report.append(f"   Resolved: {bug.date_resolved}")
            report.append("")
        
        return "\n".join(report)

def create_sample_bugs():
    """Create sample bugs for demonstration"""
    tracker = BugTracker()
    
    # Sample bugs based on recent session
    bugs = [
        Bug(
            id="BUG-001",
            title="TypeError Failed to fetch in log-search component",
            description="Unhandled TypeError when search API is unavailable",
            steps_to_reproduce=[
                "Start frontend without search API running",
                "Navigate to log search page", 
                "Click search button"
            ],
            expected_result="Graceful error handling with user message",
            actual_result="Unhandled TypeError: Failed to fetch",
            environment="Next.js 15, macOS, Chrome",
            priority=Priority.CRITICAL,
            status=BugStatus.FIXED,
            component="frontend/components/log-search.tsx",
            assigned_to="Claude Code",
            date_reported="2025-06-03",
            date_resolved="2025-06-03",
            fix_details="Added environment variable for API URL, implemented graceful error handling",
            tags=["frontend", "api", "error-handling"]
        ),
        Bug(
            id="BUG-002", 
            title="KQL Engine build failures due to TypeScript errors",
            description="TypeScript compilation errors preventing package build",
            steps_to_reproduce=[
                "Run `pnpm run build` in packages/kql-engine",
                "Observe DTS generation failures"
            ],
            expected_result="Clean build with type definitions",
            actual_result="Build fails with TypeScript errors",
            environment="Node.js 24.1.0, TypeScript 5.x, tsup 8.5.0",
            priority=Priority.HIGH,
            status=BugStatus.IN_PROGRESS,
            component="packages/kql-engine",
            assigned_to="Development Team",
            date_reported="2025-06-03",
            fix_details="Disabled DTS generation temporarily",
            tags=["build", "typescript", "kql-engine"]
        ),
        Bug(
            id="BUG-003",
            title="Redis authentication failures in search API",
            description="Search API cannot connect to Redis due to missing password",
            steps_to_reproduce=[
                "Start search API service",
                "Observe Redis NOAUTH errors in logs"
            ],
            expected_result="Successful Redis connection",
            actual_result="Repeated 'NOAUTH Authentication required' errors",
            environment="Redis 7.x in Docker, ioredis client",
            priority=Priority.HIGH,
            status=BugStatus.OPEN,
            component="apps/search-api",
            assigned_to="DevOps Team",
            date_reported="2025-06-03",
            tags=["redis", "authentication", "infrastructure"]
        )
    ]
    
    for bug in bugs:
        tracker.add_bug(bug)
    
    return tracker

if __name__ == "__main__":
    # Example usage
    print("Creating SecureWatch Bug Tracker...")
    
    # Create sample data
    tracker = create_sample_bugs()
    
    # Generate report
    print("\n" + tracker.generate_report())
    
    # Example of updating a bug
    print("\nUpdating BUG-003 to Fixed...")
    tracker.update_bug_status("BUG-003", BugStatus.FIXED, "Added Redis password to environment configuration")
    
    # Show updated summary
    summary = tracker.get_summary()
    print(f"\nUpdated Summary: {summary['open_bugs']} open bugs out of {summary['total_bugs']} total")