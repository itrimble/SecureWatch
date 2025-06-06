import { DataSource, DataSourceConfig } from '../types/data-source.types';
import { LogEvent } from '../types/log-event.types';
import { XMLAdapter, XMLConfig } from '../adapters/xml.adapter';
import { KafkaProducerPool } from '../utils/kafka-producer-pool';
import { BufferManager } from '../buffers/buffer-manager';
import { MetricsCollector } from '../monitoring/metrics-collector';

export interface XMLSourceConfig extends XMLConfig {
  kafkaConfig?: {
    brokers: string[];
    topic: string;
  };
  bufferConfig?: {
    maxSize: number;
    flushInterval: number;
  };
}

export class XMLSource extends DataSource {
  private xmlAdapter?: XMLAdapter;
  private xmlConfig: XMLSourceConfig;
  private producerPool?: KafkaProducerPool;
  private bufferManager?: BufferManager;
  private metricsCollector?: MetricsCollector;

  constructor(config: DataSourceConfig) {
    super(config);
    this.xmlConfig = this.parseXMLConfig(config.collection.config);
  }

  async start(): Promise<void> {
    if (this.status === 'active') {
      return;
    }

    try {
      await this.validateConfig();
      
      // Initialize dependencies
      this.producerPool = new KafkaProducerPool({
        brokers: this.xmlConfig.kafkaConfig?.brokers || ['localhost:9092'],
        clientId: `xml-source-${this.id}`,
        maxPoolSize: 5,
      });

      this.bufferManager = new BufferManager({
        maxSize: this.xmlConfig.bufferConfig?.maxSize || 10000,
        flushInterval: this.xmlConfig.bufferConfig?.flushInterval || 5000,
        persistPath: `/tmp/xml-buffer-${this.id}`,
      });

      this.metricsCollector = new MetricsCollector({
        prefix: 'xml_source',
        labels: { source_id: this.id, source_name: this.name },
      });

      // Initialize XML adapter
      this.xmlAdapter = new XMLAdapter(
        this.xmlConfig,
        this.producerPool,
        this.bufferManager,
        this.metricsCollector
      );

      // Start the adapter
      await this.xmlAdapter.start();
      
      this.setStatus('active');
      this.addHealthIssue('info', 'XML source started successfully');
    } catch (error) {
      this.setStatus('error');
      this.addHealthIssue('error', `Failed to start XML source: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.status === 'inactive') {
      return;
    }

    try {
      if (this.xmlAdapter) {
        await this.xmlAdapter.stop();
      }

      if (this.producerPool) {
        await this.producerPool.close();
      }

      if (this.bufferManager) {
        await this.bufferManager.close();
      }

      this.setStatus('inactive');
    } catch (error) {
      this.addHealthIssue('error', `Error stopping XML source: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  async collect(): Promise<LogEvent[]> {
    // XML source is file-based, events are collected through file processing
    return [];
  }

  async validateConfig(): Promise<boolean> {
    const config = this.xmlConfig;

    // Validate basic configuration
    if (!config.batchSize || config.batchSize < 1) {
      throw new Error('Invalid batch size');
    }

    if (!config.flushInterval || config.flushInterval < 100) {
      throw new Error('Invalid flush interval');
    }

    // Validate file extensions if specified
    if (config.fileExtensions && !Array.isArray(config.fileExtensions)) {
      throw new Error('File extensions must be an array');
    }

    // Validate watch directory if specified
    if (config.watchDirectory) {
      // In production, check if directory exists and is accessible
      // For now, just validate it's a non-empty string
      if (typeof config.watchDirectory !== 'string' || !config.watchDirectory.trim()) {
        throw new Error('Invalid watch directory');
      }
    }

    // Validate record path if specified
    if (config.recordPath && typeof config.recordPath !== 'string') {
      throw new Error('Record path must be a string');
    }

    return true;
  }

  /**
   * Process an XML file directly
   */
  async processFile(filePath: string, options?: Partial<XMLConfig>): Promise<{
    success: boolean;
    recordsProcessed: number;
    errors: string[];
  }> {
    if (!this.xmlAdapter) {
      throw new Error('XML adapter not initialized');
    }

    return this.xmlAdapter.processFile(filePath, options);
  }

  /**
   * Process XML data from a string
   */
  async processXMLString(xmlData: string, source?: string, options?: Partial<XMLConfig>): Promise<{
    success: boolean;
    recordsProcessed: number;
    errors: string[];
  }> {
    if (!this.xmlAdapter) {
      throw new Error('XML adapter not initialized');
    }

    return this.xmlAdapter.processXMLString(xmlData, source, options);
  }

  getStats(): object {
    const baseStats = super.getStats();
    const adapterStats = this.xmlAdapter?.getStats() || {};

    return {
      ...baseStats,
      xml: adapterStats,
    };
  }

  private parseXMLConfig(config: any): XMLSourceConfig {
    const defaultConfig: XMLSourceConfig = {
      batchSize: 100,
      flushInterval: 5000,
      explicitArray: false,
      includeAttributes: true,
      mergeAttributes: false,
      preserveChildrenOrder: true,
      encoding: 'utf8',
      maxFileSize: 100 * 1024 * 1024, // 100MB
      fileExtensions: ['.xml', '.log'],
    };

    return {
      ...defaultConfig,
      ...config,
    };
  }
}

export default XMLSource;