import * as zstd from '@mongodb/zstd';
import { performance } from 'perf_hooks';
import logger from '../utils/logger';

export interface CompressionConfig {
  level: number;              // Compression level (1-22)
  enableDictionary: boolean;  // Use dictionary compression
  dictionarySize: number;     // Dictionary size in bytes
  threshold: number;          // Min size to compress (bytes)
  maxSampleSize: number;      // Max sample size for dictionary
}

export interface CompressionMetrics {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  compressionTimeMs: number;
  decompressionTimeMs: number;
  throughputMBps: number;
}

export interface CompressionResult {
  data: Buffer;
  metrics: CompressionMetrics;
  wasDictionary: boolean;
}

export class ZstdManager {
  private config: CompressionConfig;
  private dictionary: Buffer | null = null;
  private compressionContext: any = null;
  private decompressionContext: any = null;
  private sampleData: Buffer[] = [];
  private metricsHistory: CompressionMetrics[] = [];

  constructor(config: Partial<CompressionConfig> = {}) {
    this.config = {
      level: 3,                    // Balanced performance
      enableDictionary: true,
      dictionarySize: 32768,       // 32KB dictionary
      threshold: 1024,             // Only compress data > 1KB
      maxSampleSize: 1048576,      // 1MB max sample size
      ...config
    };
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Zstandard compression manager', {
      level: this.config.level,
      dictionaryEnabled: this.config.enableDictionary,
      threshold: this.config.threshold
    });

    // Initialize compression context with level
    this.compressionContext = zstd.compress.createCCtx();
    zstd.compress.setCCtxParameter(
      this.compressionContext,
      zstd.constants.cParameter.compressionLevel,
      this.config.level
    );

    // Initialize decompression context
    this.decompressionContext = zstd.decompress.createDCtx();

    logger.info('Zstandard manager initialized successfully');
  }

  async addSampleData(data: Buffer): Promise<void> {
    if (!this.config.enableDictionary) return;

    // Add sample for dictionary training
    this.sampleData.push(data);

    // Limit sample data size
    let totalSize = this.sampleData.reduce((sum, buf) => sum + buf.length, 0);
    while (totalSize > this.config.maxSampleSize && this.sampleData.length > 1) {
      const removed = this.sampleData.shift();
      if (removed) {
        totalSize -= removed.length;
      }
    }

    // Train dictionary if we have enough samples
    if (this.sampleData.length >= 10 && totalSize >= this.config.dictionarySize * 2) {
      await this.trainDictionary();
    }
  }

  private async trainDictionary(): Promise<void> {
    if (this.sampleData.length === 0) return;

    try {
      logger.info('Training Zstandard dictionary with samples', {
        sampleCount: this.sampleData.length,
        totalSize: this.sampleData.reduce((sum, buf) => sum + buf.length, 0)
      });

      // Combine sample data for training
      const combinedSamples = Buffer.concat(this.sampleData);
      
      // Train dictionary
      this.dictionary = zstd.compress.trainFromBuffer(
        combinedSamples,
        this.config.dictionarySize
      );

      // Update compression context with dictionary
      if (this.dictionary && this.compressionContext) {
        zstd.compress.loadDictionary(this.compressionContext, this.dictionary);
      }

      // Update decompression context with dictionary
      if (this.dictionary && this.decompressionContext) {
        zstd.decompress.loadDictionary(this.decompressionContext, this.dictionary);
      }

      logger.info('Dictionary trained successfully', {
        dictionarySize: this.dictionary?.length || 0
      });

      // Clear sample data after training
      this.sampleData = [];

    } catch (error) {
      logger.error('Failed to train compression dictionary', error);
    }
  }

  async compress(data: Buffer): Promise<CompressionResult> {
    const startTime = performance.now();

    // Check if data meets compression threshold
    if (data.length < this.config.threshold) {
      const metrics: CompressionMetrics = {
        originalSize: data.length,
        compressedSize: data.length,
        compressionRatio: 1.0,
        compressionTimeMs: 0,
        decompressionTimeMs: 0,
        throughputMBps: 0
      };

      return {
        data,
        metrics,
        wasDictionary: false
      };
    }

    try {
      let compressedData: Buffer;
      let wasDictionary = false;

      if (this.dictionary && this.compressionContext) {
        // Use dictionary compression
        compressedData = zstd.compress.compressUsingDict(
          data,
          this.dictionary,
          this.config.level
        );
        wasDictionary = true;
      } else {
        // Standard compression
        compressedData = zstd.compress(data, this.config.level);
      }

      const endTime = performance.now();
      const compressionTimeMs = endTime - startTime;

      // Check compression efficiency (only compress if >10% reduction)
      const compressionRatio = compressedData.length / data.length;
      if (compressionRatio > 0.9) {
        // Not worth compressing
        const metrics: CompressionMetrics = {
          originalSize: data.length,
          compressedSize: data.length,
          compressionRatio: 1.0,
          compressionTimeMs,
          decompressionTimeMs: 0,
          throughputMBps: (data.length / 1024 / 1024) / (compressionTimeMs / 1000)
        };

        return {
          data,
          metrics,
          wasDictionary: false
        };
      }

      const metrics: CompressionMetrics = {
        originalSize: data.length,
        compressedSize: compressedData.length,
        compressionRatio,
        compressionTimeMs,
        decompressionTimeMs: 0,
        throughputMBps: (data.length / 1024 / 1024) / (compressionTimeMs / 1000)
      };

      this.recordMetrics(metrics);

      // Add to sample data for dictionary training
      if (this.config.enableDictionary && !this.dictionary) {
        await this.addSampleData(data);
      }

      return {
        data: compressedData,
        metrics,
        wasDictionary
      };

    } catch (error) {
      logger.error('Compression failed', error);
      throw new Error(`Zstandard compression failed: ${error.message}`);
    }
  }

  async decompress(compressedData: Buffer, usedDictionary: boolean = false): Promise<Buffer> {
    const startTime = performance.now();

    try {
      let decompressedData: Buffer;

      if (usedDictionary && this.dictionary && this.decompressionContext) {
        // Use dictionary decompression
        decompressedData = zstd.decompress.decompressUsingDict(
          compressedData,
          this.dictionary
        );
      } else {
        // Standard decompression
        decompressedData = zstd.decompress(compressedData);
      }

      const endTime = performance.now();
      const decompressionTimeMs = endTime - startTime;

      // Update metrics for decompression time
      if (this.metricsHistory.length > 0) {
        const lastMetric = this.metricsHistory[this.metricsHistory.length - 1];
        lastMetric.decompressionTimeMs = decompressionTimeMs;
      }

      return decompressedData;

    } catch (error) {
      logger.error('Decompression failed', error);
      throw new Error(`Zstandard decompression failed: ${error.message}`);
    }
  }

  adjustCompressionLevel(newLevel: number): void {
    if (newLevel < 1 || newLevel > 22) {
      throw new Error('Compression level must be between 1 and 22');
    }

    this.config.level = newLevel;

    // Update compression context
    if (this.compressionContext) {
      zstd.compress.setCCtxParameter(
        this.compressionContext,
        zstd.constants.cParameter.compressionLevel,
        newLevel
      );
    }

    logger.info('Compression level adjusted', { newLevel });
  }

  getCompressionLevel(): number {
    return this.config.level;
  }

  getRecommendedLevel(cpuUsage: number, throughputRequirement: number): number {
    // Adaptive compression level based on system load
    if (cpuUsage > 80) {
      return 1; // Fastest compression for high CPU usage
    } else if (throughputRequirement > 1000000) { // > 1M events/sec
      return 3; // Balanced for high throughput
    } else if (cpuUsage < 30) {
      return 6; // Better compression for low CPU usage
    } else {
      return 3; // Default balanced level
    }
  }

  private recordMetrics(metrics: CompressionMetrics): void {
    this.metricsHistory.push(metrics);

    // Keep only recent metrics (last 1000 operations)
    if (this.metricsHistory.length > 1000) {
      this.metricsHistory = this.metricsHistory.slice(-1000);
    }
  }

  getPerformanceMetrics(): {
    averageCompressionRatio: number;
    averageCompressionTime: number;
    averageDecompressionTime: number;
    averageThroughput: number;
    totalOperations: number;
    dictionaryEnabled: boolean;
    dictionarySize: number;
  } {
    if (this.metricsHistory.length === 0) {
      return {
        averageCompressionRatio: 1.0,
        averageCompressionTime: 0,
        averageDecompressionTime: 0,
        averageThroughput: 0,
        totalOperations: 0,
        dictionaryEnabled: false,
        dictionarySize: 0
      };
    }

    const totalOps = this.metricsHistory.length;
    const avgRatio = this.metricsHistory.reduce((sum, m) => sum + m.compressionRatio, 0) / totalOps;
    const avgCompTime = this.metricsHistory.reduce((sum, m) => sum + m.compressionTimeMs, 0) / totalOps;
    const avgDecompTime = this.metricsHistory.reduce((sum, m) => sum + m.decompressionTimeMs, 0) / totalOps;
    const avgThroughput = this.metricsHistory.reduce((sum, m) => sum + m.throughputMBps, 0) / totalOps;

    return {
      averageCompressionRatio: avgRatio,
      averageCompressionTime: avgCompTime,
      averageDecompressionTime: avgDecompTime,
      averageThroughput: avgThroughput,
      totalOperations: totalOps,
      dictionaryEnabled: !!this.dictionary,
      dictionarySize: this.dictionary?.length || 0
    };
  }

  async close(): Promise<void> {
    // Clean up contexts
    if (this.compressionContext) {
      zstd.compress.freeCCtx(this.compressionContext);
      this.compressionContext = null;
    }

    if (this.decompressionContext) {
      zstd.decompress.freeDCtx(this.decompressionContext);
      this.decompressionContext = null;
    }

    // Clear dictionary and samples
    this.dictionary = null;
    this.sampleData = [];

    logger.info('Zstandard manager closed');
  }
}