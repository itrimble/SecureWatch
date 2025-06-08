"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CaseManagementService = void 0;
const events_1 = require("events");
const uuid_1 = require("uuid");
const knex_1 = __importDefault(require("knex"));
const logger_1 = require("../utils/logger");
const incident_response_types_1 = require("../types/incident-response.types");
class CaseManagementService extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.db = (0, knex_1.default)({
            client: config.database.type,
            connection: config.database.connection,
            useNullAsDefault: true
        });
    }
    async initialize() {
        logger_1.logger.info('Initializing Case Management Service');
        await this.createTables();
        await this.setupIndexes();
        logger_1.logger.info('Case Management Service initialized successfully');
    }
    async createTables() {
        // Cases table
        if (!(await this.db.schema.hasTable('cases'))) {
            await this.db.schema.createTable('cases', (table) => {
                table.string('id').primary();
                table.string('title').notNullable();
                table.text('description');
                table.string('severity', 20).notNullable();
                table.string('priority', 20).notNullable();
                table.string('status', 20).notNullable().index();
                table.string('assignee').index();
                table.string('reporter').notNullable().index();
                table.dateTime('created_at').notNullable().index();
                table.dateTime('updated_at').notNullable();
                table.dateTime('closed_at').index();
                table.dateTime('due_date').index();
                table.json('tags');
                table.string('category');
                table.string('subcategory');
                table.json('affected_systems');
                table.json('affected_users');
                table.json('source_alerts');
                table.json('related_cases');
                table.json('mitre_attack_techniques');
                table.json('iocs');
                table.json('timeline');
                table.json('metrics');
                table.json('metadata');
                table.index(['severity', 'status']);
                table.index(['priority', 'status']);
                table.index(['assignee', 'status']);
            });
        }
        // Tasks table
        if (!(await this.db.schema.hasTable('case_tasks'))) {
            await this.db.schema.createTable('case_tasks', (table) => {
                table.string('id').primary();
                table.string('case_id').notNullable().index();
                table.string('title').notNullable();
                table.text('description');
                table.string('status', 20).notNullable().index();
                table.string('assignee').index();
                table.string('assigned_by').notNullable();
                table.dateTime('created_at').notNullable().index();
                table.dateTime('updated_at').notNullable();
                table.dateTime('due_date').index();
                table.dateTime('completed_at');
                table.string('priority', 20).notNullable();
                table.integer('estimated_hours');
                table.integer('actual_hours');
                table.json('dependencies');
                table.json('tags');
                table.json('checklist');
                table.json('comments');
                table.json('metadata');
                table.foreign('case_id').references('cases.id').onDelete('CASCADE');
                table.index(['case_id', 'status']);
                table.index(['assignee', 'status']);
            });
        }
        // Comments table
        if (!(await this.db.schema.hasTable('case_comments'))) {
            await this.db.schema.createTable('case_comments', (table) => {
                table.string('id').primary();
                table.string('case_id').notNullable().index();
                table.string('task_id').index();
                table.string('user_id').notNullable().index();
                table.text('content').notNullable();
                table.dateTime('timestamp').notNullable().index();
                table.boolean('edited').defaultTo(false);
                table.dateTime('edited_at');
                table.json('mentions');
                table.json('attachments');
                table.boolean('is_internal').defaultTo(true);
                table.json('metadata');
                table.foreign('case_id').references('cases.id').onDelete('CASCADE');
                table.foreign('task_id').references('case_tasks.id').onDelete('CASCADE');
            });
        }
        // Timeline events table
        if (!(await this.db.schema.hasTable('case_timeline'))) {
            await this.db.schema.createTable('case_timeline', (table) => {
                table.string('id').primary();
                table.string('case_id').notNullable().index();
                table.dateTime('timestamp').notNullable().index();
                table.string('event').notNullable();
                table.text('description');
                table.string('source').notNullable();
                table.string('source_type', 20).notNullable();
                table.string('severity', 20);
                table.string('user_id');
                table.boolean('automated').defaultTo(false);
                table.json('tags');
                table.json('related_entities');
                table.json('attachments');
                table.json('metadata');
                table.foreign('case_id').references('cases.id').onDelete('CASCADE');
                table.index(['case_id', 'timestamp']);
                table.index(['source_type', 'timestamp']);
            });
        }
        // Case relationships table
        if (!(await this.db.schema.hasTable('case_relationships'))) {
            await this.db.schema.createTable('case_relationships', (table) => {
                table.string('id').primary();
                table.string('parent_case_id').notNullable().index();
                table.string('related_case_id').notNullable().index();
                table.string('relationship_type').notNullable(); // 'duplicate', 'related', 'child', 'parent'
                table.string('created_by').notNullable();
                table.dateTime('created_at').notNullable();
                table.text('notes');
                table.foreign('parent_case_id').references('cases.id').onDelete('CASCADE');
                table.foreign('related_case_id').references('cases.id').onDelete('CASCADE');
                table.unique(['parent_case_id', 'related_case_id', 'relationship_type']);
            });
        }
    }
    async setupIndexes() {
        // Additional performance indexes
        try {
            // Composite indexes for common queries
            await this.db.raw('CREATE INDEX IF NOT EXISTS idx_cases_status_priority ON cases(status, priority)');
            await this.db.raw('CREATE INDEX IF NOT EXISTS idx_cases_assignee_status ON cases(assignee, status) WHERE assignee IS NOT NULL');
            await this.db.raw('CREATE INDEX IF NOT EXISTS idx_timeline_case_timestamp ON case_timeline(case_id, timestamp DESC)');
            await this.db.raw('CREATE INDEX IF NOT EXISTS idx_tasks_case_status ON case_tasks(case_id, status)');
        }
        catch (error) {
            logger_1.logger.warn('Some indexes may already exist', error);
        }
    }
    // Case CRUD Operations
    async createCase(caseData) {
        const now = new Date();
        const newCase = {
            id: (0, uuid_1.v4)(),
            createdAt: now,
            updatedAt: now,
            ...caseData
        };
        // Validate case data
        const validatedCase = incident_response_types_1.CaseSchema.parse(newCase);
        // Insert into database
        await this.db('cases').insert({
            id: validatedCase.id,
            title: validatedCase.title,
            description: validatedCase.description,
            severity: validatedCase.severity,
            priority: validatedCase.priority,
            status: validatedCase.status,
            assignee: validatedCase.assignee,
            reporter: validatedCase.reporter,
            created_at: validatedCase.createdAt,
            updated_at: validatedCase.updatedAt,
            closed_at: validatedCase.closedAt,
            due_date: validatedCase.dueDate,
            tags: JSON.stringify(validatedCase.tags),
            category: validatedCase.category,
            subcategory: validatedCase.subcategory,
            affected_systems: JSON.stringify(validatedCase.affectedSystems),
            affected_users: JSON.stringify(validatedCase.affectedUsers),
            source_alerts: JSON.stringify(validatedCase.sourceAlerts),
            related_cases: JSON.stringify(validatedCase.relatedCases),
            mitre_attack_techniques: JSON.stringify(validatedCase.mitreAttackTechniques),
            iocs: JSON.stringify(validatedCase.iocs),
            timeline: JSON.stringify(validatedCase.timeline),
            metrics: JSON.stringify(validatedCase.metrics),
            metadata: JSON.stringify(validatedCase.metadata)
        });
        // Add initial timeline event
        await this.addTimelineEvent(validatedCase.id, {
            id: (0, uuid_1.v4)(),
            caseId: validatedCase.id,
            timestamp: now,
            event: 'Case Created',
            description: `Case ${validatedCase.title} created`,
            source: 'system',
            sourceType: 'system',
            automated: true,
            tags: ['case-created'],
            relatedEntities: [],
            attachments: [],
            metadata: { reporter: validatedCase.reporter }
        });
        // Auto-assignment if enabled
        if (this.config.autoAssignment && !validatedCase.assignee) {
            const assignee = await this.getAutoAssignee(validatedCase);
            if (assignee) {
                await this.assignCase(validatedCase.id, assignee, 'system');
            }
        }
        // Emit event
        this.emit('case-created', { caseId: validatedCase.id, case: validatedCase });
        logger_1.logger.info(`Created case ${validatedCase.id}: ${validatedCase.title}`);
        return validatedCase;
    }
    async getCase(caseId) {
        const row = await this.db('cases').where('id', caseId).first();
        if (!row)
            return null;
        return this.mapRowToCase(row);
    }
    async updateCase(caseId, updates, userId) {
        const existingCase = await this.getCase(caseId);
        if (!existingCase) {
            throw new Error(`Case ${caseId} not found`);
        }
        const now = new Date();
        const updatedCase = { ...existingCase, ...updates, updatedAt: now };
        // Validate updated case
        const validatedCase = incident_response_types_1.CaseSchema.parse(updatedCase);
        // Update in database
        await this.db('cases')
            .where('id', caseId)
            .update({
            title: validatedCase.title,
            description: validatedCase.description,
            severity: validatedCase.severity,
            priority: validatedCase.priority,
            status: validatedCase.status,
            assignee: validatedCase.assignee,
            updated_at: validatedCase.updatedAt,
            closed_at: validatedCase.closedAt,
            due_date: validatedCase.dueDate,
            tags: JSON.stringify(validatedCase.tags),
            category: validatedCase.category,
            subcategory: validatedCase.subcategory,
            affected_systems: JSON.stringify(validatedCase.affectedSystems),
            affected_users: JSON.stringify(validatedCase.affectedUsers),
            source_alerts: JSON.stringify(validatedCase.sourceAlerts),
            related_cases: JSON.stringify(validatedCase.relatedCases),
            mitre_attack_techniques: JSON.stringify(validatedCase.mitreAttackTechniques),
            iocs: JSON.stringify(validatedCase.iocs),
            timeline: JSON.stringify(validatedCase.timeline),
            metrics: JSON.stringify(validatedCase.metrics),
            metadata: JSON.stringify(validatedCase.metadata)
        });
        // Add timeline event for significant changes
        const significantChanges = ['status', 'severity', 'priority', 'assignee'];
        const changedFields = Object.keys(updates).filter(key => significantChanges.includes(key));
        if (changedFields.length > 0) {
            await this.addTimelineEvent(caseId, {
                id: (0, uuid_1.v4)(),
                caseId,
                timestamp: now,
                event: 'Case Updated',
                description: `Case updated: ${changedFields.join(', ')} changed`,
                source: userId || 'system',
                sourceType: userId ? 'user-action' : 'system',
                automated: !userId,
                tags: ['case-updated'],
                relatedEntities: [],
                attachments: [],
                metadata: { changes: updates, changedFields }
            });
        }
        // Check for status transitions
        if (updates.status && existingCase.status !== updates.status) {
            await this.handleStatusTransition(existingCase, validatedCase, userId);
        }
        // Emit event
        this.emit('case-updated', { caseId, case: validatedCase, changes: updates });
        logger_1.logger.info(`Updated case ${caseId}: ${changedFields.join(', ')}`);
        return validatedCase;
    }
    async assignCase(caseId, assignee, assignedBy) {
        await this.updateCase(caseId, { assignee }, assignedBy);
        await this.addTimelineEvent(caseId, {
            id: (0, uuid_1.v4)(),
            caseId,
            timestamp: new Date(),
            event: 'Case Assigned',
            description: `Case assigned to ${assignee}`,
            source: assignedBy,
            sourceType: 'user-action',
            automated: assignedBy === 'system',
            tags: ['case-assigned'],
            relatedEntities: [{ type: 'user', value: assignee }],
            attachments: [],
            metadata: { assignee, assignedBy }
        });
        this.emit('case-assigned', { caseId, assignee, assignedBy });
    }
    async closeCase(caseId, resolution, userId) {
        const now = new Date();
        await this.updateCase(caseId, {
            status: 'closed',
            closedAt: now
        }, userId);
        await this.addTimelineEvent(caseId, {
            id: (0, uuid_1.v4)(),
            caseId,
            timestamp: now,
            event: 'Case Closed',
            description: `Case closed: ${resolution}`,
            source: userId,
            sourceType: 'user-action',
            automated: false,
            tags: ['case-closed'],
            relatedEntities: [],
            attachments: [],
            metadata: { resolution }
        });
        this.emit('case-closed', { caseId, resolution, userId });
    }
    // Case Search and Filtering
    async searchCases(criteria) {
        let query = this.db('cases');
        // Apply filters
        if (criteria.status?.length) {
            query = query.whereIn('status', criteria.status);
        }
        if (criteria.severity?.length) {
            query = query.whereIn('severity', criteria.severity);
        }
        if (criteria.priority?.length) {
            query = query.whereIn('priority', criteria.priority);
        }
        if (criteria.assignee) {
            query = query.where('assignee', criteria.assignee);
        }
        if (criteria.reporter) {
            query = query.where('reporter', criteria.reporter);
        }
        if (criteria.dateRange) {
            query = query.whereBetween('created_at', [criteria.dateRange.start, criteria.dateRange.end]);
        }
        if (criteria.textSearch) {
            query = query.where(function () {
                this.where('title', 'like', `%${criteria.textSearch}%`)
                    .orWhere('description', 'like', `%${criteria.textSearch}%`);
            });
        }
        if (criteria.tags?.length) {
            // JSON search for tags
            for (const tag of criteria.tags) {
                query = query.whereRaw('JSON_SEARCH(tags, "one", ?) IS NOT NULL', [tag]);
            }
        }
        // Get total count
        const totalQuery = query.clone();
        const totalResult = await totalQuery.count('* as count').first();
        const total = totalResult?.count || 0;
        // Apply sorting
        const sortBy = criteria.sortBy || 'created_at';
        const sortOrder = criteria.sortOrder || 'desc';
        query = query.orderBy(sortBy, sortOrder);
        // Apply pagination
        if (criteria.limit) {
            query = query.limit(criteria.limit);
        }
        if (criteria.offset) {
            query = query.offset(criteria.offset);
        }
        const rows = await query;
        const cases = rows.map(row => this.mapRowToCase(row));
        return { cases, total };
    }
    // Task Management
    async createTask(taskData) {
        const now = new Date();
        const newTask = {
            id: (0, uuid_1.v4)(),
            createdAt: now,
            updatedAt: now,
            ...taskData
        };
        const validatedTask = incident_response_types_1.TaskSchema.parse(newTask);
        await this.db('case_tasks').insert({
            id: validatedTask.id,
            case_id: validatedTask.caseId,
            title: validatedTask.title,
            description: validatedTask.description,
            status: validatedTask.status,
            assignee: validatedTask.assignee,
            assigned_by: validatedTask.assignedBy,
            created_at: validatedTask.createdAt,
            updated_at: validatedTask.updatedAt,
            due_date: validatedTask.dueDate,
            completed_at: validatedTask.completedAt,
            priority: validatedTask.priority,
            estimated_hours: validatedTask.estimatedHours,
            actual_hours: validatedTask.actualHours,
            dependencies: JSON.stringify(validatedTask.dependencies),
            tags: JSON.stringify(validatedTask.tags),
            checklist: JSON.stringify(validatedTask.checklist),
            comments: JSON.stringify(validatedTask.comments),
            metadata: JSON.stringify(validatedTask.metadata)
        });
        // Add timeline event
        await this.addTimelineEvent(validatedTask.caseId, {
            id: (0, uuid_1.v4)(),
            caseId: validatedTask.caseId,
            timestamp: now,
            event: 'Task Created',
            description: `Task created: ${validatedTask.title}`,
            source: validatedTask.assignedBy,
            sourceType: 'user-action',
            automated: false,
            tags: ['task-created'],
            relatedEntities: validatedTask.assignee ? [{ type: 'user', value: validatedTask.assignee }] : [],
            attachments: [],
            metadata: { taskId: validatedTask.id }
        });
        this.emit('task-created', { taskId: validatedTask.id, task: validatedTask });
        logger_1.logger.info(`Created task ${validatedTask.id} for case ${validatedTask.caseId}`);
        return validatedTask;
    }
    async updateTask(taskId, updates, userId) {
        const existingTask = await this.getTask(taskId);
        if (!existingTask) {
            throw new Error(`Task ${taskId} not found`);
        }
        const now = new Date();
        const updatedTask = { ...existingTask, ...updates, updatedAt: now };
        // Handle completion
        if (updates.status === 'completed' && existingTask.status !== 'completed') {
            updatedTask.completedAt = now;
        }
        const validatedTask = incident_response_types_1.TaskSchema.parse(updatedTask);
        await this.db('case_tasks')
            .where('id', taskId)
            .update({
            title: validatedTask.title,
            description: validatedTask.description,
            status: validatedTask.status,
            assignee: validatedTask.assignee,
            updated_at: validatedTask.updatedAt,
            due_date: validatedTask.dueDate,
            completed_at: validatedTask.completedAt,
            priority: validatedTask.priority,
            estimated_hours: validatedTask.estimatedHours,
            actual_hours: validatedTask.actualHours,
            dependencies: JSON.stringify(validatedTask.dependencies),
            tags: JSON.stringify(validatedTask.tags),
            checklist: JSON.stringify(validatedTask.checklist),
            comments: JSON.stringify(validatedTask.comments),
            metadata: JSON.stringify(validatedTask.metadata)
        });
        // Add timeline event for status changes
        if (updates.status && existingTask.status !== updates.status) {
            await this.addTimelineEvent(validatedTask.caseId, {
                id: (0, uuid_1.v4)(),
                caseId: validatedTask.caseId,
                timestamp: now,
                event: 'Task Status Changed',
                description: `Task "${validatedTask.title}" status changed from ${existingTask.status} to ${updates.status}`,
                source: userId || 'system',
                sourceType: userId ? 'user-action' : 'system',
                automated: !userId,
                tags: ['task-updated', `status-${updates.status}`],
                relatedEntities: [],
                attachments: [],
                metadata: { taskId, oldStatus: existingTask.status, newStatus: updates.status }
            });
        }
        this.emit('task-updated', { taskId, task: validatedTask, changes: updates });
        return validatedTask;
    }
    async getTask(taskId) {
        const row = await this.db('case_tasks').where('id', taskId).first();
        if (!row)
            return null;
        return this.mapRowToTask(row);
    }
    async getCaseTasks(caseId) {
        const rows = await this.db('case_tasks').where('case_id', caseId).orderBy('created_at', 'desc');
        return rows.map(row => this.mapRowToTask(row));
    }
    // Comments
    async addComment(commentData) {
        const comment = {
            id: (0, uuid_1.v4)(),
            timestamp: new Date(),
            ...commentData
        };
        const validatedComment = incident_response_types_1.CommentSchema.parse(comment);
        await this.db('case_comments').insert({
            id: validatedComment.id,
            case_id: validatedComment.caseId,
            task_id: validatedComment.taskId,
            user_id: validatedComment.userId,
            content: validatedComment.content,
            timestamp: validatedComment.timestamp,
            edited: validatedComment.edited,
            edited_at: validatedComment.editedAt,
            mentions: JSON.stringify(validatedComment.mentions),
            attachments: JSON.stringify(validatedComment.attachments),
            is_internal: validatedComment.isInternal,
            metadata: JSON.stringify(validatedComment.metadata)
        });
        // Add timeline event
        await this.addTimelineEvent(validatedComment.caseId, {
            id: (0, uuid_1.v4)(),
            caseId: validatedComment.caseId,
            timestamp: validatedComment.timestamp,
            event: 'Comment Added',
            description: `Comment added${validatedComment.taskId ? ' to task' : ''}`,
            source: validatedComment.userId,
            sourceType: 'user-action',
            automated: false,
            tags: ['comment-added'],
            relatedEntities: validatedComment.mentions.map(userId => ({ type: 'user', value: userId })),
            attachments: validatedComment.attachments,
            metadata: { commentId: validatedComment.id, taskId: validatedComment.taskId }
        });
        this.emit('comment-added', { commentId: validatedComment.id, comment: validatedComment });
        return validatedComment;
    }
    async getCaseComments(caseId) {
        const rows = await this.db('case_comments')
            .where('case_id', caseId)
            .orderBy('timestamp', 'desc');
        return rows.map(row => this.mapRowToComment(row));
    }
    // Timeline Management
    async addTimelineEvent(caseId, eventData) {
        const validatedEvent = incident_response_types_1.TimelineEventSchema.parse(eventData);
        await this.db('case_timeline').insert({
            id: validatedEvent.id,
            case_id: validatedEvent.caseId,
            timestamp: validatedEvent.timestamp,
            event: validatedEvent.event,
            description: validatedEvent.description,
            source: validatedEvent.source,
            source_type: validatedEvent.sourceType,
            severity: validatedEvent.severity,
            user_id: validatedEvent.userId,
            automated: validatedEvent.automated,
            tags: JSON.stringify(validatedEvent.tags),
            related_entities: JSON.stringify(validatedEvent.relatedEntities),
            attachments: JSON.stringify(validatedEvent.attachments),
            metadata: JSON.stringify(validatedEvent.metadata)
        });
    }
    async getCaseTimeline(caseId) {
        const rows = await this.db('case_timeline')
            .where('case_id', caseId)
            .orderBy('timestamp', 'desc');
        return rows.map(row => this.mapRowToTimelineEvent(row));
    }
    // Case Relationships
    async linkCases(parentCaseId, relatedCaseId, relationshipType, userId, notes) {
        await this.db('case_relationships').insert({
            id: (0, uuid_1.v4)(),
            parent_case_id: parentCaseId,
            related_case_id: relatedCaseId,
            relationship_type: relationshipType,
            created_by: userId,
            created_at: new Date(),
            notes
        });
        // Add timeline events to both cases
        const timestamp = new Date();
        await this.addTimelineEvent(parentCaseId, {
            id: (0, uuid_1.v4)(),
            caseId: parentCaseId,
            timestamp,
            event: 'Case Linked',
            description: `Case linked to ${relatedCaseId} as ${relationshipType}`,
            source: userId,
            sourceType: 'user-action',
            automated: false,
            tags: ['case-linked'],
            relatedEntities: [],
            attachments: [],
            metadata: { relatedCaseId, relationshipType }
        });
        await this.addTimelineEvent(relatedCaseId, {
            id: (0, uuid_1.v4)(),
            caseId: relatedCaseId,
            timestamp,
            event: 'Case Linked',
            description: `Case linked from ${parentCaseId} as ${relationshipType}`,
            source: userId,
            sourceType: 'user-action',
            automated: false,
            tags: ['case-linked'],
            relatedEntities: [],
            attachments: [],
            metadata: { parentCaseId, relationshipType }
        });
    }
    async getRelatedCases(caseId) {
        const relationships = await this.db('case_relationships')
            .where('parent_case_id', caseId)
            .orWhere('related_case_id', caseId);
        return relationships.map(rel => ({
            caseId: rel.parent_case_id === caseId ? rel.related_case_id : rel.parent_case_id,
            relationshipType: rel.relationship_type,
            notes: rel.notes
        }));
    }
    // Statistics and Metrics
    async getCaseStatistics() {
        const stats = await this.db('cases')
            .select(this.db.raw('COUNT(*) as total'), this.db.raw('COUNT(CASE WHEN status = "open" THEN 1 END) as open'), this.db.raw('COUNT(CASE WHEN status = "in-progress" THEN 1 END) as in_progress'), this.db.raw('COUNT(CASE WHEN status = "resolved" THEN 1 END) as resolved'), this.db.raw('COUNT(CASE WHEN status = "closed" THEN 1 END) as closed'), this.db.raw('COUNT(CASE WHEN severity = "critical" THEN 1 END) as critical'), this.db.raw('COUNT(CASE WHEN severity = "high" THEN 1 END) as high'), this.db.raw('COUNT(CASE WHEN severity = "medium" THEN 1 END) as medium'), this.db.raw('COUNT(CASE WHEN severity = "low" THEN 1 END) as low'))
            .first();
        const recentActivity = await this.db('cases')
            .where('created_at', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000))
            .count('* as count')
            .first();
        return {
            total: stats.total,
            byStatus: {
                open: stats.open,
                'in-progress': stats.in_progress,
                resolved: stats.resolved,
                closed: stats.closed
            },
            bySeverity: {
                critical: stats.critical,
                high: stats.high,
                medium: stats.medium,
                low: stats.low
            },
            recentActivity: recentActivity?.count || 0
        };
    }
    // Helper Methods
    async getAutoAssignee(caseToAssign) {
        // Simple round-robin assignment based on case count
        // In production, this would be more sophisticated
        const analysts = await this.db.raw(`
      SELECT assignee, COUNT(*) as case_count 
      FROM cases 
      WHERE status IN ('open', 'in-progress') 
      AND assignee IS NOT NULL 
      GROUP BY assignee 
      ORDER BY case_count ASC 
      LIMIT 1
    `);
        return analysts.length > 0 ? analysts[0].assignee : null;
    }
    async handleStatusTransition(oldCase, newCase, userId) {
        // Handle specific status transitions
        if (newCase.status === 'closed' && oldCase.status !== 'closed') {
            // Calculate resolution time
            const resolutionTime = newCase.closedAt.getTime() - oldCase.createdAt.getTime();
            await this.updateCase(newCase.id, {
                metrics: {
                    ...newCase.metrics,
                    timeToResolution: resolutionTime
                }
            });
        }
        // Emit status-specific events
        this.emit('case-status-changed', {
            caseId: newCase.id,
            oldStatus: oldCase.status,
            newStatus: newCase.status,
            userId
        });
    }
    // Data Mapping Methods
    mapRowToCase(row) {
        return {
            id: row.id,
            title: row.title,
            description: row.description,
            severity: row.severity,
            priority: row.priority,
            status: row.status,
            assignee: row.assignee,
            reporter: row.reporter,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            closedAt: row.closed_at ? new Date(row.closed_at) : undefined,
            dueDate: row.due_date ? new Date(row.due_date) : undefined,
            tags: JSON.parse(row.tags || '[]'),
            category: row.category,
            subcategory: row.subcategory,
            affectedSystems: JSON.parse(row.affected_systems || '[]'),
            affectedUsers: JSON.parse(row.affected_users || '[]'),
            sourceAlerts: JSON.parse(row.source_alerts || '[]'),
            relatedCases: JSON.parse(row.related_cases || '[]'),
            mitreAttackTechniques: JSON.parse(row.mitre_attack_techniques || '[]'),
            iocs: JSON.parse(row.iocs || '[]'),
            timeline: JSON.parse(row.timeline || '[]'),
            metrics: JSON.parse(row.metrics || '{}'),
            metadata: JSON.parse(row.metadata || '{}')
        };
    }
    mapRowToTask(row) {
        return {
            id: row.id,
            caseId: row.case_id,
            title: row.title,
            description: row.description,
            status: row.status,
            assignee: row.assignee,
            assignedBy: row.assigned_by,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            dueDate: row.due_date ? new Date(row.due_date) : undefined,
            completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
            priority: row.priority,
            estimatedHours: row.estimated_hours,
            actualHours: row.actual_hours,
            dependencies: JSON.parse(row.dependencies || '[]'),
            tags: JSON.parse(row.tags || '[]'),
            checklist: JSON.parse(row.checklist || '[]'),
            comments: JSON.parse(row.comments || '[]'),
            metadata: JSON.parse(row.metadata || '{}')
        };
    }
    mapRowToComment(row) {
        return {
            id: row.id,
            caseId: row.case_id,
            taskId: row.task_id,
            userId: row.user_id,
            content: row.content,
            timestamp: new Date(row.timestamp),
            edited: row.edited,
            editedAt: row.edited_at ? new Date(row.edited_at) : undefined,
            mentions: JSON.parse(row.mentions || '[]'),
            attachments: JSON.parse(row.attachments || '[]'),
            isInternal: row.is_internal,
            metadata: JSON.parse(row.metadata || '{}')
        };
    }
    mapRowToTimelineEvent(row) {
        return {
            id: row.id,
            caseId: row.case_id,
            timestamp: new Date(row.timestamp),
            event: row.event,
            description: row.description,
            source: row.source,
            sourceType: row.source_type,
            severity: row.severity,
            userId: row.user_id,
            automated: row.automated,
            tags: JSON.parse(row.tags || '[]'),
            relatedEntities: JSON.parse(row.related_entities || '[]'),
            attachments: JSON.parse(row.attachments || '[]'),
            metadata: JSON.parse(row.metadata || '{}')
        };
    }
    // Cleanup and Shutdown
    async shutdown() {
        logger_1.logger.info('Shutting down Case Management Service');
        await this.db.destroy();
        logger_1.logger.info('Case Management Service shutdown complete');
    }
}
exports.CaseManagementService = CaseManagementService;
