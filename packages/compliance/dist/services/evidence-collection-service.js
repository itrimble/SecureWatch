"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceCollectionService = void 0;
const events_1 = require("events");
const uuid_1 = require("uuid");
const knex_1 = __importDefault(require("knex"));
const crypto = __importStar(require("crypto"));
const logger_1 = require("../utils/logger");
const compliance_types_1 = require("../types/compliance.types");
class EvidenceCollectionService extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.collectors = new Map();
        this.collectionJobs = new Map();
        this.scheduledJobs = new Map();
        this.db = (0, knex_1.default)({
            client: config.database.type,
            connection: config.database.connection,
            useNullAsDefault: true
        });
        // Register built-in collectors
        this.registerBuiltInCollectors();
    }
    async initialize() {
        logger_1.logger.info('Initializing Evidence Collection Service');
        await this.createTables();
        await this.loadCollectionRules();
        logger_1.logger.info('Evidence Collection Service initialized successfully');
    }
    async createTables() {
        // Evidence collection rules table
        if (!(await this.db.schema.hasTable('evidence_collection_rules'))) {
            await this.db.schema.createTable('evidence_collection_rules', (table) => {
                table.string('id').primary();
                table.string('name').notNullable();
                table.text('description');
                table.string('framework_id').notNullable();
                table.json('control_ids');
                table.string('evidence_type').notNullable();
                table.json('automation');
                table.json('collector');
                table.json('validation');
                table.boolean('active').defaultTo(true);
                table.dateTime('created_at').notNullable();
                table.dateTime('updated_at').notNullable();
                table.index(['framework_id']);
                table.index(['evidence_type']);
                table.index(['active']);
            });
        }
        // Collected evidence table
        if (!(await this.db.schema.hasTable('compliance_evidence'))) {
            await this.db.schema.createTable('compliance_evidence', (table) => {
                table.string('id').primary();
                table.string('type').notNullable();
                table.string('source').notNullable();
                table.dateTime('collected_at').notNullable();
                table.string('collector_id').notNullable();
                table.json('data');
                table.string('hash').notNullable();
                table.bigInteger('size');
                table.json('retention');
                table.json('metadata');
                table.boolean('verified').defaultTo(false);
                table.dateTime('expires_at');
                table.index(['type']);
                table.index(['source']);
                table.index(['collected_at']);
                table.index(['hash']);
                table.index(['expires_at']);
            });
        }
        // Evidence-to-control mapping table
        if (!(await this.db.schema.hasTable('evidence_control_mapping'))) {
            await this.db.schema.createTable('evidence_control_mapping', (table) => {
                table.string('id').primary();
                table.string('evidence_id').notNullable();
                table.string('framework_id').notNullable();
                table.string('control_id').notNullable();
                table.dateTime('mapped_at').notNullable();
                table.string('mapped_by');
                table.foreign('evidence_id').references('compliance_evidence.id').onDelete('CASCADE');
                table.index(['framework_id', 'control_id']);
                table.index(['evidence_id']);
                table.unique(['evidence_id', 'framework_id', 'control_id']);
            });
        }
        // Collection history table
        if (!(await this.db.schema.hasTable('evidence_collection_history'))) {
            await this.db.schema.createTable('evidence_collection_history', (table) => {
                table.string('id').primary();
                table.string('rule_id').notNullable();
                table.string('job_id');
                table.dateTime('started_at').notNullable();
                table.dateTime('completed_at');
                table.string('status').notNullable();
                table.integer('evidence_count').defaultTo(0);
                table.json('result');
                table.text('error');
                table.integer('duration_ms');
                table.foreign('rule_id').references('evidence_collection_rules.id').onDelete('CASCADE');
                table.index(['rule_id', 'started_at']);
                table.index(['status']);
                table.index(['started_at']);
            });
        }
    }
    registerBuiltInCollectors() {
        // API Collector
        this.registerCollector({
            type: 'api',
            name: 'rest-api-collector',
            description: 'Collects evidence from REST APIs',
            collect: async (config) => {
                const { url, method = 'GET', headers = {}, body } = config;
                try {
                    const response = await fetch(url, {
                        method,
                        headers: {
                            'Content-Type': 'application/json',
                            ...headers
                        },
                        body: body ? JSON.stringify(body) : undefined
                    });
                    if (!response.ok) {
                        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
                    }
                    const data = await response.json();
                    return data;
                }
                catch (error) {
                    logger_1.logger.error('API collection failed:', error);
                    throw error;
                }
            },
            validate: (data) => data !== null && data !== undefined
        });
        // Database Query Collector
        this.registerCollector({
            type: 'query',
            name: 'database-query-collector',
            description: 'Collects evidence from database queries',
            collect: async (config) => {
                const { query, params = [] } = config;
                try {
                    // This is a simplified example - in production, you'd have proper connection pooling
                    const results = await this.db.raw(query, params);
                    return results;
                }
                catch (error) {
                    logger_1.logger.error('Database query collection failed:', error);
                    throw error;
                }
            }
        });
        // File System Collector
        this.registerCollector({
            type: 'script',
            name: 'filesystem-collector',
            description: 'Collects evidence from file system',
            collect: async (config) => {
                const { path, type = 'content' } = config;
                const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
                try {
                    if (type === 'content') {
                        const content = await fs.readFile(path, 'utf-8');
                        return { path, content, size: content.length };
                    }
                    else if (type === 'metadata') {
                        const stats = await fs.stat(path);
                        return {
                            path,
                            size: stats.size,
                            created: stats.birthtime,
                            modified: stats.mtime,
                            accessed: stats.atime,
                            permissions: stats.mode
                        };
                    }
                    else if (type === 'hash') {
                        const content = await fs.readFile(path);
                        const hash = crypto.createHash('sha256').update(content).digest('hex');
                        return { path, hash, size: content.length };
                    }
                }
                catch (error) {
                    logger_1.logger.error('File system collection failed:', error);
                    throw error;
                }
            }
        });
        // System Command Collector
        this.registerCollector({
            type: 'script',
            name: 'command-collector',
            description: 'Collects evidence from system commands',
            collect: async (config) => {
                const { command, args = [], timeout = 30000 } = config;
                const { exec } = await Promise.resolve().then(() => __importStar(require('child_process')));
                const { promisify } = await Promise.resolve().then(() => __importStar(require('util')));
                const execAsync = promisify(exec);
                try {
                    const { stdout, stderr } = await execAsync(`${command} ${args.join(' ')}`, {
                        timeout
                    });
                    return {
                        command,
                        args,
                        stdout: stdout.trim(),
                        stderr: stderr.trim(),
                        executedAt: new Date()
                    };
                }
                catch (error) {
                    logger_1.logger.error('Command execution failed:', error);
                    throw error;
                }
            }
        });
        // Configuration Snapshot Collector
        this.registerCollector({
            type: 'script',
            name: 'config-snapshot-collector',
            description: 'Collects configuration snapshots',
            collect: async (config) => {
                const { target, format = 'json' } = config;
                // This is a mock implementation - in production, this would integrate
                // with various configuration management tools
                const mockConfigs = {
                    'firewall-rules': {
                        rules: [
                            { id: 1, name: 'Allow HTTPS', port: 443, protocol: 'tcp', action: 'allow' },
                            { id: 2, name: 'Allow SSH', port: 22, protocol: 'tcp', action: 'allow', source: '10.0.0.0/8' }
                        ],
                        defaultAction: 'deny'
                    },
                    'user-permissions': {
                        users: [
                            { username: 'admin', roles: ['administrator'], lastLogin: '2024-01-15T10:30:00Z' },
                            { username: 'auditor', roles: ['read-only', 'compliance'], lastLogin: '2024-01-15T09:00:00Z' }
                        ]
                    },
                    'system-patches': {
                        installed: [
                            { id: 'KB5021233', name: 'Security Update', installedDate: '2024-01-10', severity: 'critical' },
                            { id: 'KB5021234', name: 'Quality Update', installedDate: '2024-01-12', severity: 'important' }
                        ],
                        pending: []
                    }
                };
                return mockConfigs[target] || { error: 'Unknown configuration target' };
            }
        });
    }
    registerCollector(collector) {
        const key = `${collector.type}:${collector.name}`;
        this.collectors.set(key, collector);
        logger_1.logger.info(`Registered collector: ${key}`);
    }
    // Evidence Collection Rule Management
    async createCollectionRule(ruleData) {
        const now = new Date();
        const newRule = {
            id: (0, uuid_1.v4)(),
            ...ruleData
        };
        const validatedRule = compliance_types_1.EvidenceCollectionRuleSchema.parse(newRule);
        await this.db('evidence_collection_rules').insert({
            id: validatedRule.id,
            name: validatedRule.name,
            description: validatedRule.description,
            framework_id: validatedRule.frameworkId,
            control_ids: JSON.stringify(validatedRule.controlIds),
            evidence_type: validatedRule.evidenceType,
            automation: JSON.stringify(validatedRule.automation),
            collector: JSON.stringify(validatedRule.collector),
            validation: validatedRule.validation ? JSON.stringify(validatedRule.validation) : null,
            active: validatedRule.active,
            created_at: now,
            updated_at: now
        });
        // Schedule if automation is enabled
        if (validatedRule.automation.enabled && validatedRule.automation.schedule) {
            this.scheduleCollection(validatedRule);
        }
        this.emit('collection-rule-created', { ruleId: validatedRule.id, rule: validatedRule });
        logger_1.logger.info(`Created evidence collection rule: ${validatedRule.name}`);
        return validatedRule;
    }
    async updateCollectionRule(ruleId, updates) {
        const existing = await this.getCollectionRule(ruleId);
        if (!existing) {
            throw new Error(`Collection rule not found: ${ruleId}`);
        }
        const updated = { ...existing, ...updates };
        const validatedRule = compliance_types_1.EvidenceCollectionRuleSchema.parse(updated);
        await this.db('evidence_collection_rules')
            .where('id', ruleId)
            .update({
            name: validatedRule.name,
            description: validatedRule.description,
            control_ids: JSON.stringify(validatedRule.controlIds),
            evidence_type: validatedRule.evidenceType,
            automation: JSON.stringify(validatedRule.automation),
            collector: JSON.stringify(validatedRule.collector),
            validation: validatedRule.validation ? JSON.stringify(validatedRule.validation) : null,
            active: validatedRule.active,
            updated_at: new Date()
        });
        // Update scheduling
        this.cancelScheduledCollection(ruleId);
        if (validatedRule.active && validatedRule.automation.enabled && validatedRule.automation.schedule) {
            this.scheduleCollection(validatedRule);
        }
        this.emit('collection-rule-updated', { ruleId, updates });
    }
    async getCollectionRule(ruleId) {
        const row = await this.db('evidence_collection_rules').where('id', ruleId).first();
        if (!row)
            return null;
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            frameworkId: row.framework_id,
            controlIds: JSON.parse(row.control_ids),
            evidenceType: row.evidence_type,
            automation: JSON.parse(row.automation),
            collector: JSON.parse(row.collector),
            validation: row.validation ? JSON.parse(row.validation) : undefined,
            active: row.active
        };
    }
    async getCollectionRules(frameworkId, active) {
        let query = this.db('evidence_collection_rules');
        if (frameworkId) {
            query = query.where('framework_id', frameworkId);
        }
        if (active !== undefined) {
            query = query.where('active', active);
        }
        const rows = await query;
        return rows.map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            frameworkId: row.framework_id,
            controlIds: JSON.parse(row.control_ids),
            evidenceType: row.evidence_type,
            automation: JSON.parse(row.automation),
            collector: JSON.parse(row.collector),
            validation: row.validation ? JSON.parse(row.validation) : undefined,
            active: row.active
        }));
    }
    // Evidence Collection
    async collectEvidence(request) {
        const collectorKey = `manual:manual-collector`;
        const collector = this.collectors.get(collectorKey);
        if (!collector) {
            throw new Error('Manual collector not available');
        }
        const evidence = await this.createEvidence(request.evidenceType, request.source, request.data, 'manual');
        // Map to controls
        await this.mapEvidenceToControls(evidence.id, request.frameworkId, request.controlIds);
        this.emit('evidence-collected', { evidenceId: evidence.id, evidence });
        return evidence;
    }
    async runCollectionRule(ruleId) {
        const rule = await this.getCollectionRule(ruleId);
        if (!rule) {
            throw new Error(`Collection rule not found: ${ruleId}`);
        }
        const jobId = (0, uuid_1.v4)();
        const job = {
            id: jobId,
            ruleId,
            status: 'pending',
            startedAt: new Date()
        };
        this.collectionJobs.set(jobId, job);
        // Start collection asynchronously
        this.executeCollection(rule, job);
        return job;
    }
    async executeCollection(rule, job) {
        const startTime = Date.now();
        job.status = 'running';
        try {
            const collectorKey = `${rule.collector.type}:${rule.collector.config.name || `${rule.collector.type}-collector`}`;
            const collector = this.collectors.get(collectorKey);
            if (!collector) {
                throw new Error(`Collector not found: ${collectorKey}`);
            }
            // Collect evidence
            const data = await collector.collect(rule.collector.config);
            // Validate if rules are defined
            if (rule.validation && rule.validation.rules) {
                const isValid = this.validateEvidence(data, rule.validation.rules);
                if (!isValid && rule.validation.required) {
                    throw new Error('Evidence validation failed');
                }
            }
            // Create evidence record
            const evidence = await this.createEvidence(rule.evidenceType, rule.name, data, 'system');
            // Map to controls
            await this.mapEvidenceToControls(evidence.id, rule.frameworkId, rule.controlIds);
            // Update job
            job.status = 'completed';
            job.completedAt = new Date();
            job.result = { evidenceId: evidence.id, size: evidence.size };
            // Record history
            await this.recordCollectionHistory(rule.id, job, 1, Date.now() - startTime);
            // Update next run time if scheduled
            if (rule.automation.schedule) {
                await this.updateNextRunTime(rule.id);
            }
            this.emit('collection-completed', { ruleId: rule.id, jobId: job.id, evidence });
        }
        catch (error) {
            job.status = 'failed';
            job.completedAt = new Date();
            job.error = error.message;
            await this.recordCollectionHistory(rule.id, job, 0, Date.now() - startTime, error.message);
            this.emit('collection-failed', { ruleId: rule.id, jobId: job.id, error: error.message });
            logger_1.logger.error(`Collection failed for rule ${rule.id}:`, error);
        }
    }
    async createEvidence(type, source, data, collectorId) {
        const now = new Date();
        const dataStr = JSON.stringify(data);
        const hash = crypto.createHash('sha256').update(dataStr).digest('hex');
        // Check if identical evidence already exists
        const existing = await this.db('compliance_evidence')
            .where('hash', hash)
            .first();
        if (existing) {
            logger_1.logger.info(`Evidence already exists with hash: ${hash}`);
            return this.parseEvidenceRow(existing);
        }
        const evidence = {
            id: (0, uuid_1.v4)(),
            type,
            source,
            collectedAt: now,
            collectorId,
            data,
            hash,
            size: Buffer.byteLength(dataStr),
            metadata: {}
        };
        const validatedEvidence = compliance_types_1.ComplianceEvidenceSchema.parse(evidence);
        await this.db('compliance_evidence').insert({
            id: validatedEvidence.id,
            type: validatedEvidence.type,
            source: validatedEvidence.source,
            collected_at: validatedEvidence.collectedAt,
            collector_id: validatedEvidence.collectorId,
            data: JSON.stringify(validatedEvidence.data),
            hash: validatedEvidence.hash,
            size: validatedEvidence.size,
            retention: validatedEvidence.retention ? JSON.stringify(validatedEvidence.retention) : null,
            metadata: JSON.stringify(validatedEvidence.metadata),
            verified: false,
            expires_at: validatedEvidence.retention?.expiresAt
        });
        logger_1.logger.info(`Created evidence: ${validatedEvidence.id} (${validatedEvidence.type})`);
        return validatedEvidence;
    }
    async mapEvidenceToControls(evidenceId, frameworkId, controlIds) {
        const mappings = controlIds.map(controlId => ({
            id: (0, uuid_1.v4)(),
            evidence_id: evidenceId,
            framework_id: frameworkId,
            control_id: controlId,
            mapped_at: new Date(),
            mapped_by: 'system'
        }));
        if (mappings.length > 0) {
            await this.db('evidence_control_mapping').insert(mappings);
        }
    }
    validateEvidence(data, rules) {
        for (const rule of rules) {
            const value = this.getNestedValue(data, rule.field);
            switch (rule.operator) {
                case 'equals':
                    if (value !== rule.value)
                        return false;
                    break;
                case 'contains':
                    if (!String(value).includes(rule.value))
                        return false;
                    break;
                case 'matches':
                    if (!new RegExp(rule.value).test(String(value)))
                        return false;
                    break;
                case 'exists':
                    if (value === undefined || value === null)
                        return false;
                    break;
                case 'greater_than':
                    if (Number(value) <= Number(rule.value))
                        return false;
                    break;
                case 'less_than':
                    if (Number(value) >= Number(rule.value))
                        return false;
                    break;
            }
        }
        return true;
    }
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
    // Evidence Retrieval
    async getEvidence(evidenceId) {
        const row = await this.db('compliance_evidence').where('id', evidenceId).first();
        if (!row)
            return null;
        return this.parseEvidenceRow(row);
    }
    async searchEvidence(filters, pagination) {
        let query = this.db('compliance_evidence');
        let countQuery = this.db('compliance_evidence');
        // Apply filters
        if (filters.evidenceTypes && filters.evidenceTypes.length > 0) {
            query = query.whereIn('type', filters.evidenceTypes);
            countQuery = countQuery.whereIn('type', filters.evidenceTypes);
        }
        if (filters.sources && filters.sources.length > 0) {
            query = query.whereIn('source', filters.sources);
            countQuery = countQuery.whereIn('source', filters.sources);
        }
        if (filters.dateRange) {
            query = query.whereBetween('collected_at', [filters.dateRange.start, filters.dateRange.end]);
            countQuery = countQuery.whereBetween('collected_at', [filters.dateRange.start, filters.dateRange.end]);
        }
        if (filters.query) {
            query = query.where(function () {
                this.where('source', 'like', `%${filters.query}%`)
                    .orWhere('data', 'like', `%${filters.query}%`);
            });
            countQuery = countQuery.where(function () {
                this.where('source', 'like', `%${filters.query}%`)
                    .orWhere('data', 'like', `%${filters.query}%`);
            });
        }
        // Get total count
        const totalResult = await countQuery.count('* as count').first();
        const total = totalResult?.count || 0;
        // Apply pagination
        const offset = (pagination.page - 1) * pagination.limit;
        const rows = await query
            .orderBy('collected_at', 'desc')
            .limit(pagination.limit)
            .offset(offset);
        const evidence = rows.map((row) => this.parseEvidenceRow(row));
        return { evidence, total };
    }
    async getEvidenceForControl(frameworkId, controlId) {
        const mappings = await this.db('evidence_control_mapping')
            .where({ framework_id: frameworkId, control_id: controlId })
            .select('evidence_id');
        if (mappings.length === 0)
            return [];
        const evidenceIds = mappings.map(m => m.evidence_id);
        const rows = await this.db('compliance_evidence')
            .whereIn('id', evidenceIds)
            .orderBy('collected_at', 'desc');
        return rows.map((row) => this.parseEvidenceRow(row));
    }
    // Scheduling
    async loadCollectionRules() {
        const activeRules = await this.getCollectionRules(undefined, true);
        for (const rule of activeRules) {
            if (rule.automation.enabled && rule.automation.schedule) {
                this.scheduleCollection(rule);
            }
        }
    }
    scheduleCollection(rule) {
        if (!rule.automation.schedule)
            return;
        // Parse cron expression and schedule
        // This is a simplified implementation - in production, use a proper cron library
        const schedule = rule.automation.schedule;
        let interval;
        // Simple schedule parsing (extend for full cron support)
        if (schedule === '0 * * * *') { // Every hour
            interval = 60 * 60 * 1000;
        }
        else if (schedule === '0 0 * * *') { // Daily
            interval = 24 * 60 * 60 * 1000;
        }
        else if (schedule === '0 0 * * 0') { // Weekly
            interval = 7 * 24 * 60 * 60 * 1000;
        }
        else {
            logger_1.logger.warn(`Unsupported schedule format: ${schedule}`);
            return;
        }
        const timeout = setInterval(async () => {
            await this.runCollectionRule(rule.id);
        }, interval);
        this.scheduledJobs.set(rule.id, timeout);
        logger_1.logger.info(`Scheduled collection for rule ${rule.id}: ${schedule}`);
    }
    cancelScheduledCollection(ruleId) {
        const timeout = this.scheduledJobs.get(ruleId);
        if (timeout) {
            clearInterval(timeout);
            this.scheduledJobs.delete(ruleId);
            logger_1.logger.info(`Cancelled scheduled collection for rule ${ruleId}`);
        }
    }
    async updateNextRunTime(ruleId) {
        const rule = await this.getCollectionRule(ruleId);
        if (!rule || !rule.automation.schedule)
            return;
        // Calculate next run time based on schedule
        const nextRun = this.calculateNextRunTime(rule.automation.schedule);
        await this.db('evidence_collection_rules')
            .where('id', ruleId)
            .update({
            automation: JSON.stringify({
                ...rule.automation,
                nextRun
            }),
            updated_at: new Date()
        });
    }
    calculateNextRunTime(schedule) {
        // Simplified calculation - in production, use a cron parser
        const now = new Date();
        if (schedule === '0 * * * *') { // Every hour
            now.setHours(now.getHours() + 1);
            now.setMinutes(0);
            now.setSeconds(0);
        }
        else if (schedule === '0 0 * * *') { // Daily
            now.setDate(now.getDate() + 1);
            now.setHours(0);
            now.setMinutes(0);
            now.setSeconds(0);
        }
        else if (schedule === '0 0 * * 0') { // Weekly
            now.setDate(now.getDate() + 7);
            now.setHours(0);
            now.setMinutes(0);
            now.setSeconds(0);
        }
        return now;
    }
    async recordCollectionHistory(ruleId, job, evidenceCount, durationMs, error) {
        await this.db('evidence_collection_history').insert({
            id: (0, uuid_1.v4)(),
            rule_id: ruleId,
            job_id: job.id,
            started_at: job.startedAt,
            completed_at: job.completedAt,
            status: job.status,
            evidence_count: evidenceCount,
            result: job.result ? JSON.stringify(job.result) : null,
            error,
            duration_ms: durationMs
        });
    }
    parseEvidenceRow(row) {
        return {
            id: row.id,
            type: row.type,
            source: row.source,
            collectedAt: new Date(row.collected_at),
            collectorId: row.collector_id,
            data: JSON.parse(row.data),
            hash: row.hash,
            size: Number(row.size),
            retention: row.retention ? JSON.parse(row.retention) : undefined,
            metadata: JSON.parse(row.metadata || '{}')
        };
    }
    // Cleanup and Maintenance
    async cleanupExpiredEvidence() {
        const now = new Date();
        const result = await this.db('compliance_evidence')
            .where('expires_at', '<', now)
            .delete();
        if (result > 0) {
            logger_1.logger.info(`Cleaned up ${result} expired evidence records`);
            this.emit('evidence-cleanup', { count: result });
        }
        return result;
    }
    async verifyEvidenceIntegrity(evidenceId) {
        const evidence = await this.getEvidence(evidenceId);
        if (!evidence)
            return false;
        const dataStr = JSON.stringify(evidence.data);
        const calculatedHash = crypto.createHash('sha256').update(dataStr).digest('hex');
        const isValid = calculatedHash === evidence.hash;
        await this.db('compliance_evidence')
            .where('id', evidenceId)
            .update({ verified: isValid });
        return isValid;
    }
    async shutdown() {
        logger_1.logger.info('Shutting down Evidence Collection Service');
        // Cancel all scheduled jobs
        for (const [ruleId, timeout] of this.scheduledJobs) {
            clearInterval(timeout);
        }
        this.scheduledJobs.clear();
        await this.db.destroy();
        logger_1.logger.info('Evidence Collection Service shutdown complete');
    }
}
exports.EvidenceCollectionService = EvidenceCollectionService;
//# sourceMappingURL=evidence-collection-service.js.map