import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import knex, { Knex } from 'knex';
import axios from 'axios';
import { logger } from '../utils/logger';
import {
  Playbook,
  PlaybookSchema,
  PlaybookStep,
  PlaybookAction,
  PlaybookCondition,
  ExecutionContext,
  ExecutionContextSchema,
  PlaybookResult,
  PlaybookResultSchema,
  ActionResult,
  ActionResultSchema,
  DatabaseConfig,
  PlaybookExecutionError
} from '../types/incident-response.types';

interface PlaybookEngineConfig {
  database: DatabaseConfig;
  maxConcurrentExecutions: number;
  defaultTimeout: number; // milliseconds
  enableApprovalWorkflow: boolean;
  notificationWebhook?: string;
}

interface ActionHandler {
  execute(action: PlaybookAction, context: ExecutionContext): Promise<ActionResult>;
  validate?(action: PlaybookAction): boolean;
}

export class PlaybookEngine extends EventEmitter {
  private db: Knex;
  private config: PlaybookEngineConfig;
  private actionHandlers: Map<string, ActionHandler> = new Map();
  private activeExecutions: Map<string, ExecutionContext> = new Map();
  private pendingApprovals: Map<string, ExecutionContext> = new Map();

  constructor(config: PlaybookEngineConfig) {
    super();
    this.config = config;
    this.db = knex({
      client: config.database.type,
      connection: config.database.connection,
      useNullAsDefault: true
    });

    this.initializeActionHandlers();
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Playbook Engine');
    await this.createTables();
    await this.loadActivePlaybooks();
    await this.resumePendingExecutions();
    logger.info('Playbook Engine initialized successfully');
  }

  private async createTables(): Promise<void> {
    // Playbooks table
    if (!(await this.db.schema.hasTable('playbooks'))) {
      await this.db.schema.createTable('playbooks', (table) => {
        table.string('id').primary();
        table.string('name').notNullable();
        table.text('description');
        table.string('version').defaultTo('1.0');
        table.string('category');
        table.json('trigger_conditions');
        table.json('steps');
        table.boolean('approval_required').defaultTo(false);
        table.json('approvers');
        table.integer('timeout_minutes');
        table.boolean('enabled').defaultTo(true);
        table.json('tags');
        table.string('created_by').notNullable();
        table.dateTime('created_at').notNullable();
        table.dateTime('updated_at').notNullable();
        table.dateTime('last_executed');
        table.integer('execution_count').defaultTo(0);
        table.float('success_rate').defaultTo(0);
        table.json('metadata');
        
        table.index(['enabled']);
        table.index(['category']);
        table.index(['created_by']);
      });
    }

    // Playbook executions table
    if (!(await this.db.schema.hasTable('playbook_executions'))) {
      await this.db.schema.createTable('playbook_executions', (table) => {
        table.string('id').primary();
        table.string('playbook_id').notNullable().index();
        table.string('case_id');
        table.string('alert_id');
        table.string('triggered_by').notNullable();
        table.dateTime('triggered_at').notNullable();
        table.string('status', 20).notNullable().index(); // 'running', 'success', 'failure', 'pending_approval', 'cancelled'
        table.dateTime('started_at');
        table.dateTime('completed_at');
        table.integer('duration'); // milliseconds
        table.integer('steps_executed').defaultTo(0);
        table.integer('steps_succeeded').defaultTo(0);
        table.integer('steps_failed').defaultTo(0);
        table.json('step_results');
        table.json('errors');
        table.json('output');
        table.json('context');
        table.json('metadata');
        
        table.foreign('playbook_id').references('playbooks.id').onDelete('CASCADE');
        table.index(['status', 'triggered_at']);
        table.index(['case_id']);
        table.index(['triggered_by']);
      });
    }

    // Playbook approvals table
    if (!(await this.db.schema.hasTable('playbook_approvals'))) {
      await this.db.schema.createTable('playbook_approvals', (table) => {
        table.string('id').primary();
        table.string('execution_id').notNullable().index();
        table.string('approver_id').notNullable();
        table.string('status', 20).notNullable(); // 'pending', 'approved', 'rejected'
        table.dateTime('requested_at').notNullable();
        table.dateTime('responded_at');
        table.text('comments');
        table.json('metadata');
        
        table.foreign('execution_id').references('playbook_executions.id').onDelete('CASCADE');
        table.index(['status']);
        table.index(['approver_id', 'status']);
      });
    }

    // Playbook step executions table
    if (!(await this.db.schema.hasTable('playbook_step_executions'))) {
      await this.db.schema.createTable('playbook_step_executions', (table) => {
        table.string('id').primary();
        table.string('execution_id').notNullable().index();
        table.string('step_id').notNullable();
        table.string('step_name').notNullable();
        table.string('status', 20).notNullable(); // 'pending', 'running', 'success', 'failure', 'skipped'
        table.dateTime('started_at');
        table.dateTime('completed_at');
        table.integer('duration'); // milliseconds
        table.json('input');
        table.json('output');
        table.text('error_message');
        table.json('metadata');
        
        table.foreign('execution_id').references('playbook_executions.id').onDelete('CASCADE');
        table.index(['execution_id', 'step_id']);
        table.index(['status']);
      });
    }
  }

  private initializeActionHandlers(): void {
    // Notification handler
    this.actionHandlers.set('notification', {
      execute: async (action: PlaybookAction, context: ExecutionContext): Promise<ActionResult> => {
        try {
          const { channels, message, subject, recipients } = action.config;
          
          // Send notifications through various channels
          const results = [];
          for (const channel of channels || ['email']) {
            const result = await this.sendNotification(channel, {
              message,
              subject,
              recipients,
              context: {
                playbookName: await this.getPlaybookName(context.playbookId),
                executionId: context.executionId,
                caseId: context.caseId
              }
            });
            results.push(result);
          }

          return {
            success: true,
            output: { notificationResults: results },
            duration: 0
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            duration: 0
          };
        }
      }
    });

    // API call handler
    this.actionHandlers.set('api_call', {
      execute: async (action: PlaybookAction, context: ExecutionContext): Promise<ActionResult> => {
        const startTime = Date.now();
        try {
          const { url, method = 'GET', headers = {}, body, timeout = 30000 } = action.config;
          
          const response = await axios({
            url,
            method,
            headers,
            data: body,
            timeout,
            validateStatus: () => true // Don't throw on HTTP error status
          });

          const duration = Date.now() - startTime;
          const success = response.status >= 200 && response.status < 300;

          return {
            success,
            output: {
              status: response.status,
              headers: response.headers,
              data: response.data
            },
            error: success ? undefined : `HTTP ${response.status}: ${response.statusText}`,
            duration
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            duration: Date.now() - startTime
          };
        }
      }
    });

    // Enrichment handler
    this.actionHandlers.set('enrichment', {
      execute: async (action: PlaybookAction, context: ExecutionContext): Promise<ActionResult> => {
        try {
          const { indicators, sources = ['virustotal', 'misp'] } = action.config;
          
          // Mock enrichment - in production, this would call actual threat intel services
          const enrichmentResults = {};
          for (const indicator of indicators || []) {
            enrichmentResults[indicator] = {
              reputation: Math.random() > 0.7 ? 'malicious' : 'clean',
              confidence: Math.floor(Math.random() * 100),
              sources,
              lastSeen: new Date().toISOString()
            };
          }

          return {
            success: true,
            output: { enrichmentResults },
            duration: 1000
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            duration: 0
          };
        }
      }
    });

    // Isolation handler
    this.actionHandlers.set('isolation', {
      execute: async (action: PlaybookAction, context: ExecutionContext): Promise<ActionResult> => {
        try {
          const { targets, isolationType = 'network' } = action.config;
          
          // Mock isolation - in production, this would call endpoint protection APIs
          const isolationResults = [];
          for (const target of targets || []) {
            isolationResults.push({
              target,
              status: 'isolated',
              timestamp: new Date().toISOString(),
              type: isolationType
            });
          }

          return {
            success: true,
            output: { isolationResults },
            duration: 2000
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            duration: 0
          };
        }
      }
    });

    // Block IP handler
    this.actionHandlers.set('block_ip', {
      execute: async (action: PlaybookAction, context: ExecutionContext): Promise<ActionResult> => {
        try {
          const { ips, duration = 3600, reason } = action.config;
          
          // Mock IP blocking - in production, this would call firewall APIs
          const blockResults = [];
          for (const ip of ips || []) {
            blockResults.push({
              ip,
              status: 'blocked',
              duration,
              reason,
              timestamp: new Date().toISOString()
            });
          }

          return {
            success: true,
            output: { blockResults },
            duration: 1500
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            duration: 0
          };
        }
      }
    });

    // Disable user handler
    this.actionHandlers.set('disable_user', {
      execute: async (action: PlaybookAction, context: ExecutionContext): Promise<ActionResult> => {
        try {
          const { users, reason } = action.config;
          
          // Mock user disabling - in production, this would call identity management APIs
          const disableResults = [];
          for (const user of users || []) {
            disableResults.push({
              user,
              status: 'disabled',
              reason,
              timestamp: new Date().toISOString()
            });
          }

          return {
            success: true,
            output: { disableResults },
            duration: 1000
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            duration: 0
          };
        }
      }
    });

    // Quarantine handler
    this.actionHandlers.set('quarantine', {
      execute: async (action: PlaybookAction, context: ExecutionContext): Promise<ActionResult> => {
        try {
          const { files, reason } = action.config;
          
          // Mock file quarantine - in production, this would call antivirus APIs
          const quarantineResults = [];
          for (const file of files || []) {
            quarantineResults.push({
              file,
              status: 'quarantined',
              reason,
              timestamp: new Date().toISOString()
            });
          }

          return {
            success: true,
            output: { quarantineResults },
            duration: 2000
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            duration: 0
          };
        }
      }
    });

    // Evidence collection handler
    this.actionHandlers.set('collect_evidence', {
      execute: async (action: PlaybookAction, context: ExecutionContext): Promise<ActionResult> => {
        try {
          const { targets, collectionType = 'live-response' } = action.config;
          
          // Mock evidence collection - in production, this would trigger forensic tools
          const collectionResults = [];
          for (const target of targets || []) {
            collectionResults.push({
              target,
              collectionId: uuidv4(),
              status: 'initiated',
              type: collectionType,
              timestamp: new Date().toISOString()
            });
          }

          return {
            success: true,
            output: { collectionResults },
            duration: 5000
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            duration: 0
          };
        }
      }
    });

    // Custom handler for extensibility
    this.actionHandlers.set('custom', {
      execute: async (action: PlaybookAction, context: ExecutionContext): Promise<ActionResult> => {
        try {
          const { script, parameters } = action.config;
          
          // In production, this would execute custom scripts securely
          // For now, just return a success with the parameters
          return {
            success: true,
            output: { 
              script,
              parameters,
              result: 'Custom action executed successfully'
            },
            duration: 1000
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            duration: 0
          };
        }
      }
    });
  }

  // Playbook Management
  async createPlaybook(playbookData: Omit<Playbook, 'id' | 'createdAt' | 'updatedAt' | 'executionCount' | 'successRate'>): Promise<Playbook> {
    const now = new Date();
    const playbook: Playbook = {
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      executionCount: 0,
      successRate: 0,
      ...playbookData
    };

    const validatedPlaybook = PlaybookSchema.parse(playbook);

    await this.db('playbooks').insert({
      id: validatedPlaybook.id,
      name: validatedPlaybook.name,
      description: validatedPlaybook.description,
      version: validatedPlaybook.version,
      category: validatedPlaybook.category,
      trigger_conditions: JSON.stringify(validatedPlaybook.triggerConditions),
      steps: JSON.stringify(validatedPlaybook.steps),
      approval_required: validatedPlaybook.approvalRequired,
      approvers: JSON.stringify(validatedPlaybook.approvers),
      timeout_minutes: validatedPlaybook.timeoutMinutes,
      enabled: validatedPlaybook.enabled,
      tags: JSON.stringify(validatedPlaybook.tags),
      created_by: validatedPlaybook.createdBy,
      created_at: validatedPlaybook.createdAt,
      updated_at: validatedPlaybook.updatedAt,
      last_executed: validatedPlaybook.lastExecuted,
      execution_count: validatedPlaybook.executionCount,
      success_rate: validatedPlaybook.successRate,
      metadata: JSON.stringify(validatedPlaybook.metadata)
    });

    this.emit('playbook-created', { playbookId: validatedPlaybook.id, playbook: validatedPlaybook });

    logger.info(`Created playbook ${validatedPlaybook.id}: ${validatedPlaybook.name}`);
    return validatedPlaybook;
  }

  async getPlaybook(playbookId: string): Promise<Playbook | null> {
    const row = await this.db('playbooks').where('id', playbookId).first();
    if (!row) return null;

    return this.mapRowToPlaybook(row);
  }

  async updatePlaybook(playbookId: string, updates: Partial<Playbook>): Promise<Playbook | null> {
    const existing = await this.getPlaybook(playbookId);
    if (!existing) return null;

    const updated = { ...existing, ...updates, updatedAt: new Date() };
    const validated = PlaybookSchema.parse(updated);

    await this.db('playbooks')
      .where('id', playbookId)
      .update({
        name: validated.name,
        description: validated.description,
        version: validated.version,
        category: validated.category,
        trigger_conditions: JSON.stringify(validated.triggerConditions),
        steps: JSON.stringify(validated.steps),
        approval_required: validated.approvalRequired,
        approvers: JSON.stringify(validated.approvers),
        timeout_minutes: validated.timeoutMinutes,
        enabled: validated.enabled,
        tags: JSON.stringify(validated.tags),
        updated_at: validated.updatedAt,
        success_rate: validated.successRate,
        metadata: JSON.stringify(validated.metadata)
      });

    this.emit('playbook-updated', { playbookId, playbook: validated });
    return validated;
  }

  async deletePlaybook(playbookId: string): Promise<void> {
    await this.db('playbooks').where('id', playbookId).del();
    this.emit('playbook-deleted', { playbookId });
  }

  // Playbook Execution
  async executePlaybook(
    playbookId: string,
    context: {
      triggeredBy: string;
      caseId?: string;
      alertId?: string;
      variables?: Record<string, any>;
    }
  ): Promise<PlaybookResult> {
    const playbook = await this.getPlaybook(playbookId);
    if (!playbook) {
      throw new Error(`Playbook ${playbookId} not found`);
    }

    if (!playbook.enabled) {
      throw new Error(`Playbook ${playbookId} is disabled`);
    }

    // Check concurrent execution limit
    if (this.activeExecutions.size >= this.config.maxConcurrentExecutions) {
      throw new Error('Maximum concurrent executions reached');
    }

    // Create execution context
    const executionContext: ExecutionContext = {
      executionId: uuidv4(),
      playbookId,
      caseId: context.caseId,
      alertId: context.alertId,
      triggeredBy: context.triggeredBy,
      triggeredAt: new Date(),
      approved: !playbook.approvalRequired,
      variables: context.variables || {},
      stepResults: {},
      errors: []
    };

    const validatedContext = ExecutionContextSchema.parse(executionContext);
    this.activeExecutions.set(validatedContext.executionId, validatedContext);

    // Create execution record
    await this.createExecutionRecord(validatedContext, playbook);

    this.emit('playbook-started', { 
      executionId: validatedContext.executionId, 
      playbookId, 
      context: validatedContext 
    });

    try {
      // Check if approval is required
      if (playbook.approvalRequired && !validatedContext.approved) {
        await this.requestApproval(playbook, validatedContext);
        return {
          executionId: validatedContext.executionId,
          playbookId,
          status: 'pending_approval',
          startTime: validatedContext.triggeredAt,
          stepsExecuted: 0,
          stepsSucceeded: 0,
          stepsFailed: 0,
          stepResults: {},
          errors: [],
          output: {}
        };
      }

      // Execute playbook steps
      const result = await this.executeSteps(playbook, validatedContext);
      
      // Update statistics
      await this.updatePlaybookStatistics(playbookId, result.status === 'success');

      return result;
    } catch (error) {
      logger.error(`Playbook execution ${validatedContext.executionId} failed:`, error);
      
      const result: PlaybookResult = {
        executionId: validatedContext.executionId,
        playbookId,
        status: 'failure',
        startTime: validatedContext.triggeredAt,
        endTime: new Date(),
        duration: Date.now() - validatedContext.triggeredAt.getTime(),
        stepsExecuted: 0,
        stepsSucceeded: 0,
        stepsFailed: 1,
        stepResults: {},
        errors: [error.message],
        output: {}
      };

      await this.updateExecutionRecord(validatedContext.executionId, result);
      await this.updatePlaybookStatistics(playbookId, false);

      this.emit('playbook-failed', { 
        executionId: validatedContext.executionId, 
        playbookId, 
        error: error.message 
      });

      return result;
    } finally {
      this.activeExecutions.delete(validatedContext.executionId);
    }
  }

  private async executeSteps(playbook: Playbook, context: ExecutionContext): Promise<PlaybookResult> {
    const startTime = Date.now();
    let stepsExecuted = 0;
    let stepsSucceeded = 0;
    let stepsFailed = 0;
    const stepResults: Record<string, any> = {};
    const errors: string[] = [];

    // Sort steps by order
    const sortedSteps = [...playbook.steps].sort((a, b) => a.order - b.order);

    for (const step of sortedSteps) {
      if (!step.enabled) continue;

      // Check step condition
      if (step.condition && !this.evaluateCondition(step.condition, context)) {
        logger.debug(`Step ${step.id} condition not met, skipping`);
        continue;
      }

      try {
        stepsExecuted++;
        
        // Record step start
        await this.recordStepExecution(context.executionId, step, 'running');

        // Execute step action
        const stepResult = await this.executeAction(step.action, context);
        
        if (stepResult.success) {
          stepsSucceeded++;
          stepResults[step.id] = stepResult.output;
          context.stepResults[step.id] = stepResult.output;
          
          // Record step success
          await this.recordStepExecution(context.executionId, step, 'success', stepResult);

          // Handle success path
          if (step.onSuccess) {
            // In a more complex implementation, this would handle branching
            logger.debug(`Step ${step.id} succeeded, next: ${step.onSuccess}`);
          }
        } else {
          stepsFailed++;
          errors.push(`Step ${step.id}: ${stepResult.error}`);
          context.errors.push({
            stepId: step.id,
            error: stepResult.error || 'Unknown error',
            timestamp: new Date()
          });

          // Record step failure
          await this.recordStepExecution(context.executionId, step, 'failure', stepResult);

          // Handle failure path
          if (step.onFailure) {
            logger.debug(`Step ${step.id} failed, next: ${step.onFailure}`);
          } else if (!step.action.continueOnFailure) {
            // Stop execution if step fails and continueOnFailure is false
            break;
          }
        }

        // Handle step timeout
        if (step.timeout && stepResult.duration && stepResult.duration > step.timeout * 60 * 1000) {
          logger.warn(`Step ${step.id} exceeded timeout of ${step.timeout} minutes`);
        }

      } catch (error) {
        stepsFailed++;
        const errorMessage = error instanceof PlaybookExecutionError ? error.message : error.message;
        errors.push(`Step ${step.id}: ${errorMessage}`);
        
        context.errors.push({
          stepId: step.id,
          error: errorMessage,
          timestamp: new Date()
        });

        // Record step error
        await this.recordStepExecution(context.executionId, step, 'failure', {
          success: false,
          error: errorMessage,
          duration: 0
        });

        if (!step.action.continueOnFailure) {
          break;
        }
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    const status = stepsFailed === 0 ? 'success' : (stepsSucceeded > 0 ? 'partial' : 'failure');

    const result: PlaybookResult = {
      executionId: context.executionId,
      playbookId: context.playbookId,
      status,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      duration,
      stepsExecuted,
      stepsSucceeded,
      stepsFailed,
      stepResults,
      errors,
      output: context.stepResults
    };

    // Update execution record
    await this.updateExecutionRecord(context.executionId, result);

    this.emit('playbook-completed', { 
      executionId: context.executionId, 
      playbookId: context.playbookId, 
      result 
    });

    return result;
  }

  private evaluateCondition(condition: PlaybookCondition, context: ExecutionContext): boolean {
    const { field, operator, value } = condition;
    
    // Get field value from context
    let fieldValue;
    if (field.startsWith('variable.')) {
      const varName = field.substring(9);
      fieldValue = context.variables[varName];
    } else if (field.startsWith('step.')) {
      const stepId = field.substring(5);
      fieldValue = context.stepResults[stepId];
    } else {
      // Direct context field
      fieldValue = (context as any)[field];
    }

    // Evaluate condition
    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'not_equals':
        return fieldValue !== value;
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(value);
      case 'not_contains':
        return typeof fieldValue === 'string' && !fieldValue.includes(value);
      case 'greater_than':
        return Number(fieldValue) > Number(value);
      case 'less_than':
        return Number(fieldValue) < Number(value);
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(value) && !value.includes(fieldValue);
      case 'regex':
        return typeof fieldValue === 'string' && new RegExp(value).test(fieldValue);
      default:
        logger.warn(`Unknown condition operator: ${operator}`);
        return false;
    }
  }

  private async executeAction(action: PlaybookAction, context: ExecutionContext): Promise<ActionResult> {
    const handler = this.actionHandlers.get(action.type);
    if (!handler) {
      throw new PlaybookExecutionError(
        `No handler found for action type: ${action.type}`,
        'unknown',
        context.executionId
      );
    }

    // Validate action if handler has validation
    if (handler.validate && !handler.validate(action)) {
      throw new PlaybookExecutionError(
        `Action validation failed for type: ${action.type}`,
        'unknown',
        context.executionId
      );
    }

    const startTime = Date.now();
    let result: ActionResult;

    try {
      // Set timeout for action execution
      const timeout = action.timeout || this.config.defaultTimeout;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Action timeout')), timeout);
      });

      result = await Promise.race([
        handler.execute(action, context),
        timeoutPromise
      ]);

      result.duration = Date.now() - startTime;
    } catch (error) {
      result = {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };

      // Retry logic
      if (action.retries > 0) {
        logger.info(`Retrying action ${action.type}, attempts remaining: ${action.retries}`);
        
        const retryAction = { ...action, retries: action.retries - 1 };
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        
        return this.executeAction(retryAction, context);
      }
    }

    return ActionResultSchema.parse(result);
  }

  // Approval Workflow
  private async requestApproval(playbook: Playbook, context: ExecutionContext): Promise<void> {
    this.pendingApprovals.set(context.executionId, context);

    // Create approval records for each approver
    for (const approverId of playbook.approvers) {
      await this.db('playbook_approvals').insert({
        id: uuidv4(),
        execution_id: context.executionId,
        approver_id: approverId,
        status: 'pending',
        requested_at: new Date(),
        metadata: JSON.stringify({})
      });
    }

    // Send approval notifications
    await this.sendApprovalNotifications(playbook, context);

    this.emit('approval-required', {
      executionId: context.executionId,
      playbookId: context.playbookId,
      approvers: playbook.approvers
    });

    // Set approval timeout
    if (playbook.timeoutMinutes) {
      setTimeout(async () => {
        if (this.pendingApprovals.has(context.executionId)) {
          await this.handleApprovalTimeout(context.executionId);
        }
      }, playbook.timeoutMinutes * 60 * 1000);
    }
  }

  async approvePlaybook(executionId: string, approverId: string, comments?: string): Promise<void> {
    const context = this.pendingApprovals.get(executionId);
    if (!context) {
      throw new Error(`No pending approval found for execution ${executionId}`);
    }

    // Update approval record
    await this.db('playbook_approvals')
      .where({ execution_id: executionId, approver_id: approverId })
      .update({
        status: 'approved',
        responded_at: new Date(),
        comments
      });

    // Check if all required approvals are received
    const pendingApprovals = await this.db('playbook_approvals')
      .where({ execution_id: executionId, status: 'pending' })
      .count('* as count')
      .first();

    if (pendingApprovals.count === 0) {
      // All approvals received, continue execution
      context.approved = true;
      context.approvedBy = approverId;
      context.approvedAt = new Date();

      this.pendingApprovals.delete(executionId);

      // Update execution record
      await this.db('playbook_executions')
        .where('id', executionId)
        .update({
          status: 'running',
          started_at: new Date()
        });

      // Continue execution
      const playbook = await this.getPlaybook(context.playbookId);
      if (playbook) {
        const result = await this.executeSteps(playbook, context);
        await this.updatePlaybookStatistics(context.playbookId, result.status === 'success');
      }

      this.emit('playbook-approved', { executionId, approverId });
    }
  }

  async rejectPlaybook(executionId: string, approverId: string, comments?: string): Promise<void> {
    const context = this.pendingApprovals.get(executionId);
    if (!context) {
      throw new Error(`No pending approval found for execution ${executionId}`);
    }

    // Update approval record
    await this.db('playbook_approvals')
      .where({ execution_id: executionId, approver_id: approverId })
      .update({
        status: 'rejected',
        responded_at: new Date(),
        comments
      });

    // Update execution record
    await this.db('playbook_executions')
      .where('id', executionId)
      .update({
        status: 'cancelled',
        completed_at: new Date()
      });

    this.pendingApprovals.delete(executionId);

    this.emit('playbook-rejected', { executionId, approverId, comments });
  }

  private async handleApprovalTimeout(executionId: string): Promise<void> {
    await this.db('playbook_executions')
      .where('id', executionId)
      .update({
        status: 'timeout',
        completed_at: new Date()
      });

    this.pendingApprovals.delete(executionId);

    this.emit('approval-timeout', { executionId });
  }

  // Playbook Discovery and Triggering
  async findTriggeredPlaybooks(triggerData: {
    alertType?: string;
    severity?: string;
    tags?: string[];
    mitreAttackTechniques?: string[];
  }): Promise<Playbook[]> {
    const enabledPlaybooks = await this.db('playbooks')
      .where('enabled', true)
      .whereNotNull('trigger_conditions');

    const triggeredPlaybooks: Playbook[] = [];

    for (const row of enabledPlaybooks) {
      const playbook = this.mapRowToPlaybook(row);
      if (this.matchesTriggerConditions(playbook.triggerConditions, triggerData)) {
        triggeredPlaybooks.push(playbook);
      }
    }

    return triggeredPlaybooks;
  }

  private matchesTriggerConditions(conditions: any, triggerData: any): boolean {
    if (!conditions) return false;

    // Check alert type
    if (conditions.alertType && triggerData.alertType !== conditions.alertType) {
      return false;
    }

    // Check severity
    if (conditions.severity && conditions.severity.length > 0) {
      if (!conditions.severity.includes(triggerData.severity)) {
        return false;
      }
    }

    // Check tags
    if (conditions.tags && conditions.tags.length > 0) {
      const triggerTags = triggerData.tags || [];
      if (!conditions.tags.some((tag: string) => triggerTags.includes(tag))) {
        return false;
      }
    }

    // Check MITRE ATT&CK techniques
    if (conditions.mitreAttackTechniques && conditions.mitreAttackTechniques.length > 0) {
      const triggerTechniques = triggerData.mitreAttackTechniques || [];
      if (!conditions.mitreAttackTechniques.some((technique: string) => triggerTechniques.includes(technique))) {
        return false;
      }
    }

    return true;
  }

  // Helper Methods
  private async createExecutionRecord(context: ExecutionContext, playbook: Playbook): Promise<void> {
    await this.db('playbook_executions').insert({
      id: context.executionId,
      playbook_id: context.playbookId,
      case_id: context.caseId,
      alert_id: context.alertId,
      triggered_by: context.triggeredBy,
      triggered_at: context.triggeredAt,
      status: context.approved ? 'running' : 'pending_approval',
      started_at: context.approved ? new Date() : null,
      steps_executed: 0,
      steps_succeeded: 0,
      steps_failed: 0,
      step_results: JSON.stringify({}),
      errors: JSON.stringify([]),
      output: JSON.stringify({}),
      context: JSON.stringify(context),
      metadata: JSON.stringify({})
    });
  }

  private async updateExecutionRecord(executionId: string, result: PlaybookResult): Promise<void> {
    await this.db('playbook_executions')
      .where('id', executionId)
      .update({
        status: result.status,
        completed_at: result.endTime,
        duration: result.duration,
        steps_executed: result.stepsExecuted,
        steps_succeeded: result.stepsSucceeded,
        steps_failed: result.stepsFailed,
        step_results: JSON.stringify(result.stepResults),
        errors: JSON.stringify(result.errors),
        output: JSON.stringify(result.output)
      });
  }

  private async recordStepExecution(
    executionId: string,
    step: PlaybookStep,
    status: string,
    result?: ActionResult
  ): Promise<void> {
    const record = {
      id: uuidv4(),
      execution_id: executionId,
      step_id: step.id,
      step_name: step.name,
      status,
      started_at: status === 'running' ? new Date() : null,
      completed_at: status === 'success' || status === 'failure' ? new Date() : null,
      duration: result?.duration || 0,
      input: JSON.stringify(step.action.config),
      output: JSON.stringify(result?.output || {}),
      error_message: result?.error || null,
      metadata: JSON.stringify({})
    };

    await this.db('playbook_step_executions').insert(record);
  }

  private async updatePlaybookStatistics(playbookId: string, success: boolean): Promise<void> {
    const playbook = await this.getPlaybook(playbookId);
    if (!playbook) return;

    const newExecutionCount = playbook.executionCount + 1;
    const newSuccessRate = success 
      ? (playbook.successRate * playbook.executionCount + 100) / newExecutionCount
      : (playbook.successRate * playbook.executionCount) / newExecutionCount;

    await this.db('playbooks')
      .where('id', playbookId)
      .update({
        execution_count: newExecutionCount,
        success_rate: newSuccessRate,
        last_executed: new Date()
      });
  }

  private async getPlaybookName(playbookId: string): Promise<string> {
    const playbook = await this.getPlaybook(playbookId);
    return playbook?.name || 'Unknown Playbook';
  }

  private async sendNotification(channel: string, data: any): Promise<any> {
    // Mock implementation - in production, this would integrate with actual notification services
    logger.info(`Sending ${channel} notification:`, data);
    return { channel, status: 'sent', timestamp: new Date() };
  }

  private async sendApprovalNotifications(playbook: Playbook, context: ExecutionContext): Promise<void> {
    // Send notifications to approvers
    for (const approverId of playbook.approvers) {
      await this.sendNotification('email', {
        recipient: approverId,
        subject: `Playbook Approval Required: ${playbook.name}`,
        message: `Playbook "${playbook.name}" requires your approval to execute.`,
        context: {
          executionId: context.executionId,
          playbookName: playbook.name,
          triggeredBy: context.triggeredBy
        }
      });
    }
  }

  private async loadActivePlaybooks(): Promise<void> {
    const activePlaybooks = await this.db('playbooks').where('enabled', true);
    logger.info(`Loaded ${activePlaybooks.length} active playbooks`);
  }

  private async resumePendingExecutions(): Promise<void> {
    const pendingExecutions = await this.db('playbook_executions')
      .where('status', 'pending_approval')
      .orWhere('status', 'running');

    for (const execution of pendingExecutions) {
      const context = JSON.parse(execution.context);
      if (execution.status === 'pending_approval') {
        this.pendingApprovals.set(execution.id, context);
      } else {
        this.activeExecutions.set(execution.id, context);
      }
    }

    logger.info(`Resumed ${pendingExecutions.length} pending executions`);
  }

  private mapRowToPlaybook(row: any): Playbook {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      version: row.version,
      category: row.category,
      triggerConditions: JSON.parse(row.trigger_conditions || '{}'),
      steps: JSON.parse(row.steps || '[]'),
      approvalRequired: row.approval_required,
      approvers: JSON.parse(row.approvers || '[]'),
      timeoutMinutes: row.timeout_minutes,
      enabled: row.enabled,
      tags: JSON.parse(row.tags || '[]'),
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      lastExecuted: row.last_executed ? new Date(row.last_executed) : undefined,
      executionCount: row.execution_count,
      successRate: row.success_rate,
      metadata: JSON.parse(row.metadata || '{}')
    };
  }

  // Statistics and Monitoring
  async getPlaybookStatistics(): Promise<any> {
    const stats = await this.db('playbooks')
      .select(
        this.db.raw('COUNT(*) as total'),
        this.db.raw('COUNT(CASE WHEN enabled = true THEN 1 END) as enabled'),
        this.db.raw('SUM(execution_count) as total_executions'),
        this.db.raw('AVG(success_rate) as avg_success_rate')
      )
      .first();

    const recentExecutions = await this.db('playbook_executions')
      .where('triggered_at', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000))
      .count('* as count')
      .first();

    return {
      totalPlaybooks: stats.total,
      enabledPlaybooks: stats.enabled,
      totalExecutions: stats.total_executions,
      averageSuccessRate: stats.avg_success_rate,
      recentExecutions: recentExecutions?.count || 0
    };
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down Playbook Engine');
    
    // Cancel all active executions
    for (const [executionId] of this.activeExecutions) {
      await this.db('playbook_executions')
        .where('id', executionId)
        .update({
          status: 'cancelled',
          completed_at: new Date()
        });
    }

    await this.db.destroy();
    logger.info('Playbook Engine shutdown complete');
  }
}