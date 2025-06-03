export type DataSourceType = 
  | 'windows_event' 
  | 'syslog' 
  | 'cloud_trail' 
  | 'azure_activity' 
  | 'gcp_audit' 
  | 'network_firewall' 
  | 'network_ids' 
  | 'network_flow' 
  | 'endpoint_edr' 
  | 'endpoint_antivirus' 
  | 'application_web' 
  | 'application_database' 
  | 'application_custom' 
  | 'custom';

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

export abstract class DataSource {
  protected config: DataSourceConfig;
  protected status: SourceStatus = 'inactive';
  protected health: SourceHealth;
  protected metrics: DataSourceMetrics;

  constructor(config: DataSourceConfig) {
    this.config = config;
    this.health = this.initializeHealth();
    this.metrics = this.initializeMetrics();
  }

  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;
  abstract restart(): Promise<void>;
  abstract collect(): Promise<any[]>;
  abstract validateConfig(): Promise<boolean>;

  getId(): string {
    return this.config.id;
  }

  getName(): string {
    return this.config.name;
  }

  getType(): DataSourceType {
    return this.config.type;
  }

  getStatus(): SourceStatus {
    return this.status;
  }

  getHealth(): SourceHealth {
    return this.health;
  }

  getMetrics(): DataSourceMetrics {
    return this.metrics;
  }

  getConfig(): DataSourceConfig {
    return { ...this.config };
  }

  async updateConfig(config: Partial<DataSourceConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    if (this.status === 'active') {
      await this.restart();
    }
  }

  protected setStatus(status: SourceStatus): void {
    this.status = status;
    this.updateHealth();
  }

  protected updateHealth(): void {
    const now = new Date();
    this.health.lastCheck = now;
    
    // Update health status based on current status and error rates
    if (this.status === 'error') {
      this.health.status = 'unhealthy';
    } else if (this.status === 'active' && this.metrics.statistics.errorRate < 0.01) {
      this.health.status = 'healthy';
    } else if (this.status === 'active' && this.metrics.statistics.errorRate < 0.05) {
      this.health.status = 'degraded';
    } else {
      this.health.status = 'unknown';
    }
  }

  protected addHealthIssue(severity: 'error' | 'warning' | 'info', message: string, details?: Record<string, any>): void {
    if (!this.health.issues) {
      this.health.issues = [];
    }
    
    this.health.issues.push({
      severity,
      message,
      timestamp: new Date(),
      details
    });

    // Keep only last 100 issues
    if (this.health.issues.length > 100) {
      this.health.issues = this.health.issues.slice(-100);
    }

    if (severity === 'error') {
      this.health.errorCount++;
    } else if (severity === 'warning') {
      this.health.warningCount++;
    }
  }

  private initializeHealth(): SourceHealth {
    return {
      status: 'unknown',
      lastCheck: new Date(),
      uptime: 0,
      errorCount: 0,
      warningCount: 0,
      metrics: {
        eventsPerSecond: 0,
        bytesPerSecond: 0,
        latencyMs: 0,
        successRate: 0
      },
      issues: []
    };
  }

  private initializeMetrics(): DataSourceMetrics {
    return {
      id: this.config.id,
      status: this.status,
      health: this.health,
      statistics: {
        totalEvents: 0,
        eventsToday: 0,
        avgEventsPerHour: 0,
        peakEventsPerSecond: 0,
        totalBytes: 0,
        avgLatencyMs: 0,
        errorRate: 0
      },
      performance: {
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        networkBytesIn: 0,
        networkBytesOut: 0
      }
    };
  }
}

export interface DataSourceRegistry {
  register(type: DataSourceType, factory: (config: DataSourceConfig) => DataSource): void;
  create(config: DataSourceConfig): DataSource;
  getSupportedTypes(): DataSourceType[];
}