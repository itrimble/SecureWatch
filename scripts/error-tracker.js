#!/usr/bin/env node

/**
 * SecureWatch Error Tracking System
 * 
 * Usage:
 *   node error-tracker.js add --title "Error title" --description "Error description" --category build --priority high
 *   node error-tracker.js list [--status open] [--priority critical]
 *   node error-tracker.js update <error-id> --status resolved
 *   node error-tracker.js resolve <error-id> --notes "How it was resolved"
 *   node error-tracker.js stats
 *   node error-tracker.js export [--format json|csv]
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const ERROR_TRACKING_FILE = path.join(__dirname, '..', 'error-tracking.json');

class ErrorTracker {
  constructor() {
    this.loadData();
  }

  loadData() {
    try {
      const data = fs.readFileSync(ERROR_TRACKING_FILE, 'utf8');
      this.data = JSON.parse(data);
    } catch (error) {
      console.error('Failed to load error tracking data:', error.message);
      process.exit(1);
    }
  }

  saveData() {
    try {
      this.data.metadata.lastUpdated = new Date().toISOString();
      this.updateStatistics();
      fs.writeFileSync(ERROR_TRACKING_FILE, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Failed to save error tracking data:', error.message);
      process.exit(1);
    }
  }

  updateStatistics() {
    const errors = this.data.errors;
    this.data.statistics = {
      totalErrors: errors.length,
      unresolvedErrors: errors.filter(e => e.status !== 'resolved').length,
      resolvedErrors: errors.filter(e => e.status === 'resolved').length,
      criticalErrors: errors.filter(e => e.priority === 'critical' && e.status !== 'resolved').length,
      highPriorityErrors: errors.filter(e => e.priority === 'high' && e.status !== 'resolved').length,
      mediumPriorityErrors: errors.filter(e => e.priority === 'medium' && e.status !== 'resolved').length,
      lowPriorityErrors: errors.filter(e => e.priority === 'low' && e.status !== 'resolved').length
    };
  }

  generateId() {
    return uuidv4().split('-')[0]; // Short UUID for readability
  }

  addError(options) {
    const errorId = options.id || this.generateId();
    const newError = {
      id: errorId,
      title: options.title,
      description: options.description || '',
      category: options.category || 'runtime',
      priority: options.priority || 'medium',
      status: 'open',
      dateReported: new Date().toISOString(),
      dateResolved: null,
      reportedBy: options.reportedBy || 'Claude Code Assistant',
      assignedTo: options.assignedTo || null,
      environment: options.environment || 'development',
      affectedComponents: options.affectedComponents || [],
      stackTrace: options.stackTrace || '',
      reproductionSteps: options.reproductionSteps || [],
      expectedBehavior: options.expectedBehavior || '',
      actualBehavior: options.actualBehavior || '',
      workaround: options.workaround || '',
      relatedIssues: options.relatedIssues || [],
      tags: options.tags || [],
      notes: []
    };

    // Add initial note if provided
    if (options.notes) {
      newError.notes.push({
        timestamp: new Date().toISOString(),
        author: options.reportedBy || 'Claude Code Assistant',
        content: options.notes
      });
    }

    this.data.errors.push(newError);
    this.saveData();

    console.log(`✅ Error added successfully with ID: ${errorId}`);
    return errorId;
  }

  listErrors(filters = {}) {
    let errors = this.data.errors;

    // Apply filters
    if (filters.status) {
      errors = errors.filter(e => e.status === filters.status);
    }
    if (filters.priority) {
      errors = errors.filter(e => e.priority === filters.priority);
    }
    if (filters.category) {
      errors = errors.filter(e => e.category === filters.category);
    }
    if (filters.assignedTo) {
      errors = errors.filter(e => e.assignedTo === filters.assignedTo);
    }

    if (errors.length === 0) {
      console.log('No errors found matching the specified criteria.');
      return;
    }

    console.log(`\n📋 Found ${errors.length} error(s):\n`);
    
    errors.forEach(error => {
      const priorityEmoji = {
        critical: '🔴',
        high: '🟠', 
        medium: '🟡',
        low: '🟢'
      };

      const statusEmoji = {
        open: '🔓',
        investigating: '🔍',
        resolved: '✅',
        deferred: '⏸️'
      };

      console.log(`${priorityEmoji[error.priority]} ${statusEmoji[error.status]} [${error.id}] ${error.title}`);
      console.log(`   Category: ${error.category} | Priority: ${error.priority} | Status: ${error.status}`);
      console.log(`   Reported: ${new Date(error.dateReported).toLocaleDateString()}`);
      if (error.assignedTo) {
        console.log(`   Assigned to: ${error.assignedTo}`);
      }
      if (error.description) {
        console.log(`   Description: ${error.description}`);
      }
      console.log('');
    });
  }

  updateError(errorId, updates) {
    const errorIndex = this.data.errors.findIndex(e => e.id === errorId);
    if (errorIndex === -1) {
      console.error(`❌ Error with ID ${errorId} not found`);
      return false;
    }

    const error = this.data.errors[errorIndex];
    
    // Update fields
    Object.keys(updates).forEach(key => {
      if (key === 'notes') {
        // Add note instead of replacing
        error.notes.push({
          timestamp: new Date().toISOString(),
          author: 'Claude Code Assistant',
          content: updates.notes
        });
      } else if (key === 'status' && updates.status === 'resolved') {
        error.status = 'resolved';
        error.dateResolved = new Date().toISOString();
      } else if (error.hasOwnProperty(key)) {
        error[key] = updates[key];
      }
    });

    this.saveData();
    console.log(`✅ Error ${errorId} updated successfully`);
    return true;
  }

  resolveError(errorId, resolutionNotes) {
    return this.updateError(errorId, {
      status: 'resolved',
      notes: `Resolution: ${resolutionNotes}`
    });
  }

  getError(errorId) {
    const error = this.data.errors.find(e => e.id === errorId);
    if (!error) {
      console.error(`❌ Error with ID ${errorId} not found`);
      return null;
    }

    console.log(`\n📄 Error Details [${error.id}]:`);
    console.log(`Title: ${error.title}`);
    console.log(`Description: ${error.description}`);
    console.log(`Category: ${error.category}`);
    console.log(`Priority: ${error.priority}`);
    console.log(`Status: ${error.status}`);
    console.log(`Reported: ${new Date(error.dateReported).toLocaleString()}`);
    console.log(`Reported by: ${error.reportedBy}`);
    
    if (error.assignedTo) {
      console.log(`Assigned to: ${error.assignedTo}`);
    }
    
    if (error.dateResolved) {
      console.log(`Resolved: ${new Date(error.dateResolved).toLocaleString()}`);
    }

    if (error.affectedComponents.length > 0) {
      console.log(`Affected components: ${error.affectedComponents.join(', ')}`);
    }

    if (error.reproductionSteps.length > 0) {
      console.log('\nReproduction steps:');
      error.reproductionSteps.forEach((step, index) => {
        console.log(`  ${index + 1}. ${step}`);
      });
    }

    if (error.expectedBehavior) {
      console.log(`\nExpected behavior: ${error.expectedBehavior}`);
    }

    if (error.actualBehavior) {
      console.log(`Actual behavior: ${error.actualBehavior}`);
    }

    if (error.workaround) {
      console.log(`\nWorkaround: ${error.workaround}`);
    }

    if (error.stackTrace) {
      console.log(`\nStack trace:\n${error.stackTrace}`);
    }

    if (error.tags.length > 0) {
      console.log(`\nTags: ${error.tags.join(', ')}`);
    }

    if (error.notes.length > 0) {
      console.log('\nNotes:');
      error.notes.forEach(note => {
        console.log(`  [${new Date(note.timestamp).toLocaleString()}] ${note.author}: ${note.content}`);
      });
    }

    console.log('');
    return error;
  }

  showStatistics() {
    const stats = this.data.statistics;
    
    console.log('\n📊 Error Tracking Statistics:');
    console.log(`Total errors: ${stats.totalErrors}`);
    console.log(`Unresolved: ${stats.unresolvedErrors}`);
    console.log(`Resolved: ${stats.resolvedErrors}`);
    console.log('\nBy Priority (unresolved):');
    console.log(`  🔴 Critical: ${stats.criticalErrors}`);
    console.log(`  🟠 High: ${stats.highPriorityErrors}`);
    console.log(`  🟡 Medium: ${stats.mediumPriorityErrors}`);
    console.log(`  🟢 Low: ${stats.lowPriorityErrors}`);

    // Show category breakdown
    const categoryStats = {};
    this.data.errors.forEach(error => {
      if (error.status !== 'resolved') {
        categoryStats[error.category] = (categoryStats[error.category] || 0) + 1;
      }
    });

    if (Object.keys(categoryStats).length > 0) {
      console.log('\nBy Category (unresolved):');
      Object.entries(categoryStats)
        .sort(([,a], [,b]) => b - a)
        .forEach(([category, count]) => {
          console.log(`  ${category}: ${count}`);
        });
    }
    console.log('');
  }

  exportData(format = 'json') {
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `error-tracking-export-${timestamp}.${format}`;
    const filepath = path.join(__dirname, '..', filename);

    if (format === 'json') {
      fs.writeFileSync(filepath, JSON.stringify(this.data, null, 2));
    } else if (format === 'csv') {
      const headers = [
        'ID', 'Title', 'Description', 'Category', 'Priority', 'Status', 
        'Date Reported', 'Date Resolved', 'Reported By', 'Assigned To',
        'Environment', 'Affected Components', 'Workaround'
      ];
      
      const csvData = [headers.join(',')];
      
      this.data.errors.forEach(error => {
        const row = [
          error.id,
          `"${error.title.replace(/"/g, '""')}"`,
          `"${error.description.replace(/"/g, '""')}"`,
          error.category,
          error.priority,
          error.status,
          error.dateReported,
          error.dateResolved || '',
          error.reportedBy,
          error.assignedTo || '',
          error.environment,
          `"${error.affectedComponents.join(', ')}"`,
          `"${error.workaround.replace(/"/g, '""')}"`
        ];
        csvData.push(row.join(','));
      });
      
      fs.writeFileSync(filepath, csvData.join('\n'));
    }

    console.log(`✅ Data exported to: ${filepath}`);
  }
}

// CLI interface
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const tracker = new ErrorTracker();

  if (!command) {
    console.log('Usage: node error-tracker.js <command> [options]');
    console.log('Commands: add, list, update, resolve, get, stats, export');
    console.log('Use --help with any command for detailed usage');
    return;
  }

  switch (command) {
    case 'add': {
      const title = args.find((arg, i) => args[i-1] === '--title') || 'Untitled Error';
      const description = args.find((arg, i) => args[i-1] === '--description') || '';
      const category = args.find((arg, i) => args[i-1] === '--category') || 'runtime';
      const priority = args.find((arg, i) => args[i-1] === '--priority') || 'medium';
      const environment = args.find((arg, i) => args[i-1] === '--environment') || 'development';
      const stackTrace = args.find((arg, i) => args[i-1] === '--stack') || '';
      const workaround = args.find((arg, i) => args[i-1] === '--workaround') || '';
      
      tracker.addError({
        title,
        description,
        category,
        priority,
        environment,
        stackTrace,
        workaround
      });
      break;
    }

    case 'list': {
      const status = args.find((arg, i) => args[i-1] === '--status');
      const priority = args.find((arg, i) => args[i-1] === '--priority');
      const category = args.find((arg, i) => args[i-1] === '--category');
      
      tracker.listErrors({ status, priority, category });
      break;
    }

    case 'update': {
      const errorId = args[1];
      if (!errorId) {
        console.error('❌ Error ID required');
        return;
      }
      
      const updates = {};
      if (args.includes('--status')) {
        updates.status = args[args.indexOf('--status') + 1];
      }
      if (args.includes('--priority')) {
        updates.priority = args[args.indexOf('--priority') + 1];
      }
      if (args.includes('--notes')) {
        updates.notes = args[args.indexOf('--notes') + 1];
      }
      
      tracker.updateError(errorId, updates);
      break;
    }

    case 'resolve': {
      const errorId = args[1];
      const notes = args.find((arg, i) => args[i-1] === '--notes') || 'Resolved';
      
      if (!errorId) {
        console.error('❌ Error ID required');
        return;
      }
      
      tracker.resolveError(errorId, notes);
      break;
    }

    case 'get': {
      const errorId = args[1];
      if (!errorId) {
        console.error('❌ Error ID required');
        return;
      }
      
      tracker.getError(errorId);
      break;
    }

    case 'stats': {
      tracker.showStatistics();
      break;
    }

    case 'export': {
      const format = args.find((arg, i) => args[i-1] === '--format') || 'json';
      tracker.exportData(format);
      break;
    }

    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('Available commands: add, list, update, resolve, get, stats, export');
  }
}

if (require.main === module) {
  main();
}

module.exports = ErrorTracker;