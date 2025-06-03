/**
 * SecureWatch Tiered Storage Manager
 * Manages data lifecycle across hot, warm, and cold storage tiers
 */

import { EventEmitter } from 'events';
import { Pool } from 'pg';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { GlacierClient, UploadArchiveCommand } from '@aws-sdk/client-glacier';
import { createHash } from 'crypto';

// Storage Tiers
export enum StorageTier {
  HOT = 'hot',
  WARM = 'warm',
  COLD = 'cold',
  ARCHIVE = 'archive'
}

// Storage Classes
export enum StorageClass {
  HOT_SSD = 'hot-ssd',
  HOT_NVMe = 'hot-nvme',
  WARM_HDD = 'warm-hdd',
  WARM_S3_IA = 'warm-s3-ia',
  COLD_S3_GLACIER = 'cold-s3-glacier',
  ARCHIVE_GLACIER_DEEP = 'archive-glacier-deep'
}

// Data Storage Configuration
export interface StorageConfig {
  hot: {
    type: 'database' | 's3' | 'local';
    endpoint?: string;
    bucket?: string;
    maxSizeBytes: number;
    compressionEnabled: boolean;
    encryptionEnabled: boolean;
  };
  warm: {
    type: 'database' | 's3' | 'local';
    endpoint?: string;
    bucket?: string;
    maxSizeBytes: number;
    compressionEnabled: boolean;
    encryptionEnabled: boolean;
  };
  cold: {
    type: 's3' | 'glacier' | 'local';
    endpoint?: string;
    bucket?: string;
    vaultName?: string;
    compressionEnabled: boolean;
    encryptionEnabled: boolean;
  };
  archive: {
    type: 'glacier' | 'tape' | 'local';
    endpoint?: string;
    vaultName?: string;
    compressionEnabled: boolean;
    encryptionEnabled: boolean;
  };
}

// Stored Data Interface
export interface StoredData {
  id: string;
  tenantId: string;
  originalId: string;
  type: string;
  size: number;
  checksum: string;
  tier: StorageTier;
  storageClass: StorageClass;
  location: string;
  metadata: Record<string, any>;
  createdAt: Date;
  lastAccessedAt: Date;
  movedAt?: Date;
  expiresAt?: Date;
  encrypted: boolean;
  compressed: boolean;
  classification: string;
  tags: string[];
  legalHold: boolean;
  retentionPolicyId?: string;
  region: string;
}

// Storage Operation Result
export interface StorageOperationResult {
  success: boolean;
  operation: 'store' | 'retrieve' | 'move' | 'delete';
  dataId: string;
  fromTier?: StorageTier;
  toTier?: StorageTier;
  duration: number;
  size?: number;
  error?: string;
}

// Tier Migration Stats
export interface TierMigrationStats {
  processed: number;
  moved: {
    hotToWarm: number;
    warmToCold: number;
    coldToArchive: number;
  };
  deleted: number;
  errors: Array<{
    dataId: string;
    operation: string;
    error: string;
  }>;
  totalSizeProcessed: number;
  totalSizeMoved: number;
  totalTimeMs: number;
}

export class TieredStorageManager extends EventEmitter {
  private config: StorageConfig;
  private database: Pool;
  private s3Client: S3Client;
  private glacierClient: GlacierClient;
  private compressionEnabled: boolean = true;
  private encryptionKey: Buffer;

  constructor(
    config: StorageConfig,
    database: Pool,
    s3Client: S3Client,
    glacierClient: GlacierClient,
    encryptionKey: string
  ) {
    super();
    this.config = config;
    this.database = database;
    this.s3Client = s3Client;
    this.glacierClient = glacierClient;
    this.encryptionKey = Buffer.from(encryptionKey, 'hex');
  }

  /**
   * Store data in appropriate tier
   */
  async storeData(
    data: Buffer,
    metadata: {
      tenantId: string;
      originalId: string;
      type: string;
      classification: string;
      tags: string[];
      region: string;
      retentionPolicyId?: string;
    },
    tier: StorageTier = StorageTier.HOT
  ): Promise<StorageOperationResult> {
    const startTime = Date.now();
    
    try {
      // Generate unique ID and checksum
      const dataId = this.generateDataId();
      const checksum = this.calculateChecksum(data);
      
      // Compress if enabled
      let processedData = data;
      let compressed = false;
      if (this.shouldCompress(tier)) {
        processedData = await this.compressData(data);
        compressed = true;
      }
      
      // Encrypt if enabled
      let encrypted = false;
      if (this.shouldEncrypt(tier)) {
        processedData = await this.encryptData(processedData);
        encrypted = true;
      }
      
      // Store in appropriate backend
      const location = await this.storeInTier(dataId, processedData, tier, metadata.region);
      
      // Record in database
      const storedData: StoredData = {
        id: dataId,
        tenantId: metadata.tenantId,
        originalId: metadata.originalId,
        type: metadata.type,
        size: data.length,
        checksum,
        tier,
        storageClass: this.getStorageClass(tier),
        location,
        metadata: metadata as any,
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        encrypted,
        compressed,
        classification: metadata.classification,
        tags: metadata.tags,
        legalHold: false,
        retentionPolicyId: metadata.retentionPolicyId,
        region: metadata.region,
      };
      
      await this.recordDataInDatabase(storedData);
      
      const duration = Date.now() - startTime;
      const result: StorageOperationResult = {
        success: true,
        operation: 'store',
        dataId,
        toTier: tier,
        duration,
        size: processedData.length,
      };
      
      this.emit('dataStored', { storedData, result });
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const result: StorageOperationResult = {
        success: false,
        operation: 'store',
        dataId: 'unknown',
        toTier: tier,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      
      this.emit('storageError', { operation: 'store', error, result });
      return result;
    }
  }

  /**
   * Retrieve data from storage
   */
  async retrieveData(dataId: string): Promise<{ data: Buffer; metadata: StoredData } | null> {
    try {
      // Get metadata from database
      const metadata = await this.getDataMetadata(dataId);
      if (!metadata) {
        return null;
      }
      
      // Update last accessed time
      await this.updateLastAccessed(dataId);
      
      // Retrieve from storage backend
      let data = await this.retrieveFromTier(metadata.location, metadata.tier, metadata.region);
      
      // Decrypt if necessary
      if (metadata.encrypted) {
        data = await this.decryptData(data);
      }
      
      // Decompress if necessary
      if (metadata.compressed) {
        data = await this.decompressData(data);
      }
      
      // Verify checksum
      const checksum = this.calculateChecksum(data);
      if (checksum !== metadata.checksum) {
        throw new Error(`Data integrity check failed for ${dataId}`);
      }
      
      this.emit('dataRetrieved', { dataId, size: data.length, tier: metadata.tier });
      return { data, metadata };
      
    } catch (error) {
      this.emit('storageError', { operation: 'retrieve', dataId, error });
      throw error;
    }
  }

  /**
   * Move data between tiers
   */
  async moveDataBetweenTiers(dataId: string, targetTier: StorageTier): Promise<StorageOperationResult> {
    const startTime = Date.now();
    
    try {
      const metadata = await this.getDataMetadata(dataId);
      if (!metadata) {
        throw new Error(`Data not found: ${dataId}`);
      }
      
      if (metadata.tier === targetTier) {
        return {
          success: true,
          operation: 'move',
          dataId,
          fromTier: metadata.tier,
          toTier: targetTier,
          duration: Date.now() - startTime,
        };
      }
      
      // Check legal hold
      if (metadata.legalHold && targetTier === StorageTier.ARCHIVE) {
        throw new Error(`Cannot archive data under legal hold: ${dataId}`);
      }
      
      // Retrieve data from current tier
      const retrieved = await this.retrieveData(dataId);
      if (!retrieved) {
        throw new Error(`Failed to retrieve data for migration: ${dataId}`);
      }
      
      // Store in target tier
      const newLocation = await this.storeInTier(dataId, retrieved.data, targetTier, metadata.region);
      
      // Update database record
      await this.updateDataTier(dataId, targetTier, newLocation);
      
      // Delete from old tier (except for critical data)
      if (metadata.classification !== 'critical') {
        await this.deleteFromTier(metadata.location, metadata.tier, metadata.region);
      }
      
      const duration = Date.now() - startTime;
      const result: StorageOperationResult = {
        success: true,
        operation: 'move',
        dataId,
        fromTier: metadata.tier,
        toTier: targetTier,
        duration,
        size: retrieved.data.length,
      };
      
      this.emit('dataMoved', { dataId, fromTier: metadata.tier, toTier: targetTier, result });
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const result: StorageOperationResult = {
        success: false,
        operation: 'move',
        dataId,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      
      this.emit('storageError', { operation: 'move', dataId, error, result });
      return result;
    }
  }

  /**
   * Delete data from storage
   */
  async deleteData(dataId: string, force: boolean = false): Promise<StorageOperationResult> {
    const startTime = Date.now();
    
    try {
      const metadata = await this.getDataMetadata(dataId);
      if (!metadata) {
        throw new Error(`Data not found: ${dataId}`);
      }
      
      // Check legal hold
      if (metadata.legalHold && !force) {
        throw new Error(`Cannot delete data under legal hold: ${dataId}`);
      }
      
      // Delete from storage backend
      await this.deleteFromTier(metadata.location, metadata.tier, metadata.region);
      
      // Remove from database
      await this.removeDataFromDatabase(dataId);
      
      const duration = Date.now() - startTime;
      const result: StorageOperationResult = {
        success: true,
        operation: 'delete',
        dataId,
        fromTier: metadata.tier,
        duration,
        size: metadata.size,
      };
      
      this.emit('dataDeleted', { dataId, tier: metadata.tier, result });
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const result: StorageOperationResult = {
        success: false,
        operation: 'delete',
        dataId,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      
      this.emit('storageError', { operation: 'delete', dataId, error, result });
      return result;
    }
  }

  /**
   * Find data candidates for tier migration
   */
  async findMigrationCandidates(
    fromTier: StorageTier,
    ageThresholdDays: number,
    limit: number = 1000
  ): Promise<StoredData[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ageThresholdDays);
    
    const query = `
      SELECT * FROM stored_data 
      WHERE tier = $1 
        AND created_at < $2 
        AND legal_hold = false
      ORDER BY created_at ASC 
      LIMIT $3
    `;
    
    const result = await this.database.query(query, [fromTier, cutoffDate, limit]);
    return result.rows.map(row => this.rowToStoredData(row));
  }

  /**
   * Execute tier migration job
   */
  async executeTierMigration(): Promise<TierMigrationStats> {
    const stats: TierMigrationStats = {
      processed: 0,
      moved: { hotToWarm: 0, warmToCold: 0, coldToArchive: 0 },
      deleted: 0,
      errors: [],
      totalSizeProcessed: 0,
      totalSizeMoved: 0,
      totalTimeMs: 0,
    };
    
    const startTime = Date.now();
    
    try {
      // Hot to Warm migration (30 days)
      const hotToWarmCandidates = await this.findMigrationCandidates(StorageTier.HOT, 30);
      for (const data of hotToWarmCandidates) {
        try {
          const result = await this.moveDataBetweenTiers(data.id, StorageTier.WARM);
          if (result.success) {
            stats.moved.hotToWarm++;
            stats.totalSizeMoved += result.size || 0;
          } else {
            stats.errors.push({ dataId: data.id, operation: 'hotToWarm', error: result.error || 'Unknown' });
          }
          stats.processed++;
          stats.totalSizeProcessed += data.size;
        } catch (error) {
          stats.errors.push({
            dataId: data.id,
            operation: 'hotToWarm',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
      
      // Warm to Cold migration (90 days)
      const warmToColdCandidates = await this.findMigrationCandidates(StorageTier.WARM, 90);
      for (const data of warmToColdCandidates) {
        try {
          const result = await this.moveDataBetweenTiers(data.id, StorageTier.COLD);
          if (result.success) {
            stats.moved.warmToCold++;
            stats.totalSizeMoved += result.size || 0;
          } else {
            stats.errors.push({ dataId: data.id, operation: 'warmToCold', error: result.error || 'Unknown' });
          }
          stats.processed++;
          stats.totalSizeProcessed += data.size;
        } catch (error) {
          stats.errors.push({
            dataId: data.id,
            operation: 'warmToCold',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
      
      // Cold to Archive migration (365 days)
      const coldToArchiveCandidates = await this.findMigrationCandidates(StorageTier.COLD, 365);
      for (const data of coldToArchiveCandidates) {
        try {
          const result = await this.moveDataBetweenTiers(data.id, StorageTier.ARCHIVE);
          if (result.success) {
            stats.moved.coldToArchive++;
            stats.totalSizeMoved += result.size || 0;
          } else {
            stats.errors.push({ dataId: data.id, operation: 'coldToArchive', error: result.error || 'Unknown' });
          }
          stats.processed++;
          stats.totalSizeProcessed += data.size;
        } catch (error) {
          stats.errors.push({
            dataId: data.id,
            operation: 'coldToArchive',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
      
      stats.totalTimeMs = Date.now() - startTime;
      
      this.emit('tierMigrationCompleted', stats);
      return stats;
      
    } catch (error) {
      stats.totalTimeMs = Date.now() - startTime;
      this.emit('tierMigrationError', { error, stats });
      throw error;
    }
  }

  /**
   * Get storage tier statistics
   */
  async getStorageStats(): Promise<Record<StorageTier, { count: number; totalSize: number; avgAge: number }>> {
    const query = `
      SELECT 
        tier,
        COUNT(*) as count,
        SUM(size) as total_size,
        AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/86400) as avg_age_days
      FROM stored_data 
      GROUP BY tier
    `;
    
    const result = await this.database.query(query);
    const stats: any = {};
    
    for (const tier of Object.values(StorageTier)) {
      stats[tier] = { count: 0, totalSize: 0, avgAge: 0 };
    }
    
    result.rows.forEach(row => {
      stats[row.tier as StorageTier] = {
        count: parseInt(row.count),
        totalSize: parseInt(row.total_size) || 0,
        avgAge: parseFloat(row.avg_age_days) || 0,
      };
    });
    
    return stats;
  }

  /**
   * Store data in specific tier backend
   */
  private async storeInTier(dataId: string, data: Buffer, tier: StorageTier, region: string): Promise<string> {
    const tierConfig = this.config[tier];
    
    switch (tierConfig.type) {
      case 's3':
        const key = `${tier}/${region}/${dataId}`;
        await this.s3Client.send(new PutObjectCommand({
          Bucket: tierConfig.bucket,
          Key: key,
          Body: data,
          StorageClass: this.getS3StorageClass(tier),
        }));
        return `s3://${tierConfig.bucket}/${key}`;
        
      case 'glacier':
        const archiveId = await this.s3Client.send(new UploadArchiveCommand({
          vaultName: tierConfig.vaultName,
          body: data,
        }));
        return `glacier://${tierConfig.vaultName}/${archiveId}`;
        
      case 'database':
        // Store in PostgreSQL bytea
        const query = 'INSERT INTO blob_storage (id, data, tier) VALUES ($1, $2, $3)';
        await this.database.query(query, [dataId, data, tier]);
        return `db://${dataId}`;
        
      default:
        throw new Error(`Unsupported storage type for tier ${tier}: ${tierConfig.type}`);
    }
  }

  /**
   * Retrieve data from specific tier backend
   */
  private async retrieveFromTier(location: string, tier: StorageTier, region: string): Promise<Buffer> {
    const [protocol, path] = location.split('://');
    
    switch (protocol) {
      case 's3':
        const [bucket, ...keyParts] = path.split('/');
        const key = keyParts.join('/');
        const response = await this.s3Client.send(new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        }));
        return Buffer.from(await response.Body!.transformToByteArray());
        
      case 'glacier':
        // Glacier retrieval would require a separate job initiation and completion check
        throw new Error('Glacier retrieval not implemented in this example');
        
      case 'db':
        const query = 'SELECT data FROM blob_storage WHERE id = $1';
        const result = await this.database.query(query, [path]);
        if (result.rows.length === 0) {
          throw new Error(`Blob not found in database: ${path}`);
        }
        return result.rows[0].data;
        
      default:
        throw new Error(`Unsupported storage protocol: ${protocol}`);
    }
  }

  /**
   * Delete data from specific tier backend
   */
  private async deleteFromTier(location: string, tier: StorageTier, region: string): Promise<void> {
    const [protocol, path] = location.split('://');
    
    switch (protocol) {
      case 's3':
        const [bucket, ...keyParts] = path.split('/');
        const key = keyParts.join('/');
        await this.s3Client.send(new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        }));
        break;
        
      case 'glacier':
        // Glacier deletion would require vault operations
        console.warn('Glacier deletion not implemented');
        break;
        
      case 'db':
        const query = 'DELETE FROM blob_storage WHERE id = $1';
        await this.database.query(query, [path]);
        break;
        
      default:
        throw new Error(`Unsupported storage protocol: ${protocol}`);
    }
  }

  /**
   * Helper methods
   */
  private generateDataId(): string {
    return `data_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private calculateChecksum(data: Buffer): string {
    return createHash('sha256').update(data).digest('hex');
  }

  private shouldCompress(tier: StorageTier): boolean {
    return this.config[tier].compressionEnabled;
  }

  private shouldEncrypt(tier: StorageTier): boolean {
    return this.config[tier].encryptionEnabled;
  }

  private getStorageClass(tier: StorageTier): StorageClass {
    switch (tier) {
      case StorageTier.HOT: return StorageClass.HOT_SSD;
      case StorageTier.WARM: return StorageClass.WARM_S3_IA;
      case StorageTier.COLD: return StorageClass.COLD_S3_GLACIER;
      case StorageTier.ARCHIVE: return StorageClass.ARCHIVE_GLACIER_DEEP;
    }
  }

  private getS3StorageClass(tier: StorageTier): string {
    switch (tier) {
      case StorageTier.HOT: return 'STANDARD';
      case StorageTier.WARM: return 'STANDARD_IA';
      case StorageTier.COLD: return 'GLACIER';
      case StorageTier.ARCHIVE: return 'DEEP_ARCHIVE';
    }
  }

  private async compressData(data: Buffer): Promise<Buffer> {
    // Implementation would use zlib or similar
    return data; // Placeholder
  }

  private async decompressData(data: Buffer): Promise<Buffer> {
    // Implementation would use zlib or similar
    return data; // Placeholder
  }

  private async encryptData(data: Buffer): Promise<Buffer> {
    // Implementation would use AES encryption
    return data; // Placeholder
  }

  private async decryptData(data: Buffer): Promise<Buffer> {
    // Implementation would use AES decryption
    return data; // Placeholder
  }

  private async recordDataInDatabase(data: StoredData): Promise<void> {
    const query = `
      INSERT INTO stored_data (
        id, tenant_id, original_id, type, size, checksum, tier, storage_class,
        location, metadata, created_at, last_accessed_at, encrypted, compressed,
        classification, tags, legal_hold, retention_policy_id, region
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    `;
    
    await this.database.query(query, [
      data.id, data.tenantId, data.originalId, data.type, data.size, data.checksum,
      data.tier, data.storageClass, data.location, JSON.stringify(data.metadata),
      data.createdAt, data.lastAccessedAt, data.encrypted, data.compressed,
      data.classification, data.tags, data.legalHold, data.retentionPolicyId, data.region
    ]);
  }

  private async getDataMetadata(dataId: string): Promise<StoredData | null> {
    const query = 'SELECT * FROM stored_data WHERE id = $1';
    const result = await this.database.query(query, [dataId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.rowToStoredData(result.rows[0]);
  }

  private async updateLastAccessed(dataId: string): Promise<void> {
    const query = 'UPDATE stored_data SET last_accessed_at = NOW() WHERE id = $1';
    await this.database.query(query, [dataId]);
  }

  private async updateDataTier(dataId: string, tier: StorageTier, location: string): Promise<void> {
    const query = 'UPDATE stored_data SET tier = $1, location = $2, moved_at = NOW() WHERE id = $3';
    await this.database.query(query, [tier, location, dataId]);
  }

  private async removeDataFromDatabase(dataId: string): Promise<void> {
    const query = 'DELETE FROM stored_data WHERE id = $1';
    await this.database.query(query, [dataId]);
  }

  private rowToStoredData(row: any): StoredData {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      originalId: row.original_id,
      type: row.type,
      size: row.size,
      checksum: row.checksum,
      tier: row.tier as StorageTier,
      storageClass: row.storage_class as StorageClass,
      location: row.location,
      metadata: row.metadata,
      createdAt: row.created_at,
      lastAccessedAt: row.last_accessed_at,
      movedAt: row.moved_at,
      expiresAt: row.expires_at,
      encrypted: row.encrypted,
      compressed: row.compressed,
      classification: row.classification,
      tags: row.tags,
      legalHold: row.legal_hold,
      retentionPolicyId: row.retention_policy_id,
      region: row.region,
    };
  }
}