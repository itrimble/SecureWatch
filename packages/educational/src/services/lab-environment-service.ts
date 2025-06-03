import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import knex, { Knex } from 'knex';
import { logger } from '../utils/logger';
import {
  Lab,
  LabSchema,
  LabTask,
  LabTaskSchema,
  LabHint,
  LabHintSchema,
  LabEnvironment,
  LabEnvironmentType,
  DatabaseConfig,
  SearchFilters,
  Pagination,
  Difficulty,
  SkillLevel
} from '../types/educational.types';

interface LabInstance {
  id: string;
  labId: string;
  studentId: string;
  status: 'provisioning' | 'running' | 'paused' | 'stopped' | 'failed' | 'completed';
  containersInfo: {
    containerId: string;
    name: string;
    status: string;
    ports: Record<string, number>;
    ipAddress?: string;
  }[];
  accessInfo: {
    endpoint?: string;
    credentials?: {
      username: string;
      password: string;
    };
    sshKeys?: string[];
    vpnConfig?: string;
  };
  startedAt: Date;
  lastAccessedAt?: Date;
  expiresAt: Date;
  timeRemaining: number; // seconds
  progress: {
    tasksCompleted: number;
    totalTasks: number;
    score: number;
    hintsUsed: number;
    flags: string[];
  };
  resources: {
    cpu: string;
    memory: string;
    storage: string;
  };
  metadata: Record<string, any>;
}

interface LabSearchResult {
  labs: Lab[];
  total: number;
  page: number;
  totalPages: number;
}

interface TaskSubmission {
  taskId: string;
  studentId: string;
  answer: string;
  flags: string[];
  output: string;
  submittedAt: Date;
  validationResult?: {
    passed: boolean;
    score: number;
    feedback: string;
    errors: string[];
  };
}

export class LabEnvironmentService extends EventEmitter {
  private db: Knex;
  private activeInstances: Map<string, LabInstance> = new Map();
  private containerOrchestrator: ContainerOrchestrator;

  constructor(config: { database: DatabaseConfig; container?: any }) {
    super();
    this.db = knex({
      client: config.database.type,
      connection: config.database.connection,
      useNullAsDefault: true
    });
    
    this.containerOrchestrator = new ContainerOrchestrator(config.container);
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Lab Environment Service');
    await this.createTables();
    await this.containerOrchestrator.initialize();
    await this.loadActiveInstances();
    this.startCleanupWorker();
    logger.info('Lab Environment Service initialized successfully');
  }

  private async createTables(): Promise<void> {
    // Labs table
    if (!(await this.db.schema.hasTable('labs'))) {
      await this.db.schema.createTable('labs', (table) => {
        table.string('id').primary();
        table.string('title').notNullable();
        table.text('description');
        table.string('difficulty').notNullable();
        table.string('skill_level').notNullable();
        table.json('environment');
        table.text('solution');
        table.integer('estimated_time').notNullable(); // minutes
        table.integer('max_attempts').defaultTo(5);
        table.integer('order').defaultTo(0);
        table.json('prerequisites');
        table.json('tags');
        table.json('learning_objectives');
        table.json('references');
        table.string('created_by').notNullable();
        table.dateTime('created_at').notNullable();
        table.dateTime('updated_at').notNullable();
        table.json('metadata');
        
        table.index(['difficulty', 'skill_level']);
        table.index(['created_at']);
      });
    }

    // Lab tasks table
    if (!(await this.db.schema.hasTable('lab_tasks'))) {
      await this.db.schema.createTable('lab_tasks', (table) => {
        table.string('id').primary();
        table.string('lab_id').notNullable();
        table.string('title').notNullable();
        table.text('description');
        table.integer('order').notNullable();
        table.text('instructions');
        table.text('expected_output');
        table.text('validation_script');
        table.integer('points').defaultTo(10);
        table.integer('time_limit'); // minutes
        table.json('prerequisites');
        table.json('tools');
        table.json('flags');
        
        table.foreign('lab_id').references('labs.id').onDelete('CASCADE');
        table.index(['lab_id', 'order']);
      });
    }

    // Lab hints table
    if (!(await this.db.schema.hasTable('lab_hints'))) {
      await this.db.schema.createTable('lab_hints', (table) => {
        table.string('id').primary();
        table.string('lab_id').notNullable();
        table.integer('order').notNullable();
        table.string('title').notNullable();
        table.text('content');
        table.integer('point_deduction').defaultTo(0);
        
        table.foreign('lab_id').references('labs.id').onDelete('CASCADE');
        table.index(['lab_id', 'order']);
      });
    }

    // Lab instances table
    if (!(await this.db.schema.hasTable('lab_instances'))) {
      await this.db.schema.createTable('lab_instances', (table) => {
        table.string('id').primary();
        table.string('lab_id').notNullable();
        table.string('student_id').notNullable();
        table.string('status').notNullable();
        table.json('containers_info');
        table.json('access_info');
        table.dateTime('started_at').notNullable();
        table.dateTime('last_accessed_at');
        table.dateTime('expires_at').notNullable();
        table.integer('time_remaining'); // seconds
        table.json('progress');
        table.json('resources');
        table.json('metadata');
        
        table.foreign('lab_id').references('labs.id').onDelete('CASCADE');
        table.index(['student_id']);
        table.index(['status']);
        table.index(['expires_at']);
      });
    }

    // Task submissions table
    if (!(await this.db.schema.hasTable('task_submissions'))) {
      await this.db.schema.createTable('task_submissions', (table) => {
        table.string('id').primary();
        table.string('task_id').notNullable();
        table.string('student_id').notNullable();
        table.string('instance_id').notNullable();
        table.text('answer');
        table.json('flags');
        table.text('output');
        table.dateTime('submitted_at').notNullable();
        table.json('validation_result');
        table.boolean('is_correct').defaultTo(false);
        table.integer('score').defaultTo(0);
        table.integer('attempt_number').defaultTo(1);
        
        table.foreign('task_id').references('lab_tasks.id').onDelete('CASCADE');
        table.foreign('instance_id').references('lab_instances.id').onDelete('CASCADE');
        table.index(['student_id', 'task_id']);
        table.index(['instance_id']);
      });
    }

    // Lab analytics table
    if (!(await this.db.schema.hasTable('lab_analytics'))) {
      await this.db.schema.createTable('lab_analytics', (table) => {
        table.string('id').primary();
        table.string('lab_id').notNullable();
        table.string('student_id').notNullable();
        table.string('instance_id').notNullable();
        table.string('event_type').notNullable(); // 'start', 'pause', 'resume', 'task_attempt', 'hint_used', 'complete'
        table.json('event_data');
        table.dateTime('timestamp').notNullable();
        
        table.foreign('lab_id').references('labs.id').onDelete('CASCADE');
        table.foreign('instance_id').references('lab_instances.id').onDelete('CASCADE');
        table.index(['lab_id', 'timestamp']);
        table.index(['student_id', 'timestamp']);
      });
    }
  }

  private async loadActiveInstances(): Promise<void> {
    const instances = await this.db('lab_instances')
      .whereIn('status', ['provisioning', 'running', 'paused']);

    for (const row of instances) {
      const instance: LabInstance = {
        id: row.id,
        labId: row.lab_id,
        studentId: row.student_id,
        status: row.status,
        containersInfo: JSON.parse(row.containers_info || '[]'),
        accessInfo: JSON.parse(row.access_info || '{}'),
        startedAt: new Date(row.started_at),
        lastAccessedAt: row.last_accessed_at ? new Date(row.last_accessed_at) : undefined,
        expiresAt: new Date(row.expires_at),
        timeRemaining: row.time_remaining || 0,
        progress: JSON.parse(row.progress || '{}'),
        resources: JSON.parse(row.resources || '{}'),
        metadata: JSON.parse(row.metadata || '{}')
      };

      this.activeInstances.set(instance.id, instance);
    }

    logger.info(`Loaded ${this.activeInstances.size} active lab instances`);
  }

  private startCleanupWorker(): void {
    // Check for expired instances every 5 minutes
    setInterval(async () => {
      await this.cleanupExpiredInstances();
    }, 5 * 60 * 1000);

    logger.info('Lab cleanup worker started');
  }

  // Lab Management
  async createLab(labData: Omit<Lab, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lab> {
    const now = new Date();
    const newLab: Lab = {
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      ...labData
    };

    const validatedLab = LabSchema.parse(newLab);

    // Insert the lab
    await this.db('labs').insert({
      id: validatedLab.id,
      title: validatedLab.title,
      description: validatedLab.description,
      difficulty: validatedLab.difficulty,
      skill_level: validatedLab.skillLevel,
      environment: JSON.stringify(validatedLab.environment),
      solution: validatedLab.solution,
      estimated_time: validatedLab.estimatedTime,
      max_attempts: validatedLab.maxAttempts,
      order: validatedLab.order,
      prerequisites: JSON.stringify(validatedLab.prerequisites),
      tags: JSON.stringify(validatedLab.tags),
      learning_objectives: JSON.stringify(validatedLab.learningObjectives),
      references: JSON.stringify(validatedLab.references),
      created_by: validatedLab.createdBy,
      created_at: validatedLab.createdAt,
      updated_at: validatedLab.updatedAt,
      metadata: JSON.stringify(validatedLab.metadata)
    });

    // Insert tasks
    for (const task of validatedLab.tasks) {
      await this.addTaskToLab(validatedLab.id, task);
    }

    // Insert hints
    for (const hint of validatedLab.hints) {
      await this.addHintToLab(validatedLab.id, hint);
    }

    this.emit('lab-created', { labId: validatedLab.id, lab: validatedLab });
    logger.info(`Created lab: ${validatedLab.title}`);
    
    return validatedLab;
  }

  async getLab(labId: string): Promise<Lab | null> {
    const labRow = await this.db('labs').where('id', labId).first();
    if (!labRow) return null;

    const [tasks, hints] = await Promise.all([
      this.getLabTasks(labId),
      this.getLabHints(labId)
    ]);

    const lab: Lab = {
      id: labRow.id,
      title: labRow.title,
      description: labRow.description,
      difficulty: labRow.difficulty,
      skillLevel: labRow.skill_level,
      environment: JSON.parse(labRow.environment),
      tasks,
      hints,
      solution: labRow.solution,
      estimatedTime: labRow.estimated_time,
      maxAttempts: labRow.max_attempts,
      order: labRow.order,
      prerequisites: JSON.parse(labRow.prerequisites || '[]'),
      tags: JSON.parse(labRow.tags || '[]'),
      learningObjectives: JSON.parse(labRow.learning_objectives || '[]'),
      references: JSON.parse(labRow.references || '[]'),
      createdBy: labRow.created_by,
      createdAt: new Date(labRow.created_at),
      updatedAt: new Date(labRow.updated_at),
      metadata: JSON.parse(labRow.metadata || '{}')
    };

    return lab;
  }

  async searchLabs(filters: SearchFilters, pagination: Pagination): Promise<LabSearchResult> {
    let query = this.db('labs').select('*');

    // Apply filters similar to learning paths
    if (filters.query) {
      query = query.where((builder) => {
        builder
          .where('title', 'like', `%${filters.query}%`)
          .orWhere('description', 'like', `%${filters.query}%`);
      });
    }

    if (filters.skillLevel) {
      query = query.where('skill_level', filters.skillLevel);
    }

    if (filters.difficulty) {
      query = query.where('difficulty', filters.difficulty);
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.whereRaw('JSON_EXTRACT(tags, "$") LIKE ?', [`%${filters.tags.join('%')}%`]);
    }

    if (filters.duration) {
      if (filters.duration.min !== undefined) {
        query = query.where('estimated_time', '>=', filters.duration.min);
      }
      if (filters.duration.max !== undefined) {
        query = query.where('estimated_time', '<=', filters.duration.max);
      }
    }

    // Count total results
    const totalResult = await query.clone().count('* as total').first();
    const total = totalResult?.total || 0;

    // Apply pagination and sorting
    const offset = (pagination.page - 1) * pagination.limit;
    query = query
      .orderBy(pagination.sortBy, pagination.sortOrder)
      .limit(pagination.limit)
      .offset(offset);

    const rows = await query;
    const labs: Lab[] = [];

    for (const row of rows) {
      const [tasks, hints] = await Promise.all([
        this.getLabTasks(row.id),
        this.getLabHints(row.id)
      ]);

      labs.push({
        id: row.id,
        title: row.title,
        description: row.description,
        difficulty: row.difficulty,
        skillLevel: row.skill_level,
        environment: JSON.parse(row.environment),
        tasks,
        hints,
        solution: row.solution,
        estimatedTime: row.estimated_time,
        maxAttempts: row.max_attempts,
        order: row.order,
        prerequisites: JSON.parse(row.prerequisites || '[]'),
        tags: JSON.parse(row.tags || '[]'),
        learningObjectives: JSON.parse(row.learning_objectives || '[]'),
        references: JSON.parse(row.references || '[]'),
        createdBy: row.created_by,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        metadata: JSON.parse(row.metadata || '{}')
      });
    }

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      labs,
      total,
      page: pagination.page,
      totalPages
    };
  }

  // Lab Instance Management
  async startLabInstance(labId: string, studentId: string): Promise<LabInstance> {
    const lab = await this.getLab(labId);
    if (!lab) {
      throw new Error(`Lab ${labId} not found`);
    }

    // Check if student already has an active instance
    const existingInstance = await this.getActiveInstanceForStudent(labId, studentId);
    if (existingInstance) {
      return existingInstance;
    }

    const now = new Date();
    const instanceId = uuidv4();
    const expiresAt = new Date(now.getTime() + lab.environment.config.timeout * 1000);

    // Create instance record
    const instance: LabInstance = {
      id: instanceId,
      labId,
      studentId,
      status: 'provisioning',
      containersInfo: [],
      accessInfo: {},
      startedAt: now,
      expiresAt,
      timeRemaining: lab.environment.config.timeout,
      progress: {
        tasksCompleted: 0,
        totalTasks: lab.tasks.length,
        score: 0,
        hintsUsed: 0,
        flags: []
      },
      resources: lab.environment.config.resources || {
        cpu: '1',
        memory: '1Gi',
        storage: '10Gi'
      },
      metadata: {}
    };

    // Save to database
    await this.db('lab_instances').insert({
      id: instance.id,
      lab_id: instance.labId,
      student_id: instance.studentId,
      status: instance.status,
      containers_info: JSON.stringify(instance.containersInfo),
      access_info: JSON.stringify(instance.accessInfo),
      started_at: instance.startedAt,
      expires_at: instance.expiresAt,
      time_remaining: instance.timeRemaining,
      progress: JSON.stringify(instance.progress),
      resources: JSON.stringify(instance.resources),
      metadata: JSON.stringify(instance.metadata)
    });

    this.activeInstances.set(instanceId, instance);

    // Start environment provisioning
    this.provisionLabEnvironment(instance, lab);

    this.emit('lab-instance-started', { instanceId, labId, studentId });
    logger.info(`Started lab instance ${instanceId} for student ${studentId}`);

    return instance;
  }

  private async provisionLabEnvironment(instance: LabInstance, lab: Lab): Promise<void> {
    try {
      const containersInfo = await this.containerOrchestrator.createLabEnvironment(
        instance.id,
        lab.environment,
        instance.resources
      );

      instance.containersInfo = containersInfo;
      instance.accessInfo = await this.containerOrchestrator.getAccessInfo(instance.id);
      instance.status = 'running';

      // Update database
      await this.updateInstance(instance);

      this.emit('lab-instance-ready', { instanceId: instance.id, accessInfo: instance.accessInfo });
      logger.info(`Lab instance ${instance.id} provisioned and ready`);
    } catch (error) {
      instance.status = 'failed';
      await this.updateInstance(instance);
      
      this.emit('lab-instance-failed', { instanceId: instance.id, error: error.message });
      logger.error(`Failed to provision lab instance ${instance.id}:`, error);
    }
  }

  async getLabInstance(instanceId: string): Promise<LabInstance | null> {
    return this.activeInstances.get(instanceId) || null;
  }

  async getActiveInstanceForStudent(labId: string, studentId: string): Promise<LabInstance | null> {
    for (const instance of this.activeInstances.values()) {
      if (instance.labId === labId && instance.studentId === studentId && 
          ['provisioning', 'running', 'paused'].includes(instance.status)) {
        return instance;
      }
    }
    return null;
  }

  async pauseLabInstance(instanceId: string): Promise<void> {
    const instance = this.activeInstances.get(instanceId);
    if (!instance || instance.status !== 'running') {
      throw new Error(`Cannot pause instance ${instanceId}`);
    }

    await this.containerOrchestrator.pauseEnvironment(instanceId);
    instance.status = 'paused';
    await this.updateInstance(instance);

    this.emit('lab-instance-paused', { instanceId });
  }

  async resumeLabInstance(instanceId: string): Promise<void> {
    const instance = this.activeInstances.get(instanceId);
    if (!instance || instance.status !== 'paused') {
      throw new Error(`Cannot resume instance ${instanceId}`);
    }

    await this.containerOrchestrator.resumeEnvironment(instanceId);
    instance.status = 'running';
    instance.lastAccessedAt = new Date();
    await this.updateInstance(instance);

    this.emit('lab-instance-resumed', { instanceId });
  }

  async stopLabInstance(instanceId: string): Promise<void> {
    const instance = this.activeInstances.get(instanceId);
    if (!instance) return;

    await this.containerOrchestrator.destroyEnvironment(instanceId);
    instance.status = 'stopped';
    await this.updateInstance(instance);

    this.activeInstances.delete(instanceId);
    this.emit('lab-instance-stopped', { instanceId });
  }

  // Task and Submission Management
  async submitTaskAnswer(
    instanceId: string,
    taskId: string,
    submission: {
      answer: string;
      flags: string[];
      output: string;
    }
  ): Promise<TaskSubmission> {
    const instance = this.activeInstances.get(instanceId);
    if (!instance) {
      throw new Error(`Lab instance ${instanceId} not found`);
    }

    const task = await this.getLabTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Validate submission
    const validationResult = await this.validateTaskSubmission(task, submission);

    const taskSubmission: TaskSubmission = {
      taskId,
      studentId: instance.studentId,
      answer: submission.answer,
      flags: submission.flags,
      output: submission.output,
      submittedAt: new Date(),
      validationResult
    };

    // Save submission
    const submissionId = uuidv4();
    await this.db('task_submissions').insert({
      id: submissionId,
      task_id: taskId,
      student_id: instance.studentId,
      instance_id: instanceId,
      answer: submission.answer,
      flags: JSON.stringify(submission.flags),
      output: submission.output,
      submitted_at: taskSubmission.submittedAt,
      validation_result: JSON.stringify(validationResult),
      is_correct: validationResult.passed,
      score: validationResult.score,
      attempt_number: 1 // TODO: Calculate attempt number
    });

    // Update instance progress
    if (validationResult.passed) {
      instance.progress.tasksCompleted++;
      instance.progress.score += validationResult.score;
      instance.progress.flags.push(...submission.flags);
    }

    await this.updateInstance(instance);

    // Record analytics
    await this.recordAnalyticsEvent(instance.labId, instance.studentId, instanceId, 'task_attempt', {
      taskId,
      passed: validationResult.passed,
      score: validationResult.score,
      flags: submission.flags
    });

    this.emit('task-submitted', { instanceId, taskId, submission: taskSubmission });

    return taskSubmission;
  }

  private async validateTaskSubmission(task: LabTask, submission: any): Promise<any> {
    // Basic validation logic - in production, this would be more sophisticated
    let passed = false;
    let score = 0;
    const feedback: string[] = [];
    const errors: string[] = [];

    try {
      // Check flags
      if (task.flags && task.flags.length > 0) {
        const correctFlags = task.flags.filter(flag => submission.flags.includes(flag));
        if (correctFlags.length === task.flags.length) {
          passed = true;
          score = task.points;
          feedback.push('All flags found correctly!');
        } else {
          score = Math.floor((correctFlags.length / task.flags.length) * task.points);
          feedback.push(`Found ${correctFlags.length} out of ${task.flags.length} flags`);
        }
      }

      // Check expected output
      if (task.expectedOutput && !passed) {
        if (submission.output.includes(task.expectedOutput)) {
          passed = true;
          score = task.points;
          feedback.push('Expected output found!');
        } else {
          errors.push('Output does not match expected result');
        }
      }

      // Run validation script if provided
      if (task.validationScript && !passed) {
        // In production, this would execute the validation script safely
        // For now, simulate validation
        passed = Math.random() > 0.3; // 70% success rate
        score = passed ? task.points : 0;
        feedback.push(passed ? 'Validation script passed' : 'Validation script failed');
      }

    } catch (error) {
      errors.push(`Validation error: ${error.message}`);
    }

    return {
      passed,
      score,
      feedback: feedback.join(' '),
      errors
    };
  }

  // Helper Methods
  private async addTaskToLab(labId: string, task: LabTask): Promise<void> {
    const validatedTask = LabTaskSchema.parse(task);

    await this.db('lab_tasks').insert({
      id: validatedTask.id,
      lab_id: labId,
      title: validatedTask.title,
      description: validatedTask.description,
      order: validatedTask.order,
      instructions: validatedTask.instructions,
      expected_output: validatedTask.expectedOutput,
      validation_script: validatedTask.validationScript,
      points: validatedTask.points,
      time_limit: validatedTask.timeLimit,
      prerequisites: JSON.stringify(validatedTask.prerequisites),
      tools: JSON.stringify(validatedTask.tools),
      flags: JSON.stringify(validatedTask.flags)
    });
  }

  private async addHintToLab(labId: string, hint: LabHint): Promise<void> {
    const validatedHint = LabHintSchema.parse(hint);

    await this.db('lab_hints').insert({
      id: validatedHint.id,
      lab_id: labId,
      order: validatedHint.order,
      title: validatedHint.title,
      content: validatedHint.content,
      point_deduction: validatedHint.pointDeduction
    });
  }

  private async getLabTasks(labId: string): Promise<LabTask[]> {
    const rows = await this.db('lab_tasks')
      .where('lab_id', labId)
      .orderBy('order');

    return rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      order: row.order,
      instructions: row.instructions,
      expectedOutput: row.expected_output,
      validationScript: row.validation_script,
      points: row.points,
      timeLimit: row.time_limit,
      prerequisites: JSON.parse(row.prerequisites || '[]'),
      tools: JSON.parse(row.tools || '[]'),
      flags: JSON.parse(row.flags || '[]')
    }));
  }

  private async getLabHints(labId: string): Promise<LabHint[]> {
    const rows = await this.db('lab_hints')
      .where('lab_id', labId)
      .orderBy('order');

    return rows.map((row: any) => ({
      id: row.id,
      order: row.order,
      title: row.title,
      content: row.content,
      pointDeduction: row.point_deduction
    }));
  }

  private async getLabTask(taskId: string): Promise<LabTask | null> {
    const row = await this.db('lab_tasks').where('id', taskId).first();
    if (!row) return null;

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      order: row.order,
      instructions: row.instructions,
      expectedOutput: row.expected_output,
      validationScript: row.validation_script,
      points: row.points,
      timeLimit: row.time_limit,
      prerequisites: JSON.parse(row.prerequisites || '[]'),
      tools: JSON.parse(row.tools || '[]'),
      flags: JSON.parse(row.flags || '[]')
    };
  }

  private async updateInstance(instance: LabInstance): Promise<void> {
    await this.db('lab_instances')
      .where('id', instance.id)
      .update({
        status: instance.status,
        containers_info: JSON.stringify(instance.containersInfo),
        access_info: JSON.stringify(instance.accessInfo),
        last_accessed_at: instance.lastAccessedAt,
        time_remaining: instance.timeRemaining,
        progress: JSON.stringify(instance.progress),
        metadata: JSON.stringify(instance.metadata)
      });
  }

  private async recordAnalyticsEvent(
    labId: string,
    studentId: string,
    instanceId: string,
    eventType: string,
    eventData: any
  ): Promise<void> {
    await this.db('lab_analytics').insert({
      id: uuidv4(),
      lab_id: labId,
      student_id: studentId,
      instance_id: instanceId,
      event_type: eventType,
      event_data: JSON.stringify(eventData),
      timestamp: new Date()
    });
  }

  private async cleanupExpiredInstances(): Promise<void> {
    const now = new Date();
    const expiredInstances = Array.from(this.activeInstances.values())
      .filter(instance => instance.expiresAt < now);

    for (const instance of expiredInstances) {
      try {
        await this.stopLabInstance(instance.id);
        logger.info(`Cleaned up expired lab instance: ${instance.id}`);
      } catch (error) {
        logger.error(`Failed to cleanup expired instance ${instance.id}:`, error);
      }
    }
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down Lab Environment Service');
    
    // Stop all active instances
    for (const instance of this.activeInstances.values()) {
      await this.stopLabInstance(instance.id);
    }

    await this.containerOrchestrator.shutdown();
    await this.db.destroy();
    
    logger.info('Lab Environment Service shutdown complete');
  }
}

// Container Orchestrator for managing lab environments
class ContainerOrchestrator {
  private config: any;

  constructor(config: any = {}) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Container Orchestrator');
    // Initialize Docker/Kubernetes client
  }

  async createLabEnvironment(
    instanceId: string,
    environment: LabEnvironment,
    resources: any
  ): Promise<any[]> {
    logger.info(`Creating lab environment for instance ${instanceId}`);
    
    // Mock implementation - in production, this would use Docker or Kubernetes
    const containersInfo = environment.config.containers.map((container, index) => ({
      containerId: `${instanceId}-${container.name}-${index}`,
      name: container.name,
      status: 'running',
      ports: container.ports.reduce((acc, port, i) => {
        acc[port] = 8000 + index * 10 + i;
        return acc;
      }, {} as Record<string, number>),
      ipAddress: `172.20.0.${10 + index}`
    }));

    return containersInfo;
  }

  async getAccessInfo(instanceId: string): Promise<any> {
    return {
      endpoint: `https://lab-${instanceId}.securewatch.edu`,
      credentials: {
        username: 'student',
        password: 'changeme123'
      },
      sshKeys: []
    };
  }

  async pauseEnvironment(instanceId: string): Promise<void> {
    logger.info(`Pausing environment for instance ${instanceId}`);
    // Pause all containers
  }

  async resumeEnvironment(instanceId: string): Promise<void> {
    logger.info(`Resuming environment for instance ${instanceId}`);
    // Resume all containers
  }

  async destroyEnvironment(instanceId: string): Promise<void> {
    logger.info(`Destroying environment for instance ${instanceId}`);
    // Stop and remove all containers
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down Container Orchestrator');
    // Cleanup any resources
  }
}