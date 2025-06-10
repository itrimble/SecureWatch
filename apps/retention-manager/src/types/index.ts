import { z } from 'zod';

// Storage tier definitions
export enum StorageTier {
  HOT = 'hot',
  WARM = 'warm',
  COLD = 'cold',
  FROZEN = 'frozen',
}

// Retention policy configuration
export const RetentionPolicySchema = z.object({
  tier: z.nativeEnum(StorageTier),
  minAge: z.number().min(0), // days
  maxAge: z.number().min(0).optional(), // days
  compressionLevel: z.number().min(0).max(9),
  indexingStrategy: z.enum(['full', 'partial', 'minimal', 'none']),
  storageBackend: z.enum(['local', 's3', 'azure', 'gcs', 'hdfs']),
  encryption: z.boolean(),
  replicationFactor: z.number().min(1).max(5),
});

export type RetentionPolicy = z.infer<typeof RetentionPolicySchema>;

// Storage statistics
export interface StorageStats {
  tier: StorageTier;
  totalSize: number;
  recordCount: number;
  oldestRecord: Date;
  newestRecord: Date;
  compressionRatio: number;
  accessFrequency: number;
  lastAccessed: Date;
}

// Pipeline health metrics
export interface PipelineMetrics {
  throughput: {
    current: number;
    average: number;
    peak: number;
  };
  latency: {
    p50: number;
    p95: number;
    p99: number;
  };
  errors: {
    rate: number;
    total: number;
    types: Record<string, number>;
  };
  backpressure: {
    level: number;
    queueDepth: number;
    spilloverEvents: number;
  };
}

// Lifecycle transition
export interface LifecycleTransition {
  id: string;
  fromTier: StorageTier;
  toTier: StorageTier;
  recordCount: number;
  sizeBytes: number;
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  error?: string;
}

// Alert configuration
export const AlertRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  condition: z.object({
    metric: z.string(),
    operator: z.enum(['gt', 'lt', 'eq', 'gte', 'lte']),
    threshold: z.number(),
    duration: z.number(), // seconds
  }),
  severity: z.enum(['critical', 'warning', 'info']),
  actions: z.array(
    z.object({
      type: z.enum(['email', 'slack', 'webhook', 'pagerduty']),
      config: z.record(z.any()),
    })
  ),
  enabled: z.boolean(),
});

export type AlertRule = z.infer<typeof AlertRuleSchema>;

// Capacity planning
export interface CapacityProjection {
  tier: StorageTier;
  currentUsageGB: number;
  projectedUsageGB: number;
  daysUntilFull: number;
  recommendedAction?: string;
  costProjection: {
    current: number;
    projected: number;
    savings: number;
  };
}
