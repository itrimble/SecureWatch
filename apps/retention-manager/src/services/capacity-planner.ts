import { Pool } from 'pg';
import { Logger } from 'winston';
import { StorageTier, CapacityProjection } from '../types';
import {
  DEFAULT_RETENTION_POLICIES,
  COST_OPTIMIZATION,
} from '../config/retention-policies';

export class CapacityPlanner {
  private pgPool: Pool;
  private logger: Logger;

  // Cost per GB per month (example values, adjust based on actual pricing)
  private readonly STORAGE_COSTS = {
    local: 0.1, // Local SSD
    s3: {
      STANDARD: 0.023,
      STANDARD_IA: 0.0125,
      GLACIER_FLEXIBLE_RETRIEVAL: 0.004,
      DEEP_ARCHIVE: 0.00099,
    },
    azure: {
      Hot: 0.0184,
      Cool: 0.01,
      Archive: 0.00099,
    },
    gcs: {
      STANDARD: 0.02,
      NEARLINE: 0.01,
      COLDLINE: 0.004,
      ARCHIVE: 0.0012,
    },
  };

  constructor(pgPool: Pool, logger: Logger) {
    this.pgPool = pgPool;
    this.logger = logger;
  }

  async projectCapacity(daysAhead: number = 90): Promise<CapacityProjection[]> {
    const projections: CapacityProjection[] = [];

    // Get historical growth rates
    const growthRates = await this.calculateGrowthRates();

    // Get current usage for each tier
    const currentUsage = await this.getCurrentUsage();

    for (const tier of Object.values(StorageTier)) {
      const current = currentUsage.find((u) => u.tier === tier) || {
        tier,
        sizeGB: 0,
        dailyGrowthGB: 0,
      };

      const projection = await this.projectTier(
        tier,
        current.sizeGB,
        current.dailyGrowthGB,
        daysAhead
      );

      projections.push(projection);
    }

    return projections;
  }

  private async calculateGrowthRates(): Promise<Map<StorageTier, number>> {
    const query = `
      WITH daily_sizes AS (
        SELECT 
          tier,
          DATE(timestamp) as date,
          SUM(size_bytes) / (1024 * 1024 * 1024) as size_gb
        FROM chunk_statistics
        WHERE timestamp > NOW() - INTERVAL '30 days'
        GROUP BY tier, DATE(timestamp)
      ),
      growth_rates AS (
        SELECT 
          tier,
          AVG(size_gb - LAG(size_gb) OVER (PARTITION BY tier ORDER BY date)) as daily_growth_gb
        FROM daily_sizes
      )
      SELECT tier, daily_growth_gb
      FROM growth_rates
      WHERE daily_growth_gb IS NOT NULL
    `;

    const result = await this.pgPool.query(query);
    const rates = new Map<StorageTier, number>();

    for (const row of result.rows) {
      rates.set(row.tier, row.daily_growth_gb || 0);
    }

    return rates;
  }

  private async getCurrentUsage(): Promise<
    Array<{
      tier: StorageTier;
      sizeGB: number;
      dailyGrowthGB: number;
    }>
  > {
    const query = `
      SELECT 
        tier,
        SUM(total_size_bytes) / (1024 * 1024 * 1024) as size_gb
      FROM chunk_statistics
      GROUP BY tier
    `;

    const result = await this.pgPool.query(query);
    const growthRates = await this.calculateGrowthRates();

    return result.rows.map((row) => ({
      tier: row.tier,
      sizeGB: parseFloat(row.size_gb) || 0,
      dailyGrowthGB: growthRates.get(row.tier) || 0,
    }));
  }

  private async projectTier(
    tier: StorageTier,
    currentSizeGB: number,
    dailyGrowthGB: number,
    daysAhead: number
  ): Promise<CapacityProjection> {
    const projectedSizeGB = currentSizeGB + dailyGrowthGB * daysAhead;

    // Get storage limits
    const storageLimit = await this.getStorageLimit(tier);
    const daysUntilFull =
      storageLimit > 0
        ? Math.floor((storageLimit - currentSizeGB) / dailyGrowthGB)
        : -1;

    // Calculate costs
    const currentCost = this.calculateStorageCost(tier, currentSizeGB);
    const projectedCost = this.calculateStorageCost(tier, projectedSizeGB);

    // Calculate potential savings with optimization
    const optimizedCost = this.calculateOptimizedCost(tier, projectedSizeGB);
    const savings = projectedCost - optimizedCost;

    // Generate recommendations
    const recommendation = this.generateRecommendation(
      tier,
      currentSizeGB,
      projectedSizeGB,
      daysUntilFull,
      savings
    );

    return {
      tier,
      currentUsageGB: currentSizeGB,
      projectedUsageGB: projectedSizeGB,
      daysUntilFull,
      recommendedAction: recommendation,
      costProjection: {
        current: currentCost,
        projected: projectedCost,
        savings,
      },
    };
  }

  private async getStorageLimit(tier: StorageTier): Promise<number> {
    // Get configured storage limits from environment or config
    const limits: Record<StorageTier, number> = {
      [StorageTier.HOT]: parseInt(process.env.HOT_STORAGE_LIMIT_GB || '10000'),
      [StorageTier.WARM]: parseInt(
        process.env.WARM_STORAGE_LIMIT_GB || '50000'
      ),
      [StorageTier.COLD]: parseInt(
        process.env.COLD_STORAGE_LIMIT_GB || '100000'
      ),
      [StorageTier.FROZEN]: parseInt(
        process.env.FROZEN_STORAGE_LIMIT_GB || '0'
      ), // Unlimited
    };

    return limits[tier] || 0;
  }

  private calculateStorageCost(tier: StorageTier, sizeGB: number): number {
    const policy = DEFAULT_RETENTION_POLICIES[tier];
    let costPerGB = this.STORAGE_COSTS.local;

    if (policy.storageBackend === 's3') {
      const storageClass = this.getS3StorageClass(tier);
      costPerGB =
        this.STORAGE_COSTS.s3[
          storageClass as keyof typeof this.STORAGE_COSTS.s3
        ];
    } else if (policy.storageBackend === 'azure') {
      const accessTier = this.getAzureAccessTier(tier);
      costPerGB =
        this.STORAGE_COSTS.azure[
          accessTier as keyof typeof this.STORAGE_COSTS.azure
        ];
    } else if (policy.storageBackend === 'gcs') {
      const storageClass = this.getGCSStorageClass(tier);
      costPerGB =
        this.STORAGE_COSTS.gcs[
          storageClass as keyof typeof this.STORAGE_COSTS.gcs
        ];
    }

    return sizeGB * costPerGB;
  }

  private calculateOptimizedCost(tier: StorageTier, sizeGB: number): number {
    // Calculate cost with maximum compression
    const compressionRatio = this.getExpectedCompressionRatio(tier);
    const compressedSizeGB = sizeGB * compressionRatio;

    // Calculate with optimal storage backend
    const optimalBackend = this.getOptimalStorageBackend(tier);
    let costPerGB = this.STORAGE_COSTS.local;

    if (optimalBackend === 's3') {
      costPerGB = this.STORAGE_COSTS.s3.DEEP_ARCHIVE;
    } else if (optimalBackend === 'azure') {
      costPerGB = this.STORAGE_COSTS.azure.Archive;
    } else if (optimalBackend === 'gcs') {
      costPerGB = this.STORAGE_COSTS.gcs.ARCHIVE;
    }

    return compressedSizeGB * costPerGB;
  }

  private getExpectedCompressionRatio(tier: StorageTier): number {
    // Expected compression ratios based on tier and data age
    const ratios: Record<StorageTier, number> = {
      [StorageTier.HOT]: 0.7, // 30% compression
      [StorageTier.WARM]: 0.5, // 50% compression
      [StorageTier.COLD]: 0.3, // 70% compression
      [StorageTier.FROZEN]: 0.2, // 80% compression
    };
    return ratios[tier] || 1;
  }

  private getOptimalStorageBackend(tier: StorageTier): string {
    // Determine optimal backend based on tier and cost
    switch (tier) {
      case StorageTier.HOT:
      case StorageTier.WARM:
        return 'local'; // Fast access needed
      case StorageTier.COLD:
      case StorageTier.FROZEN:
        // Choose cheapest object storage
        const s3Cost = this.STORAGE_COSTS.s3.DEEP_ARCHIVE;
        const azureCost = this.STORAGE_COSTS.azure.Archive;
        const gcsCost = this.STORAGE_COSTS.gcs.ARCHIVE;

        if (s3Cost <= azureCost && s3Cost <= gcsCost) return 's3';
        if (azureCost <= gcsCost) return 'azure';
        return 'gcs';
      default:
        return 'local';
    }
  }

  private generateRecommendation(
    tier: StorageTier,
    currentSizeGB: number,
    projectedSizeGB: number,
    daysUntilFull: number,
    potentialSavings: number
  ): string | undefined {
    const recommendations: string[] = [];

    // Check if running out of space
    if (daysUntilFull > 0 && daysUntilFull < 30) {
      recommendations.push(
        `⚠️ Storage will be full in ${daysUntilFull} days. Consider increasing limit or accelerating data migration.`
      );
    }

    // Check if tier migration would save money
    if (potentialSavings > 100) {
      // $100/month threshold
      recommendations.push(
        `💰 Enable automatic tiering to save $${potentialSavings.toFixed(2)}/month`
      );
    }

    // Check if compression can be increased
    const policy = DEFAULT_RETENTION_POLICIES[tier];
    if (policy.compressionLevel < 6 && projectedSizeGB > 1000) {
      recommendations.push(
        `🗜️ Increase compression level to reduce storage by ${(1 - this.getExpectedCompressionRatio(tier)) * 100}%`
      );
    }

    // Check if data is ready for next tier
    if (tier === StorageTier.HOT && currentSizeGB > 5000) {
      recommendations.push(
        `📦 Consider moving older data to WARM tier to improve query performance`
      );
    }

    return recommendations.length > 0 ? recommendations.join(' ') : undefined;
  }

  private getS3StorageClass(tier: StorageTier): string {
    const mapping: Record<string, string> = {
      hot: 'STANDARD',
      warm: 'STANDARD_IA',
      cold: 'GLACIER_FLEXIBLE_RETRIEVAL',
      frozen: 'DEEP_ARCHIVE',
    };
    return mapping[tier] || 'STANDARD';
  }

  private getAzureAccessTier(tier: StorageTier): string {
    const mapping: Record<string, string> = {
      hot: 'Hot',
      warm: 'Cool',
      cold: 'Archive',
      frozen: 'Archive',
    };
    return mapping[tier] || 'Hot';
  }

  private getGCSStorageClass(tier: StorageTier): string {
    const mapping: Record<string, string> = {
      hot: 'STANDARD',
      warm: 'NEARLINE',
      cold: 'COLDLINE',
      frozen: 'ARCHIVE',
    };
    return mapping[tier] || 'STANDARD';
  }

  async optimizeStorage(): Promise<void> {
    const projections = await this.projectCapacity(30);

    for (const projection of projections) {
      if (
        projection.costProjection.savings >
        COST_OPTIMIZATION.autoTiering.costThreshold
      ) {
        this.logger.info(`Auto-tiering recommended for ${projection.tier}`, {
          currentCost: projection.costProjection.current,
          projectedCost: projection.costProjection.projected,
          savings: projection.costProjection.savings,
        });

        // Trigger automatic optimization if enabled
        if (COST_OPTIMIZATION.autoTiering.enabled) {
          await this.applyOptimization(projection.tier);
        }
      }
    }
  }

  private async applyOptimization(tier: StorageTier): Promise<void> {
    // Implement automatic optimization actions
    this.logger.info(`Applying optimization for ${tier} tier`);

    // This would trigger actual migration or compression changes
    // For now, just log the action
  }
}
