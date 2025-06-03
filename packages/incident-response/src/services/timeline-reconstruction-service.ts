import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import knex, { Knex } from 'knex';
import { logger } from '../utils/logger';
import {
  TimelineEvent,
  TimelineEventSchema,
  DatabaseConfig
} from '../types/incident-response.types';

interface TimelineFilter {
  caseId?: string;
  startTime?: Date;
  endTime?: Date;
  sourceTypes?: string[];
  sources?: string[];
  severities?: string[];
  tags?: string[];
  entityTypes?: string[];
  entityValues?: string[];
  textSearch?: string;
  automated?: boolean;
  limit?: number;
  offset?: number;
}

interface TimelineAnalysis {
  totalEvents: number;
  timeSpan: number; // milliseconds
  eventFrequency: { [key: string]: number };
  sourceBreakdown: { [key: string]: number };
  severityBreakdown: { [key: string]: number };
  patterns: TimelinePattern[];
  gaps: TimelineGap[];
  clusters: TimelineCluster[];
}

interface TimelinePattern {
  id: string;
  type: string;
  description: string;
  events: string[]; // event IDs
  confidence: number;
  startTime: Date;
  endTime: Date;
  significance: 'low' | 'medium' | 'high' | 'critical';
}

interface TimelineGap {
  startTime: Date;
  endTime: Date;
  duration: number; // milliseconds
  significance: 'normal' | 'suspicious' | 'critical';
  context: string;
}

interface TimelineCluster {
  id: string;
  centerTime: Date;
  events: string[]; // event IDs
  radius: number; // milliseconds
  density: number;
  type: string; // 'attack-sequence', 'normal-activity', 'response-activity'
}

interface CorrelationRule {
  id: string;
  name: string;
  description: string;
  patterns: Array<{
    eventType: string;
    timeWindow: number; // milliseconds
    conditions: any;
  }>;
  significance: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

export class TimelineReconstructionService extends EventEmitter {
  private db: Knex;
  private correlationRules: Map<string, CorrelationRule> = new Map();

  constructor(config: { database: DatabaseConfig }) {
    super();
    this.db = knex({
      client: config.database.type,
      connection: config.database.connection,
      useNullAsDefault: true
    });

    this.initializeCorrelationRules();
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Timeline Reconstruction Service');
    await this.createTables();
    await this.setupIndexes();
    logger.info('Timeline Reconstruction Service initialized successfully');
  }

  private async createTables(): Promise<void> {
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

  private async setupIndexes(): Promise<void> {
    try {
      // Performance indexes for timeline queries
      await this.db.raw('CREATE INDEX IF NOT EXISTS idx_timeline_case_time ON case_timeline(case_id, timestamp DESC)');
      await this.db.raw('CREATE INDEX IF NOT EXISTS idx_timeline_source_time ON case_timeline(source_type, timestamp)');
      await this.db.raw('CREATE INDEX IF NOT EXISTS idx_timeline_entities ON case_timeline USING gin((related_entities))');
    } catch (error) {
      logger.warn('Some indexes may already exist', error);
    }
  }

  private initializeCorrelationRules(): void {
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
  async reconstructTimeline(filter: TimelineFilter): Promise<{
    events: TimelineEvent[];
    analysis: TimelineAnalysis;
  }> {
    logger.info(`Reconstructing timeline with filter: ${JSON.stringify(filter)}`);

    // Get timeline events
    const events = await this.getTimelineEvents(filter);
    
    // Perform analysis
    const analysis = await this.analyzeTimeline(events, filter.caseId);

    return { events, analysis };
  }

  private async getTimelineEvents(filter: TimelineFilter): Promise<TimelineEvent[]> {
    let query = this.db('case_timeline');

    // Apply filters
    if (filter.caseId) {
      query = query.where('case_id', filter.caseId);
    }

    if (filter.startTime && filter.endTime) {
      query = query.whereBetween('timestamp', [filter.startTime, filter.endTime]);
    } else if (filter.startTime) {
      query = query.where('timestamp', '>=', filter.startTime);
    } else if (filter.endTime) {
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
      query = query.where(function() {
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
          query = query.whereRaw(
            'JSON_SEARCH(related_entities, "one", ?, NULL, "$[*].type") IS NOT NULL AND JSON_SEARCH(related_entities, "one", ?, NULL, "$[*].value") IS NOT NULL',
            [entityType, entityValue]
          );
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

  private async analyzeTimeline(events: TimelineEvent[], caseId?: string): Promise<TimelineAnalysis> {
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

  private calculateEventFrequency(events: TimelineEvent[]): { [key: string]: number } {
    const frequency: { [key: string]: number } = {};
    
    events.forEach(event => {
      const eventType = event.event;
      frequency[eventType] = (frequency[eventType] || 0) + 1;
    });

    return frequency;
  }

  private calculateSourceBreakdown(events: TimelineEvent[]): { [key: string]: number } {
    const breakdown: { [key: string]: number } = {};
    
    events.forEach(event => {
      const sourceType = event.sourceType;
      breakdown[sourceType] = (breakdown[sourceType] || 0) + 1;
    });

    return breakdown;
  }

  private calculateSeverityBreakdown(events: TimelineEvent[]): { [key: string]: number } {
    const breakdown: { [key: string]: number } = {};
    
    events.forEach(event => {
      const severity = event.severity || 'unknown';
      breakdown[severity] = (breakdown[severity] || 0) + 1;
    });

    return breakdown;
  }

  private async detectPatterns(events: TimelineEvent[], caseId?: string): Promise<TimelinePattern[]> {
    const patterns: TimelinePattern[] = [];

    for (const [ruleId, rule] of this.correlationRules) {
      if (!rule.enabled) continue;

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

  private async applyCorrelationRule(events: TimelineEvent[], rule: CorrelationRule): Promise<TimelinePattern[]> {
    const patterns: TimelinePattern[] = [];
    const eventsByType: { [key: string]: TimelineEvent[] } = {};

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
    const patternEvents: TimelineEvent[] = [];
    let windowStart: Date | null = null;
    let windowEnd: Date | null = null;

    for (const patternDef of rule.patterns) {
      const matchingEvents = eventsByType[patternDef.eventType] || [];
      
      for (const event of matchingEvents) {
        if (!windowStart) {
          windowStart = event.timestamp;
          windowEnd = new Date(event.timestamp.getTime() + patternDef.timeWindow);
        }

        if (event.timestamp >= windowStart && event.timestamp <= windowEnd!) {
          patternEvents.push(event);
        }
      }
    }

    // If we found events matching all pattern requirements, create a pattern
    if (patternEvents.length >= rule.patterns.length) {
      const pattern: TimelinePattern = {
        id: uuidv4(),
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

  private getEventTypeFromEvent(event: TimelineEvent, rule: CorrelationRule): string | null {
    // Simple event type matching based on event description
    // In production, this would be more sophisticated
    for (const pattern of rule.patterns) {
      if (event.event.toLowerCase().includes(pattern.eventType)) {
        return pattern.eventType;
      }
    }
    return null;
  }

  private calculatePatternConfidence(events: TimelineEvent[], rule: CorrelationRule): number {
    // Calculate confidence based on temporal proximity and event relationships
    if (events.length < 2) return 0.5;

    const timeSpan = Math.max(...events.map(e => e.timestamp.getTime())) - 
                   Math.min(...events.map(e => e.timestamp.getTime()));
    
    // Higher confidence for events closer in time
    const maxWindow = Math.max(...rule.patterns.map(p => p.timeWindow));
    const temporalConfidence = Math.max(0, 1 - (timeSpan / maxWindow));

    // Bonus for more events
    const countConfidence = Math.min(1, events.length / rule.patterns.length);

    return (temporalConfidence + countConfidence) / 2;
  }

  private findTimelineGaps(events: TimelineEvent[]): TimelineGap[] {
    if (events.length < 2) return [];

    const gaps: TimelineGap[] = [];
    const sortedEvents = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    for (let i = 1; i < sortedEvents.length; i++) {
      const prevEvent = sortedEvents[i - 1];
      const currentEvent = sortedEvents[i];
      const gapDuration = currentEvent.timestamp.getTime() - prevEvent.timestamp.getTime();

      // Consider gaps longer than 30 minutes as potentially significant
      if (gapDuration > 30 * 60 * 1000) {
        let significance: 'normal' | 'suspicious' | 'critical' = 'normal';
        
        // Determine significance based on gap duration and context
        if (gapDuration > 24 * 60 * 60 * 1000) { // > 24 hours
          significance = 'critical';
        } else if (gapDuration > 4 * 60 * 60 * 1000) { // > 4 hours
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

  private createEventClusters(events: TimelineEvent[]): TimelineCluster[] {
    if (events.length < 3) return [];

    const clusters: TimelineCluster[] = [];
    const sortedEvents = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Simple clustering based on temporal proximity
    const clusterWindow = 30 * 60 * 1000; // 30 minutes
    let currentCluster: TimelineEvent[] = [sortedEvents[0]];

    for (let i = 1; i < sortedEvents.length; i++) {
      const event = sortedEvents[i];
      const lastEventInCluster = currentCluster[currentCluster.length - 1];
      
      if (event.timestamp.getTime() - lastEventInCluster.timestamp.getTime() <= clusterWindow) {
        currentCluster.push(event);
      } else {
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

  private createClusterFromEvents(events: TimelineEvent[]): TimelineCluster {
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
    } else if (hasAlerts) {
      type = 'attack-sequence';
    }

    return {
      id: uuidv4(),
      centerTime,
      events: events.map(e => e.id),
      radius,
      density,
      type
    };
  }

  // Pattern Management
  async savePattern(caseId: string, pattern: TimelinePattern): Promise<void> {
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

  async getPatterns(caseId: string): Promise<TimelinePattern[]> {
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
  async getTimelineVisualizationData(caseId: string, granularity: 'hour' | 'day' | 'week' = 'hour'): Promise<{
    buckets: Array<{
      timestamp: Date;
      count: number;
      severity: { [key: string]: number };
      sources: { [key: string]: number };
    }>;
    summary: {
      totalEvents: number;
      timeSpan: number;
      peakActivity: Date;
      quietPeriods: Array<{ start: Date; end: Date }>;
    };
  }> {
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
    let bucketSize: number;
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
    const buckets: Array<{
      timestamp: Date;
      count: number;
      severity: { [key: string]: number };
      sources: { [key: string]: number };
    }> = [];

    for (let time = startTime; time <= endTime; time += bucketSize) {
      const bucketStart = time;
      const bucketEnd = time + bucketSize;
      const bucketEvents = events.filter(e => 
        e.timestamp.getTime() >= bucketStart && e.timestamp.getTime() < bucketEnd
      );

      const severityBreakdown: { [key: string]: number } = {};
      const sourceBreakdown: { [key: string]: number } = {};

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
    const peakBucket = buckets.reduce((max, bucket) => 
      bucket.count > max.count ? bucket : max, buckets[0]);

    // Find quiet periods (buckets with no activity)
    const quietPeriods: Array<{ start: Date; end: Date }> = [];
    let quietStart: Date | null = null;

    buckets.forEach(bucket => {
      if (bucket.count === 0) {
        if (!quietStart) {
          quietStart = bucket.timestamp;
        }
      } else {
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
  async correlateEvents(event1Id: string, event2Id: string, correlationType: string, confidence: number): Promise<void> {
    // Implementation would store event correlations
    // This could be used for manual analyst correlations
    logger.info(`Correlating events ${event1Id} and ${event2Id} with type ${correlationType}`);
  }

  // Export and Reporting
  async exportTimeline(caseId: string, format: 'json' | 'csv' | 'xml' = 'json'): Promise<string> {
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

  private convertToCSV(events: TimelineEvent[]): string {
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

  private convertToXML(data: any): string {
    // Simple XML conversion - in production, use a proper XML library
    return `<?xml version="1.0" encoding="UTF-8"?>
<timeline>
  <caseId>${data.caseId}</caseId>
  <exportedAt>${data.exportedAt.toISOString()}</exportedAt>
  <totalEvents>${data.totalEvents}</totalEvents>
  <events>
    ${data.events.map((event: TimelineEvent) => `
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
  private mapRowToTimelineEvent(row: any): TimelineEvent {
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

  async shutdown(): Promise<void> {
    logger.info('Shutting down Timeline Reconstruction Service');
    await this.db.destroy();
    logger.info('Timeline Reconstruction Service shutdown complete');
  }
}