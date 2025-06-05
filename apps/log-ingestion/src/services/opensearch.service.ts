import { Client } from '@opensearch-project/opensearch';
import { Logger } from 'winston';
import { createLogger } from '../utils/logger';

export interface OpenSearchConfig {
  node: string | string[];
  auth?: {
    username: string;
    password: string;
  };
  ssl?: {
    rejectUnauthorized: boolean;
  };
  requestTimeout?: number;
  maxRetries?: number;
}

export interface LogDocument {
  // Core fields
  timestamp: Date;
  raw_message: string;
  source_type: string;
  source_host: string;
  
  // Normalized fields from your schema
  event_id?: string;
  severity?: string;
  event_type?: string;
  category?: string;
  subcategory?: string;
  
  // User context
  user?: {
    name?: string;
    id?: string;
    domain?: string;
    email?: string;
  };
  
  // Process context
  process?: {
    name?: string;
    pid?: number;
    command_line?: string;
    executable?: string;
    parent?: {
      name?: string;
      pid?: number;
    };
  };
  
  // Network context
  network?: {
    source_ip?: string;
    source_port?: number;
    destination_ip?: string;
    destination_port?: number;
    protocol?: string;
    bytes_sent?: number;
    bytes_received?: number;
  };
  
  // Security context
  security?: {
    action?: string;
    outcome?: string;
    risk_score?: number;
    mitre_technique?: string[];
    threat_indicators?: string[];
  };
  
  // Additional metadata
  metadata?: Record<string, any>;
  tags?: string[];
  
  // Search optimization fields
  _search_text?: string; // Concatenated searchable fields
  _normalized_timestamp?: number; // Epoch for range queries
}

export class OpenSearchService {
  private client: Client;
  private logger: Logger;
  private indexName: string;
  private bulkSize: number;
  private bulkBuffer: any[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(config: OpenSearchConfig, indexName: string = 'securewatch-logs') {
    this.logger = createLogger('OpenSearchService');
    this.indexName = indexName;
    this.bulkSize = 100; // Configurable bulk size
    
    // Initialize OpenSearch client with v3.0 configuration
    this.client = new Client({
      node: config.node,
      auth: config.auth,
      ssl: config.ssl || { rejectUnauthorized: false },
      requestTimeout: config.requestTimeout || 30000,
      maxRetries: config.maxRetries || 3,
    });
    
    this.startFlushInterval();
  }

  async initialize(): Promise<void> {
    try {
      // Check cluster health
      const health = await this.client.cluster.health();
      this.logger.info('OpenSearch cluster health:', health.body);
      
      // Create index with optimized mapping
      await this.createIndexIfNotExists();
      
      this.logger.info(`OpenSearch service initialized with index: ${this.indexName}`);
    } catch (error) {
      this.logger.error('Failed to initialize OpenSearch:', error);
      throw error;
    }
  }

  private async createIndexIfNotExists(): Promise<void> {
    try {
      const exists = await this.client.indices.exists({ index: this.indexName });
      
      if (!exists.body) {
        await this.client.indices.create({
          index: this.indexName,
          body: {
            settings: {
              number_of_shards: 3,
              number_of_replicas: 1,
              refresh_interval: '5s',
              analysis: {
                analyzer: {
                  log_analyzer: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: ['lowercase', 'stop', 'snowball']
                  }
                }
              }
            },
            mappings: {
              properties: {
                timestamp: { type: 'date' },
                raw_message: { 
                  type: 'text',
                  analyzer: 'log_analyzer',
                  fields: {
                    keyword: { type: 'keyword', ignore_above: 256 }
                  }
                },
                source_type: { type: 'keyword' },
                source_host: { type: 'keyword' },
                event_id: { type: 'keyword' },
                severity: { type: 'keyword' },
                event_type: { type: 'keyword' },
                category: { type: 'keyword' },
                subcategory: { type: 'keyword' },
                
                user: {
                  properties: {
                    name: { type: 'keyword' },
                    id: { type: 'keyword' },
                    domain: { type: 'keyword' },
                    email: { type: 'keyword' }
                  }
                },
                
                process: {
                  properties: {
                    name: { type: 'keyword' },
                    pid: { type: 'integer' },
                    command_line: { 
                      type: 'text',
                      fields: { keyword: { type: 'keyword', ignore_above: 512 } }
                    },
                    executable: { type: 'keyword' },
                    parent: {
                      properties: {
                        name: { type: 'keyword' },
                        pid: { type: 'integer' }
                      }
                    }
                  }
                },
                
                network: {
                  properties: {
                    source_ip: { type: 'ip' },
                    source_port: { type: 'integer' },
                    destination_ip: { type: 'ip' },
                    destination_port: { type: 'integer' },
                    protocol: { type: 'keyword' },
                    bytes_sent: { type: 'long' },
                    bytes_received: { type: 'long' }
                  }
                },
                
                security: {
                  properties: {
                    action: { type: 'keyword' },
                    outcome: { type: 'keyword' },
                    risk_score: { type: 'float' },
                    mitre_technique: { type: 'keyword' },
                    threat_indicators: { type: 'keyword' }
                  }
                },
                
                metadata: { type: 'object', enabled: false },
                tags: { type: 'keyword' },
                _search_text: { type: 'text', analyzer: 'log_analyzer' },
                _normalized_timestamp: { type: 'long' }
              }
            }
          }
        });
        
        this.logger.info(`Created index: ${this.indexName}`);
      }
    } catch (error) {
      this.logger.error('Failed to create index:', error);
      throw error;
    }
  }

  async indexDocument(document: LogDocument): Promise<void> {
    // Prepare document with search optimization
    const enrichedDoc = this.enrichDocument(document);
    
    // Add to bulk buffer
    this.bulkBuffer.push(
      { index: { _index: this.indexName } },
      enrichedDoc
    );
    
    // Flush if buffer is full
    if (this.bulkBuffer.length >= this.bulkSize * 2) {
      await this.flushBulkBuffer();
    }
  }

  async bulkIndex(documents: LogDocument[]): Promise<void> {
    for (const doc of documents) {
      await this.indexDocument(doc);
    }
  }

  private enrichDocument(doc: LogDocument): LogDocument {
    // Create searchable text field
    const searchableFields = [
      doc.raw_message,
      doc.event_type,
      doc.category,
      doc.user?.name,
      doc.process?.name,
      doc.process?.command_line,
      doc.security?.action
    ].filter(Boolean).join(' ');
    
    return {
      ...doc,
      _search_text: searchableFields,
      _normalized_timestamp: new Date(doc.timestamp).getTime()
    };
  }

  private async flushBulkBuffer(): Promise<void> {
    if (this.bulkBuffer.length === 0) return;
    
    try {
      const response = await this.client.bulk({
        body: this.bulkBuffer,
        refresh: false // Don't wait for refresh
      });
      
      if (response.body.errors) {
        const erroredDocuments = response.body.items.filter((item: any) => 
          item.index && item.index.error
        );
        this.logger.error('Bulk indexing errors:', erroredDocuments);
      }
      
      this.logger.info(`Bulk indexed ${this.bulkBuffer.length / 2} documents`);
      this.bulkBuffer = [];
    } catch (error) {
      this.logger.error('Bulk indexing failed:', error);
      throw error;
    }
  }

  private startFlushInterval(): void {
    this.flushInterval = setInterval(() => {
      this.flushBulkBuffer().catch(error => 
        this.logger.error('Interval flush failed:', error)
      );
    }, 5000); // Flush every 5 seconds
  }

  async search(query: any, size: number = 100): Promise<any> {
    try {
      const response = await this.client.search({
        index: this.indexName,
        body: query,
        size
      });
      
      return response.body;
    } catch (error) {
      this.logger.error('Search failed:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    await this.flushBulkBuffer();
    await this.client.close();
  }
}