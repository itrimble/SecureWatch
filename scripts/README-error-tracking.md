# SecureWatch Error Tracking System

A comprehensive error tracking system for managing and troubleshooting unresolved issues during development.

## Files

- **`error-tracking.json`** - Main data file containing all tracked errors
- **`scripts/error-tracker.js`** - CLI tool for managing errors
- **`scripts/README-error-tracking.md`** - This documentation

## Quick Start

```bash
# Add a new error
node scripts/error-tracker.js add --title "Build fails on TypeScript compilation" --description "tsc compilation fails with type errors" --category build --priority high

# List all open errors
node scripts/error-tracker.js list --status open

# Update an error status
node scripts/error-tracker.js update <error-id> --status investigating --notes "Looking into TypeScript config"

# Resolve an error
node scripts/error-tracker.js resolve <error-id> --notes "Fixed by updating tsconfig.json"

# View statistics
node scripts/error-tracker.js stats

# Export data
node scripts/error-tracker.js export --format csv
```

## Commands

### Add Error
```bash
node scripts/error-tracker.js add \
  --title "Error title" \
  --description "Detailed description" \
  --category <category> \
  --priority <priority> \
  --environment <environment> \
  --stack "Stack trace" \
  --workaround "Temporary solution"
```

**Categories:** build, runtime, dependency, configuration, network, database, authentication, ui, performance, testing, deployment, integration

**Priorities:** critical, high, medium, low

**Environments:** development, staging, production

### List Errors
```bash
# List all errors
node scripts/error-tracker.js list

# Filter by status
node scripts/error-tracker.js list --status open
node scripts/error-tracker.js list --status resolved

# Filter by priority
node scripts/error-tracker.js list --priority critical

# Filter by category
node scripts/error-tracker.js list --category build
```

### Update Error
```bash
node scripts/error-tracker.js update <error-id> \
  --status <new-status> \
  --priority <new-priority> \
  --notes "Update notes"
```

**Statuses:** open, investigating, resolved, deferred

### Get Error Details
```bash
node scripts/error-tracker.js get <error-id>
```

### Resolve Error
```bash
node scripts/error-tracker.js resolve <error-id> --notes "How it was resolved"
```

### Statistics
```bash
node scripts/error-tracker.js stats
```

### Export Data
```bash
# Export as JSON
node scripts/error-tracker.js export --format json

# Export as CSV
node scripts/error-tracker.js export --format csv
```

## Error Structure

Each error contains:

- **Basic Info:** ID, title, description, category, priority, status
- **Tracking:** Date reported/resolved, reported by, assigned to
- **Technical:** Environment, affected components, stack trace
- **Reproduction:** Steps to reproduce, expected vs actual behavior
- **Solutions:** Workaround, resolution notes
- **Metadata:** Related issues, tags, investigation notes

## Integration with Development Workflow

### During Development
```bash
# When you encounter an error that can't be immediately fixed
node scripts/error-tracker.js add \
  --title "Kafka connection timeout in streams processor" \
  --description "KafkaStreamProcessor fails to connect to broker after 30s" \
  --category network \
  --priority high \
  --stack "Error: Connection timeout..." \
  --workaround "Restart Docker containers"
```

### During TaskMaster Workflow
```bash
# Before starting a new task
node scripts/error-tracker.js list --status open --priority critical
node scripts/error-tracker.js list --status open --priority high

# After completing a task
node scripts/error-tracker.js update <error-id> --status resolved --notes "Fixed in Task 3.8"
```

### Regular Maintenance
```bash
# Weekly error review
node scripts/error-tracker.js stats
node scripts/error-tracker.js list --status investigating

# Monthly export for analysis
node scripts/error-tracker.js export --format csv
```

## Examples

### Example 1: Build Error
```bash
node scripts/error-tracker.js add \
  --title "TypeScript compilation fails in log-ingestion" \
  --description "Property 'compression' does not exist on type 'SerializationConfig'" \
  --category build \
  --priority high \
  --environment development \
  --stack "src/serialization/serialization-manager.ts(65,5): error TS2339"
```

### Example 2: Runtime Error
```bash
node scripts/error-tracker.js add \
  --title "Kafka producer connection refused" \
  --description "Unable to connect to Kafka broker on localhost:9092" \
  --category network \
  --priority critical \
  --environment development \
  --workaround "Start Kafka with docker-compose up kafka"
```

### Example 3: Performance Issue
```bash
node scripts/error-tracker.js add \
  --title "Stream processing latency >100ms" \
  --description "LogEnrichmentProcessor taking too long per event" \
  --category performance \
  --priority medium \
  --environment development
```

## Best Practices

1. **Immediate Logging:** Log errors as soon as you encounter them, even if you plan to fix them later
2. **Detailed Descriptions:** Include enough context for future troubleshooting
3. **Proper Categorization:** Use consistent categories for better filtering
4. **Regular Updates:** Update status and add notes as you investigate
5. **Resolution Documentation:** Always document how errors were resolved
6. **Periodic Review:** Review open errors weekly to prevent accumulation

## Integration with Claude Code

The error tracker integrates seamlessly with your development workflow:

```bash
# In any Claude Code session, you can:
# 1. Add errors encountered during development
# 2. Check existing errors before starting new work
# 3. Update errors as you resolve them
# 4. Export data for analysis

# Example workflow:
node scripts/error-tracker.js list --status open --priority high
# ... work on fixes ...
node scripts/error-tracker.js resolve abc123 --notes "Updated Kafka config in docker-compose.yml"
```

This system ensures no errors are forgotten and provides a comprehensive history of issues and their resolutions for the SecureWatch project.