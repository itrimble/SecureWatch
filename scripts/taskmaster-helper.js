#!/usr/bin/env node

/**
 * TaskMaster Helper Script
 * Provides utilities for managing TaskMaster tasks when MCP commands fail
 */

const fs = require('fs');
const path = require('path');

const TASKS_FILE = path.join(__dirname, '../tasks/tasks.json');

class TaskMasterHelper {
  constructor() {
    this.tasksData = this.loadTasks();
  }

  loadTasks() {
    try {
      const data = fs.readFileSync(TASKS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading tasks:', error.message);
      process.exit(1);
    }
  }

  saveTasks() {
    try {
      fs.writeFileSync(TASKS_FILE, JSON.stringify(this.tasksData, null, 2));
      console.log('✅ Tasks saved successfully');
    } catch (error) {
      console.error('Error saving tasks:', error.message);
      process.exit(1);
    }
  }

  findSubtask(subtaskId) {
    for (const task of this.tasksData.tasks) {
      if (task.subtasks) {
        const subtask = task.subtasks.find(s => s.id === subtaskId);
        if (subtask) {
          return { task, subtask };
        }
      }
    }
    return null;
  }

  updateSubtaskStatus(subtaskId, newStatus) {
    const result = this.findSubtask(subtaskId);
    if (!result) {
      console.error(`❌ Subtask ${subtaskId} not found`);
      return false;
    }

    const oldStatus = result.subtask.status;
    result.subtask.status = newStatus;
    
    console.log(`📝 Updated subtask ${subtaskId}:`);
    console.log(`   Title: ${result.subtask.title}`);
    console.log(`   Status: ${oldStatus} → ${newStatus}`);
    
    this.saveTasks();
    return true;
  }

  listSubtasks(taskId = null) {
    console.log('📋 TaskMaster Subtasks:');
    console.log('=' .repeat(60));
    
    for (const task of this.tasksData.tasks) {
      if (taskId && task.id !== parseInt(taskId)) continue;
      
      if (task.subtasks && task.subtasks.length > 0) {
        console.log(`\n🎯 Task ${task.id}: ${task.title}`);
        console.log(`   Status: ${task.status} | Priority: ${task.priority}`);
        
        for (const subtask of task.subtasks) {
          const statusEmoji = {
            'pending': '⏳',
            'in_progress': '🔄', 
            'done': '✅',
            'cancelled': '❌'
          }[subtask.status] || '❓';
          
          console.log(`   ${statusEmoji} ${subtask.id}: ${subtask.title} (${subtask.status})`);
        }
      }
    }
  }

  getTaskProgress(taskId = null) {
    const tasks = taskId ? 
      this.tasksData.tasks.filter(t => t.id === parseInt(taskId)) : 
      this.tasksData.tasks;

    for (const task of tasks) {
      if (!task.subtasks || task.subtasks.length === 0) continue;
      
      const total = task.subtasks.length;
      const completed = task.subtasks.filter(s => s.status === 'done').length;
      const inProgress = task.subtasks.filter(s => s.status === 'in_progress').length;
      const pending = task.subtasks.filter(s => s.status === 'pending').length;
      
      const progress = ((completed / total) * 100).toFixed(1);
      
      console.log(`\n📊 Task ${task.id}: ${task.title}`);
      console.log(`   Progress: ${progress}% (${completed}/${total} completed)`);
      console.log(`   ✅ Done: ${completed} | 🔄 In Progress: ${inProgress} | ⏳ Pending: ${pending}`);
      
      if (completed === total) {
        console.log('   🎉 All subtasks completed!');
      }
    }
  }
}

// CLI Interface
function main() {
  const helper = new TaskMasterHelper();
  const [,, command, ...args] = process.argv;

  switch (command) {
    case 'update':
      const [subtaskId, status] = args;
      if (!subtaskId || !status) {
        console.error('Usage: node taskmaster-helper.js update <subtaskId> <status>');
        console.error('Example: node taskmaster-helper.js update 1.5 done');
        process.exit(1);
      }
      helper.updateSubtaskStatus(subtaskId, status);
      break;

    case 'list':
      const [taskId] = args;
      helper.listSubtasks(taskId);
      break;

    case 'progress':
      const [progressTaskId] = args;
      helper.getTaskProgress(progressTaskId);
      break;

    case 'help':
    default:
      console.log('🛠️  TaskMaster Helper - Available Commands:');
      console.log('');
      console.log('  update <subtaskId> <status>  - Update subtask status');
      console.log('  list [taskId]                - List all subtasks or for specific task');
      console.log('  progress [taskId]            - Show task progress');
      console.log('  help                         - Show this help');
      console.log('');
      console.log('Examples:');
      console.log('  node taskmaster-helper.js update 1.5 done');
      console.log('  node taskmaster-helper.js list 1');
      console.log('  node taskmaster-helper.js progress');
      break;
  }
}

if (require.main === module) {
  main();
}

module.exports = TaskMasterHelper;