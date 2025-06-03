import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import knex, { Knex } from 'knex';
import { logger } from '../utils/logger';
import {
  Case,
  EscalationRule,
  EscalationRuleSchema,
  DatabaseConfig,
  CaseSeverity,
  CasePriority,
  CaseStatus
} from '../types/incident-response.types';

interface EscalationAction {
  type: 'assign' | 'notify' | 'escalate' | 'auto-approve';
  target: string;
  config: Record<string, any>;
}

interface EscalationCheck {
  caseId: string;
  ruleId: string;
  nextCheckTime: Date;
  attempts: number;
  lastAttempt?: Date;
}

export class EscalationService extends EventEmitter {
  private db: Knex;
  private escalationRules: Map<string, EscalationRule> = new Map();
  private activeChecks: Map<string, EscalationCheck> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(config: { database: DatabaseConfig }) {
    super();
    this.db = knex({
      client: config.database.type,
      connection: config.database.connection,
      useNullAsDefault: true
    });
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Escalation Service');
    await this.createTables();
    await this.loadEscalationRules();
    await this.loadActiveChecks();
    this.startEscalationWorker();
    logger.info('Escalation Service initialized successfully');
  }

  private async createTables(): Promise<void> {
    // Escalation rules table
    if (!(await this.db.schema.hasTable('escalation_rules'))) {
      await this.db.schema.createTable('escalation_rules', (table) => {
        table.string('id').primary();
        table.string('name').notNullable();
        table.text('description');
        table.json('conditions');
        table.json('actions');
        table.boolean('enabled').defaultTo(true);
        table.integer('order').defaultTo(0);
        table.dateTime('created_at').notNullable();
        table.dateTime('updated_at').notNullable();
        table.json('metadata');
        
        table.index(['enabled', 'order']);
      });
    }

    // Escalation history table
    if (!(await this.db.schema.hasTable('escalation_history'))) {
      await this.db.schema.createTable('escalation_history', (table) => {
        table.string('id').primary();
        table.string('case_id').notNullable().index();
        table.string('rule_id').notNullable();
        table.string('action_type').notNullable();
        table.string('target').notNullable();
        table.string('status').notNullable(); // 'success', 'failed', 'pending'
        table.dateTime('triggered_at').notNullable().index();
        table.dateTime('completed_at');
        table.text('error_message');
        table.json('metadata');
        
        table.foreign('case_id').references('cases.id').onDelete('CASCADE');
        table.index(['rule_id', 'triggered_at']);
        table.index(['status']);
      });
    }

    // Active escalation checks table
    if (!(await this.db.schema.hasTable('escalation_checks'))) {
      await this.db.schema.createTable('escalation_checks', (table) => {
        table.string('id').primary();
        table.string('case_id').notNullable().index();
        table.string('rule_id').notNullable();
        table.dateTime('next_check_time').notNullable().index();
        table.integer('attempts').defaultTo(0);
        table.dateTime('last_attempt');
        table.dateTime('created_at').notNullable();
        table.json('metadata');
        
        table.foreign('case_id').references('cases.id').onDelete('CASCADE');
        table.unique(['case_id', 'rule_id']);
      });
    }
  }

  private async loadEscalationRules(): Promise<void> {
    // Load default rules
    this.initializeDefaultRules();

    // Load custom rules from database
    const dbRules = await this.db('escalation_rules').where('enabled', true).orderBy('order');
    
    for (const row of dbRules) {
      const rule: EscalationRule = {
        id: row.id,
        name: row.name,
        description: row.description,
        conditions: JSON.parse(row.conditions),
        actions: JSON.parse(row.actions),
        enabled: row.enabled,
        order: row.order
      };

      this.escalationRules.set(rule.id, rule);
    }

    logger.info(`Loaded ${this.escalationRules.size} escalation rules`);
  }

  private initializeDefaultRules(): void {
    // Critical case no response rule
    this.escalationRules.set('critical-no-response', {
      id: 'critical-no-response',
      name: 'Critical Case No Response',
      description: 'Escalate critical cases that have no response within 30 minutes',
      conditions: {
        severity: ['critical'],
        timeElapsed: 30, // minutes
        noResponse: true
      },
      actions: [
        {
          type: 'notify',
          target: 'security-manager',
          config: { 
            channels: ['email', 'sms', 'slack'],
            urgent: true
          }
        },
        {
          type: 'escalate',
          target: 'security-director',
          config: { 
            reason: 'Critical case requires immediate attention',
            priority: 'p1'
          }
        }
      ],
      enabled: true,
      order: 1
    });

    // High priority SLA breach rule
    this.escalationRules.set('high-sla-breach', {
      id: 'high-sla-breach',
      name: 'High Priority SLA Breach',
      description: 'Escalate high priority cases that breach 2-hour SLA',
      conditions: {
        severity: ['high'],
        priority: ['p1', 'p2'],
        timeElapsed: 120 // minutes
      },
      actions: [
        {
          type: 'notify',
          target: 'team-lead',
          config: { 
            channels: ['email', 'slack'],
            includeMetrics: true
          }
        },
        {
          type: 'assign',
          target: 'senior-analyst',
          config: { 
            reason: 'SLA breach escalation',
            preserveHistory: true
          }
        }
      ],
      enabled: true,
      order: 2
    });

    // Unassigned case rule
    this.escalationRules.set('unassigned-case', {
      id: 'unassigned-case',
      name: 'Unassigned Case Escalation',
      description: 'Auto-assign unassigned cases after 15 minutes',
      conditions: {
        status: ['open'],
        timeElapsed: 15, // minutes
        customCondition: 'assignee IS NULL'
      },
      actions: [
        {
          type: 'assign',
          target: 'next-available-analyst',
          config: { 
            algorithm: 'round-robin',
            reason: 'Auto-assignment due to no initial assignment'
          }
        }
      ],
      enabled: true,
      order: 3
    });

    // Stale case rule
    this.escalationRules.set('stale-case', {
      id: 'stale-case',
      name: 'Stale Case Follow-up',
      description: 'Follow up on cases with no activity for 24 hours',
      conditions: {
        status: ['in-progress'],
        timeElapsed: 1440 // 24 hours in minutes
      },
      actions: [
        {
          type: 'notify',
          target: 'assignee',
          config: { 
            channels: ['email'],
            reminder: true,
            escalateAfter: 4 // hours
          }
        }
      ],
      enabled: true,
      order: 4
    });
  }

  private async loadActiveChecks(): Promise<void> {
    const activeChecks = await this.db('escalation_checks')
      .where('next_check_time', '>=', new Date());

    for (const row of activeChecks) {
      this.activeChecks.set(`${row.case_id}-${row.rule_id}`, {
        caseId: row.case_id,
        ruleId: row.rule_id,
        nextCheckTime: new Date(row.next_check_time),
        attempts: row.attempts,
        lastAttempt: row.last_attempt ? new Date(row.last_attempt) : undefined
      });
    }

    logger.info(`Loaded ${this.activeChecks.size} active escalation checks`);
  }

  private startEscalationWorker(): void {
    // Check for escalations every minute
    this.checkInterval = setInterval(async () => {
      await this.processEscalationChecks();
    }, 60000);

    logger.info('Escalation worker started');
  }

  // Case Registration for Escalation
  async registerCaseForEscalation(caseData: Case): Promise<void> {
    logger.debug(`Registering case ${caseData.id} for escalation monitoring`);

    // Find applicable escalation rules
    const applicableRules = this.findApplicableRules(caseData);

    for (const rule of applicableRules) {
      const checkId = `${caseData.id}-${rule.id}`;
      
      if (this.activeChecks.has(checkId)) {
        continue; // Already registered
      }

      // Calculate next check time based on rule conditions
      const nextCheckTime = this.calculateNextCheckTime(caseData, rule);
      
      const check: EscalationCheck = {
        caseId: caseData.id,
        ruleId: rule.id,
        nextCheckTime,
        attempts: 0
      };

      this.activeChecks.set(checkId, check);

      // Save to database
      await this.db('escalation_checks').insert({
        id: uuidv4(),
        case_id: check.caseId,
        rule_id: check.ruleId,
        next_check_time: check.nextCheckTime,
        attempts: check.attempts,
        created_at: new Date(),
        metadata: JSON.stringify({})
      });
    }

    this.emit('case-registered', { caseId: caseData.id, rulesCount: applicableRules.length });
  }

  async unregisterCaseFromEscalation(caseId: string): Promise<void> {
    logger.debug(`Unregistering case ${caseId} from escalation monitoring`);

    // Remove all checks for this case
    const checksToRemove = Array.from(this.activeChecks.keys())
      .filter(key => key.startsWith(`${caseId}-`));

    for (const checkId of checksToRemove) {
      this.activeChecks.delete(checkId);
    }

    // Remove from database
    await this.db('escalation_checks').where('case_id', caseId).del();

    this.emit('case-unregistered', { caseId });
  }

  // Escalation Processing
  private async processEscalationChecks(): Promise<void> {
    const now = new Date();
    const checksToProcess = Array.from(this.activeChecks.values())
      .filter(check => check.nextCheckTime <= now);

    if (checksToProcess.length === 0) {
      return;
    }

    logger.debug(`Processing ${checksToProcess.length} escalation checks`);

    for (const check of checksToProcess) {
      try {
        await this.processEscalationCheck(check);
      } catch (error) {
        logger.error(`Failed to process escalation check for case ${check.caseId}:`, error);
      }
    }
  }

  private async processEscalationCheck(check: EscalationCheck): Promise<void> {
    const rule = this.escalationRules.get(check.ruleId);
    if (!rule || !rule.enabled) {
      this.removeCheck(check);
      return;
    }

    // Get current case data
    const caseData = await this.getCaseData(check.caseId);
    if (!caseData) {
      this.removeCheck(check);
      return;
    }

    // Check if escalation conditions are still met
    if (!this.evaluateEscalationConditions(caseData, rule)) {
      this.removeCheck(check);
      return;
    }

    // Execute escalation actions
    let escalationSuccess = true;
    const executionResults = [];

    for (const action of rule.actions) {
      try {
        const result = await this.executeEscalationAction(caseData, action, rule);
        executionResults.push(result);
        
        if (!result.success) {
          escalationSuccess = false;
        }
      } catch (error) {
        logger.error(`Failed to execute escalation action for case ${check.caseId}:`, error);
        escalationSuccess = false;
        executionResults.push({
          success: false,
          error: error.message
        });
      }
    }

    // Record escalation history
    await this.recordEscalationHistory(check, rule, executionResults);

    if (escalationSuccess) {
      this.removeCheck(check);
      this.emit('escalation-executed', { 
        caseId: check.caseId, 
        ruleId: check.ruleId, 
        results: executionResults 
      });
    } else {
      // Schedule retry if appropriate
      check.attempts++;
      check.lastAttempt = new Date();
      
      if (check.attempts < 3) {
        check.nextCheckTime = new Date(Date.now() + 15 * 60 * 1000); // Retry in 15 minutes
        await this.updateCheck(check);
      } else {
        this.removeCheck(check);
        this.emit('escalation-failed', { 
          caseId: check.caseId, 
          ruleId: check.ruleId, 
          attempts: check.attempts 
        });
      }
    }
  }

  private findApplicableRules(caseData: Case): EscalationRule[] {
    return Array.from(this.escalationRules.values())
      .filter(rule => rule.enabled)
      .filter(rule => this.isRuleApplicableToCase(caseData, rule))
      .sort((a, b) => a.order - b.order);
  }

  private isRuleApplicableToCase(caseData: Case, rule: EscalationRule): boolean {
    const conditions = rule.conditions;

    // Check severity conditions
    if (conditions.severity && conditions.severity.length > 0) {
      if (!conditions.severity.includes(caseData.severity)) {
        return false;
      }
    }

    // Check priority conditions
    if (conditions.priority && conditions.priority.length > 0) {
      if (!conditions.priority.includes(caseData.priority)) {
        return false;
      }
    }

    // Check status conditions
    if (conditions.status && conditions.status.length > 0) {
      if (!conditions.status.includes(caseData.status)) {
        return false;
      }
    }

    // Check custom conditions
    if (conditions.customCondition) {
      // For now, simple string matching - in production, this would use a proper expression evaluator
      if (conditions.customCondition.includes('assignee IS NULL')) {
        if (caseData.assignee) {
          return false;
        }
      }
    }

    return true;
  }

  private calculateNextCheckTime(caseData: Case, rule: EscalationRule): Date {
    const timeElapsed = rule.conditions.timeElapsed || 60; // Default 60 minutes
    return new Date(caseData.createdAt.getTime() + timeElapsed * 60 * 1000);
  }

  private evaluateEscalationConditions(caseData: Case, rule: EscalationRule): boolean {
    const conditions = rule.conditions;
    const now = new Date();
    const caseAge = now.getTime() - caseData.createdAt.getTime();
    const ageInMinutes = Math.floor(caseAge / (60 * 1000));

    // Check if case meets basic criteria
    if (!this.isRuleApplicableToCase(caseData, rule)) {
      return false;
    }

    // Check time elapsed condition
    if (conditions.timeElapsed && ageInMinutes < conditions.timeElapsed) {
      return false;
    }

    // Check no response condition
    if (conditions.noResponse) {
      // In a real implementation, this would check for recent activity
      // For now, assume no response if no assignee and status is still open
      if (caseData.assignee || caseData.status !== 'open') {
        return false;
      }
    }

    return true;
  }

  private async executeEscalationAction(
    caseData: Case, 
    action: EscalationAction, 
    rule: EscalationRule
  ): Promise<any> {
    logger.info(`Executing escalation action ${action.type} for case ${caseData.id}`);

    switch (action.type) {
      case 'notify':
        return this.executeNotifyAction(caseData, action, rule);
      case 'assign':
        return this.executeAssignAction(caseData, action, rule);
      case 'escalate':
        return this.executeEscalateAction(caseData, action, rule);
      case 'auto-approve':
        return this.executeAutoApproveAction(caseData, action, rule);
      default:
        throw new Error(`Unknown escalation action type: ${action.type}`);
    }
  }

  private async executeNotifyAction(
    caseData: Case, 
    action: EscalationAction, 
    rule: EscalationRule
  ): Promise<any> {
    // Emit notification event for the notification service to handle
    this.emit('escalation-notification', {
      type: 'escalation',
      caseId: caseData.id,
      recipient: action.target,
      channels: action.config.channels || ['email'],
      urgent: action.config.urgent || false,
      rule: rule.name,
      caseTitle: caseData.title,
      caseSeverity: caseData.severity,
      escalationReason: rule.description
    });

    return { success: true, action: 'notification-sent' };
  }

  private async executeAssignAction(
    caseData: Case, 
    action: EscalationAction, 
    rule: EscalationRule
  ): Promise<any> {
    // Emit assignment event for the case management service to handle
    let assignee = action.target;

    // Handle special assignment targets
    if (assignee === 'next-available-analyst') {
      assignee = await this.getNextAvailableAnalyst();
    } else if (assignee === 'senior-analyst') {
      assignee = await this.getSeniorAnalyst();
    }

    this.emit('escalation-assignment', {
      caseId: caseData.id,
      assignee,
      reason: action.config.reason || `Escalated by rule: ${rule.name}`,
      preserveHistory: action.config.preserveHistory || false
    });

    return { success: true, action: 'case-assigned', assignee };
  }

  private async executeEscalateAction(
    caseData: Case, 
    action: EscalationAction, 
    rule: EscalationRule
  ): Promise<any> {
    // Create escalation case or update priority
    this.emit('escalation-case-escalated', {
      caseId: caseData.id,
      escalatedTo: action.target,
      reason: action.config.reason || rule.description,
      newPriority: action.config.priority || 'p1'
    });

    return { success: true, action: 'case-escalated', escalatedTo: action.target };
  }

  private async executeAutoApproveAction(
    caseData: Case, 
    action: EscalationAction, 
    rule: EscalationRule
  ): Promise<any> {
    // Auto-approve pending playbook executions
    this.emit('escalation-auto-approve', {
      caseId: caseData.id,
      approver: 'escalation-service',
      reason: `Auto-approved by escalation rule: ${rule.name}`
    });

    return { success: true, action: 'auto-approved' };
  }

  // Helper Methods
  private async getCaseData(caseId: string): Promise<Case | null> {
    // This would typically call the case management service
    // For now, emit an event and wait for response
    return new Promise((resolve) => {
      this.emit('get-case-data', { caseId, callback: resolve });
    });
  }

  private async getNextAvailableAnalyst(): Promise<string> {
    // Mock implementation - in production, this would check analyst workloads
    const analysts = ['analyst1', 'analyst2', 'analyst3'];
    return analysts[Math.floor(Math.random() * analysts.length)];
  }

  private async getSeniorAnalyst(): Promise<string> {
    // Mock implementation
    const seniorAnalysts = ['senior-analyst1', 'senior-analyst2'];
    return seniorAnalysts[Math.floor(Math.random() * seniorAnalysts.length)];
  }

  private async recordEscalationHistory(
    check: EscalationCheck, 
    rule: EscalationRule, 
    results: any[]
  ): Promise<void> {
    for (const result of results) {
      await this.db('escalation_history').insert({
        id: uuidv4(),
        case_id: check.caseId,
        rule_id: rule.id,
        action_type: result.action || 'unknown',
        target: result.assignee || result.escalatedTo || 'system',
        status: result.success ? 'success' : 'failed',
        triggered_at: new Date(),
        completed_at: new Date(),
        error_message: result.error,
        metadata: JSON.stringify(result)
      });
    }
  }

  private removeCheck(check: EscalationCheck): void {
    const checkId = `${check.caseId}-${check.ruleId}`;
    this.activeChecks.delete(checkId);
    
    // Remove from database
    this.db('escalation_checks')
      .where({ case_id: check.caseId, rule_id: check.ruleId })
      .del()
      .catch(error => logger.error('Failed to remove escalation check from database:', error));
  }

  private async updateCheck(check: EscalationCheck): Promise<void> {
    await this.db('escalation_checks')
      .where({ case_id: check.caseId, rule_id: check.ruleId })
      .update({
        next_check_time: check.nextCheckTime,
        attempts: check.attempts,
        last_attempt: check.lastAttempt
      });
  }

  // Rule Management
  async createEscalationRule(ruleData: Omit<EscalationRule, 'id'>): Promise<EscalationRule> {
    const rule: EscalationRule = {
      id: uuidv4(),
      ...ruleData
    };

    const validatedRule = EscalationRuleSchema.parse(rule);

    await this.db('escalation_rules').insert({
      id: validatedRule.id,
      name: validatedRule.name,
      description: validatedRule.description,
      conditions: JSON.stringify(validatedRule.conditions),
      actions: JSON.stringify(validatedRule.actions),
      enabled: validatedRule.enabled,
      order: validatedRule.order,
      created_at: new Date(),
      updated_at: new Date(),
      metadata: JSON.stringify({})
    });

    this.escalationRules.set(validatedRule.id, validatedRule);
    this.emit('rule-created', { ruleId: validatedRule.id });

    logger.info(`Created escalation rule: ${validatedRule.name}`);
    return validatedRule;
  }

  async updateEscalationRule(ruleId: string, updates: Partial<EscalationRule>): Promise<EscalationRule | null> {
    const existingRule = this.escalationRules.get(ruleId);
    if (!existingRule) return null;

    const updatedRule = { ...existingRule, ...updates };
    const validatedRule = EscalationRuleSchema.parse(updatedRule);

    await this.db('escalation_rules')
      .where('id', ruleId)
      .update({
        name: validatedRule.name,
        description: validatedRule.description,
        conditions: JSON.stringify(validatedRule.conditions),
        actions: JSON.stringify(validatedRule.actions),
        enabled: validatedRule.enabled,
        order: validatedRule.order,
        updated_at: new Date()
      });

    this.escalationRules.set(ruleId, validatedRule);
    this.emit('rule-updated', { ruleId });

    return validatedRule;
  }

  async deleteEscalationRule(ruleId: string): Promise<void> {
    await this.db('escalation_rules').where('id', ruleId).del();
    this.escalationRules.delete(ruleId);
    this.emit('rule-deleted', { ruleId });
  }

  getEscalationRules(): EscalationRule[] {
    return Array.from(this.escalationRules.values()).sort((a, b) => a.order - b.order);
  }

  // Statistics
  async getEscalationStatistics(): Promise<any> {
    const stats = await this.db('escalation_history')
      .select(
        this.db.raw('COUNT(*) as total'),
        this.db.raw('COUNT(CASE WHEN status = "success" THEN 1 END) as successful'),
        this.db.raw('COUNT(CASE WHEN status = "failed" THEN 1 END) as failed')
      )
      .first();

    const recentEscalations = await this.db('escalation_history')
      .where('triggered_at', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000))
      .count('* as count')
      .first();

    const activeChecksCount = this.activeChecks.size;
    const rulesCount = this.escalationRules.size;

    return {
      totalEscalations: stats.total,
      successfulEscalations: stats.successful,
      failedEscalations: stats.failed,
      recentEscalations: recentEscalations?.count || 0,
      activeChecks: activeChecksCount,
      rulesCount,
      successRate: stats.total > 0 ? (stats.successful / stats.total) * 100 : 0
    };
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down Escalation Service');
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    await this.db.destroy();
    logger.info('Escalation Service shutdown complete');
  }
}