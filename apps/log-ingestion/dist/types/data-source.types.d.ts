export type DataSourceType = 'windows_event' | 'syslog' | 'csv' | 'xml' | 'json' | 'cloud_trail' | 'azure_activity' | 'gcp_audit' | 'network_firewall' | 'network_ids' | 'network_flow' | 'endpoint_edr' | 'endpoint_antivirus' | 'application_web' | 'application_database' | 'application_custom' | 'custom';
export type CollectionMethod = 'agent' | 'api' | 'file' | 'stream' | 'pull' | 'push';
export type LogFormat = 'evtx' | 'xml' | 'json' | 'syslog' | 'csv' | 'cef' | 'leef' | 'custom';
export type SourceStatus = 'active' | 'inactive' | 'error' | 'configuring' | 'unknown';
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
export interface ScheduleConfig {
    type: 'interval' | 'cron';
    value: string | number;
    timezone?: string;
}
export interface CollectionConfig {
    method: CollectionMethod;
    config: Record<string, any>;
    schedule?: ScheduleConfig;
    retryPolicy?: {
        maxRetries: number;
        backoffMs: number;
        maxBackoffMs: number;
    };
}
export interface FieldMapping {
    source: string;
    destination: string;
    transformation?: string;
    defaultValue?: any;
    required?: boolean;
}
export interface ParsingConfig {
    format: LogFormat;
    customParser?: string;
    fieldMappings: FieldMapping[];
    timestampField?: string;
    timestampFormat?: string;
    multilinePattern?: string;
    delimiter?: string;
}
export interface EnrichmentSource {
    type: string;
    config: Record<string, any>;
    priority?: number;
    cache?: {
        enabled: boolean;
        ttlMs: number;
        maxSize: number;
    };
}
export interface EnrichmentConfig {
    enabled: boolean;
    sources: EnrichmentSource[];
    timeout?: number;
}
export interface ValidationRule {
    field: string;
    condition: string;
    value: any;
    action: 'drop' | 'tag' | 'modify' | 'quarantine';
    metadata?: Record<string, any>;
}
export interface ValidationConfig {
    rules: ValidationRule[];
    dropInvalid?: boolean;
    tagMalformed?: boolean;
}
export interface PerformanceConfig {
    batchSize: number;
    maxConcurrency: number;
    bufferSize: number;
    flushIntervalMs?: number;
    maxMemoryUsageMB?: number;
    compressionEnabled?: boolean;
}
export interface SecurityConfig {
    encryption?: {
        enabled: boolean;
        algorithm?: string;
        keyId?: string;
    };
    authentication?: {
        type: 'none' | 'basic' | 'oauth' | 'certificate' | 'apikey';
        config: Record<string, any>;
    };
    tls?: {
        enabled: boolean;
        version?: string;
        certificates?: {
            ca?: string;
            cert?: string;
            key?: string;
        };
    };
}
export interface DataSourceConfig {
    id: string;
    name: string;
    description?: string;
    type: DataSourceType;
    enabled: boolean;
    tags?: string[];
    collection: CollectionConfig;
    parsing: ParsingConfig;
    enrichment: EnrichmentConfig;
    validation: ValidationConfig;
    performance: PerformanceConfig;
    security?: SecurityConfig;
    metadata?: {
        created: string;
        updated: string;
        version: string;
        createdBy?: string;
        updatedBy?: string;
    };
}
export interface SourceHealth {
    status: HealthStatus;
    lastCheck: Date;
    uptime: number;
    errorCount: number;
    warningCount: number;
    metrics: {
        eventsPerSecond: number;
        bytesPerSecond: number;
        latencyMs: number;
        successRate: number;
    };
    issues?: Array<{
        severity: 'error' | 'warning' | 'info';
        message: string;
        timestamp: Date;
        details?: Record<string, any>;
    }>;
}
export interface DataSourceMetrics {
    id: string;
    status: SourceStatus;
    health: SourceHealth;
    statistics: {
        totalEvents: number;
        eventsToday: number;
        avgEventsPerHour: number;
        peakEventsPerSecond: number;
        totalBytes: number;
        avgLatencyMs: number;
        errorRate: number;
        lastEventTime?: Date;
    };
    performance: {
        cpuUsage: number;
        memoryUsage: number;
        diskUsage: number;
        networkBytesIn: number;
        networkBytesOut: number;
    };
}
export declare abstract class DataSource {
    protected config: DataSourceConfig;
    protected status: SourceStatus;
    protected health: SourceHealth;
    protected metrics: DataSourceMetrics;
    constructor(config: DataSourceConfig);
    abstract start(): Promise<void>;
    abstract stop(): Promise<void>;
    abstract restart(): Promise<void>;
    abstract collect(): Promise<any[]>;
    abstract validateConfig(): Promise<boolean>;
    getId(): string;
    getName(): string;
    getType(): DataSourceType;
    getStatus(): SourceStatus;
    getHealth(): SourceHealth;
    getMetrics(): DataSourceMetrics;
    getConfig(): DataSourceConfig;
    updateConfig(config: Partial<DataSourceConfig>): Promise<void>;
    protected setStatus(status: SourceStatus): void;
    protected updateHealth(): void;
    protected addHealthIssue(severity: 'error' | 'warning' | 'info', message: string, details?: Record<string, any>): void;
    private initializeHealth;
    private initializeMetrics;
}
export interface DataSourceRegistry {
    register(type: DataSourceType, factory: (config: DataSourceConfig) => DataSource): void;
    create(config: DataSourceConfig): DataSource;
    getSupportedTypes(): DataSourceType[];
}
//# sourceMappingURL=data-source.types.d.ts.map