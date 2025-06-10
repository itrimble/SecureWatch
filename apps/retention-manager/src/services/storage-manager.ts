import { Pool } from 'pg';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { BlobServiceClient } from '@azure/storage-blob';
import { Storage as GCSStorage } from '@google-cloud/storage';
import { Logger } from 'winston';
import { StorageTier, StorageStats, RetentionPolicy } from '../types';
import { DEFAULT_RETENTION_POLICIES } from '../config/retention-policies';

export class StorageManager {
  private pgPool: Pool;
  private s3Client?: S3Client;
  private azureClient?: BlobServiceClient;
  private gcsClient?: GCSStorage;
  private logger: Logger;

  constructor(pgPool: Pool, logger: Logger) {
    this.pgPool = pgPool;
    this.logger = logger;
    this.initializeStorageBackends();
  }

  private initializeStorageBackends() {
    // Initialize S3
    if (process.env.AWS_ACCESS_KEY_ID) {
      this.s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-west-2',
      });
    }

    // Initialize Azure
    if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
      this.azureClient = BlobServiceClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING
      );
    }

    // Initialize GCS
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      this.gcsClient = new GCSStorage();
    }
  }

  async getStorageStats(): Promise<StorageStats[]> {
    const query = `
      SELECT 
        tier,
        SUM(total_size_bytes) as total_size,
        SUM(row_count) as record_count,
        MIN(time_range_start) as oldest_record,
        MAX(time_range_end) as newest_record,
        AVG(compression_ratio) as avg_compression_ratio
      FROM chunk_statistics
      GROUP BY tier
    `;

    const result = await this.pgPool.query(query);

    return result.rows.map((row) => ({
      tier: row.tier as StorageTier,
      totalSize: parseInt(row.total_size),
      recordCount: parseInt(row.record_count),
      oldestRecord: new Date(row.oldest_record),
      newestRecord: new Date(row.newest_record),
      compressionRatio: parseFloat(row.avg_compression_ratio) || 1,
      accessFrequency: 0, // To be implemented with access tracking
      lastAccessed: new Date(),
    }));
  }

  async migrateData(
    fromTier: StorageTier,
    toTier: StorageTier,
    batchSize: number = 10000
  ): Promise<void> {
    const fromPolicy = DEFAULT_RETENTION_POLICIES[fromTier];
    const toPolicy = DEFAULT_RETENTION_POLICIES[toTier];

    this.logger.info(`Starting migration from ${fromTier} to ${toTier}`, {
      fromPolicy,
      toPolicy,
      batchSize,
    });

    const client = await this.pgPool.connect();

    try {
      await client.query('BEGIN');

      // Get eligible chunks for migration
      const eligibleChunks = await client.query(`
        SELECT chunk_name, table_name
        FROM timescaledb_information.chunks
        WHERE hypertable_name = 'log_events_${fromTier}'
        AND range_end < NOW() - INTERVAL '${toPolicy.minAge} days'
        ORDER BY range_start
        LIMIT 10
      `);

      for (const chunk of eligibleChunks.rows) {
        await this.migrateChunk(client, chunk, fromTier, toTier, toPolicy);
      }

      await client.query('COMMIT');

      this.logger.info(
        `Migration completed: ${eligibleChunks.rowCount} chunks moved`
      );
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Migration failed', error);
      throw error;
    } finally {
      client.release();
    }
  }

  private async migrateChunk(
    client: any,
    chunk: any,
    fromTier: StorageTier,
    toTier: StorageTier,
    toPolicy: RetentionPolicy
  ): Promise<void> {
    const { chunk_name, table_name } = chunk;

    // Apply compression if needed
    if (toPolicy.compressionLevel > 0) {
      await client.query(`
        ALTER TABLE ${table_name} SET (
          timescaledb.compress,
          timescaledb.compress_segmentby = 'source_ip,event_type',
          timescaledb.compress_orderby = 'timestamp DESC'
        )
      `);

      await client.query(`SELECT compress_chunk('${table_name}')`);
    }

    // Move to object storage if configured
    if (toPolicy.storageBackend !== 'local') {
      await this.moveToObjectStorage(client, table_name, toTier, toPolicy);
    }

    // Update indexes based on policy
    await this.updateIndexes(client, table_name, toPolicy.indexingStrategy);

    // Move chunk to new hypertable
    await client.query(`
      INSERT INTO log_events_${toTier} 
      SELECT * FROM ${table_name}
    `);

    // Drop old chunk
    await client.query(`DROP TABLE ${table_name}`);
  }

  private async moveToObjectStorage(
    client: any,
    tableName: string,
    tier: StorageTier,
    policy: RetentionPolicy
  ): Promise<void> {
    // Export data to parquet format
    const exportPath = `/tmp/${tableName}.parquet`;

    await client.query(`
      COPY (SELECT * FROM ${tableName})
      TO '${exportPath}'
      WITH (FORMAT PARQUET, COMPRESSION 'zstd')
    `);

    // Upload to appropriate storage backend
    const objectKey = `${tier}/${tableName}.parquet`;

    switch (policy.storageBackend) {
      case 's3':
        await this.uploadToS3(exportPath, objectKey, tier);
        break;
      case 'azure':
        await this.uploadToAzure(exportPath, objectKey, tier);
        break;
      case 'gcs':
        await this.uploadToGCS(exportPath, objectKey, tier);
        break;
    }

    // Create external table reference
    await client.query(`
      CREATE FOREIGN TABLE IF NOT EXISTS ${tableName}_external (
        LIKE ${tableName}
      ) SERVER object_storage
      OPTIONS (
        location '${policy.storageBackend}://${objectKey}',
        format 'parquet'
      )
    `);
  }

  private async uploadToS3(
    filePath: string,
    key: string,
    tier: StorageTier
  ): Promise<void> {
    if (!this.s3Client) throw new Error('S3 client not initialized');

    const storageClass = this.getS3StorageClass(tier);
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET || 'securewatch-archive',
      Key: key,
      Body: require('fs').createReadStream(filePath),
      StorageClass: storageClass,
      ServerSideEncryption: 'AES256',
    });

    await this.s3Client.send(command);
  }

  private async uploadToAzure(
    filePath: string,
    key: string,
    tier: StorageTier
  ): Promise<void> {
    if (!this.azureClient) throw new Error('Azure client not initialized');

    const containerName = process.env.AZURE_CONTAINER || 'securewatch-archive';
    const containerClient = this.azureClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(key);

    await blockBlobClient.uploadFile(filePath, {
      tier: this.getAzureAccessTier(tier),
    });
  }

  private async uploadToGCS(
    filePath: string,
    key: string,
    tier: StorageTier
  ): Promise<void> {
    if (!this.gcsClient) throw new Error('GCS client not initialized');

    const bucketName = process.env.GCS_BUCKET || 'securewatch-archive';
    const bucket = this.gcsClient.bucket(bucketName);

    await bucket.upload(filePath, {
      destination: key,
      metadata: {
        storageClass: this.getGCSStorageClass(tier),
      },
    });
  }

  private async updateIndexes(
    client: any,
    tableName: string,
    strategy: string
  ): Promise<void> {
    // Drop unnecessary indexes based on strategy
    switch (strategy) {
      case 'minimal':
        await client.query(`
          DROP INDEX IF EXISTS ${tableName}_source_ip_idx;
          DROP INDEX IF EXISTS ${tableName}_event_type_idx;
        `);
        break;
      case 'none':
        await client
          .query(
            `
          SELECT indexname FROM pg_indexes 
          WHERE tablename = '${tableName}'
          AND indexname NOT LIKE '%pkey'
        `
          )
          .then(async (result: any) => {
            for (const row of result.rows) {
              await client.query(`DROP INDEX ${row.indexname}`);
            }
          });
        break;
    }
  }

  private getS3StorageClass(tier: StorageTier): string {
    const mapping: Record<string, string> = {
      warm: 'STANDARD_IA',
      cold: 'GLACIER_FLEXIBLE_RETRIEVAL',
      frozen: 'DEEP_ARCHIVE',
    };
    return mapping[tier] || 'STANDARD';
  }

  private getAzureAccessTier(tier: StorageTier): string {
    const mapping: Record<string, string> = {
      warm: 'Cool',
      cold: 'Archive',
      frozen: 'Archive',
    };
    return mapping[tier] || 'Hot';
  }

  private getGCSStorageClass(tier: StorageTier): string {
    const mapping: Record<string, string> = {
      warm: 'NEARLINE',
      cold: 'COLDLINE',
      frozen: 'ARCHIVE',
    };
    return mapping[tier] || 'STANDARD';
  }

  async pruneExpiredData(): Promise<number> {
    let totalDeleted = 0;

    for (const [tier, policy] of Object.entries(DEFAULT_RETENTION_POLICIES)) {
      if (!policy.maxAge) continue;

      const result = await this.pgPool.query(`
        DELETE FROM log_events_${tier}
        WHERE timestamp < NOW() - INTERVAL '${policy.maxAge} days'
        RETURNING id
      `);

      totalDeleted += result.rowCount || 0;

      this.logger.info(`Pruned ${result.rowCount} records from ${tier} tier`);
    }

    return totalDeleted;
  }
}
