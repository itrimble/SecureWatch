export interface HECToken {
  id: string;
  name: string;
  token: string;
  isActive: boolean;
  allowedSources?: string[];
  allowedIndexes?: string[];
  maxEventsPerSecond?: number;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  lastUsed?: Date;
  usageCount: number;
  organizationId: string;
  createdBy: string;
}

export interface HECEvent {
  time?: number | string;
  host?: string;
  source?: string;
  sourcetype?: string;
  index?: string;
  event: any;
  fields?: Record<string, any>;
}

export interface HECBatchRequest {
  events: HECEvent[];
  metadata?: {
    source?: string;
    sourcetype?: string;
    index?: string;
    host?: string;
  };
}

export interface HECResponse {
  text: string;
  code: number;
  invalid?: boolean;
  ackId?: number;
}

export interface HECError {
  text: string;
  code: number;
  invalid?: boolean;
}

export interface HECValidationResult {
  isValid: boolean;
  errors: string[];
  eventCount: number;
  estimatedSize: number;
}

export interface HECMetrics {
  totalEvents: number;
  eventsPerSecond: number;
  bytesReceived: number;
  bytesPerSecond: number;
  errorCount: number;
  successRate: number;
  lastEventTime?: Date;
  peakEventsPerSecond: number;
  activeTokens: number;
}

export interface HECConfig {
  port: number;
  maxEventSize: number;
  maxBatchSize: number;
  maxEventsPerBatch: number;
  tokenValidationCacheMs: number;
  rateLimitWindowMs: number;
  defaultRateLimit: number;
  enableCompression: boolean;
  enableCors: boolean;
  corsOrigins: string[];
  kafkaTopic: string;
  kafkaBrokers: string[];
  enableAck: boolean;
  ackTimeoutMs: number;
}

export type HECEventFormat = 'json' | 'raw' | 'splunk';

export interface ProcessedHECEvent {
  id: string;
  originalEvent: HECEvent;
  normalizedEvent: any;
  metadata: {
    token: string;
    tokenName: string;
    organizationId: string;
    receivedAt: Date;
    processedAt: Date;
    source: string;
    sourcetype: string;
    index: string;
    host: string;
    eventSize: number;
    format: HECEventFormat;
    clientIp: string;
    userAgent?: string;
  };
}

export interface TokenUsageStats {
  tokenId: string;
  tokenName: string;
  eventsReceived: number;
  bytesReceived: number;
  lastUsed: Date;
  errorCount: number;
  successRate: number;
  topSources: Array<{ source: string; count: number }>;
  topSourceTypes: Array<{ sourcetype: string; count: number }>;
}

export interface HECHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  version: string;
  kafka: {
    connected: boolean;
    lastError?: string;
    messagesPerSecond: number;
  };
  tokens: {
    total: number;
    active: number;
    expired: number;
  };
  performance: {
    currentLoad: number;
    memoryUsage: number;
    eventsPerSecond: number;
    errorRate: number;
  };
  errors?: string[];
}