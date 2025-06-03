# Bug Management Integration Guide

## Overview
This guide explains how to integrate the SecureWatch bug tracking system with Claude Code for automatic bug discovery, tracking, and resolution.

## Quick Start

### 1. Initialize Bug Tracker
```bash
cd /Users/ian/Scripts/SecureWatch
python3 scripts/bug-tracker.py
```

### 2. Add New Bug
```python
from scripts.bug_tracker import BugTracker, Bug, Priority, BugStatus

tracker = BugTracker()
bug = Bug(
    id="BUG-004",
    title="New issue discovered",
    description="Description of the issue",
    steps_to_reproduce=["Step 1", "Step 2"],
    expected_result="What should happen",
    actual_result="What actually happens", 
    environment="Environment details",
    priority=Priority.MEDIUM,
    status=BugStatus.OPEN,
    component="component/path",
    assigned_to="Team Name",
    date_reported="2025-06-03"
)
tracker.add_bug(bug)
```

### 3. Update Bug Status
```python
tracker.update_bug_status("BUG-004", BugStatus.FIXED, "Fix description")
```

### 4. Generate Report
```python
print(tracker.generate_report())
```

## Claude Code Integration

### Memory Instructions
Add this to your Claude conversation for persistent bug tracking:

```
Remember: SecureWatch has a bug tracking system at scripts/bug-tracker.py and docs/bug-tracker.md. 

When you encounter or fix bugs:
1. Document them in the bug tracker
2. Update status as resolved
3. Include file paths and fix details
4. Generate reports for project updates

Current priority bugs to watch for:
- TypeScript compilation errors
- Service startup failures  
- API connection issues
- Authentication problems
```

### Auto-Discovery Prompts

Use these prompts with Claude to automatically discover and track bugs:

```
"Scan the codebase for potential bugs and add them to the bug tracker"

"Check recent error logs and create bug reports for any issues found"

"Review the current TODO list and convert any bug-related items to the bug tracker"

"Generate a bug status report for the current sprint"
```

## Integration with Development Workflow

### 1. Pre-commit Hook
Add to `.git/hooks/pre-commit`:
```bash
#!/bin/bash
python3 scripts/bug-tracker.py --check-critical
if [ $? -ne 0 ]; then
    echo "Critical bugs found. Please resolve before committing."
    exit 1
fi
```

### 2. CI/CD Integration
Add to build pipeline:
```yaml
- name: Check Bug Status
  run: |
    python3 scripts/bug-tracker.py --generate-report
    python3 scripts/bug-tracker.py --count-open
```

### 3. Issue Tracking Integration
Sync with GitHub Issues:
```python
# Example sync script
def sync_to_github():
    tracker = BugTracker()
    for bug in tracker.list_bugs(status=BugStatus.OPEN):
        # Create GitHub issue
        create_github_issue(bug.title, bug.description, bug.priority.value)
```

## Maintenance Commands

### Weekly Maintenance
```bash
# Generate weekly report
python3 scripts/bug-tracker.py --report --output weekly_report.txt

# Archive resolved bugs
python3 scripts/bug-tracker.py --archive-resolved

# Check for stale bugs
python3 scripts/bug-tracker.py --check-stale --days 30
```

### Monthly Maintenance  
```bash
# Full system health check
python3 scripts/bug-tracker.py --health-check

# Generate metrics dashboard
python3 scripts/bug-tracker.py --metrics --format json
```

## Best Practices

### Bug Reporting
1. **Clear Titles**: Use descriptive, searchable titles
2. **Detailed Steps**: Include exact reproduction steps
3. **Environment Info**: Specify OS, browser, versions
4. **Component Tags**: Tag bugs by affected components
5. **Priority Assessment**: Use priority levels consistently

### Status Management
1. **Regular Updates**: Update status weekly
2. **Fix Documentation**: Always include fix details
3. **Verification**: Mark bugs as verified after testing
4. **Closure**: Close bugs only after verification

### Integration Tips
1. **Consistent IDs**: Use BUG-XXX format for all bugs
2. **Component Mapping**: Map bugs to specific files/modules
3. **Tag Strategy**: Use consistent tags for filtering
4. **Automation**: Automate status updates where possible

## File Structure
```
SecureWatch/
├── docs/
│   └── bug-tracker.md          # Human-readable bug list
├── scripts/
│   ├── bug-tracker.py          # Bug management system
│   └── bug-management.md       # This guide
└── bug_tracker.json           # JSON persistence file
```

## Example Workflows

### Bug Discovery Workflow
1. Claude encounters an error during development
2. Automatically create bug report with file context
3. Assign priority based on error type
4. Tag with relevant components
5. Update project documentation

### Bug Resolution Workflow  
1. Developer fixes the issue
2. Update bug status to "Fixed"
3. Add fix details and file references
4. Run verification tests
5. Mark as "Closed" after verification

### Bug Review Workflow
1. Weekly review of all open bugs
2. Prioritize based on business impact
3. Assign to appropriate team members
4. Set target resolution dates
5. Track progress in standups

This system provides comprehensive bug tracking with Claude Code integration for the SecureWatch project.