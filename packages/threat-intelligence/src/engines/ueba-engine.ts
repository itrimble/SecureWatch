import { EventEmitter } from 'events';
import { EntityBehavior, UserBehaviorProfile, EntityType } from '../types/threat-intel.types';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import knex, { Knex } from 'knex';

interface BehaviorMetric {
  name: string;
  value: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface AnomalyDetection {
  entityId: string;
  entityType: EntityType;
  anomalyType: string;
  score: number;
  description: string;
  metrics: BehaviorMetric[];
  timestamp: Date;
  context: Record<string, any>;
}

interface PeerGroup {
  id: string;
  name: string;
  description: string;
  members: string[];
  behaviorProfile: Record<string, any>;
}

interface TimeWindow {
  start: Date;
  end: Date;
  duration: number; // milliseconds
}

export class UEBAEngine extends EventEmitter {
  private db: Knex;
  private metricsBuffer: Map<string, BehaviorMetric[]> = new Map();
  private baselineWindow: number = 30 * 24 * 60 * 60 * 1000; // 30 days
  private anomalyThreshold: number = 2.5; // Standard deviations
  private updateInterval: number = 300000; // 5 minutes
  private updateTimer?: NodeJS.Timeout;

  constructor(dbConfig: any) {
    super();
    this.db = knex({
      client: dbConfig.type,
      connection: dbConfig.connection,
      useNullAsDefault: true
    });
  }

  async initialize(): Promise<void> {
    logger.info('Initializing UEBA engine');
    
    await this.createTables();
    this.startUpdateWorker();
    
    logger.info('UEBA engine initialized');
  }

  async shutdown(): Promise<void> {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    await this.db.destroy();
  }

  private async createTables(): Promise<void> {
    // Entity behaviors table
    if (!(await this.db.schema.hasTable('entity_behaviors'))) {
      await this.db.schema.createTable('entity_behaviors', (table) => {
        table.string('id').primary();
        table.string('entity_id').notNullable();
        table.string('entity_type', 20).notNullable();
        table.string('metric', 100).notNullable();
        table.float('value').notNullable();
        table.dateTime('timestamp').notNullable();
        table.float('baseline');
        table.float('deviation');
        table.float('anomaly_score');
        table.json('metadata');
        table.dateTime('created_at').defaultTo(this.db.fn.now());
        
        table.index(['entity_id', 'entity_type']);
        table.index(['metric']);
        table.index(['timestamp']);
        table.index(['anomaly_score']);
      });
    }

    // User profiles table
    if (!(await this.db.schema.hasTable('user_profiles'))) {
      await this.db.schema.createTable('user_profiles', (table) => {
        table.string('user_id').primary();
        table.json('normal_working_hours');
        table.json('typical_locations');
        table.json('common_applications');
        table.float('average_data_transfer');
        table.json('peer_group');
        table.float('risk_score').defaultTo(0);
        table.dateTime('first_seen');
        table.dateTime('last_seen');
        table.dateTime('last_updated');
        table.json('behavior_baselines');
        table.json('metadata');
        
        table.index(['risk_score']);
        table.index(['last_seen']);
      });
    }

    // Peer groups table
    if (!(await this.db.schema.hasTable('peer_groups'))) {
      await this.db.schema.createTable('peer_groups', (table) => {
        table.string('id').primary();
        table.string('name').notNullable();
        table.text('description');
        table.json('members');
        table.json('behavior_profile');
        table.json('baselines');
        table.dateTime('created_at').defaultTo(this.db.fn.now());
        table.dateTime('updated_at').defaultTo(this.db.fn.now());
      });
    }

    // Anomalies table
    if (!(await this.db.schema.hasTable('behavior_anomalies'))) {
      await this.db.schema.createTable('behavior_anomalies', (table) => {
        table.string('id').primary();
        table.string('entity_id').notNullable();
        table.string('entity_type', 20).notNullable();
        table.string('anomaly_type', 50).notNullable();
        table.float('score').notNullable();
        table.text('description');
        table.json('metrics');
        table.dateTime('timestamp').notNullable();
        table.json('context');
        table.string('status', 20).defaultTo('new');
        table.dateTime('created_at').defaultTo(this.db.fn.now());
        
        table.index(['entity_id', 'entity_type']);
        table.index(['anomaly_type']);
        table.index(['score']);
        table.index(['timestamp']);
        table.index(['status']);
      });
    }
  }

  // Behavior Recording Methods
  async recordBehavior(
    entityId: string,
    entityType: EntityType,
    metric: string,
    value: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    const behavior: BehaviorMetric = {
      name: metric,
      value,
      timestamp: new Date(),
      metadata
    };

    // Buffer metrics for batch processing
    const key = `${entityType}:${entityId}`;
    if (!this.metricsBuffer.has(key)) {
      this.metricsBuffer.set(key, []);
    }
    this.metricsBuffer.get(key)!.push(behavior);

    // Process immediately if buffer is large
    if (this.metricsBuffer.get(key)!.length > 100) {
      await this.processEntityMetrics(entityId, entityType);
    }
  }

  async recordUserActivity(userId: string, activity: {
    action: string;
    resource?: string;
    location?: string;
    application?: string;
    dataVolume?: number;
    success?: boolean;
    metadata?: Record<string, any>;
  }): Promise<void> {
    // Record various metrics based on activity
    const timestamp = new Date();

    // Time-based metrics
    const hour = timestamp.getHours();
    const dayOfWeek = timestamp.getDay();
    await this.recordBehavior(userId, 'user', 'activity_hour', hour, { action: activity.action });
    await this.recordBehavior(userId, 'user', 'activity_day', dayOfWeek, { action: activity.action });

    // Location metrics
    if (activity.location) {
      await this.recordBehavior(userId, 'user', 'location_access', 1, { location: activity.location });
    }

    // Application usage
    if (activity.application) {
      await this.recordBehavior(userId, 'user', 'app_usage', 1, { application: activity.application });
    }

    // Data transfer metrics
    if (activity.dataVolume !== undefined) {
      await this.recordBehavior(userId, 'user', 'data_transfer', activity.dataVolume);
    }

    // Success/failure metrics
    if (activity.success !== undefined) {
      await this.recordBehavior(userId, 'user', activity.success ? 'success_count' : 'failure_count', 1);
    }
  }

  // Analysis Methods
  private async processEntityMetrics(entityId: string, entityType: EntityType): Promise<void> {
    const key = `${entityType}:${entityId}`;
    const metrics = this.metricsBuffer.get(key);
    if (!metrics || metrics.length === 0) return;

    // Clear buffer
    this.metricsBuffer.set(key, []);

    // Get or create entity profile
    const profile = await this.getOrCreateEntityProfile(entityId, entityType);

    // Process each metric
    for (const metric of metrics) {
      const baseline = await this.getMetricBaseline(entityId, entityType, metric.name);
      const deviation = baseline ? this.calculateDeviation(metric.value, baseline) : 0;
      const anomalyScore = this.calculateAnomalyScore(metric.value, baseline);

      // Store behavior
      await this.db('entity_behaviors').insert({
        id: uuidv4(),
        entity_id: entityId,
        entity_type: entityType,
        metric: metric.name,
        value: metric.value,
        timestamp: metric.timestamp,
        baseline: baseline?.mean,
        deviation,
        anomaly_score: anomalyScore,
        metadata: JSON.stringify(metric.metadata || {})
      });

      // Check for anomalies
      if (anomalyScore > this.anomalyThreshold) {
        await this.detectAndRecordAnomaly(entityId, entityType, metric, baseline, anomalyScore);
      }
    }

    // Update entity profile
    await this.updateEntityProfile(entityId, entityType);
  }

  private async getMetricBaseline(
    entityId: string,
    entityType: EntityType,
    metric: string
  ): Promise<{ mean: number; stddev: number } | null> {
    const windowStart = new Date(Date.now() - this.baselineWindow);

    const result = await this.db('entity_behaviors')
      .where('entity_id', entityId)
      .where('entity_type', entityType)
      .where('metric', metric)
      .where('timestamp', '>=', windowStart)
      .select(
        this.db.raw('AVG(value) as mean'),
        this.db.raw('STDDEV(value) as stddev'),
        this.db.raw('COUNT(*) as count')
      )
      .first();

    if (!result || result.count < 10) {
      // Not enough data for baseline
      return null;
    }

    return {
      mean: result.mean,
      stddev: result.stddev || 1
    };
  }

  private calculateDeviation(value: number, baseline: { mean: number; stddev: number }): number {
    if (baseline.stddev === 0) return 0;
    return Math.abs(value - baseline.mean) / baseline.stddev;
  }

  private calculateAnomalyScore(
    value: number,
    baseline: { mean: number; stddev: number } | null
  ): number {
    if (!baseline) return 0;
    
    const deviation = this.calculateDeviation(value, baseline);
    
    // Apply exponential scaling for higher deviations
    return Math.min(100, deviation * deviation * 10);
  }

  private async detectAndRecordAnomaly(
    entityId: string,
    entityType: EntityType,
    metric: BehaviorMetric,
    baseline: { mean: number; stddev: number } | null,
    score: number
  ): Promise<void> {
    const anomalyType = this.classifyAnomaly(metric, baseline);
    
    const anomaly: AnomalyDetection = {
      entityId,
      entityType,
      anomalyType,
      score,
      description: this.generateAnomalyDescription(anomalyType, metric, baseline),
      metrics: [metric],
      timestamp: metric.timestamp,
      context: {
        baseline: baseline ? { mean: baseline.mean, stddev: baseline.stddev } : null,
        value: metric.value,
        metadata: metric.metadata
      }
    };

    // Store anomaly
    await this.db('behavior_anomalies').insert({
      id: uuidv4(),
      entity_id: anomaly.entityId,
      entity_type: anomaly.entityType,
      anomaly_type: anomaly.anomalyType,
      score: anomaly.score,
      description: anomaly.description,
      metrics: JSON.stringify(anomaly.metrics),
      timestamp: anomaly.timestamp,
      context: JSON.stringify(anomaly.context)
    });

    // Emit anomaly event
    this.emit('anomaly-detected', anomaly);
    logger.warn('Behavior anomaly detected', anomaly);
  }

  private classifyAnomaly(
    metric: BehaviorMetric,
    baseline: { mean: number; stddev: number } | null
  ): string {
    if (!baseline) return 'new_behavior';

    const deviation = this.calculateDeviation(metric.value, baseline);

    // Classify based on metric type and deviation
    switch (metric.name) {
      case 'activity_hour':
        return deviation > 3 ? 'unusual_time' : 'time_anomaly';
      
      case 'location_access':
        return 'unusual_location';
      
      case 'data_transfer':
        return metric.value > baseline.mean * 10 ? 'excessive_data_transfer' : 'data_anomaly';
      
      case 'failure_count':
        return metric.value > baseline.mean * 5 ? 'excessive_failures' : 'failure_anomaly';
      
      case 'app_usage':
        return 'unusual_application';
      
      default:
        return deviation > 5 ? 'extreme_deviation' : 'moderate_deviation';
    }
  }

  private generateAnomalyDescription(
    anomalyType: string,
    metric: BehaviorMetric,
    baseline: { mean: number; stddev: number } | null
  ): string {
    const descriptions: Record<string, string> = {
      'unusual_time': `Activity detected at unusual time: ${metric.value}:00`,
      'unusual_location': `Access from unusual location: ${metric.metadata?.location}`,
      'excessive_data_transfer': `Excessive data transfer: ${metric.value} bytes (baseline: ${baseline?.mean.toFixed(0)} bytes)`,
      'excessive_failures': `High number of failures: ${metric.value} (baseline: ${baseline?.mean.toFixed(1)})`,
      'unusual_application': `Usage of unusual application: ${metric.metadata?.application}`,
      'new_behavior': `New behavior pattern detected: ${metric.name}`,
      'extreme_deviation': `Extreme deviation in ${metric.name}: ${metric.value} (baseline: ${baseline?.mean.toFixed(2)})`,
      'moderate_deviation': `Moderate deviation in ${metric.name}: ${metric.value} (baseline: ${baseline?.mean.toFixed(2)})`
    };

    return descriptions[anomalyType] || `Anomaly detected in ${metric.name}`;
  }

  // Profile Management
  private async getOrCreateEntityProfile(entityId: string, entityType: EntityType): Promise<any> {
    if (entityType === 'user') {
      let profile = await this.db('user_profiles').where('user_id', entityId).first();
      
      if (!profile) {
        profile = {
          user_id: entityId,
          normal_working_hours: JSON.stringify([]),
          typical_locations: JSON.stringify([]),
          common_applications: JSON.stringify([]),
          average_data_transfer: 0,
          peer_group: JSON.stringify([]),
          risk_score: 0,
          first_seen: new Date(),
          last_seen: new Date(),
          last_updated: new Date(),
          behavior_baselines: JSON.stringify({}),
          metadata: JSON.stringify({})
        };
        
        await this.db('user_profiles').insert(profile);
      }
      
      return profile;
    }
    
    // For other entity types, return a generic profile
    return {
      entity_id: entityId,
      entity_type: entityType,
      first_seen: new Date(),
      last_seen: new Date()
    };
  }

  private async updateEntityProfile(entityId: string, entityType: EntityType): Promise<void> {
    if (entityType === 'user') {
      await this.updateUserProfile(entityId);
    }
    // Add other entity type updates as needed
  }

  private async updateUserProfile(userId: string): Promise<void> {
    const windowStart = new Date(Date.now() - this.baselineWindow);

    // Calculate working hours pattern
    const hourStats = await this.db('entity_behaviors')
      .where('entity_id', userId)
      .where('entity_type', 'user')
      .where('metric', 'activity_hour')
      .where('timestamp', '>=', windowStart)
      .select('value')
      .groupBy('value')
      .count('* as count')
      .orderBy('count', 'desc');

    const workingHours = hourStats
      .filter(h => h.count > 5)
      .map(h => ({ hour: h.value, frequency: h.count }));

    // Calculate typical locations
    const locationStats = await this.db('entity_behaviors')
      .where('entity_id', userId)
      .where('entity_type', 'user')
      .where('metric', 'location_access')
      .where('timestamp', '>=', windowStart)
      .whereNotNull('metadata')
      .select('metadata')
      .limit(1000);

    const locationCounts = new Map<string, number>();
    for (const row of locationStats) {
      const metadata = JSON.parse(row.metadata);
      if (metadata.location) {
        locationCounts.set(
          metadata.location,
          (locationCounts.get(metadata.location) || 0) + 1
        );
      }
    }

    const typicalLocations = Array.from(locationCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([location]) => location);

    // Calculate average data transfer
    const dataStats = await this.db('entity_behaviors')
      .where('entity_id', userId)
      .where('entity_type', 'user')
      .where('metric', 'data_transfer')
      .where('timestamp', '>=', windowStart)
      .avg('value as avg')
      .first();

    // Calculate risk score based on recent anomalies
    const recentAnomalies = await this.db('behavior_anomalies')
      .where('entity_id', userId)
      .where('entity_type', 'user')
      .where('timestamp', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
      .select('score');

    const riskScore = Math.min(100, recentAnomalies.reduce((sum, a) => sum + a.score, 0) / 10);

    // Update profile
    await this.db('user_profiles')
      .where('user_id', userId)
      .update({
        normal_working_hours: JSON.stringify(workingHours),
        typical_locations: JSON.stringify(typicalLocations),
        average_data_transfer: dataStats?.avg || 0,
        risk_score: riskScore,
        last_seen: new Date(),
        last_updated: new Date()
      });
  }

  // Peer Group Analysis
  async createPeerGroup(name: string, description: string, memberIds: string[]): Promise<string> {
    const id = uuidv4();
    
    await this.db('peer_groups').insert({
      id,
      name,
      description,
      members: JSON.stringify(memberIds),
      behavior_profile: JSON.stringify({}),
      baselines: JSON.stringify({})
    });

    // Update peer group baselines
    await this.updatePeerGroupBaselines(id);

    return id;
  }

  private async updatePeerGroupBaselines(groupId: string): Promise<void> {
    const group = await this.db('peer_groups').where('id', groupId).first();
    if (!group) return;

    const members = JSON.parse(group.members);
    const baselines: Record<string, any> = {};

    // Calculate group baselines for common metrics
    const metrics = ['activity_hour', 'data_transfer', 'app_usage', 'failure_count'];
    
    for (const metric of metrics) {
      const result = await this.db('entity_behaviors')
        .whereIn('entity_id', members)
        .where('entity_type', 'user')
        .where('metric', metric)
        .where('timestamp', '>=', new Date(Date.now() - this.baselineWindow))
        .select(
          this.db.raw('AVG(value) as mean'),
          this.db.raw('STDDEV(value) as stddev'),
          this.db.raw('COUNT(*) as count')
        )
        .first();

      if (result && result.count > 50) {
        baselines[metric] = {
          mean: result.mean,
          stddev: result.stddev,
          count: result.count
        };
      }
    }

    await this.db('peer_groups')
      .where('id', groupId)
      .update({
        baselines: JSON.stringify(baselines),
        updated_at: new Date()
      });
  }

  async detectPeerGroupAnomalies(userId: string): Promise<AnomalyDetection[]> {
    // Get user's peer groups
    const userProfile = await this.db('user_profiles').where('user_id', userId).first();
    if (!userProfile) return [];

    const peerGroups = JSON.parse(userProfile.peer_group || '[]');
    const anomalies: AnomalyDetection[] = [];

    for (const groupId of peerGroups) {
      const group = await this.db('peer_groups').where('id', groupId).first();
      if (!group) continue;

      const baselines = JSON.parse(group.baselines);

      // Compare user's recent behavior to peer group
      for (const [metric, baseline] of Object.entries(baselines)) {
        const userBehavior = await this.db('entity_behaviors')
          .where('entity_id', userId)
          .where('entity_type', 'user')
          .where('metric', metric)
          .where('timestamp', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
          .avg('value as avg')
          .first();

        if (userBehavior && userBehavior.avg) {
          const deviation = this.calculateDeviation(userBehavior.avg, baseline as any);
          if (deviation > this.anomalyThreshold) {
            anomalies.push({
              entityId: userId,
              entityType: 'user',
              anomalyType: 'peer_deviation',
              score: Math.min(100, deviation * 15),
              description: `Behavior deviates from peer group ${group.name} in ${metric}`,
              metrics: [{
                name: metric,
                value: userBehavior.avg,
                timestamp: new Date(),
                metadata: { peerGroup: group.name }
              }],
              timestamp: new Date(),
              context: {
                peerGroup: group.name,
                userValue: userBehavior.avg,
                peerBaseline: baseline
              }
            });
          }
        }
      }
    }

    return anomalies;
  }

  // Query Methods
  async getUserProfile(userId: string): Promise<UserBehaviorProfile | null> {
    const profile = await this.db('user_profiles').where('user_id', userId).first();
    
    if (!profile) return null;

    return {
      userId: profile.user_id,
      normalWorkingHours: JSON.parse(profile.normal_working_hours),
      typicalLocations: JSON.parse(profile.typical_locations),
      commonApplications: JSON.parse(profile.common_applications),
      averageDataTransfer: profile.average_data_transfer,
      peerGroup: JSON.parse(profile.peer_group),
      riskScore: profile.risk_score,
      lastUpdated: profile.last_updated
    };
  }

  async getTopRiskEntities(
    entityType?: EntityType,
    limit: number = 10
  ): Promise<Array<{ entityId: string; entityType: string; riskScore: number }>> {
    let query = this.db('user_profiles')
      .select('user_id as entityId', this.db.raw("'user' as entityType"), 'risk_score as riskScore')
      .orderBy('risk_score', 'desc')
      .limit(limit);

    if (entityType === 'user') {
      return await query;
    }

    // Add other entity types as needed
    return [];
  }

  async getRecentAnomalies(
    entityId?: string,
    entityType?: EntityType,
    limit: number = 100
  ): Promise<AnomalyDetection[]> {
    let query = this.db('behavior_anomalies');

    if (entityId) {
      query = query.where('entity_id', entityId);
    }
    if (entityType) {
      query = query.where('entity_type', entityType);
    }

    const results = await query
      .orderBy('timestamp', 'desc')
      .limit(limit);

    return results.map(row => ({
      entityId: row.entity_id,
      entityType: row.entity_type,
      anomalyType: row.anomaly_type,
      score: row.score,
      description: row.description,
      metrics: JSON.parse(row.metrics),
      timestamp: row.timestamp,
      context: JSON.parse(row.context)
    }));
  }

  // Worker Methods
  private startUpdateWorker(): void {
    this.updateTimer = setInterval(async () => {
      try {
        // Process buffered metrics
        for (const [key, metrics] of this.metricsBuffer.entries()) {
          if (metrics.length > 0) {
            const [entityType, entityId] = key.split(':');
            await this.processEntityMetrics(entityId, entityType as EntityType);
          }
        }

        // Update peer groups
        const groups = await this.db('peer_groups').select('id');
        for (const group of groups) {
          await this.updatePeerGroupBaselines(group.id);
        }

        // Clean old data
        const retentionDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days
        await this.db('entity_behaviors')
          .where('timestamp', '<', retentionDate)
          .delete();

      } catch (error) {
        logger.error('UEBA update worker error', error);
      }
    }, this.updateInterval);
  }

  // Statistics
  async getStatistics(): Promise<any> {
    const [
      totalEntities,
      totalBehaviors,
      totalAnomalies,
      highRiskEntities
    ] = await Promise.all([
      this.db('user_profiles').count('* as count').first(),
      this.db('entity_behaviors').count('* as count').first(),
      this.db('behavior_anomalies').where('timestamp', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000)).count('* as count').first(),
      this.db('user_profiles').where('risk_score', '>', 70).count('* as count').first()
    ]);

    return {
      totalEntities: Number(totalEntities?.count || 0),
      totalBehaviors: Number(totalBehaviors?.count || 0),
      recentAnomalies: Number(totalAnomalies?.count || 0),
      highRiskEntities: Number(highRiskEntities?.count || 0),
      metricsBufferSize: Array.from(this.metricsBuffer.values()).reduce((sum, m) => sum + m.length, 0)
    };
  }
}