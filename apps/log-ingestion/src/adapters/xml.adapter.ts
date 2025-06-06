import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as xml2js from 'xml2js';
import { RawLogEvent, LogSource } from '../types/log-event.types';
import { KafkaProducerPool } from '../utils/kafka-producer-pool';
import { BufferManager } from '../buffers/buffer-manager';
import { MetricsCollector } from '../monitoring/metrics-collector';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

export interface XMLConfig {
  watchDirectory?: string;
  batchSize: number;
  flushInterval: number;
  explicitArray?: boolean;
  tagNameProcessors?: Array<(name: string) => string>;
  attrNameProcessors?: Array<(name: string) => string>;
  valueProcessors?: Array<(value: string, name: string) => any>;
  attrValueProcessors?: Array<(value: string, name: string) => any>;
  preserveChildrenOrder?: boolean;
  rootName?: string;
  renderOpts?: {
    pretty?: boolean;
    indent?: string;
    newline?: string;
  };
  includeAttributes?: boolean;
  mergeAttributes?: boolean;
  timestampField?: string;
  timestampFormat?: string;
  encoding?: BufferEncoding;
  maxFileSize?: number; // in bytes
  fileExtensions?: string[];
  recordPath?: string; // XPath-like path to extract log records
}

interface XMLFileInfo {
  filePath: string;
  size: number;
  lastModified: Date;
  processed: boolean;
  recordCount?: number;
  errors?: string[];
}

export class XMLAdapter extends EventEmitter {
  private config: XMLConfig;
  private producerPool: KafkaProducerPool;
  private bufferManager: BufferManager;
  private metrics: MetricsCollector;
  private isRunning: boolean = false;
  private watchInterval?: NodeJS.Timer;
  private processedFiles: Map<string, XMLFileInfo> = new Map();
  private parser: xml2js.Parser;

  constructor(
    config: XMLConfig,
    producerPool: KafkaProducerPool,
    bufferManager: BufferManager,
    metrics: MetricsCollector
  ) {
    super();
    this.config = {
      explicitArray: false,
      includeAttributes: true,
      mergeAttributes: false,
      preserveChildrenOrder: true,
      encoding: 'utf8',
      maxFileSize: 100 * 1024 * 1024, // 100MB default
      fileExtensions: ['.xml', '.log'],
      ...config,
    };
    this.producerPool = producerPool;
    this.bufferManager = bufferManager;
    this.metrics = metrics;

    // Initialize XML parser with configuration
    this.parser = new xml2js.Parser({
      explicitArray: this.config.explicitArray,
      tagNameProcessors: this.config.tagNameProcessors,
      attrNameProcessors: this.config.attrNameProcessors,
      valueProcessors: this.config.valueProcessors,
      attrValueProcessors: this.config.attrValueProcessors,
      preserveChildrenOrder: this.config.preserveChildrenOrder,
      includeRoot: false,
      mergeAttrs: this.config.mergeAttributes,
      normalize: true,
      normalizeTags: true,
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('XML adapter is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting XML adapter', this.config);

    // Start file watching if directory is configured
    if (this.config.watchDirectory) {
      await this.startFileWatching();
    }

    this.emit('started');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    logger.info('Stopping XML adapter');

    // Stop file watching
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
    }

    // Flush remaining events
    await this.bufferManager.flush();

    this.emit('stopped');
  }

  /**
   * Process a single XML file
   */
  async processFile(filePath: string, options: Partial<XMLConfig> = {}): Promise<{
    success: boolean;
    recordsProcessed: number;
    errors: string[];
  }> {
    const mergedConfig = { ...this.config, ...options };
    const errors: string[] = [];
    let recordsProcessed = 0;

    try {
      // Check file existence and size
      const stats = await fs.promises.stat(filePath);
      if (stats.size > (mergedConfig.maxFileSize || 100 * 1024 * 1024)) {
        throw new Error(`File size ${stats.size} exceeds maximum allowed size ${mergedConfig.maxFileSize}`);
      }

      logger.info(`Processing XML file: ${filePath}`, {
        size: stats.size,
        lastModified: stats.mtime,
      });

      // Read and parse the XML file
      const xmlContent = await fs.promises.readFile(filePath, mergedConfig.encoding || 'utf8');
      const parsedData = await this.parseXML(xmlContent);
      
      // Extract records based on configuration
      const records = this.extractRecords(parsedData, mergedConfig);
      
      // Convert records to log events
      const events: RawLogEvent[] = [];
      for (const [index, record] of records.entries()) {
        try {
          const event = this.createLogEvent(record, filePath, index, mergedConfig);
          events.push(event);
          recordsProcessed++;

          // Process in batches
          if (events.length >= mergedConfig.batchSize) {
            await this.processBatch(events);
            events.length = 0; // Clear the array
          }
        } catch (error) {
          const errorMsg = `Error processing record ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          logger.warn(errorMsg, { record });
        }
      }

      // Process remaining events
      if (events.length > 0) {
        await this.processBatch(events);
      }

      // Update file tracking
      this.processedFiles.set(filePath, {
        filePath,
        size: stats.size,
        lastModified: stats.mtime,
        processed: true,
        recordCount: recordsProcessed,
        errors: errors.length > 0 ? errors : undefined,
      });

      this.metrics.incrementCounter('xml.files_processed');
      this.metrics.incrementCounter('xml.records_processed', {}, recordsProcessed);

      logger.info(`Successfully processed XML file: ${filePath}`, {
        recordsProcessed,
        errors: errors.length,
      });

      return {
        success: true,
        recordsProcessed,
        errors,
      };
    } catch (error) {
      const errorMsg = `Failed to process XML file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      logger.error(errorMsg, error);
      
      this.metrics.incrementCounter('xml.file_errors');
      
      return {
        success: false,
        recordsProcessed,
        errors,
      };
    }
  }

  /**
   * Process XML data from a string
   */
  async processXMLString(xmlData: string, source: string = 'string', options: Partial<XMLConfig> = {}): Promise<{
    success: boolean;
    recordsProcessed: number;
    errors: string[];
  }> {
    const mergedConfig = { ...this.config, ...options };
    const errors: string[] = [];
    let recordsProcessed = 0;

    try {
      const parsedData = await this.parseXML(xmlData);
      const records = this.extractRecords(parsedData, mergedConfig);
      const events: RawLogEvent[] = [];

      for (const [index, record] of records.entries()) {
        try {
          const event = this.createLogEvent(record, source, index, mergedConfig);
          events.push(event);
          recordsProcessed++;

          if (events.length >= mergedConfig.batchSize) {
            await this.processBatch(events);
            events.length = 0;
          }
        } catch (error) {
          const errorMsg = `Error processing record ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
        }
      }

      if (events.length > 0) {
        await this.processBatch(events);
      }

      this.metrics.incrementCounter('xml.strings_processed');
      this.metrics.incrementCounter('xml.records_processed', {}, recordsProcessed);

      return {
        success: true,
        recordsProcessed,
        errors,
      };
    } catch (error) {
      const errorMsg = `Failed to process XML string: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      logger.error(errorMsg, error);
      
      return {
        success: false,
        recordsProcessed,
        errors,
      };
    }
  }

  /**
   * Start file watching for automatic XML processing
   */
  private async startFileWatching(): Promise<void> {
    if (!this.config.watchDirectory) {
      return;
    }

    const watchDir = this.config.watchDirectory;
    
    // Check if directory exists
    try {
      await fs.promises.access(watchDir);
    } catch {
      logger.warn(`Watch directory does not exist: ${watchDir}`);
      return;
    }

    logger.info(`Starting file watching on directory: ${watchDir}`);

    // Initial scan
    await this.scanDirectory();

    // Set up periodic scanning
    this.watchInterval = setInterval(() => {
      if (this.isRunning) {
        this.scanDirectory().catch(error => {
          logger.error('Error during directory scan', error);
        });
      }
    }, this.config.flushInterval);
  }

  /**
   * Scan directory for new XML files
   */
  private async scanDirectory(): Promise<void> {
    if (!this.config.watchDirectory) {
      return;
    }

    try {
      const files = await fs.promises.readdir(this.config.watchDirectory);
      
      for (const file of files) {
        const filePath = path.join(this.config.watchDirectory, file);
        const ext = path.extname(file).toLowerCase();
        
        // Check if file has valid extension
        if (!this.config.fileExtensions?.includes(ext)) {
          continue;
        }

        try {
          const stats = await fs.promises.stat(filePath);
          
          // Skip directories
          if (stats.isDirectory()) {
            continue;
          }

          // Check if file has been processed or modified
          const existingInfo = this.processedFiles.get(filePath);
          if (existingInfo && existingInfo.processed && 
              existingInfo.lastModified.getTime() === stats.mtime.getTime()) {
            continue;
          }

          // Process the file
          logger.debug(`Found new/modified XML file: ${filePath}`);
          await this.processFile(filePath);
        } catch (error) {
          logger.warn(`Error processing file ${filePath}`, error);
        }
      }
    } catch (error) {
      logger.error(`Error scanning directory ${this.config.watchDirectory}`, error);
    }
  }

  /**
   * Parse XML content
   */
  private async parseXML(xmlContent: string): Promise<any> {
    try {
      return await this.parser.parseStringPromise(xmlContent);
    } catch (error) {
      throw new Error(`XML parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract records from parsed XML based on configuration
   */
  private extractRecords(parsedData: any, config: XMLConfig): any[] {
    const records: any[] = [];

    if (config.recordPath) {
      // Extract records using path (simplified XPath-like)
      const pathParts = config.recordPath.split('/').filter(p => p);
      let current = parsedData;
      
      for (const part of pathParts) {
        if (current && current[part]) {
          current = current[part];
        } else {
          logger.warn(`Record path ${config.recordPath} not found in XML`);
          return [];
        }
      }

      // If current is an array, it's our records
      if (Array.isArray(current)) {
        records.push(...current);
      } else if (current && typeof current === 'object') {
        // Single record
        records.push(current);
      }
    } else {
      // No specific path, try to auto-detect records
      if (Array.isArray(parsedData)) {
        records.push(...parsedData);
      } else if (parsedData && typeof parsedData === 'object') {
        // Look for array properties that might be log records
        const arrayProps = Object.keys(parsedData).filter(key => Array.isArray(parsedData[key]));
        
        if (arrayProps.length === 1) {
          // Single array property, likely our records
          records.push(...parsedData[arrayProps[0]]);
        } else if (arrayProps.length > 1) {
          // Multiple arrays, look for likely candidates
          const likelyCandidates = arrayProps.filter(key => 
            key.toLowerCase().includes('log') || 
            key.toLowerCase().includes('event') || 
            key.toLowerCase().includes('record') ||
            key.toLowerCase().includes('entry')
          );
          
          if (likelyCandidates.length > 0) {
            records.push(...parsedData[likelyCandidates[0]]);
          } else {
            // Use the first array
            records.push(...parsedData[arrayProps[0]]);
          }
        } else {
          // No arrays, treat the whole object as a single record
          records.push(parsedData);
        }
      }
    }

    return records;
  }

  /**
   * Create a log event from an XML record
   */
  private createLogEvent(record: any, source: string, index: number, config: XMLConfig): RawLogEvent {
    // Extract timestamp if configured
    let timestamp = new Date();
    if (config.timestampField) {
      const timestampValue = this.getNestedValue(record, config.timestampField);
      if (timestampValue) {
        try {
          timestamp = config.timestampFormat 
            ? this.parseCustomTimestamp(timestampValue, config.timestampFormat)
            : new Date(timestampValue);
        } catch (error) {
          logger.warn(`Failed to parse timestamp from field ${config.timestampField}`, {
            value: timestampValue,
            error,
          });
        }
      }
    }

    // Flatten nested XML structure
    const flattenedRecord = this.flattenObject(record);

    return {
      id: uuidv4(),
      source: LogSource.XML as any,
      timestamp,
      rawData: JSON.stringify(record),
      metadata: {
        ingestionId: uuidv4(),
        ingestionTime: new Date(),
        collector: 'xml-adapter',
        collectorVersion: '1.0.0',
        organizationId: process.env.ORGANIZATION_ID || 'default',
        environment: process.env.ENVIRONMENT || 'production',
        retention: {
          tier: 'hot',
          days: 7,
          compressed: false,
          encrypted: false,
        },
        xml: {
          source,
          recordIndex: index,
          fieldCount: Object.keys(flattenedRecord).length,
          hasAttributes: config.includeAttributes,
          recordPath: config.recordPath,
        },
      },
      receivedAt: new Date(),
      fields: flattenedRecord,
    };
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current && current[part] !== undefined) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  /**
   * Flatten nested object structure
   */
  private flattenObject(obj: any, prefix: string = '', result: Record<string, any> = {}): Record<string, any> {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;
        
        if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
          // Recursively flatten nested objects
          this.flattenObject(value, newKey, result);
        } else if (Array.isArray(value)) {
          // Handle arrays
          if (value.length > 0 && typeof value[0] === 'object') {
            // Array of objects - flatten each
            value.forEach((item, index) => {
              this.flattenObject(item, `${newKey}[${index}]`, result);
            });
          } else {
            // Array of primitives
            result[newKey] = value.join(', ');
          }
        } else {
          // Primitive value
          result[newKey] = value;
        }
      }
    }
    
    return result;
  }

  /**
   * Parse custom timestamp format
   */
  private parseCustomTimestamp(value: string, format: string): Date {
    // Reuse timestamp parsing logic from CSV adapter
    const commonFormats: Record<string, RegExp> = {
      'YYYY-MM-DD HH:mm:ss': /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/,
      'MM/DD/YYYY HH:mm:ss': /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/,
      'DD-MM-YYYY HH:mm:ss': /^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2})$/,
      'ISO8601': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?$/,
    };

    // Check for ISO8601 format first
    if (format === 'ISO8601' || commonFormats['ISO8601'].test(value)) {
      return new Date(value);
    }

    const pattern = commonFormats[format];
    if (pattern) {
      const match = value.match(pattern);
      if (match) {
        // Parse based on format
        if (format.includes('YYYY-MM-DD')) {
          const [, year, month, day, hour = '0', minute = '0', second = '0'] = match;
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 
                         parseInt(hour), parseInt(minute), parseInt(second));
        } else if (format.includes('MM/DD/YYYY')) {
          const [, month, day, year, hour = '0', minute = '0', second = '0'] = match;
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 
                         parseInt(hour), parseInt(minute), parseInt(second));
        } else if (format.includes('DD-MM-YYYY')) {
          const [, day, month, year, hour = '0', minute = '0', second = '0'] = match;
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 
                         parseInt(hour), parseInt(minute), parseInt(second));
        }
      }
    }

    // Fallback to standard Date parsing
    return new Date(value);
  }

  /**
   * Process a batch of events
   */
  private async processBatch(events: RawLogEvent[]): Promise<void> {
    try {
      // Add to buffer
      await this.bufferManager.addEvents(events);

      // Send to Kafka
      await this.sendToKafka(events);

      logger.debug(`Processed batch of ${events.length} XML events`);
    } catch (error) {
      logger.error('Error processing XML batch', error);
      this.metrics.incrementCounter('xml.batch_errors');
      throw error;
    }
  }

  /**
   * Send events to Kafka
   */
  private async sendToKafka(events: RawLogEvent[]): Promise<void> {
    try {
      const messages = events.map(event => ({
        key: event.metadata.organizationId,
        value: JSON.stringify(event),
        timestamp: event.timestamp.toISOString(),
        headers: {
          source: 'xml',
          ingestionId: event.metadata.ingestionId,
        },
      }));

      await this.producerPool.sendBatch('log-events-raw', messages);

      this.metrics.incrementCounter('xml.events_sent', {}, events.length);
    } catch (error) {
      logger.error('Error sending XML events to Kafka', error);
      this.metrics.incrementCounter('xml.kafka_errors');
      
      // Re-queue events for retry
      await this.bufferManager.requeueEvents(events);
      throw error;
    }
  }

  /**
   * Get adapter statistics
   */
  getStats(): object {
    return {
      isRunning: this.isRunning,
      watchDirectory: this.config.watchDirectory,
      processedFiles: this.processedFiles.size,
      fileDetails: Array.from(this.processedFiles.values()),
      bufferSize: this.bufferManager.getSize(),
      metrics: this.metrics.getMetrics(),
    };
  }

  /**
   * Get list of processed files
   */
  getProcessedFiles(): XMLFileInfo[] {
    return Array.from(this.processedFiles.values());
  }

  /**
   * Reset processed files tracking
   */
  resetProcessedFiles(): void {
    this.processedFiles.clear();
    logger.info('Reset processed files tracking');
  }
}

export default XMLAdapter;