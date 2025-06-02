import { EventEmitter } from 'events';
import knex, { Knex } from 'knex';
import { IOC, IOCType, ThreatActor, TTP } from '../types/threat-intel.types';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import * as crypto from 'crypto';

interface IOCDatabaseConfig {
  type: 'sqlite' | 'postgres' | 'mysql';
  connection: any;
}

interface IOCCorrelation {
  id: string;
  ioc1_id: string;
  ioc2_id: string;
  correlation_type: 'same_campaign' | 'same_actor' | 'same_malware' | 'temporal' | 'behavioral';
  confidence: number;
  evidence: string;
  created_at: Date;
}

interface IOCSighting {
  id: string;
  ioc_id: string;
  source: string;
  timestamp: Date;
  context: any;
  location?: string;
  severity?: string;
}

export class IOCDatabase extends EventEmitter {
  private db: Knex;
  private correlationWorker?: NodeJS.Timeout;
  private deduplicationCache: Map<string, string> = new Map();

  constructor(private config: IOCDatabaseConfig) {
    super();
    this.db = knex({
      client: this.config.type,
      connection: this.config.connection,
      useNullAsDefault: true
    });
  }

  async initialize(): Promise<void> {
    logger.info('Initializing IOC database');
    
    // Create tables
    await this.createTables();
    
    // Start correlation worker
    this.startCorrelationWorker();
    
    logger.info('IOC database initialized');
  }

  async shutdown(): Promise<void> {
    if (this.correlationWorker) {
      clearInterval(this.correlationWorker);
    }
    await this.db.destroy();
  }

  private async createTables(): Promise<void> {
    // IOCs table
    if (!(await this.db.schema.hasTable('iocs'))) {
      await this.db.schema.createTable('iocs', (table) => {
        table.string('id').primary();
        table.string('type', 50).notNullable();
        table.string('value', 500).notNullable();
        table.string('normalized_value', 500).notNullable();
        table.string('source', 255).notNullable();
        table.integer('confidence').notNullable();
        table.string('severity', 20).notNullable();
        table.json('tags');
        table.dateTime('first_seen').notNullable();
        table.dateTime('last_seen').notNullable();
        table.dateTime('expires_at');
        table.json('metadata');
        table.json('related_iocs');
        table.string('tlp', 10).notNullable();
        table.boolean('active').defaultTo(true);
        table.string('hash').notNullable();
        table.dateTime('created_at').defaultTo(this.db.fn.now());
        table.dateTime('updated_at').defaultTo(this.db.fn.now());
        
        table.index(['type']);
        table.index(['normalized_value']);
        table.index(['source']);
        table.index(['active']);
        table.index(['hash']);
        table.index(['first_seen']);
        table.index(['last_seen']);
      });
    }

    // IOC Correlations table
    if (!(await this.db.schema.hasTable('ioc_correlations'))) {
      await this.db.schema.createTable('ioc_correlations', (table) => {
        table.string('id').primary();
        table.string('ioc1_id').notNullable();
        table.string('ioc2_id').notNullable();
        table.string('correlation_type', 50).notNullable();
        table.integer('confidence').notNullable();
        table.text('evidence');
        table.dateTime('created_at').defaultTo(this.db.fn.now());
        
        table.foreign('ioc1_id').references('iocs.id').onDelete('CASCADE');
        table.foreign('ioc2_id').references('iocs.id').onDelete('CASCADE');
        table.index(['ioc1_id']);
        table.index(['ioc2_id']);
        table.index(['correlation_type']);
      });
    }

    // IOC Sightings table
    if (!(await this.db.schema.hasTable('ioc_sightings'))) {
      await this.db.schema.createTable('ioc_sightings', (table) => {
        table.string('id').primary();
        table.string('ioc_id').notNullable();
        table.string('source', 255).notNullable();
        table.dateTime('timestamp').notNullable();
        table.json('context');
        table.string('location', 255);
        table.string('severity', 20);
        table.dateTime('created_at').defaultTo(this.db.fn.now());
        
        table.foreign('ioc_id').references('iocs.id').onDelete('CASCADE');
        table.index(['ioc_id']);
        table.index(['timestamp']);
        table.index(['source']);
      });
    }

    // Threat Actors table
    if (!(await this.db.schema.hasTable('threat_actors'))) {
      await this.db.schema.createTable('threat_actors', (table) => {
        table.string('id').primary();
        table.string('name', 255).notNullable();
        table.json('aliases');
        table.text('description');
        table.json('motivation');
        table.string('sophistication', 20);
        table.boolean('active').defaultTo(true);
        table.dateTime('first_seen').notNullable();
        table.dateTime('last_seen').notNullable();
        table.string('origin', 100);
        table.json('targeted_countries');
        table.json('targeted_sectors');
        table.json('ttps');
        table.json('associated_malware');
        table.json('associated_tools');
        table.json('iocs');
        table.dateTime('created_at').defaultTo(this.db.fn.now());
        table.dateTime('updated_at').defaultTo(this.db.fn.now());
        
        table.index(['name']);
        table.index(['active']);
      });
    }

    // TTPs table
    if (!(await this.db.schema.hasTable('ttps'))) {
      await this.db.schema.createTable('ttps', (table) => {
        table.string('id').primary();
        table.string('mitre_id', 50).notNullable();
        table.string('name', 255).notNullable();
        table.text('description');
        table.string('tactic', 100);
        table.json('platforms');
        table.json('data_sources');
        table.text('detection');
        table.text('mitigation');
        table.json('subtechniques');
        table.json('references');
        table.dateTime('created_at').defaultTo(this.db.fn.now());
        table.dateTime('updated_at').defaultTo(this.db.fn.now());
        
        table.index(['mitre_id']);
        table.index(['tactic']);
      });
    }
  }

  // IOC Management Methods
  async addIOC(ioc: IOC): Promise<string> {
    const normalizedValue = this.normalizeIOCValue(ioc.value, ioc.type);
    const hash = this.generateIOCHash(ioc.type, normalizedValue);

    // Check for duplicates
    const existing = await this.db('iocs')
      .where('hash', hash)
      .where('source', ioc.source)
      .first();

    if (existing) {
      // Update existing IOC
      await this.db('iocs')
        .where('id', existing.id)
        .update({
          confidence: Math.max(existing.confidence, ioc.confidence),
          severity: this.getHigherSeverity(existing.severity, ioc.severity),
          last_seen: new Date(),
          tags: JSON.stringify([...new Set([...(JSON.parse(existing.tags) || []), ...ioc.tags])]),
          metadata: JSON.stringify({ ...JSON.parse(existing.metadata || '{}'), ...ioc.metadata }),
          updated_at: new Date()
        });

      this.emit('ioc-updated', { id: existing.id, ioc });
      return existing.id;
    }

    // Insert new IOC
    const id = ioc.id || uuidv4();
    await this.db('iocs').insert({
      id,
      type: ioc.type,
      value: ioc.value,
      normalized_value: normalizedValue,
      source: ioc.source,
      confidence: ioc.confidence,
      severity: ioc.severity,
      tags: JSON.stringify(ioc.tags),
      first_seen: ioc.firstSeen,
      last_seen: ioc.lastSeen,
      expires_at: ioc.expiresAt,
      metadata: JSON.stringify(ioc.metadata),
      related_iocs: JSON.stringify(ioc.relatedIOCs),
      tlp: ioc.tlp,
      active: ioc.active,
      hash
    });

    this.emit('ioc-added', { id, ioc });
    
    // Trigger correlation
    this.scheduleCorrelation(id);
    
    return id;
  }

  async bulkAddIOCs(iocs: IOC[]): Promise<{ added: number; updated: number }> {
    let added = 0;
    let updated = 0;

    // Process in batches
    const batchSize = 100;
    for (let i = 0; i < iocs.length; i += batchSize) {
      const batch = iocs.slice(i, i + batchSize);
      
      await this.db.transaction(async (trx) => {
        for (const ioc of batch) {
          const normalizedValue = this.normalizeIOCValue(ioc.value, ioc.type);
          const hash = this.generateIOCHash(ioc.type, normalizedValue);

          const existing = await trx('iocs')
            .where('hash', hash)
            .where('source', ioc.source)
            .first();

          if (existing) {
            await trx('iocs')
              .where('id', existing.id)
              .update({
                confidence: Math.max(existing.confidence, ioc.confidence),
                severity: this.getHigherSeverity(existing.severity, ioc.severity),
                last_seen: new Date(),
                tags: JSON.stringify([...new Set([...(JSON.parse(existing.tags) || []), ...ioc.tags])]),
                metadata: JSON.stringify({ ...JSON.parse(existing.metadata || '{}'), ...ioc.metadata }),
                updated_at: new Date()
              });
            updated++;
          } else {
            await trx('iocs').insert({
              id: ioc.id || uuidv4(),
              type: ioc.type,
              value: ioc.value,
              normalized_value: normalizedValue,
              source: ioc.source,
              confidence: ioc.confidence,
              severity: ioc.severity,
              tags: JSON.stringify(ioc.tags),
              first_seen: ioc.firstSeen,
              last_seen: ioc.lastSeen,
              expires_at: ioc.expiresAt,
              metadata: JSON.stringify(ioc.metadata),
              related_iocs: JSON.stringify(ioc.relatedIOCs),
              tlp: ioc.tlp,
              active: ioc.active,
              hash
            });
            added++;
          }
        }
      });
    }

    logger.info(`Bulk IOC import completed: ${added} added, ${updated} updated`);
    return { added, updated };
  }

  async searchIOCs(criteria: {
    type?: IOCType;
    value?: string;
    source?: string;
    tags?: string[];
    minConfidence?: number;
    severity?: string[];
    active?: boolean;
    since?: Date;
    until?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ iocs: IOC[]; total: number }> {
    let query = this.db('iocs');

    if (criteria.type) {
      query = query.where('type', criteria.type);
    }

    if (criteria.value) {
      const normalized = this.normalizeIOCValue(criteria.value, criteria.type || 'domain');
      query = query.where('normalized_value', 'like', `%${normalized}%`);
    }

    if (criteria.source) {
      query = query.where('source', 'like', `%${criteria.source}%`);
    }

    if (criteria.tags && criteria.tags.length > 0) {
      query = query.where(function() {
        for (const tag of criteria.tags!) {
          this.orWhereRaw('tags LIKE ?', [`%"${tag}"%`]);
        }
      });
    }

    if (criteria.minConfidence !== undefined) {
      query = query.where('confidence', '>=', criteria.minConfidence);
    }

    if (criteria.severity && criteria.severity.length > 0) {
      query = query.whereIn('severity', criteria.severity);
    }

    if (criteria.active !== undefined) {
      query = query.where('active', criteria.active);
    }

    if (criteria.since) {
      query = query.where('last_seen', '>=', criteria.since);
    }

    if (criteria.until) {
      query = query.where('first_seen', '<=', criteria.until);
    }

    // Get total count
    const countQuery = query.clone();
    const [{ count }] = await countQuery.count('* as count');
    const total = Number(count);

    // Apply pagination
    if (criteria.limit) {
      query = query.limit(criteria.limit);
    }

    if (criteria.offset) {
      query = query.offset(criteria.offset);
    }

    // Execute query
    const results = await query.orderBy('last_seen', 'desc');

    // Parse JSON fields
    const iocs: IOC[] = results.map(row => ({
      id: row.id,
      type: row.type,
      value: row.value,
      source: row.source,
      confidence: row.confidence,
      severity: row.severity,
      tags: JSON.parse(row.tags || '[]'),
      firstSeen: row.first_seen,
      lastSeen: row.last_seen,
      expiresAt: row.expires_at,
      metadata: JSON.parse(row.metadata || '{}'),
      relatedIOCs: JSON.parse(row.related_iocs || '[]'),
      tlp: row.tlp,
      active: row.active
    }));

    return { iocs, total };
  }

  async getIOCById(id: string): Promise<IOC | null> {
    const row = await this.db('iocs').where('id', id).first();
    
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      type: row.type,
      value: row.value,
      source: row.source,
      confidence: row.confidence,
      severity: row.severity,
      tags: JSON.parse(row.tags || '[]'),
      firstSeen: row.first_seen,
      lastSeen: row.last_seen,
      expiresAt: row.expires_at,
      metadata: JSON.parse(row.metadata || '{}'),
      relatedIOCs: JSON.parse(row.related_iocs || '[]'),
      tlp: row.tlp,
      active: row.active
    };
  }

  async addSighting(sighting: IOCSighting): Promise<void> {
    await this.db('ioc_sightings').insert({
      id: sighting.id || uuidv4(),
      ioc_id: sighting.ioc_id,
      source: sighting.source,
      timestamp: sighting.timestamp,
      context: JSON.stringify(sighting.context),
      location: sighting.location,
      severity: sighting.severity
    });

    // Update IOC last seen
    await this.db('iocs')
      .where('id', sighting.ioc_id)
      .update({
        last_seen: sighting.timestamp,
        updated_at: new Date()
      });

    this.emit('ioc-sighting', sighting);
  }

  // Correlation Methods
  private async correlateIOC(iocId: string): Promise<void> {
    const ioc = await this.getIOCById(iocId);
    if (!ioc) return;

    // Find potential correlations
    const correlations: IOCCorrelation[] = [];

    // 1. Same campaign correlation (shared tags)
    if (ioc.tags.length > 0) {
      const relatedByTags = await this.db('iocs')
        .where('id', '!=', iocId)
        .where(function() {
          for (const tag of ioc.tags) {
            this.orWhereRaw('tags LIKE ?', [`%"${tag}"%`]);
          }
        })
        .limit(50);

      for (const related of relatedByTags) {
        const sharedTags = JSON.parse(related.tags).filter((tag: string) => ioc.tags.includes(tag));
        if (sharedTags.length >= 2) {
          correlations.push({
            id: uuidv4(),
            ioc1_id: iocId,
            ioc2_id: related.id,
            correlation_type: 'same_campaign',
            confidence: Math.min(90, 50 + sharedTags.length * 10),
            evidence: `Shared tags: ${sharedTags.join(', ')}`,
            created_at: new Date()
          });
        }
      }
    }

    // 2. Temporal correlation (seen around the same time)
    const timeWindow = 3600000; // 1 hour
    const temporalRelated = await this.db('iocs')
      .where('id', '!=', iocId)
      .whereBetween('first_seen', [
        new Date(ioc.firstSeen.getTime() - timeWindow),
        new Date(ioc.firstSeen.getTime() + timeWindow)
      ])
      .limit(20);

    for (const related of temporalRelated) {
      correlations.push({
        id: uuidv4(),
        ioc1_id: iocId,
        ioc2_id: related.id,
        correlation_type: 'temporal',
        confidence: 60,
        evidence: `Seen within 1 hour of each other`,
        created_at: new Date()
      });
    }

    // 3. Behavioral correlation (similar patterns)
    if (ioc.type === 'domain' || ioc.type === 'ip') {
      // Find IOCs from same ASN or domain family
      const behavioral = await this.findBehavioralCorrelations(ioc);
      correlations.push(...behavioral);
    }

    // Save correlations
    if (correlations.length > 0) {
      await this.db('ioc_correlations').insert(correlations);
      logger.info(`Created ${correlations.length} correlations for IOC ${iocId}`);
    }
  }

  private async findBehavioralCorrelations(ioc: IOC): Promise<IOCCorrelation[]> {
    const correlations: IOCCorrelation[] = [];

    if (ioc.type === 'domain') {
      // Extract TLD and SLD
      const parts = ioc.value.split('.');
      if (parts.length >= 2) {
        const sld = parts[parts.length - 2];
        const pattern = `%.${sld}.%`;

        const similar = await this.db('iocs')
          .where('type', 'domain')
          .where('id', '!=', ioc.id)
          .where('normalized_value', 'like', pattern)
          .limit(10);

        for (const related of similar) {
          correlations.push({
            id: uuidv4(),
            ioc1_id: ioc.id,
            ioc2_id: related.id,
            correlation_type: 'behavioral',
            confidence: 70,
            evidence: `Similar domain pattern: ${sld}`,
            created_at: new Date()
          });
        }
      }
    }

    return correlations;
  }

  async getCorrelations(iocId: string): Promise<any[]> {
    const correlations = await this.db('ioc_correlations')
      .where('ioc1_id', iocId)
      .orWhere('ioc2_id', iocId)
      .orderBy('confidence', 'desc');

    // Get the related IOCs
    const relatedIds = new Set<string>();
    correlations.forEach(c => {
      relatedIds.add(c.ioc1_id === iocId ? c.ioc2_id : c.ioc1_id);
    });

    const relatedIOCs = await this.db('iocs')
      .whereIn('id', Array.from(relatedIds));

    const iocMap = new Map(relatedIOCs.map(ioc => [ioc.id, ioc]));

    return correlations.map(c => ({
      ...c,
      relatedIOC: iocMap.get(c.ioc1_id === iocId ? c.ioc2_id : c.ioc1_id)
    }));
  }

  // Helper Methods
  private normalizeIOCValue(value: string, type: IOCType): string {
    switch (type) {
      case 'domain':
      case 'email':
        return value.toLowerCase();
      case 'ip':
        return value.trim();
      case 'hash-md5':
      case 'hash-sha1':
      case 'hash-sha256':
      case 'hash-sha512':
        return value.toLowerCase();
      case 'url':
        try {
          const url = new URL(value);
          return url.href.toLowerCase();
        } catch {
          return value.toLowerCase();
        }
      default:
        return value;
    }
  }

  private generateIOCHash(type: IOCType, normalizedValue: string): string {
    const data = `${type}:${normalizedValue}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private getHigherSeverity(sev1: string, sev2: string): string {
    const severityOrder = ['low', 'medium', 'high', 'critical'];
    const idx1 = severityOrder.indexOf(sev1);
    const idx2 = severityOrder.indexOf(sev2);
    return idx1 > idx2 ? sev1 : sev2;
  }

  private scheduleCorrelation(iocId: string): void {
    // Schedule correlation after a short delay to batch operations
    setTimeout(() => {
      this.correlateIOC(iocId).catch(error => {
        logger.error(`Failed to correlate IOC ${iocId}`, error);
      });
    }, 5000);
  }

  private startCorrelationWorker(): void {
    // Run correlation checks periodically
    this.correlationWorker = setInterval(async () => {
      try {
        // Find IOCs without correlations
        const uncorrelated = await this.db('iocs')
          .leftJoin('ioc_correlations', 'iocs.id', 'ioc_correlations.ioc1_id')
          .whereNull('ioc_correlations.id')
          .limit(10)
          .select('iocs.id');

        for (const row of uncorrelated) {
          await this.correlateIOC(row.id);
        }
      } catch (error) {
        logger.error('Correlation worker error', error);
      }
    }, 60000); // Run every minute
  }

  // Statistics Methods
  async getStatistics(): Promise<any> {
    const [
      totalIOCs,
      activeIOCs,
      severityBreakdown,
      typeBreakdown,
      sourceBreakdown,
      recentIOCs
    ] = await Promise.all([
      this.db('iocs').count('* as count').first(),
      this.db('iocs').where('active', true).count('* as count').first(),
      this.db('iocs')
        .select('severity')
        .count('* as count')
        .groupBy('severity'),
      this.db('iocs')
        .select('type')
        .count('* as count')
        .groupBy('type'),
      this.db('iocs')
        .select('source')
        .count('* as count')
        .groupBy('source')
        .limit(10),
      this.db('iocs')
        .orderBy('created_at', 'desc')
        .limit(10)
    ]);

    return {
      total: Number(totalIOCs?.count || 0),
      active: Number(activeIOCs?.count || 0),
      severityBreakdown: severityBreakdown.reduce((acc, row) => {
        acc[row.severity] = Number(row.count);
        return acc;
      }, {} as Record<string, number>),
      typeBreakdown: typeBreakdown.reduce((acc, row) => {
        acc[row.type] = Number(row.count);
        return acc;
      }, {} as Record<string, number>),
      sourceBreakdown: sourceBreakdown.map(row => ({
        source: row.source,
        count: Number(row.count)
      })),
      recent: recentIOCs
    };
  }
}