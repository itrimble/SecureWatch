import { Pool } from 'pg';
import { OpenSearchService, LogDocument } from './opensearch.service';
import { Logger } from 'winston';
import { createLogger } from '../utils/logger';
import { NormalizedLogEvent } from '../types/log-event.types';

export interface DualWriteConfig {
  postgres: {
    connectionString: string;
    poolSize?: number;
  };
  opensearch: {
    node: string | string[];
    auth?: {
      username: string;
      password: string;
    };
  };
}

export class DualWriteService {
  private pgPool: Pool;
  private opensearchService: OpenSearchService;
  private logger: Logger;
  private writeStats = {
    postgresSuccess: 0,
    postgresFailure: 0,
    opensearchSuccess: 0,
    opensearchFailure: 0
  };

  constructor(config: DualWriteConfig) {
    this.logger = createLogger('DualWriteService');
    
    // Initialize PostgreSQL pool
    this.pgPool = new Pool({
      connectionString: config.postgres.connectionString,
      max: config.postgres.poolSize || 10
    });
    
    // Initialize OpenSearch service
    this.opensearchService = new OpenSearchService(
      config.opensearch,
      'securewatch-logs'
    );
  }

  async initialize(): Promise<void> {
    try {
      // Test PostgreSQL connection
      await this.pgPool.query('SELECT 1');
      this.logger.info('PostgreSQL connection established');
      
      // Initialize OpenSearch
      await this.opensearchService.initialize();
      this.logger.info('OpenSearch connection established');
      
      // Start stats reporting
      this.startStatsReporting();
    } catch (error) {
      this.logger.error('Failed to initialize dual-write service:', error);
      throw error;
    }
  }

  async writeLog(normalizedEvent: NormalizedLogEvent): Promise<void> {
    // Prepare data for both stores
    const pgData = this.preparePostgresData(normalizedEvent);
    const osData = this.prepareOpenSearchData(normalizedEvent);
    
    // Execute writes in parallel
    const results = await Promise.allSettled([
      this.writeToPostgres(pgData),
      this.writeToOpenSearch(osData)
    ]);
    
    // Track results
    if (results[0].status === 'fulfilled') {
      this.writeStats.postgresSuccess++;
    } else {
      this.writeStats.postgresFailure++;
      this.logger.error('PostgreSQL write failed:', results[0].reason);
    }
    
    if (results[1].status === 'fulfilled') {
      this.writeStats.opensearchSuccess++;
    } else {
      this.writeStats.opensearchFailure++;
      this.logger.error('OpenSearch write failed:', results[1].reason);
    }
    
    // Throw if both writes failed
    if (results.every(r => r.status === 'rejected')) {
      throw new Error('Both PostgreSQL and OpenSearch writes failed');
    }
  }

  async writeBatch(events: NormalizedLogEvent[]): Promise<void> {
    // Prepare batches
    const pgBatch = events.map(e => this.preparePostgresData(e));
    const osBatch = events.map(e => this.prepareOpenSearchData(e));
    
    // Execute batch writes in parallel
    const results = await Promise.allSettled([
      this.batchWriteToPostgres(pgBatch),
      this.opensearchService.bulkIndex(osBatch)
    ]);
    
    // Track results
    if (results[0].status === 'fulfilled') {
      this.writeStats.postgresSuccess += events.length;
    } else {
      this.writeStats.postgresFailure += events.length;
      this.logger.error('PostgreSQL batch write failed:', results[0].reason);
    }
    
    if (results[1].status === 'fulfilled') {
      this.writeStats.opensearchSuccess += events.length;
    } else {
      this.writeStats.opensearchFailure += events.length;
      this.logger.error('OpenSearch batch write failed:', results[1].reason);
    }
  }

  private preparePostgresData(event: NormalizedLogEvent): any {
    return {
      timestamp: event.timestamp,
      source_type: event.source,
      event_id: event.eventId,
      severity: event.severity,
      category: event.category,
      subcategory: event.subcategory,
      raw_message: event.rawMessage,
      
      // User fields
      user_name: event.user?.name,
      user_id: event.user?.id,
      user_domain: event.user?.domain,
      
      // Process fields
      process_name: event.process?.name,
      process_id: event.process?.pid,
      process_command_line: event.process?.commandLine,
      
      // Network fields
      source_ip: event.network?.sourceIp,
      source_port: event.network?.sourcePort,
      destination_ip: event.network?.destinationIp,
      destination_port: event.network?.destinationPort,
      
      // Security fields
      risk_score: event.riskScore,
      mitre_techniques: event.mitreTechniques,
      
      // Metadata
      metadata: JSON.stringify(event.metadata || {}),
      tags: event.tags
    };
  }

  private prepareOpenSearchData(event: NormalizedLogEvent): LogDocument {
    return {
      timestamp: event.timestamp,
      raw_message: event.rawMessage,
      source_type: event.source,
      source_host: event.host?.hostname || 'unknown',
      
      event_id: event.eventId,
      severity: event.severity,
      event_type: event.eventType,
      category: event.category,
      subcategory: event.subcategory,
      
      user: event.user ? {
        name: event.user.name,
        id: event.user.id,
        domain: event.user.domain,
        email: event.user.email
      } : undefined,
      
      process: event.process ? {
        name: event.process.name,
        pid: event.process.pid,
        command_line: event.process.commandLine,
        executable: event.process.executable,
        parent: event.process.parent ? {
          name: event.process.parent.name,
          pid: event.process.parent.pid
        } : undefined
      } : undefined,
      
      network: event.network ? {
        source_ip: event.network.sourceIp,
        source_port: event.network.sourcePort,
        destination_ip: event.network.destinationIp,
        destination_port: event.network.destinationPort,
        protocol: event.network.protocol,
        bytes_sent: event.network.bytesSent,
        bytes_received: event.network.bytesReceived
      } : undefined,
      
      security: {
        action: event.action,
        outcome: event.outcome,
        risk_score: event.riskScore,
        mitre_technique: event.mitreTechniques,
        threat_indicators: event.threatIndicators
      },
      
      metadata: event.metadata,
      tags: event.tags
    };
  }

  private async writeToPostgres(data: any): Promise<void> {
    const query = `
      INSERT INTO logs (
        timestamp, source_type, event_id, severity, category, subcategory,
        raw_message, user_name, user_id, user_domain, process_name, process_id,
        process_command_line, source_ip, source_port, destination_ip,
        destination_port, risk_score, mitre_techniques, metadata, tags
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21
      )
    `;
    
    const values = [
      data.timestamp, data.source_type, data.event_id, data.severity,
      data.category, data.subcategory, data.raw_message, data.user_name,
      data.user_id, data.user_domain, data.process_name, data.process_id,
      data.process_command_line, data.source_ip, data.source_port,
      data.destination_ip, data.destination_port, data.risk_score,
      data.mitre_techniques, data.metadata, data.tags
    ];
    
    await this.pgPool.query(query, values);
  }

  private async batchWriteToPostgres(batch: any[]): Promise<void> {
    const client = await this.pgPool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const data of batch) {
        await this.writeToPostgres(data);
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async writeToOpenSearch(data: LogDocument): Promise<void> {
    await this.opensearchService.indexDocument(data);
  }

  private startStatsReporting(): void {
    setInterval(() => {
      this.logger.info('Dual-write statistics:', {
        postgres: {
          success: this.writeStats.postgresSuccess,
          failure: this.writeStats.postgresFailure,
          successRate: this.calculateSuccessRate(
            this.writeStats.postgresSuccess,
            this.writeStats.postgresFailure
          )
        },
        opensearch: {
          success: this.writeStats.opensearchSuccess,
          failure: this.writeStats.opensearchFailure,
          successRate: this.calculateSuccessRate(
            this.writeStats.opensearchSuccess,
            this.writeStats.opensearchFailure
          )
        }
      });
    }, 60000); // Report every minute
  }

  private calculateSuccessRate(success: number, failure: number): string {
    const total = success + failure;
    if (total === 0) return '0%';
    return `${((success / total) * 100).toFixed(2)}%`;
  }

  async close(): Promise<void> {
    await this.opensearchService.close();
    await this.pgPool.end();
  }
}