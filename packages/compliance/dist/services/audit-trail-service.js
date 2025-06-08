"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditTrailService = void 0;
const events_1 = require("events");
const uuid_1 = require("uuid");
const knex_1 = __importDefault(require("knex"));
const logger_1 = require("../utils/logger");
const compliance_types_1 = require("../types/compliance.types");
class AuditTrailService extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.alertRules = new Map();
        this.sessionCache = new Map();
        this.BATCH_SIZE = 1000;
        this.pendingEvents = [];
        this.batchTimer = null;
        this.db = (0, knex_1.default)({
            client: config.database.type,
            connection: config.database.connection,
            useNullAsDefault: true
        });
    }
    async initialize() {
        logger_1.logger.info('Initializing Audit Trail Service');
        await this.createTables();
        await this.loadAlertRules();
        await this.createIndexes();
        logger_1.logger.info('Audit Trail Service initialized successfully');
    }
    async createTables() {
        // Main audit events table
        if (!(await this.db.schema.hasTable('audit_events'))) {
            await this.db.schema.createTable('audit_events', (table) => {
                table.string('id').primary();
                table.dateTime('timestamp').notNullable();
                table.string('user_id').notNullable();
                table.string('user_email').notNullable();
                table.string('user_role').notNullable();
                table.string('action').notNullable();
                table.json('resource');
                table.json('details');
                table.string('result').notNullable();
                table.string('ip_address').notNullable();
                table.string('user_agent');
                table.string('session_id').notNullable();
                table.string('correlation_id');
                table.json('compliance');
                table.dateTime('indexed_at');
                table.index(['timestamp']);
                table.index(['user_id']);
                table.index(['action']);
                table.index(['session_id']);
                table.index(['result']);
            });
        }
        // Audit retention policies table
        if (!(await this.db.schema.hasTable('audit_retention_policies'))) {
            await this.db.schema.createTable('audit_retention_policies', (table) => {
                table.string('id').primary();
                table.string('name').notNullable();
                table.text('description');
                table.integer('retention_days').notNullable();
                table.json('actions');
                table.json('resource_types');
                table.integer('priority').defaultTo(0);
                table.boolean('active').defaultTo(true);
                table.dateTime('created_at').notNullable();
                table.dateTime('updated_at').notNullable();
                table.index(['active', 'priority']);
            });
        }
        // Audit alert rules table
        if (!(await this.db.schema.hasTable('audit_alert_rules'))) {
            await this.db.schema.createTable('audit_alert_rules', (table) => {
                table.string('id').primary();
                table.string('name').notNullable();
                table.text('description');
                table.json('conditions');
                table.json('notifications');
                table.string('severity').notNullable();
                table.boolean('active').defaultTo(true);
                table.integer('trigger_count').defaultTo(0);
                table.dateTime('last_triggered');
                table.dateTime('created_at').notNullable();
                table.dateTime('updated_at').notNullable();
                table.index(['active']);
                table.index(['severity']);
            });
        }
        // Audit statistics table (for performance)
        if (!(await this.db.schema.hasTable('audit_statistics'))) {
            await this.db.schema.createTable('audit_statistics', (table) => {
                table.string('id').primary();
                table.string('stat_type').notNullable(); // 'daily', 'hourly', 'action', 'user'
                table.string('stat_key').notNullable();
                table.integer('count').defaultTo(0);
                table.dateTime('period_start').notNullable();
                table.dateTime('period_end').notNullable();
                table.json('metadata');
                table.dateTime('created_at').notNullable();
                table.index(['stat_type', 'period_start']);
                table.index(['stat_key']);
                table.unique(['stat_type', 'stat_key', 'period_start']);
            });
        }
        // Session tracking table
        if (!(await this.db.schema.hasTable('audit_sessions'))) {
            await this.db.schema.createTable('audit_sessions', (table) => {
                table.string('id').primary();
                table.string('session_id').notNullable().unique();
                table.string('user_id').notNullable();
                table.string('ip_address').notNullable();
                table.string('user_agent');
                table.dateTime('started_at').notNullable();
                table.dateTime('last_activity').notNullable();
                table.dateTime('ended_at');
                table.json('metadata');
                table.index(['user_id']);
                table.index(['started_at']);
                table.index(['session_id']);
            });
        }
    }
    async createIndexes() {
        // Create additional indexes for performance
        const hasComplianceIndex = await this.db.schema.hasColumn('audit_events', 'compliance_framework_id');
        if (!hasComplianceIndex) {
            await this.db.schema.alterTable('audit_events', (table) => {
                table.index(['timestamp', 'user_id'], 'idx_timestamp_user');
                table.index(['timestamp', 'action'], 'idx_timestamp_action');
                table.index(['ip_address', 'timestamp'], 'idx_ip_timestamp');
            });
        }
    }
    async loadAlertRules() {
        const rules = await this.db('audit_alert_rules').where('active', true);
        for (const rule of rules) {
            this.alertRules.set(rule.id, {
                id: rule.id,
                name: rule.name,
                description: rule.description,
                conditions: JSON.parse(rule.conditions),
                notifications: JSON.parse(rule.notifications),
                severity: rule.severity,
                active: true
            });
        }
        logger_1.logger.info(`Loaded ${this.alertRules.size} active alert rules`);
    }
    // Audit Event Logging
    async logEvent(event) {
        const auditEvent = {
            id: (0, uuid_1.v4)(),
            ...event
        };
        const validatedEvent = compliance_types_1.AuditEventSchema.parse(auditEvent);
        // Add to pending batch
        this.pendingEvents.push(validatedEvent);
        // Process batch if it's full
        if (this.pendingEvents.length >= this.BATCH_SIZE) {
            await this.processBatch();
        }
        else {
            // Schedule batch processing if not already scheduled
            if (!this.batchTimer) {
                this.batchTimer = setTimeout(() => this.processBatch(), 5000); // 5 second batch window
            }
        }
        // Check alert rules asynchronously
        setImmediate(() => this.checkAlertRules(validatedEvent));
        // Update session tracking
        await this.updateSessionActivity(validatedEvent.sessionId, validatedEvent.timestamp);
        return validatedEvent;
    }
    async processBatch() {
        if (this.pendingEvents.length === 0)
            return;
        const events = [...this.pendingEvents];
        this.pendingEvents = [];
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }
        try {
            // Insert events in batch
            await this.db('audit_events').insert(events.map(event => ({
                id: event.id,
                timestamp: event.timestamp,
                user_id: event.userId,
                user_email: event.userEmail,
                user_role: event.userRole,
                action: event.action,
                resource: JSON.stringify(event.resource),
                details: JSON.stringify(event.details),
                result: event.result,
                ip_address: event.ipAddress,
                user_agent: event.userAgent,
                session_id: event.sessionId,
                correlation_id: event.correlationId,
                compliance: event.compliance ? JSON.stringify(event.compliance) : null,
                indexed_at: new Date()
            })));
            // Update statistics
            await this.updateStatistics(events);
            this.emit('batch-processed', { count: events.length });
            logger_1.logger.debug(`Processed batch of ${events.length} audit events`);
        }
        catch (error) {
            logger_1.logger.error('Failed to process audit batch:', error);
            // Re-queue events for retry
            this.pendingEvents.unshift(...events);
            throw error;
        }
    }
    async updateStatistics(events) {
        const statUpdates = new Map();
        for (const event of events) {
            const hourKey = `hourly:${event.timestamp.toISOString().slice(0, 13)}`;
            const actionKey = `action:${event.action}`;
            const userKey = `user:${event.userId}`;
            const resultKey = `result:${event.result}`;
            // Increment counters
            statUpdates.set(hourKey, (statUpdates.get(hourKey) || 0) + 1);
            statUpdates.set(actionKey, (statUpdates.get(actionKey) || 0) + 1);
            statUpdates.set(userKey, (statUpdates.get(userKey) || 0) + 1);
            statUpdates.set(resultKey, (statUpdates.get(resultKey) || 0) + 1);
        }
        // Batch update statistics
        const now = new Date();
        for (const [key, count] of statUpdates) {
            const [type, value] = key.split(':', 2);
            await this.db('audit_statistics')
                .insert({
                id: (0, uuid_1.v4)(),
                stat_type: type,
                stat_key: value,
                count,
                period_start: type === 'hourly' ? new Date(value + ':00:00Z') : new Date(now.toISOString().slice(0, 10)),
                period_end: type === 'hourly' ? new Date(value + ':59:59Z') : new Date(now.toISOString().slice(0, 10) + 'T23:59:59Z'),
                created_at: now
            })
                .onConflict(['stat_type', 'stat_key', 'period_start'])
                .merge({
                count: this.db.raw('audit_statistics.count + ?', [count])
            });
        }
    }
    // Session Management
    async createSession(sessionId, userId, ipAddress, userAgent) {
        const now = new Date();
        await this.db('audit_sessions').insert({
            id: (0, uuid_1.v4)(),
            session_id: sessionId,
            user_id: userId,
            ip_address: ipAddress,
            user_agent: userAgent,
            started_at: now,
            last_activity: now,
            metadata: JSON.stringify({})
        });
        this.sessionCache.set(sessionId, {
            userId,
            ipAddress,
            userAgent,
            startedAt: now
        });
    }
    async updateSessionActivity(sessionId, timestamp) {
        await this.db('audit_sessions')
            .where('session_id', sessionId)
            .update({ last_activity: timestamp });
    }
    async endSession(sessionId) {
        await this.db('audit_sessions')
            .where('session_id', sessionId)
            .update({ ended_at: new Date() });
        this.sessionCache.delete(sessionId);
    }
    // Search and Retrieval
    async searchEvents(filters, pagination) {
        let query = this.db('audit_events');
        let countQuery = this.db('audit_events');
        // Apply filters
        if (filters.userIds && filters.userIds.length > 0) {
            query = query.whereIn('user_id', filters.userIds);
            countQuery = countQuery.whereIn('user_id', filters.userIds);
        }
        if (filters.actions && filters.actions.length > 0) {
            query = query.whereIn('action', filters.actions);
            countQuery = countQuery.whereIn('action', filters.actions);
        }
        if (filters.resourceTypes && filters.resourceTypes.length > 0) {
            query = query.whereIn(this.db.raw("json_extract(resource, '$.type')"), filters.resourceTypes);
            countQuery = countQuery.whereIn(this.db.raw("json_extract(resource, '$.type')"), filters.resourceTypes);
        }
        if (filters.dateRange) {
            query = query.whereBetween('timestamp', [filters.dateRange.start, filters.dateRange.end]);
            countQuery = countQuery.whereBetween('timestamp', [filters.dateRange.start, filters.dateRange.end]);
        }
        if (filters.results && filters.results.length > 0) {
            query = query.whereIn('result', filters.results);
            countQuery = countQuery.whereIn('result', filters.results);
        }
        if (filters.ipAddresses && filters.ipAddresses.length > 0) {
            query = query.whereIn('ip_address', filters.ipAddresses);
            countQuery = countQuery.whereIn('ip_address', filters.ipAddresses);
        }
        if (filters.query) {
            const searchTerm = `%${filters.query}%`;
            query = query.where(function () {
                this.where('user_email', 'like', searchTerm)
                    .orWhere('action', 'like', searchTerm)
                    .orWhere('details', 'like', searchTerm);
            });
            countQuery = countQuery.where(function () {
                this.where('user_email', 'like', searchTerm)
                    .orWhere('action', 'like', searchTerm)
                    .orWhere('details', 'like', searchTerm);
            });
        }
        // Get total count
        const totalResult = await countQuery.count('* as count').first();
        const total = totalResult?.count || 0;
        // Apply sorting and pagination
        const sortBy = pagination.sortBy || 'timestamp';
        const sortOrder = pagination.sortOrder || 'desc';
        const offset = (pagination.page - 1) * pagination.limit;
        const rows = await query
            .orderBy(sortBy, sortOrder)
            .limit(pagination.limit)
            .offset(offset);
        const events = rows.map((row) => this.parseEventRow(row));
        return { events, total };
    }
    async getEvent(eventId) {
        const row = await this.db('audit_events').where('id', eventId).first();
        if (!row)
            return null;
        return this.parseEventRow(row);
    }
    async getUserActivity(userId, dateRange) {
        let query = this.db('audit_events').where('user_id', userId);
        if (dateRange) {
            query = query.whereBetween('timestamp', [dateRange.start, dateRange.end]);
        }
        const rows = await query.orderBy('timestamp', 'desc').limit(1000);
        return rows.map((row) => this.parseEventRow(row));
    }
    async getSessionActivity(sessionId) {
        const rows = await this.db('audit_events')
            .where('session_id', sessionId)
            .orderBy('timestamp', 'asc');
        return rows.map((row) => this.parseEventRow(row));
    }
    // Analytics and Reporting
    async getAuditStatistics(dateRange) {
        // Get basic counts
        const totalResult = await this.db('audit_events')
            .whereBetween('timestamp', [dateRange.start, dateRange.end])
            .count('* as count')
            .first();
        const total = totalResult?.count || 0;
        // Get events by action
        const actionStats = await this.db('audit_events')
            .whereBetween('timestamp', [dateRange.start, dateRange.end])
            .select('action')
            .count('* as count')
            .groupBy('action')
            .orderBy('count', 'desc');
        const eventsByAction = {};
        actionStats.forEach(stat => {
            eventsByAction[stat.action] = stat.count;
        });
        // Get events by user
        const userStats = await this.db('audit_events')
            .whereBetween('timestamp', [dateRange.start, dateRange.end])
            .select('user_id', 'user_email')
            .count('* as count')
            .groupBy(['user_id', 'user_email'])
            .orderBy('count', 'desc')
            .limit(10);
        const eventsByUser = {};
        userStats.forEach(stat => {
            eventsByUser[stat.user_email] = stat.count;
        });
        // Get events by result
        const resultStats = await this.db('audit_events')
            .whereBetween('timestamp', [dateRange.start, dateRange.end])
            .select('result')
            .count('* as count')
            .groupBy('result');
        const eventsByResult = {};
        resultStats.forEach(stat => {
            eventsByResult[stat.result] = stat.count;
        });
        // Get hourly distribution
        const hourlyStats = await this.db('audit_statistics')
            .where('stat_type', 'hourly')
            .whereBetween('period_start', [dateRange.start, dateRange.end])
            .select('stat_key', 'count');
        const eventsByHour = {};
        hourlyStats.forEach(stat => {
            const hour = new Date(stat.stat_key + ':00:00Z').getHours();
            eventsByHour[hour.toString()] = (eventsByHour[hour.toString()] || 0) + stat.count;
        });
        // Get top resources
        const resourceStats = await this.db('audit_events')
            .whereBetween('timestamp', [dateRange.start, dateRange.end])
            .select(this.db.raw("json_extract(resource, '$.type') as type"))
            .select(this.db.raw("json_extract(resource, '$.id') as id"))
            .count('* as count')
            .groupBy(['type', 'id'])
            .orderBy('count', 'desc')
            .limit(10);
        const topResources = resourceStats.map(stat => ({
            type: stat.type,
            id: stat.id,
            count: stat.count
        }));
        // Detect suspicious activities
        const suspiciousActivities = await this.detectSuspiciousActivities(dateRange);
        return {
            totalEvents: total,
            eventsByAction,
            eventsByUser,
            eventsByResult,
            eventsByHour,
            topResources,
            suspiciousActivities
        };
    }
    async detectSuspiciousActivities(dateRange) {
        const activities = [];
        // Check for multiple failed logins
        const failedLogins = await this.db('audit_events')
            .whereBetween('timestamp', [dateRange.start, dateRange.end])
            .where('action', 'login')
            .where('result', 'failure')
            .select('user_id', 'ip_address')
            .count('* as count')
            .groupBy(['user_id', 'ip_address'])
            .having('count', '>', 5);
        failedLogins.forEach(item => {
            activities.push({
                type: 'multiple_failed_logins',
                description: `${item.count} failed login attempts from ${item.ip_address}`,
                severity: item.count > 10 ? 'high' : 'medium',
                timestamp: new Date()
            });
        });
        // Check for unusual access patterns
        const unusualHours = await this.db('audit_events')
            .whereBetween('timestamp', [dateRange.start, dateRange.end])
            .whereRaw('EXTRACT(HOUR FROM timestamp) NOT BETWEEN 6 AND 22')
            .select('user_id')
            .countDistinct('DATE(timestamp) as days')
            .groupBy('user_id')
            .having('days', '>', 3);
        unusualHours.forEach(item => {
            activities.push({
                type: 'unusual_access_hours',
                description: `User accessed system during unusual hours on ${item.days} days`,
                severity: 'low',
                timestamp: new Date()
            });
        });
        // Check for privilege escalation attempts
        const privEscalation = await this.db('audit_events')
            .whereBetween('timestamp', [dateRange.start, dateRange.end])
            .whereIn('action', ['role_change', 'permission_grant', 'privilege_escalation'])
            .where('result', 'failure')
            .select('user_id')
            .count('* as count')
            .groupBy('user_id')
            .having('count', '>', 3);
        privEscalation.forEach(item => {
            activities.push({
                type: 'privilege_escalation_attempts',
                description: `${item.count} failed privilege escalation attempts`,
                severity: 'high',
                timestamp: new Date()
            });
        });
        return activities;
    }
    // Alert Rule Management
    async createAlertRule(rule) {
        const newRule = {
            id: (0, uuid_1.v4)(),
            ...rule
        };
        await this.db('audit_alert_rules').insert({
            id: newRule.id,
            name: newRule.name,
            description: newRule.description,
            conditions: JSON.stringify(newRule.conditions),
            notifications: JSON.stringify(newRule.notifications),
            severity: newRule.severity,
            active: newRule.active,
            created_at: new Date(),
            updated_at: new Date()
        });
        if (newRule.active) {
            this.alertRules.set(newRule.id, newRule);
        }
        return newRule;
    }
    async checkAlertRules(event) {
        for (const [ruleId, rule] of this.alertRules) {
            if (this.matchesAlertConditions(event, rule.conditions)) {
                await this.triggerAlert(rule, event);
            }
        }
    }
    matchesAlertConditions(event, conditions) {
        if (conditions.actions && !conditions.actions.includes(event.action)) {
            return false;
        }
        if (conditions.results && !conditions.results.includes(event.result)) {
            return false;
        }
        if (conditions.userPatterns) {
            const matchesPattern = conditions.userPatterns.some((pattern) => new RegExp(pattern).test(event.userEmail));
            if (!matchesPattern)
                return false;
        }
        if (conditions.ipPatterns) {
            const matchesPattern = conditions.ipPatterns.some((pattern) => new RegExp(pattern).test(event.ipAddress));
            if (!matchesPattern)
                return false;
        }
        return true;
    }
    async triggerAlert(rule, event) {
        logger_1.logger.warn(`Alert triggered: ${rule.name} for event ${event.id}`);
        // Update trigger count
        await this.db('audit_alert_rules')
            .where('id', rule.id)
            .update({
            trigger_count: this.db.raw('trigger_count + 1'),
            last_triggered: new Date()
        });
        // Send notifications
        if (rule.notifications.email && rule.notifications.email.length > 0) {
            // In production, integrate with email service
            logger_1.logger.info(`Would send email to: ${rule.notifications.email.join(', ')}`);
        }
        if (rule.notifications.webhook) {
            // In production, send webhook
            logger_1.logger.info(`Would send webhook to: ${rule.notifications.webhook}`);
        }
        this.emit('alert-triggered', { rule, event });
    }
    // Retention and Cleanup
    async applyRetentionPolicies() {
        const policies = await this.db('audit_retention_policies')
            .where('active', true)
            .orderBy('priority', 'desc');
        let totalDeleted = 0;
        for (const policy of policies) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - policy.retention_days);
            let deleteQuery = this.db('audit_events')
                .where('timestamp', '<', cutoffDate);
            if (policy.actions) {
                const actions = JSON.parse(policy.actions);
                deleteQuery = deleteQuery.whereIn('action', actions);
            }
            if (policy.resource_types) {
                const types = JSON.parse(policy.resource_types);
                deleteQuery = deleteQuery.whereIn(this.db.raw("json_extract(resource, '$.type')"), types);
            }
            const deleted = await deleteQuery.delete();
            totalDeleted += deleted;
            logger_1.logger.info(`Retention policy ${policy.name}: deleted ${deleted} events`);
        }
        return totalDeleted;
    }
    // Export functionality
    async exportAuditLog(filters, format) {
        const { events } = await this.searchEvents(filters, {
            page: 1,
            limit: 100000 // Reasonable limit for export
        });
        if (format === 'json') {
            return JSON.stringify(events, null, 2);
        }
        else if (format === 'csv') {
            const headers = [
                'ID', 'Timestamp', 'User ID', 'User Email', 'User Role',
                'Action', 'Resource Type', 'Resource ID', 'Result',
                'IP Address', 'Session ID'
            ];
            const rows = events.map(event => [
                event.id,
                event.timestamp.toISOString(),
                event.userId,
                event.userEmail,
                event.userRole,
                event.action,
                event.resource.type,
                event.resource.id,
                event.result,
                event.ipAddress,
                event.sessionId
            ]);
            return [headers, ...rows].map(row => row.join(',')).join('\n');
        }
        throw new Error(`Unsupported export format: ${format}`);
    }
    parseEventRow(row) {
        return {
            id: row.id,
            timestamp: new Date(row.timestamp),
            userId: row.user_id,
            userEmail: row.user_email,
            userRole: row.user_role,
            action: row.action,
            resource: JSON.parse(row.resource),
            details: JSON.parse(row.details),
            result: row.result,
            ipAddress: row.ip_address,
            userAgent: row.user_agent,
            sessionId: row.session_id,
            correlationId: row.correlation_id,
            compliance: row.compliance ? JSON.parse(row.compliance) : undefined
        };
    }
    async shutdown() {
        logger_1.logger.info('Shutting down Audit Trail Service');
        // Process any pending events
        if (this.pendingEvents.length > 0) {
            await this.processBatch();
        }
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
        }
        await this.db.destroy();
        logger_1.logger.info('Audit Trail Service shutdown complete');
    }
}
exports.AuditTrailService = AuditTrailService;
//# sourceMappingURL=audit-trail-service.js.map