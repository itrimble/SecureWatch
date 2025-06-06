// @ts-nocheck
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { LogEvent, CorrelationIncident, EvaluationResult } from '../types';

export interface CreateIncidentParams {
  rule_id?: string;
  pattern_id?: string;
  incident_type: string;
  severity: string;
  title: string;
  description: string;
  first_seen: string;
  last_seen: string;
  event_count: number;
  affected_assets: string[];
  metadata: any;
}

export class IncidentManager {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  async initialize(): Promise<void> {
    logger.info('Incident manager initialized');
  }

  async createIncident(params: CreateIncidentParams): Promise<CorrelationIncident> {
    try {
      const incidentId = uuidv4();
      const organizationId = 'default'; // TODO: Get from context
      
      const query = `
        INSERT INTO incidents (
          id, organization_id, rule_id, pattern_id, incident_type, severity,
          title, description, status, first_seen, last_seen, event_count,
          affected_assets, metadata, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
        ) RETURNING *
      `;

      const values = [
        incidentId,
        organizationId,
        params.rule_id || null,
        params.pattern_id || null,
        params.incident_type,
        params.severity,
        params.title,
        params.description,
        'open',
        params.first_seen,
        params.last_seen,
        params.event_count,
        JSON.stringify(params.affected_assets),
        JSON.stringify(params.metadata)
      ];

      const result = await this.db.query(query, values);
      const incident = result.rows[0] as CorrelationIncident;

      logger.info('Created new incident:', {
        incidentId: incident.id,
        severity: incident.severity,
        type: incident.incident_type,
        title: incident.title
      });

      return incident;

    } catch (error) {
      logger.error('Error creating incident:', error);
      throw error;
    }
  }

  async updateIncident(
    incidentId: string, 
    event: LogEvent, 
    result: EvaluationResult
  ): Promise<CorrelationIncident> {
    try {
      const query = `
        UPDATE incidents 
        SET 
          last_seen = $2,
          event_count = event_count + 1,
          metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;

      const additionalMetadata = {
        last_event_id: event.id,
        last_update: new Date().toISOString(),
        ...result.metadata
      };

      const values = [incidentId, event.timestamp, JSON.stringify(additionalMetadata)];
      const updateResult = await this.db.query(query, values);
      
      if (updateResult.rows.length === 0) {
        throw new Error(`Incident ${incidentId} not found`);
      }

      const incident = updateResult.rows[0] as CorrelationIncident;

      // Add this event to the incident's event correlation
      await this.addCorrelatedEvent(incidentId, event.id, event.timestamp, result.confidence || 0.8);

      logger.info('Updated incident:', {
        incidentId: incident.id,
        eventCount: incident.event_count,
        lastSeen: incident.last_seen
      });

      return incident;

    } catch (error) {
      logger.error('Error updating incident:', error);
      throw error;
    }
  }

  async findOpenIncident(
    ruleId: string, 
    event: LogEvent, 
    timeWindowMinutes: number
  ): Promise<CorrelationIncident | null> {
    try {
      const query = `
        SELECT * FROM incidents 
        WHERE rule_id = $1 
          AND status = 'open'
          AND last_seen >= NOW() - INTERVAL '${timeWindowMinutes} minutes'
          AND (
            affected_assets::jsonb @> $2::jsonb OR
            metadata->>'source_identifier' = $3
          )
        ORDER BY last_seen DESC
        LIMIT 1
      `;

      const affectedAssets = JSON.stringify([
        event.computer_name,
        event.user_name,
        event.source_ip,
        event.ip_address
      ].filter(Boolean));

      const values = [ruleId, affectedAssets, event.source_identifier];
      const result = await this.db.query(query, values);

      return result.rows.length > 0 ? result.rows[0] as CorrelationIncident : null;

    } catch (error) {
      logger.error('Error finding open incident:', error);
      return null;
    }
  }

  async addCorrelatedEvent(
    incidentId: string,
    eventId: string,
    eventTimestamp: string,
    relevanceScore: number
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO incident_events (
          incident_id, event_id, event_timestamp, relevance_score, created_at
        ) VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (incident_id, event_id) DO NOTHING
      `;

      await this.db.query(query, [incidentId, eventId, eventTimestamp, relevanceScore]);

    } catch (error) {
      logger.error('Error adding correlated event:', error);
    }
  }

  async getIncidentById(incidentId: string): Promise<CorrelationIncident | null> {
    try {
      const query = 'SELECT * FROM incidents WHERE id = $1';
      const result = await this.db.query(query, [incidentId]);
      
      return result.rows.length > 0 ? result.rows[0] as CorrelationIncident : null;

    } catch (error) {
      logger.error('Error getting incident by ID:', error);
      return null;
    }
  }

  async getActiveIncidents(organizationId: string): Promise<CorrelationIncident[]> {
    try {
      const query = `
        SELECT * FROM incidents 
        WHERE organization_id = $1 AND status IN ('open', 'investigating')
        ORDER BY severity DESC, last_seen DESC
      `;
      
      const result = await this.db.query(query, [organizationId]);
      return result.rows as CorrelationIncident[];

    } catch (error) {
      logger.error('Error getting active incidents:', error);
      return [];
    }
  }

  async updateIncidentStatus(incidentId: string, status: string, resolution?: string): Promise<void> {
    try {
      const query = `
        UPDATE incidents 
        SET 
          status = $2,
          resolution = $3,
          resolved_at = CASE WHEN $2 = 'resolved' THEN NOW() ELSE resolved_at END,
          updated_at = NOW()
        WHERE id = $1
      `;

      await this.db.query(query, [incidentId, status, resolution || null]);

      logger.info('Updated incident status:', {
        incidentId,
        status,
        resolution
      });

    } catch (error) {
      logger.error('Error updating incident status:', error);
      throw error;
    }
  }

  async getIncidentStats(organizationId: string): Promise<any> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_incidents,
          COUNT(CASE WHEN status = 'open' THEN 1 END) as open_incidents,
          COUNT(CASE WHEN status = 'investigating' THEN 1 END) as investigating_incidents,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_incidents,
          COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_incidents,
          COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_incidents,
          COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium_incidents,
          COUNT(CASE WHEN severity = 'low' THEN 1 END) as low_incidents,
          AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as avg_resolution_time_hours
        FROM incidents 
        WHERE organization_id = $1
          AND created_at >= NOW() - INTERVAL '30 days'
      `;

      const result = await this.db.query(query, [organizationId]);
      return result.rows[0];

    } catch (error) {
      logger.error('Error getting incident stats:', error);
      return {};
    }
  }
}