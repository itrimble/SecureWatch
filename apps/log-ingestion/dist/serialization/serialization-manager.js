import * as avro from 'avsc';
import * as protobuf from 'protobufjs';
import { performance } from 'perf_hooks';
import { createHash } from 'crypto';
export var SerializationFormat;
(function (SerializationFormat) {
    SerializationFormat["PROTOBUF"] = "protobuf";
    SerializationFormat["AVRO"] = "avro";
    SerializationFormat["JSON"] = "json";
    SerializationFormat["MSGPACK"] = "msgpack";
})(SerializationFormat || (SerializationFormat = {}));
export class SerializationManager {
    config;
    protobufRoot = null;
    avroTypes = new Map();
    schemaCache = new Map();
    metricsHistory = [];
    constructor(config = {}) {
        this.config = {
            defaultFormat: SerializationFormat.PROTOBUF,
            compressionEnabled: true,
            schemaValidation: true,
            performanceMetrics: true,
            cacheSchemas: true,
            maxSchemaCache: 1000,
            ...config
        };
    }
    async initialize() {
        console.log('Initializing SerializationManager...');
        // Load Protocol Buffers schema
        await this.loadProtobufSchema();
        // Load Avro schemas
        await this.loadAvroSchemas();
        console.log('SerializationManager initialized successfully');
    }
    async loadProtobufSchema() {
        try {
            // In a real implementation, you'd load the .proto file
            // For now, we'll define the schema programmatically
            this.protobufRoot = new protobuf.Root();
            // Note: In production, load from the .proto file:
            // this.protobufRoot = await protobuf.load('./serialization/protobuf/log-event.proto');
            console.log('Protocol Buffers schema loaded');
        }
        catch (error) {
            console.error('Failed to load Protocol Buffers schema:', error);
            throw error;
        }
    }
    async loadAvroSchemas() {
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
            }
            catch (fileError) {
                // Schema file might not exist yet, create in-memory schema
                console.warn('Could not load Avro schema file, using in-memory schema');
                this.createInMemoryAvroSchemas();
            }
        }
        catch (error) {
            console.error('Failed to load Avro schemas:', error);
            // Fallback to in-memory schemas
            this.createInMemoryAvroSchemas();
        }
    }
    createInMemoryAvroSchemas() {
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
    async serialize(data, format = this.config.defaultFormat, eventType = 'unknown') {
        const startTime = performance.now();
        let serializedData;
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
            const endTime = performance.now();
            const serializationTimeNs = (endTime - startTime) * 1_000_000; // Convert to nanoseconds
            // Calculate checksum
            const checksum = createHash('sha256').update(serializedData).digest('hex');
            const metrics = {
                format,
                serializationTimeNs,
                deserializationTimeNs: 0,
                serializedSizeBytes: serializedData.length,
                originalSizeBytes: originalSize,
                compressionRatio: originalSize > 0 ? serializedData.length / originalSize : 1,
                throughputOpsPerSec: 0,
                errorCount: 0
            };
            if (this.config.performanceMetrics) {
                this.recordMetrics(metrics);
            }
            return {
                data: serializedData,
                format,
                size: serializedData.length,
                metrics: this.config.performanceMetrics ? metrics : undefined,
                checksum
            };
        }
        catch (error) {
            console.error(`Serialization failed for format ${format}:`, error);
            throw new Error(`Serialization failed: ${error.message}`);
        }
    }
    async deserialize(serializedData, format, eventType = 'unknown', expectedChecksum) {
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
            let data;
            switch (format) {
                case SerializationFormat.PROTOBUF:
                    data = await this.deserializeProtobuf(serializedData, eventType);
                    break;
                case SerializationFormat.AVRO:
                    data = await this.deserializeAvro(serializedData, eventType);
                    break;
                case SerializationFormat.JSON:
                    data = JSON.parse(serializedData.toString('utf8'));
                    break;
                case SerializationFormat.MSGPACK:
                    data = await this.deserializeMsgPack(serializedData);
                    break;
                default:
                    throw new Error(`Unsupported deserialization format: ${format}`);
            }
            const endTime = performance.now();
            const deserializationTimeNs = (endTime - startTime) * 1_000_000;
            const metrics = {
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
        }
        catch (error) {
            console.error(`Deserialization failed for format ${format}:`, error);
            throw new Error(`Deserialization failed: ${error.message}`);
        }
    }
    async serializeProtobuf(data, eventType) {
        // In a real implementation, this would use the loaded protobuf schema
        // For now, return JSON as buffer (placeholder)
        return Buffer.from(JSON.stringify(data), 'utf8');
    }
    async deserializeProtobuf(data, eventType) {
        // In a real implementation, this would use the loaded protobuf schema
        // For now, parse as JSON (placeholder)
        return JSON.parse(data.toString('utf8'));
    }
    async serializeAvro(data, eventType) {
        const avroType = this.avroTypes.get(eventType) || this.avroTypes.get('NormalizedLogEvent');
        if (!avroType) {
            throw new Error(`No Avro schema found for event type: ${eventType}`);
        }
        try {
            return avroType.toBuffer(data);
        }
        catch (error) {
            console.error('Avro serialization error:', error);
            throw new Error(`Avro serialization failed: ${error.message}`);
        }
    }
    async deserializeAvro(data, eventType) {
        const avroType = this.avroTypes.get(eventType) || this.avroTypes.get('NormalizedLogEvent');
        if (!avroType) {
            throw new Error(`No Avro schema found for event type: ${eventType}`);
        }
        try {
            return avroType.fromBuffer(data);
        }
        catch (error) {
            console.error('Avro deserialization error:', error);
            throw new Error(`Avro deserialization failed: ${error.message}`);
        }
    }
    async serializeMsgPack(data) {
        // Placeholder - would use msgpack library
        return Buffer.from(JSON.stringify(data), 'utf8');
    }
    async deserializeMsgPack(data) {
        // Placeholder - would use msgpack library
        return JSON.parse(data.toString('utf8'));
    }
    recordMetrics(metrics) {
        this.metricsHistory.push(metrics);
        // Keep only recent metrics (last 10000 operations)
        if (this.metricsHistory.length > 10000) {
            this.metricsHistory = this.metricsHistory.slice(-10000);
        }
    }
    getPerformanceMetrics() {
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
    async benchmarkFormats(sampleData, iterations = 1000) {
        const results = new Map();
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
                }
                catch (error) {
                    errorCount++;
                }
            }
            const endTime = performance.now();
            const totalTimeMs = endTime - startTime;
            const totalTimeNs = totalTimeMs * 1_000_000;
            const metrics = {
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
    async registerSchema(schemaId, schema) {
        if (this.config.cacheSchemas) {
            if (this.schemaCache.size >= this.config.maxSchemaCache) {
                // Remove oldest entry (simple LRU)
                const firstKey = this.schemaCache.keys().next().value;
                this.schemaCache.delete(firstKey);
            }
            this.schemaCache.set(schemaId, schema);
        }
    }
    async getSchema(schemaId) {
        return this.schemaCache.get(schemaId) || null;
    }
    getFormatRecommendation(eventSize, evolutionImportance) {
        // Simple heuristic for format recommendation
        if (evolutionImportance > 0.7) {
            return SerializationFormat.AVRO; // Better for schema evolution
        }
        else if (eventSize < 1024) {
            return SerializationFormat.PROTOBUF; // Better for small, fast messages
        }
        else {
            return SerializationFormat.AVRO; // Better for larger messages with compression
        }
    }
}
//# sourceMappingURL=serialization-manager.js.map