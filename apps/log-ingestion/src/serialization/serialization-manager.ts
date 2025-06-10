import { RawLogEvent, NormalizedLogEvent, EnrichedLogEvent } from '../types/log-event.types';
import * as avro from 'avsc';
import * as protobuf from 'protobufjs';
import { performance } from 'perf_hooks';
import { createHash } from 'crypto';
import { ZstdManager } from '../compression/zstd-manager';

export enum SerializationFormat {
  PROTOBUF = 'protobuf',
  AVRO = 'avro',
  JSON = 'json',
  MSGPACK = 'msgpack'
}

export interface SerializationConfig {
  defaultFormat: SerializationFormat;
  compressionEnabled: boolean;
  compressionLevel: number;
  adaptiveCompression: boolean;
  schemaValidation: boolean;
  performanceMetrics: boolean;
  cacheSchemas: boolean;
  maxSchemaCache: number;
}

export interface SerializationMetrics {
  format: SerializationFormat;
  serializationTimeNs: number;
  deserializationTimeNs: number;
  serializedSizeBytes: number;
  originalSizeBytes: number;
  compressionRatio: number;
  throughputOpsPerSec: number;
  errorCount: number;
}

export interface SerializationResult<T> {
  data: Buffer;
  format: SerializationFormat;
  size: number;
  metrics?: SerializationMetrics;
  checksum: string;
}

export interface DeserializationResult<T> {
  data: T;
  format: SerializationFormat;
  metrics?: SerializationMetrics;
  checksumValid: boolean;
}

export class SerializationManager {
  private config: SerializationConfig;
  private protobufRoot: protobuf.Root | null = null;
  private avroTypes: Map<string, avro.Type> = new Map();
  private schemaCache: Map<string, any> = new Map();
  private metricsHistory: SerializationMetrics[] = [];
  private zstdManager: ZstdManager;

  constructor(config: Partial<SerializationConfig> = {}) {
    this.config = {
      defaultFormat: SerializationFormat.PROTOBUF,
      compressionEnabled: true,
      compressionLevel: 3,
      adaptiveCompression: true,
      schemaValidation: true,
      performanceMetrics: true,
      cacheSchemas: true,
      maxSchemaCache: 1000,
      ...config
    };

    // Initialize Zstandard compression manager
    this.zstdManager = new ZstdManager({
      level: this.config.compressionLevel,
      enableDictionary: true,
      threshold: 1024, // Only compress data > 1KB
    });
  }

  async initialize(): Promise<void> {
    console.log('Initializing SerializationManager...');
    
    // Initialize Zstandard compression
    if (this.config.compressionEnabled) {
      await this.zstdManager.initialize();
    }
    
    // Load Protocol Buffers schema
    await this.loadProtobufSchema();
    
    // Load Avro schemas
    await this.loadAvroSchemas();
    
    console.log('SerializationManager initialized successfully');
  }

  private async loadProtobufSchema(): Promise<void> {
    try {
      // In a real implementation, you'd load the .proto file
      // For now, we'll define the schema programmatically
      this.protobufRoot = new protobuf.Root();
      
      // Note: In production, load from the .proto file:
      // this.protobufRoot = await protobuf.load('./serialization/protobuf/log-event.proto');
      
      console.log('Protocol Buffers schema loaded');
    } catch (error) {
      console.error('Failed to load Protocol Buffers schema:', error);
      throw error;
    }
  }

  private async loadAvroSchemas(): Promise<void> {
    try {
      // Load Avro schemas from files
      const fs = await import('fs').then(m => m.promises);
      
      // Load normalized log event schema
      const normalizedSchemaPath = './serialization/avro/schemas/normalized-log-event.avsc';
      try {
        const normalizedSchemaJson = await fs.readFile(normalizedSchemaPath, 'utf8');
        const normalizedSchema = JSON.parse(normalizedSchemaJson);
        const normalizedType = avro.Type.forSchema(normalizedSchema);
        this.avroTypes.set('NormalizedLogEvent', normalizedType);
        
        console.log('Avro schemas loaded successfully');
      } catch (fileError) {
        // Schema file might not exist yet, create in-memory schema
        console.warn('Could not load Avro schema file, using in-memory schema');
        this.createInMemoryAvroSchemas();
      }
      
    } catch (error) {
      console.error('Failed to load Avro schemas:', error);
      // Fallback to in-memory schemas
      this.createInMemoryAvroSchemas();
    }
  }

  private createInMemoryAvroSchemas(): void {
    // Simplified in-memory schema for NormalizedLogEvent
    const normalizedSchema = {
      type: 'record',
      name: 'NormalizedLogEvent',
      fields: [
        { name: 'id', type: 'string' },
        { name: 'timestamp', type: 'long' },
        { name: 'message', type: 'string' },
        { name: 'source', type: 'string' },
        { name: 'severity', type: 'string' },
        { name: 'category', type: 'string' },
        { name: 'fields', type: { type: 'map', values: 'string' }, default: {} },
        { name: 'tags', type: { type: 'array', items: 'string' }, default: [] }
      ]
    };

    const normalizedType = avro.Type.forSchema(normalizedSchema);
    this.avroTypes.set('NormalizedLogEvent', normalizedType);
  }

  async serialize<T>(
    data: T,
    format: SerializationFormat = this.config.defaultFormat,
    eventType: string = 'unknown'
  ): Promise<SerializationResult<T>> {
    const startTime = performance.now();
    let serializedData: Buffer;
    let originalSize = 0;

    try {
      // Calculate original size (rough estimate)
      originalSize = Buffer.byteLength(JSON.stringify(data), 'utf8');

      switch (format) {
        case SerializationFormat.PROTOBUF:
          serializedData = await this.serializeProtobuf(data, eventType);
          break;
        case SerializationFormat.AVRO:
          serializedData = await this.serializeAvro(data, eventType);
          break;
        case SerializationFormat.JSON:
          serializedData = Buffer.from(JSON.stringify(data), 'utf8');
          break;
        case SerializationFormat.MSGPACK:
          serializedData = await this.serializeMsgPack(data);
          break;
        default:
          throw new Error(`Unsupported serialization format: ${format}`);
      }

      // Apply Zstandard compression if enabled
      let finalData = serializedData;
      let compressionMetrics = null;
      
      if (this.config.compressionEnabled) {
        const compressionResult = await this.zstdManager.compress(serializedData);
        finalData = compressionResult.data;
        compressionMetrics = compressionResult.metrics;

        // Adaptive compression level adjustment
        if (this.config.adaptiveCompression) {
          await this.adjustCompressionLevel(compressionMetrics);
        }
      }

      const endTime = performance.now();
      const serializationTimeNs = (endTime - startTime) * 1_000_000; // Convert to nanoseconds

      // Calculate checksum on final compressed data
      const checksum = createHash('sha256').update(finalData).digest('hex');

      const metrics: SerializationMetrics = {
        format,
        serializationTimeNs,
        deserializationTimeNs: 0,
        serializedSizeBytes: finalData.length,
        originalSizeBytes: originalSize,
        compressionRatio: originalSize > 0 ? finalData.length / originalSize : 1,
        throughputOpsPerSec: 0,
        errorCount: 0
      };

      if (this.config.performanceMetrics) {
        this.recordMetrics(metrics);
      }

      return {
        data: finalData,
        format,
        size: finalData.length,
        metrics: this.config.performanceMetrics ? metrics : undefined,
        checksum
      };

    } catch (error) {
      console.error(`Serialization failed for format ${format}:`, error);
      throw new Error(`Serialization failed: ${error.message}`);
    }
  }

  async deserialize<T>(
    serializedData: Buffer,
    format: SerializationFormat,
    eventType: string = 'unknown',
    expectedChecksum?: string
  ): Promise<DeserializationResult<T>> {
    const startTime = performance.now();

    try {
      // Verify checksum if provided
      let checksumValid = true;
      if (expectedChecksum) {
        const actualChecksum = createHash('sha256').update(serializedData).digest('hex');
        checksumValid = actualChecksum === expectedChecksum;
        if (!checksumValid) {
          console.warn('Checksum mismatch detected during deserialization');
        }
      }

      let data: T;

      switch (format) {
        case SerializationFormat.PROTOBUF:
          data = await this.deserializeProtobuf<T>(serializedData, eventType);
          break;
        case SerializationFormat.AVRO:
          data = await this.deserializeAvro<T>(serializedData, eventType);
          break;
        case SerializationFormat.JSON:
          data = JSON.parse(serializedData.toString('utf8'));
          break;
        case SerializationFormat.MSGPACK:
          data = await this.deserializeMsgPack<T>(serializedData);
          break;
        default:
          throw new Error(`Unsupported deserialization format: ${format}`);
      }

      const endTime = performance.now();
      const deserializationTimeNs = (endTime - startTime) * 1_000_000;

      const metrics: SerializationMetrics = {
        format,
        serializationTimeNs: 0,
        deserializationTimeNs,
        serializedSizeBytes: serializedData.length,
        originalSizeBytes: 0,
        compressionRatio: 1,
        throughputOpsPerSec: 0,
        errorCount: 0
      };

      if (this.config.performanceMetrics) {
        this.recordMetrics(metrics);
      }

      return {
        data,
        format,
        metrics: this.config.performanceMetrics ? metrics : undefined,
        checksumValid
      };

    } catch (error) {
      console.error(`Deserialization failed for format ${format}:`, error);
      throw new Error(`Deserialization failed: ${error.message}`);
    }
  }

  private async serializeProtobuf<T>(data: T, eventType: string): Promise<Buffer> {
    // In a real implementation, this would use the loaded protobuf schema
    // For now, return JSON as buffer (placeholder)
    return Buffer.from(JSON.stringify(data), 'utf8');
  }

  private async deserializeProtobuf<T>(data: Buffer, eventType: string): Promise<T> {
    // In a real implementation, this would use the loaded protobuf schema
    // For now, parse as JSON (placeholder)
    return JSON.parse(data.toString('utf8'));
  }

  private async serializeAvro<T>(data: T, eventType: string): Promise<Buffer> {
    const avroType = this.avroTypes.get(eventType) || this.avroTypes.get('NormalizedLogEvent');
    
    if (!avroType) {
      throw new Error(`No Avro schema found for event type: ${eventType}`);
    }

    try {
      return avroType.toBuffer(data);
    } catch (error) {
      console.error('Avro serialization error:', error);
      throw new Error(`Avro serialization failed: ${error.message}`);
    }
  }

  private async deserializeAvro<T>(data: Buffer, eventType: string): Promise<T> {
    const avroType = this.avroTypes.get(eventType) || this.avroTypes.get('NormalizedLogEvent');
    
    if (!avroType) {
      throw new Error(`No Avro schema found for event type: ${eventType}`);
    }

    try {
      return avroType.fromBuffer(data);
    } catch (error) {
      console.error('Avro deserialization error:', error);
      throw new Error(`Avro deserialization failed: ${error.message}`);
    }
  }

  private async serializeMsgPack<T>(data: T): Promise<Buffer> {
    // Placeholder - would use msgpack library
    return Buffer.from(JSON.stringify(data), 'utf8');
  }

  private async deserializeMsgPack<T>(data: Buffer): Promise<T> {
    // Placeholder - would use msgpack library
    return JSON.parse(data.toString('utf8'));
  }

  private recordMetrics(metrics: SerializationMetrics): void {
    this.metricsHistory.push(metrics);
    
    // Keep only recent metrics (last 10000 operations)
    if (this.metricsHistory.length > 10000) {
      this.metricsHistory = this.metricsHistory.slice(-10000);
    }
  }

  getPerformanceMetrics(): {
    averageSerializationTime: number;
    averageDeserializationTime: number;
    averageCompressionRatio: number;
    totalOperations: number;
    errorRate: number;
    throughputOpsPerSec: number;
  } {
    if (this.metricsHistory.length === 0) {
      return {
        averageSerializationTime: 0,
        averageDeserializationTime: 0,
        averageCompressionRatio: 1,
        totalOperations: 0,
        errorRate: 0,
        throughputOpsPerSec: 0
      };
    }

    const totalOps = this.metricsHistory.length;
    const avgSerTime = this.metricsHistory.reduce((sum, m) => sum + m.serializationTimeNs, 0) / totalOps;
    const avgDeserTime = this.metricsHistory.reduce((sum, m) => sum + m.deserializationTimeNs, 0) / totalOps;
    const avgCompRatio = this.metricsHistory.reduce((sum, m) => sum + m.compressionRatio, 0) / totalOps;
    const totalErrors = this.metricsHistory.reduce((sum, m) => sum + m.errorCount, 0);

    // Calculate throughput based on recent performance
    const recentMetrics = this.metricsHistory.slice(-1000); // Last 1000 operations
    const recentAvgTime = recentMetrics.reduce((sum, m) => sum + m.serializationTimeNs + m.deserializationTimeNs, 0) / recentMetrics.length;
    const throughput = recentAvgTime > 0 ? (1_000_000_000 / recentAvgTime) : 0;

    return {
      averageSerializationTime: avgSerTime,
      averageDeserializationTime: avgDeserTime,
      averageCompressionRatio: avgCompRatio,
      totalOperations: totalOps,
      errorRate: totalErrors / totalOps,
      throughputOpsPerSec: throughput
    };
  }

  async benchmarkFormats(sampleData: any, iterations: number = 1000): Promise<Map<SerializationFormat, SerializationMetrics>> {
    const results = new Map<SerializationFormat, SerializationMetrics>();
    const formats = [SerializationFormat.PROTOBUF, SerializationFormat.AVRO, SerializationFormat.JSON];

    console.log(`Running serialization benchmark with ${iterations} iterations...`);

    for (const format of formats) {
      console.log(`Benchmarking ${format}...`);
      
      const startTime = performance.now();
      let totalSerSize = 0;
      let totalOrigSize = 0;
      let errorCount = 0;

      for (let i = 0; i < iterations; i++) {
        try {
          const serResult = await this.serialize(sampleData, format);
          totalSerSize += serResult.size;
          totalOrigSize += serResult.metrics?.originalSizeBytes || 0;
          
          await this.deserialize(serResult.data, format);
        } catch (error) {
          errorCount++;
        }
      }

      const endTime = performance.now();
      const totalTimeMs = endTime - startTime;
      const totalTimeNs = totalTimeMs * 1_000_000;

      const metrics: SerializationMetrics = {
        format,
        serializationTimeNs: totalTimeNs / iterations,
        deserializationTimeNs: totalTimeNs / iterations,
        serializedSizeBytes: totalSerSize / iterations,
        originalSizeBytes: totalOrigSize / iterations,
        compressionRatio: totalOrigSize > 0 ? totalSerSize / totalOrigSize : 1,
        throughputOpsPerSec: (iterations / totalTimeMs) * 1000,
        errorCount
      };

      results.set(format, metrics);
      
      console.log(`${format} benchmark complete: ${metrics.throughputOpsPerSec.toFixed(0)} ops/sec`);
    }

    return results;
  }

  // Schema registry integration methods
  async registerSchema(schemaId: string, schema: any): Promise<void> {
    if (this.config.cacheSchemas) {
      if (this.schemaCache.size >= this.config.maxSchemaCache) {
        // Remove oldest entry (simple LRU)
        const firstKey = this.schemaCache.keys().next().value;
        this.schemaCache.delete(firstKey);
      }
      this.schemaCache.set(schemaId, schema);
    }
  }

  async getSchema(schemaId: string): Promise<any | null> {
    return this.schemaCache.get(schemaId) || null;
  }

  getFormatRecommendation(eventSize: number, evolutionImportance: number): SerializationFormat {
    // Simple heuristic for format recommendation
    if (evolutionImportance > 0.7) {
      return SerializationFormat.AVRO; // Better for schema evolution
    } else if (eventSize < 1024) {
      return SerializationFormat.PROTOBUF; // Better for small, fast messages
    } else {
      return SerializationFormat.AVRO; // Better for larger messages with compression
    }
  }

  private async adjustCompressionLevel(compressionMetrics: any): Promise<void> {
    // Adaptive compression level based on performance
    const compressionRatio = compressionMetrics.compressionRatio;
    const throughput = compressionMetrics.throughputMBps;

    if (compressionRatio > 0.9 && throughput < 100) {
      // Poor compression and low throughput - reduce level
      const currentLevel = this.zstdManager.getCompressionLevel();
      if (currentLevel > 1) {
        this.zstdManager.adjustCompressionLevel(currentLevel - 1);
      }
    } else if (compressionRatio < 0.6 && throughput > 200) {
      // Good compression and high throughput - can increase level
      const currentLevel = this.zstdManager.getCompressionLevel();
      if (currentLevel < 6) {
        this.zstdManager.adjustCompressionLevel(currentLevel + 1);
      }
    }
  }

  getCompressionMetrics() {
    return this.zstdManager.getPerformanceMetrics();
  }

  async close(): Promise<void> {
    if (this.zstdManager) {
      await this.zstdManager.close();
    }
  }
}