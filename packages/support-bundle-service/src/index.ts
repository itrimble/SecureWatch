import { Client } from '@opensearch-project/opensearch';
import archiver from 'archiver';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface LogExportOptions {
  startTime: Date;
  endTime: Date;
  services?: string[];
  logLevels?: ('error' | 'warn' | 'info' | 'debug')[];
  maxDocuments?: number;
  includeStackTraces?: boolean;
}

export interface LogExportResult {
  bundlePath: string;
  totalDocuments: number;
  bundleSize: number;
  exportDuration: number;
  services: string[];
  timeRange: {
    start: string;
    end: string;
  };
}

export interface LogDocument {
  '@timestamp': string;
  level: string;
  message: string;
  service: string;
  hostname?: string;
  pid?: number;
  requestId?: string;
  userId?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
  [key: string]: any;
}

export class LogExporter {
  private client: Client;
  private indexPattern: string;

  constructor(
    client: Client,
    indexPattern: string = 'platform-internal-logs-*'
  ) {
    this.client = client;
    this.indexPattern = indexPattern;
  }

  /**
   * Export logs within the specified time range to a compressed bundle
   */
  async exportLogs(options: LogExportOptions): Promise<LogExportResult> {
    const exportId = uuidv4();
    const startTime = Date.now();
    
    console.log(`[LogExporter] Starting log export ${exportId} for range: ${options.startTime.toISOString()} to ${options.endTime.toISOString()}`);

    try {
      // Create temporary directory for this export
      const tempDir = join(tmpdir(), `securewatch-logs-${exportId}`);
      await fs.mkdir(tempDir, { recursive: true });

      // Generate the OpenSearch query
      const query = this.buildQuery(options);
      
      // Fetch all log documents using scroll API
      const documents = await this.fetchAllDocuments(query, options.maxDocuments || 100000);
      
      console.log(`[LogExporter] Fetched ${documents.length} log documents`);

      // Create the bundle metadata
      const metadata = this.createBundleMetadata(options, documents, exportId);
      
      // Write logs to JSON file
      const logsFilePath = join(tempDir, 'logs.json');
      await this.writeLogsToFile(documents, logsFilePath);
      
      // Write metadata to separate file
      const metadataFilePath = join(tempDir, 'metadata.json');
      await fs.writeFile(metadataFilePath, JSON.stringify(metadata, null, 2));
      
      // Create README for the bundle
      const readmeFilePath = join(tempDir, 'README.txt');
      await this.writeReadmeFile(readmeFilePath, metadata);
      
      // Compress everything into a ZIP file
      const bundlePath = await this.createCompressedBundle(tempDir, exportId);
      
      // Clean up temporary directory
      await fs.rm(tempDir, { recursive: true, force: true });
      
      const exportDuration = Date.now() - startTime;
      const bundleStats = await fs.stat(bundlePath);
      
      console.log(`[LogExporter] Export ${exportId} completed in ${exportDuration}ms, bundle size: ${bundleStats.size} bytes`);

      return {
        bundlePath,
        totalDocuments: documents.length,
        bundleSize: bundleStats.size,
        exportDuration,
        services: this.extractUniqueServices(documents),
        timeRange: {
          start: options.startTime.toISOString(),
          end: options.endTime.toISOString()
        }
      };
    } catch (error) {
      console.error(`[LogExporter] Export ${exportId} failed:`, error);
      throw new Error(`Log export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build OpenSearch query based on export options
   */
  private buildQuery(options: LogExportOptions): any {
    const mustClauses: any[] = [
      {
        range: {
          '@timestamp': {
            gte: options.startTime.toISOString(),
            lte: options.endTime.toISOString()
          }
        }
      }
    ];

    // Filter by services if specified
    if (options.services && options.services.length > 0) {
      mustClauses.push({
        terms: {
          'service.keyword': options.services
        }
      });
    }

    // Filter by log levels if specified
    if (options.logLevels && options.logLevels.length > 0) {
      mustClauses.push({
        terms: {
          'level.keyword': options.logLevels
        }
      });
    }

    return {
      query: {
        bool: {
          must: mustClauses
        }
      },
      sort: [
        {
          '@timestamp': {
            order: 'asc'
          }
        }
      ],
      _source: true
    };
  }

  /**
   * Fetch all documents using OpenSearch scroll API
   */
  private async fetchAllDocuments(query: any, maxDocuments: number): Promise<LogDocument[]> {
    const documents: LogDocument[] = [];
    const scrollSize = Math.min(1000, maxDocuments);
    let scrollId: string | undefined;

    try {
      // Initial search request
      const initialResponse = await this.client.search({
        index: this.indexPattern,
        body: {
          ...query,
          size: scrollSize
        },
        scroll: '5m'
      });

      scrollId = initialResponse.body._scroll_id;
      let hits = initialResponse.body.hits.hits;

      // Process initial batch
      documents.push(...hits.map((hit: any) => hit._source));

      // Continue scrolling while there are more results and we haven't hit the limit
      while (hits.length > 0 && documents.length < maxDocuments) {
        const scrollResponse = await this.client.scroll({
          scroll_id: scrollId,
          scroll: '5m'
        });

        scrollId = scrollResponse.body._scroll_id;
        hits = scrollResponse.body.hits.hits;

        if (hits.length > 0) {
          const remainingSlots = maxDocuments - documents.length;
          const documentsToAdd = hits.slice(0, remainingSlots);
          documents.push(...documentsToAdd.map((hit: any) => hit._source));
        }
      }

      return documents;
    } finally {
      // Clean up scroll context
      if (scrollId) {
        try {
          await this.client.clearScroll({
            scroll_id: scrollId
          });
        } catch (error) {
          console.warn(`[LogExporter] Failed to clear scroll context: ${error}`);
        }
      }
    }
  }

  /**
   * Create bundle metadata
   */
  private createBundleMetadata(options: LogExportOptions, documents: LogDocument[], exportId: string): any {
    const services = this.extractUniqueServices(documents);
    const logLevels = this.extractUniqueLogLevels(documents);
    const firstDocument = documents[0];
    const lastDocument = documents[documents.length - 1];

    return {
      exportInfo: {
        exportId,
        exportTime: new Date().toISOString(),
        secureWatchVersion: process.env.SECUREWATCH_VERSION || 'unknown',
        exportedBy: 'SecureWatch Support Bundle Service'
      },
      requestedTimeRange: {
        start: options.startTime.toISOString(),
        end: options.endTime.toISOString()
      },
      actualTimeRange: {
        start: firstDocument?.['@timestamp'] || null,
        end: lastDocument?.['@timestamp'] || null
      },
      statistics: {
        totalDocuments: documents.length,
        uniqueServices: services.length,
        uniqueLogLevels: logLevels.length,
        services,
        logLevels
      },
      filters: {
        services: options.services || [],
        logLevels: options.logLevels || [],
        maxDocuments: options.maxDocuments || 100000,
        includeStackTraces: options.includeStackTraces || false
      }
    };
  }

  /**
   * Write logs to JSON file with proper formatting
   */
  private async writeLogsToFile(documents: LogDocument[], filePath: string): Promise<void> {
    const stream = require('fs').createWriteStream(filePath);
    
    return new Promise((resolve, reject) => {
      stream.write('[\n');
      
      documents.forEach((doc, index) => {
        const jsonLine = JSON.stringify(doc, null, 2);
        const indentedJsonLine = jsonLine.split('\n').map(line => '  ' + line).join('\n');
        
        stream.write(indentedJsonLine);
        
        if (index < documents.length - 1) {
          stream.write(',\n');
        } else {
          stream.write('\n');
        }
      });
      
      stream.write(']\n');
      stream.end();
      
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }

  /**
   * Create README file for the bundle
   */
  private async writeReadmeFile(filePath: string, metadata: any): Promise<void> {
    const readme = `
SecureWatch SIEM - Troubleshooting Log Bundle
=============================================

Export Information:
- Export ID: ${metadata.exportInfo.exportId}
- Export Time: ${metadata.exportInfo.exportTime}
- SecureWatch Version: ${metadata.exportInfo.secureWatchVersion}

Time Range:
- Requested: ${metadata.requestedTimeRange.start} to ${metadata.requestedTimeRange.end}
- Actual: ${metadata.actualTimeRange.start || 'N/A'} to ${metadata.actualTimeRange.end || 'N/A'}

Statistics:
- Total Log Documents: ${metadata.statistics.totalDocuments}
- Unique Services: ${metadata.statistics.uniqueServices}
- Services Included: ${metadata.statistics.services.join(', ')}
- Log Levels: ${metadata.statistics.logLevels.join(', ')}

Files in this Bundle:
- logs.json: All log documents in JSON format
- metadata.json: Detailed metadata about this export
- README.txt: This file

Usage:
This bundle contains internal operational logs from the SecureWatch SIEM platform.
These logs are intended for troubleshooting and support purposes.

For support, please include this entire bundle when reporting issues.
    `.trim();

    await fs.writeFile(filePath, readme);
  }

  /**
   * Create compressed bundle
   */
  private async createCompressedBundle(tempDir: string, exportId: string): Promise<string> {
    const bundlePath = join(tmpdir(), `securewatch-logs-${exportId}.zip`);
    
    return new Promise((resolve, reject) => {
      const output = require('fs').createWriteStream(bundlePath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      output.on('close', () => {
        console.log(`[LogExporter] Bundle created: ${archive.pointer()} bytes`);
        resolve(bundlePath);
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);
      archive.directory(tempDir, false);
      archive.finalize();
    });
  }

  /**
   * Extract unique services from documents
   */
  private extractUniqueServices(documents: LogDocument[]): string[] {
    const services = new Set<string>();
    documents.forEach(doc => {
      if (doc.service) {
        services.add(doc.service);
      }
    });
    return Array.from(services).sort();
  }

  /**
   * Extract unique log levels from documents
   */
  private extractUniqueLogLevels(documents: LogDocument[]): string[] {
    const levels = new Set<string>();
    documents.forEach(doc => {
      if (doc.level) {
        levels.add(doc.level);
      }
    });
    return Array.from(levels).sort();
  }

  /**
   * Check if the service is healthy and can connect to OpenSearch
   */
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      const response = await this.client.cluster.health();
      return {
        healthy: true,
        details: {
          cluster_name: response.body.cluster_name,
          status: response.body.status,
          number_of_nodes: response.body.number_of_nodes,
          active_primary_shards: response.body.active_primary_shards
        }
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
}

export default LogExporter;