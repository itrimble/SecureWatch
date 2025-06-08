"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimelineReconstructionService = void 0;
const events_1 = require("events");
const uuid_1 = require("uuid");
const knex_1 = __importDefault(require("knex"));
const logger_1 = require("../utils/logger");
class TimelineReconstructionService extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.correlationRules = new Map();
        this.db = (0, knex_1.default)({
            client: config.database.type,
            connection: config.database.connection,
            useNullAsDefault: true
        });
        this.initializeCorrelationRules();
    }
    async initialize() {
        logger_1.logger.info('Initializing Timeline Reconstruction Service');
        await this.createTables();
        await this.setupIndexes();
        logger_1.logger.info('Timeline Reconstruction Service initialized successfully');
    }
    async createTables() {
        // Timeline patterns table
        if (!(await this.db.schema.hasTable('timeline_patterns'))) {
            await this.db.schema.createTable('timeline_patterns', (table) => {
                table.string('id').primary();
                table.string('case_id').notNullable().index();
                table.string('type').notNullable();
                table.text('description');
                table.json('event_ids');
                table.float('confidence').notNullable();
                table.dateTime('start_time').notNullable().index();
                table.dateTime('end_time').notNullable().index();
                table.string('significance', 20).notNullable();
                table.dateTime('created_at').notNullable();
                table.json('metadata');
                table.foreign('case_id').references('cases.id').onDelete('CASCADE');
                table.index(['case_id', 'type']);
                table.index(['case_id', 'significance']);
            });
        }
        // Timeline clusters table
        if (!(await this.db.schema.hasTable('timeline_clusters'))) {
            await this.db.schema.createTable('timeline_clusters', (table) => {
                table.string('id').primary();
                table.string('case_id').notNullable().index();
                table.dateTime('center_time').notNullable().index();
                table.json('event_ids');
                table.integer('radius').notNullable(); // milliseconds
                table.float('density').notNullable();
                table.string('type').notNullable();
                table.dateTime('created_at').notNullable();
                table.json('metadata');
                table.foreign('case_id').references('cases.id').onDelete('CASCADE');
                table.index(['case_id', 'type']);
            });
        }
        // Timeline gaps table
        if (!(await this.db.schema.hasTable('timeline_gaps'))) {
            await this.db.schema.createTable('timeline_gaps', (table) => {
                table.string('id').primary();
                table.string('case_id').notNullable().index();
                table.dateTime('start_time').notNullable().index();
                table.dateTime('end_time').notNullable().index();
                table.integer('duration').notNullable(); // milliseconds
                table.string('significance', 20).notNullable();
                table.text('context');
                table.dateTime('created_at').notNullable();
                table.json('metadata');
                table.foreign('case_id').references('cases.id').onDelete('CASCADE');
                table.index(['case_id', 'significance']);
            });
        }
    }
    async setupIndexes() {
        try {
            // Performance indexes for timeline queries
            await this.db.raw('CREATE INDEX IF NOT EXISTS idx_timeline_case_time ON case_timeline(case_id, timestamp DESC)');
            await this.db.raw('CREATE INDEX IF NOT EXISTS idx_timeline_source_time ON case_timeline(source_type, timestamp)');
            await this.db.raw('CREATE INDEX IF NOT EXISTS idx_timeline_entities ON case_timeline USING gin((related_entities))');
        }
        catch (error) {
            logger_1.logger.warn('Some indexes may already exist', error);
        }
    }
    initializeCorrelationRules() {
        // Login Anomaly Pattern
        this.correlationRules.set('login-anomaly', {
            id: 'login-anomaly',
            name: 'Login Anomaly Pattern',
            description: 'Detect suspicious login patterns indicating potential compromise',
            patterns: [
                {
                    eventType: 'authentication',
                    timeWindow: 300000, // 5 minutes
                    conditions: {
                        sourceType: 'log',
                        eventPattern: 'failed.*login'
                    }
                },
                {
                    eventType: 'authentication',
                    timeWindow: 60000, // 1 minute
                    conditions: {
                        sourceType: 'log',
                        eventPattern: 'successful.*login'
                    }
                }
            ],
            significance: 'high',
            enabled: true
        });
        // Data Exfiltration Pattern
        this.correlationRules.set('data-exfiltration', {
            id: 'data-exfiltration',
            name: 'Data Exfiltration Pattern',
            description: 'Detect potential data exfiltration activities',
            patterns: [
                {
                    eventType: 'file-access',
                    timeWindow: 1800000, // 30 minutes
                    conditions: {
                        sourceType: 'log',
                        eventPattern: 'large.*file.*access'
                    }
                },
                {
                    eventType: 'network',
                    timeWindow: 300000, // 5 minutes
                    conditions: {
                        sourceType: 'log',
                        eventPattern: 'outbound.*large.*transfer'
                    }
                }
            ],
            significance: 'critical',
            enabled: true
        });
        // Lateral Movement Pattern
        this.correlationRules.set('lateral-movement', {
            id: 'lateral-movement',
            name: 'Lateral Movement Pattern',
            description: 'Detect lateral movement across the network',
            patterns: [
                {
                    eventType: 'authentication',
                    timeWindow: 600000, // 10 minutes
                    conditions: {
                        sourceType: 'log',
                        eventPattern: 'remote.*login'
                    }
                },
                {
                    eventType: 'process',
                    timeWindow: 300000, // 5 minutes
                    conditions: {
                        sourceType: 'log',
                        eventPattern: 'suspicious.*process'
                    }
                }
            ],
            significance: 'high',
            enabled: true
        });
    }
    // Core Timeline Reconstruction
    async reconstructTimeline(filter) {
        logger_1.logger.info(`Reconstructing timeline with filter: ${JSON.stringify(filter)}`);
        // Get timeline events
        const events = await this.getTimelineEvents(filter);
        // Perform analysis
        const analysis = await this.analyzeTimeline(events, filter.caseId);
        return { events, analysis };
    }
    async getTimelineEvents(filter) {
        let query = this.db('case_timeline');
        // Apply filters
        if (filter.caseId) {
            query = query.where('case_id', filter.caseId);
        }
        if (filter.startTime && filter.endTime) {
            query = query.whereBetween('timestamp', [filter.startTime, filter.endTime]);
        }
        else if (filter.startTime) {
            query = query.where('timestamp', '>=', filter.startTime);
        }
        else if (filter.endTime) {
            query = query.where('timestamp', '<=', filter.endTime);
        }
        if (filter.sourceTypes?.length) {
            query = query.whereIn('source_type', filter.sourceTypes);
        }
        if (filter.sources?.length) {
            query = query.whereIn('source', filter.sources);
        }
        if (filter.severities?.length) {
            query = query.whereIn('severity', filter.severities);
        }
        if (filter.automated !== undefined) {
            query = query.where('automated', filter.automated);
        }
        if (filter.textSearch) {
            query = query.where(function () {
                this.where('event', 'like', `%${filter.textSearch}%`)
                    .orWhere('description', 'like', `%${filter.textSearch}%`);
            });
        }
        if (filter.tags?.length) {
            for (const tag of filter.tags) {
                query = query.whereRaw('JSON_SEARCH(tags, "one", ?) IS NOT NULL', [tag]);
            }
        }
        if (filter.entityTypes?.length && filter.entityValues?.length) {
            // Search in related_entities JSON
            for (let i = 0; i < filter.entityTypes.length; i++) {
                const entityType = filter.entityTypes[i];
                const entityValue = filter.entityValues[i];
                if (entityValue) {
                    query = query.whereRaw('JSON_SEARCH(related_entities, "one", ?, NULL, "$[*].type") IS NOT NULL AND JSON_SEARCH(related_entities, "one", ?, NULL, "$[*].value") IS NOT NULL', [entityType, entityValue]);
                }
            }
        }
        // Apply sorting and pagination
        query = query.orderBy('timestamp', 'asc');
        if (filter.limit) {
            query = query.limit(filter.limit);
        }
        if (filter.offset) {
            query = query.offset(filter.offset);
        }
        const rows = await query;
        return rows.map(row => this.mapRowToTimelineEvent(row));
    }
    async analyzeTimeline(events, caseId) {
        if (events.length === 0) {
            return {
                totalEvents: 0,
                timeSpan: 0,
                eventFrequency: {},
                sourceBreakdown: {},
                severityBreakdown: {},
                patterns: [],
                gaps: [],
                clusters: []
            };
        }
        const startTime = new Date(Math.min(...events.map(e => e.timestamp.getTime())));
        const endTime = new Date(Math.max(...events.map(e => e.timestamp.getTime())));
        const timeSpan = endTime.getTime() - startTime.getTime();
        // Calculate frequencies and breakdowns
        const eventFrequency = this.calculateEventFrequency(events);
        const sourceBreakdown = this.calculateSourceBreakdown(events);
        const severityBreakdown = this.calculateSeverityBreakdown(events);
        // Detect patterns
        const patterns = await this.detectPatterns(events, caseId);
        // Find gaps
        const gaps = this.findTimelineGaps(events);
        // Create clusters
        const clusters = this.createEventClusters(events);
        return {
            totalEvents: events.length,
            timeSpan,
            eventFrequency,
            sourceBreakdown,
            severityBreakdown,
            patterns,
            gaps,
            clusters
        };
    }
    calculateEventFrequency(events) {
        const frequency = {};
        events.forEach(event => {
            const eventType = event.event;
            frequency[eventType] = (frequency[eventType] || 0) + 1;
        });
        return frequency;
    }
    calculateSourceBreakdown(events) {
        const breakdown = {};
        events.forEach(event => {
            const sourceType = event.sourceType;
            breakdown[sourceType] = (breakdown[sourceType] || 0) + 1;
        });
        return breakdown;
    }
    calculateSeverityBreakdown(events) {
        const breakdown = {};
        events.forEach(event => {
            const severity = event.severity || 'unknown';
            breakdown[severity] = (breakdown[severity] || 0) + 1;
        });
        return breakdown;
    }
    async detectPatterns(events, caseId) {
        const patterns = [];
        for (const [ruleId, rule] of this.correlationRules) {
            if (!rule.enabled)
                continue;
            const detectedPatterns = await this.applyCorrelationRule(events, rule);
            patterns.push(...detectedPatterns);
        }
        // Save patterns to database if caseId provided
        if (caseId) {
            for (const pattern of patterns) {
                await this.savePattern(caseId, pattern);
            }
        }
        return patterns;
    }
    async applyCorrelationRule(events, rule) {
        const patterns = [];
        const eventsByType = {};
        // Group events by type
        events.forEach(event => {
            const eventType = this.getEventTypeFromEvent(event, rule);
            if (eventType) {
                if (!eventsByType[eventType]) {
                    eventsByType[eventType] = [];
                }
                eventsByType[eventType].push(event);
            }
        });
        // Look for pattern matches
        const patternEvents = [];
        let windowStart = null;
        let windowEnd = null;
        for (const patternDef of rule.patterns) {
            const matchingEvents = eventsByType[patternDef.eventType] || [];
            for (const event of matchingEvents) {
                if (!windowStart) {
                    windowStart = event.timestamp;
                    windowEnd = new Date(event.timestamp.getTime() + patternDef.timeWindow);
                }
                if (event.timestamp >= windowStart && event.timestamp <= windowEnd) {
                    patternEvents.push(event);
                }
            }
        }
        // If we found events matching all pattern requirements, create a pattern
        if (patternEvents.length >= rule.patterns.length) {
            const pattern = {
                id: (0, uuid_1.v4)(),
                type: rule.id,
                description: rule.description,
                events: patternEvents.map(e => e.id),
                confidence: this.calculatePatternConfidence(patternEvents, rule),
                startTime: new Date(Math.min(...patternEvents.map(e => e.timestamp.getTime()))),
                endTime: new Date(Math.max(...patternEvents.map(e => e.timestamp.getTime()))),
                significance: rule.significance
            };
            patterns.push(pattern);
        }
        return patterns;
    }
    getEventTypeFromEvent(event, rule) {
        // Simple event type matching based on event description
        // In production, this would be more sophisticated
        for (const pattern of rule.patterns) {
            if (event.event.toLowerCase().includes(pattern.eventType)) {
                return pattern.eventType;
            }
        }
        return null;
    }
    calculatePatternConfidence(events, rule) {
        // Calculate confidence based on temporal proximity and event relationships
        if (events.length < 2)
            return 0.5;
        const timeSpan = Math.max(...events.map(e => e.timestamp.getTime())) -
            Math.min(...events.map(e => e.timestamp.getTime()));
        // Higher confidence for events closer in time
        const maxWindow = Math.max(...rule.patterns.map(p => p.timeWindow));
        const temporalConfidence = Math.max(0, 1 - (timeSpan / maxWindow));
        // Bonus for more events
        const countConfidence = Math.min(1, events.length / rule.patterns.length);
        return (temporalConfidence + countConfidence) / 2;
    }
    findTimelineGaps(events) {
        if (events.length < 2)
            return [];
        const gaps = [];
        const sortedEvents = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        for (let i = 1; i < sortedEvents.length; i++) {
            const prevEvent = sortedEvents[i - 1];
            const currentEvent = sortedEvents[i];
            const gapDuration = currentEvent.timestamp.getTime() - prevEvent.timestamp.getTime();
            // Consider gaps longer than 30 minutes as potentially significant
            if (gapDuration > 30 * 60 * 1000) {
                let significance = 'normal';
                // Determine significance based on gap duration and context
                if (gapDuration > 24 * 60 * 60 * 1000) { // > 24 hours
                    significance = 'critical';
                }
                else if (gapDuration > 4 * 60 * 60 * 1000) { // > 4 hours
                    significance = 'suspicious';
                }
                gaps.push({
                    startTime: prevEvent.timestamp,
                    endTime: currentEvent.timestamp,
                    duration: gapDuration,
                    significance,
                    context: `Gap between "${prevEvent.event}" and "${currentEvent.event}"`
                });
            }
        }
        return gaps;
    }
    createEventClusters(events) {
        if (events.length < 3)
            return [];
        const clusters = [];
        const sortedEvents = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        // Simple clustering based on temporal proximity
        const clusterWindow = 30 * 60 * 1000; // 30 minutes
        let currentCluster = [sortedEvents[0]];
        for (let i = 1; i < sortedEvents.length; i++) {
            const event = sortedEvents[i];
            const lastEventInCluster = currentCluster[currentCluster.length - 1];
            if (event.timestamp.getTime() - lastEventInCluster.timestamp.getTime() <= clusterWindow) {
                currentCluster.push(event);
            }
            else {
                // Close current cluster if it has enough events
                if (currentCluster.length >= 3) {
                    clusters.push(this.createClusterFromEvents(currentCluster));
                }
                currentCluster = [event];
            }
        }
        // Don't forget the last cluster
        if (currentCluster.length >= 3) {
            clusters.push(this.createClusterFromEvents(currentCluster));
        }
        return clusters;
    }
    createClusterFromEvents(events) {
        const times = events.map(e => e.timestamp.getTime());
        const centerTime = new Date((Math.min(...times) + Math.max(...times)) / 2);
        const radius = (Math.max(...times) - Math.min(...times)) / 2;
        const density = events.length / (radius / 1000 / 60); // events per minute
        // Determine cluster type based on event characteristics
        let type = 'normal-activity';
        const hasAlerts = events.some(e => e.sourceType === 'alert');
        const hasUserActions = events.some(e => e.sourceType === 'user-action' && !e.automated);
        if (hasAlerts && hasUserActions) {
            type = 'response-activity';
        }
        else if (hasAlerts) {
            type = 'attack-sequence';
        }
        return {
            id: (0, uuid_1.v4)(),
            centerTime,
            events: events.map(e => e.id),
            radius,
            density,
            type
        };
    }
    // Pattern Management
    async savePattern(caseId, pattern) {
        await this.db('timeline_patterns').insert({
            id: pattern.id,
            case_id: caseId,
            type: pattern.type,
            description: pattern.description,
            event_ids: JSON.stringify(pattern.events),
            confidence: pattern.confidence,
            start_time: pattern.startTime,
            end_time: pattern.endTime,
            significance: pattern.significance,
            created_at: new Date(),
            metadata: JSON.stringify({})
        });
    }
    async getPatterns(caseId) {
        const rows = await this.db('timeline_patterns')
            .where('case_id', caseId)
            .orderBy('start_time', 'asc');
        return rows.map(row => ({
            id: row.id,
            type: row.type,
            description: row.description,
            events: JSON.parse(row.event_ids),
            confidence: row.confidence,
            startTime: new Date(row.start_time),
            endTime: new Date(row.end_time),
            significance: row.significance
        }));
    }
    // Timeline Visualization Data
    async getTimelineVisualizationData(caseId, granularity = 'hour') {
        const events = await this.getTimelineEvents({ caseId });
        if (events.length === 0) {
            return {
                buckets: [],
                summary: {
                    totalEvents: 0,
                    timeSpan: 0,
                    peakActivity: new Date(),
                    quietPeriods: []
                }
            };
        }
        // Calculate bucket size based on granularity
        let bucketSize;
        switch (granularity) {
            case 'hour':
                bucketSize = 60 * 60 * 1000; // 1 hour
                break;
            case 'day':
                bucketSize = 24 * 60 * 60 * 1000; // 1 day
                break;
            case 'week':
                bucketSize = 7 * 24 * 60 * 60 * 1000; // 1 week
                break;
        }
        const startTime = Math.min(...events.map(e => e.timestamp.getTime()));
        const endTime = Math.max(...events.map(e => e.timestamp.getTime()));
        const timeSpan = endTime - startTime;
        // Create buckets
        const buckets = [];
        for (let time = startTime; time <= endTime; time += bucketSize) {
            const bucketStart = time;
            const bucketEnd = time + bucketSize;
            const bucketEvents = events.filter(e => e.timestamp.getTime() >= bucketStart && e.timestamp.getTime() < bucketEnd);
            const severityBreakdown = {};
            const sourceBreakdown = {};
            bucketEvents.forEach(event => {
                const severity = event.severity || 'unknown';
                const source = event.sourceType;
                severityBreakdown[severity] = (severityBreakdown[severity] || 0) + 1;
                sourceBreakdown[source] = (sourceBreakdown[source] || 0) + 1;
            });
            buckets.push({
                timestamp: new Date(bucketStart),
                count: bucketEvents.length,
                severity: severityBreakdown,
                sources: sourceBreakdown
            });
        }
        // Find peak activity
        const peakBucket = buckets.reduce((max, bucket) => bucket.count > max.count ? bucket : max, buckets[0]);
        // Find quiet periods (buckets with no activity)
        const quietPeriods = [];
        let quietStart = null;
        buckets.forEach(bucket => {
            if (bucket.count === 0) {
                if (!quietStart) {
                    quietStart = bucket.timestamp;
                }
            }
            else {
                if (quietStart) {
                    quietPeriods.push({
                        start: quietStart,
                        end: bucket.timestamp
                    });
                    quietStart = null;
                }
            }
        });
        return {
            buckets,
            summary: {
                totalEvents: events.length,
                timeSpan,
                peakActivity: peakBucket.timestamp,
                quietPeriods
            }
        };
    }
    // Event Correlation
    async correlateEvents(event1Id, event2Id, correlationType, confidence) {
        // Implementation would store event correlations
        // This could be used for manual analyst correlations
        logger_1.logger.info(`Correlating events ${event1Id} and ${event2Id} with type ${correlationType}`);
    }
    // Export and Reporting
    async exportTimeline(caseId, format = 'json') {
        const events = await this.getTimelineEvents({ caseId });
        const patterns = await this.getPatterns(caseId);
        const timelineData = {
            caseId,
            events,
            patterns,
            exportedAt: new Date(),
            totalEvents: events.length
        };
        switch (format) {
            case 'json':
                return JSON.stringify(timelineData, null, 2);
            case 'csv':
                return this.convertToCSV(events);
            case 'xml':
                return this.convertToXML(timelineData);
            default:
                return JSON.stringify(timelineData, null, 2);
        }
    }
    convertToCSV(events) {
        const headers = ['timestamp', 'event', 'description', 'source', 'sourceType', 'severity', 'automated'];
        const rows = events.map(event => [
            event.timestamp.toISOString(),
            event.event,
            event.description,
            event.source,
            event.sourceType,
            event.severity || '',
            event.automated.toString()
        ]);
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
    convertToXML(data) {
        // Simple XML conversion - in production, use a proper XML library
        return `<?xml version="1.0" encoding="UTF-8"?>
<timeline>
  <caseId>${data.caseId}</caseId>
  <exportedAt>${data.exportedAt.toISOString()}</exportedAt>
  <totalEvents>${data.totalEvents}</totalEvents>
  <events>
    ${data.events.map((event) => `
    <event>
      <id>${event.id}</id>
      <timestamp>${event.timestamp.toISOString()}</timestamp>
      <event>${event.event}</event>
      <description>${event.description}</description>
      <source>${event.source}</source>
      <sourceType>${event.sourceType}</sourceType>
      <severity>${event.severity || ''}</severity>
      <automated>${event.automated}</automated>
    </event>`).join('')}
  </events>
</timeline>`;
    }
    // Helper Methods
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
    async shutdown() {
        logger_1.logger.info('Shutting down Timeline Reconstruction Service');
        await this.db.destroy();
        logger_1.logger.info('Timeline Reconstruction Service shutdown complete');
    }
}
exports.TimelineReconstructionService = TimelineReconstructionService;
