export declare enum SerializationFormat {
    PROTOBUF = "protobuf",
    AVRO = "avro",
    JSON = "json",
    MSGPACK = "msgpack"
}
export interface SerializationConfig {
    defaultFormat: SerializationFormat;
    compressionEnabled: boolean;
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
export declare class SerializationManager {
    private config;
    private protobufRoot;
    private avroTypes;
    private schemaCache;
    private metricsHistory;
    constructor(config?: Partial<SerializationConfig>);
    initialize(): Promise<void>;
    private loadProtobufSchema;
    private loadAvroSchemas;
    private createInMemoryAvroSchemas;
    serialize<T>(data: T, format?: SerializationFormat, eventType?: string): Promise<SerializationResult<T>>;
    deserialize<T>(serializedData: Buffer, format: SerializationFormat, eventType?: string, expectedChecksum?: string): Promise<DeserializationResult<T>>;
    private serializeProtobuf;
    private deserializeProtobuf;
    private serializeAvro;
    private deserializeAvro;
    private serializeMsgPack;
    private deserializeMsgPack;
    private recordMetrics;
    getPerformanceMetrics(): {
        averageSerializationTime: number;
        averageDeserializationTime: number;
        averageCompressionRatio: number;
        totalOperations: number;
        errorRate: number;
        throughputOpsPerSec: number;
    };
    benchmarkFormats(sampleData: any, iterations?: number): Promise<Map<SerializationFormat, SerializationMetrics>>;
    registerSchema(schemaId: string, schema: any): Promise<void>;
    getSchema(schemaId: string): Promise<any | null>;
    getFormatRecommendation(eventSize: number, evolutionImportance: number): SerializationFormat;
}
//# sourceMappingURL=serialization-manager.d.ts.map