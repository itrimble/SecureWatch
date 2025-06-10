import { RetentionPolicy, StorageTier } from '../types';

// Default retention policies aligned with existing SQL implementation
export const DEFAULT_RETENTION_POLICIES: Record<StorageTier, RetentionPolicy> =
  {
    [StorageTier.HOT]: {
      tier: StorageTier.HOT,
      minAge: 0,
      maxAge: 7,
      compressionLevel: 0, // No compression for fast access
      indexingStrategy: 'full',
      storageBackend: 'local',
      encryption: true,
      replicationFactor: 3,
    },
    [StorageTier.WARM]: {
      tier: StorageTier.WARM,
      minAge: 8,
      maxAge: 30,
      compressionLevel: 3, // Medium compression
      indexingStrategy: 'partial',
      storageBackend: 'local',
      encryption: true,
      replicationFactor: 2,
    },
    [StorageTier.COLD]: {
      tier: StorageTier.COLD,
      minAge: 31,
      maxAge: 90,
      compressionLevel: 6, // High compression
      indexingStrategy: 'minimal',
      storageBackend: 's3', // Object storage for cost efficiency
      encryption: true,
      replicationFactor: 1,
    },
    [StorageTier.FROZEN]: {
      tier: StorageTier.FROZEN,
      minAge: 91,
      compressionLevel: 9, // Maximum compression
      indexingStrategy: 'none',
      storageBackend: 's3', // Glacier-like storage
      encryption: true,
      replicationFactor: 1,
    },
  };

// Alert thresholds
export const ALERT_THRESHOLDS = {
  // Pipeline health
  throughputDegradation: {
    threshold: 0.8, // 80% of normal
    duration: 300, // 5 minutes
  },
  errorRate: {
    threshold: 0.05, // 5% error rate
    duration: 60, // 1 minute
  },
  backpressure: {
    threshold: 0.9, // 90% queue depth
    duration: 120, // 2 minutes
  },

  // Storage capacity
  storageUsage: {
    warning: 0.8, // 80% full
    critical: 0.95, // 95% full
  },

  // Performance
  latencyP99: {
    threshold: 1000, // 1 second
    duration: 300, // 5 minutes
  },
};

// Cost optimization settings
export const COST_OPTIMIZATION = {
  // Automatic tiering thresholds
  autoTiering: {
    enabled: true,
    checkInterval: 3600, // 1 hour
    costThreshold: 100, // Move to cheaper tier if cost > $100/month
  },

  // Compression optimization
  compression: {
    enabled: true,
    minSizeKB: 100, // Only compress files > 100KB
    cpuThreshold: 0.7, // Reduce compression if CPU > 70%
  },

  // Storage backend selection
  storageBackend: {
    s3: {
      region: process.env.AWS_REGION || 'us-west-2',
      storageClass: {
        warm: 'STANDARD_IA',
        cold: 'GLACIER_FLEXIBLE_RETRIEVAL',
        frozen: 'DEEP_ARCHIVE',
      },
    },
    azure: {
      tier: {
        warm: 'Cool',
        cold: 'Archive',
      },
    },
    gcs: {
      storageClass: {
        warm: 'NEARLINE',
        cold: 'COLDLINE',
        frozen: 'ARCHIVE',
      },
    },
  },
};
