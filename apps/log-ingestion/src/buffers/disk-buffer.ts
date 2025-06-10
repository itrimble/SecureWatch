import * as fs from 'fs/promises';
import * as path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createGzip, createGunzip } from 'zlib';
import { Transform } from 'stream';
import logger from '../utils/logger';

/**
 * High-performance disk buffer with compression support
 * Provides persistent storage for events with guaranteed delivery
 */
export class DiskBuffer<T> {
  private bufferPath: string;
  private maxSize: number;
  private compressionEnabled: boolean;
  private writeStream?: fs.FileHandle;
  private readPosition: number = 0;
  private writePosition: number = 0;
  private itemCount: number = 0;
  private isInitialized: boolean = false;

  constructor(bufferPath: string, maxSize: number, compressionEnabled: boolean = true) {
    this.bufferPath = bufferPath;
    this.maxSize = maxSize;
    this.compressionEnabled = compressionEnabled;
  }

  async initialize(): Promise<void> {
    try {
      // Ensure buffer directory exists
      await fs.mkdir(path.dirname(this.bufferPath), { recursive: true });
      
      // Check if buffer file exists and recover state
      try {
        const stats = await fs.stat(this.bufferPath);
        if (stats.isFile()) {
          await this.recoverState();
        }
      } catch (error) {
        // File doesn't exist, start fresh
        this.readPosition = 0;
        this.writePosition = 0;
        this.itemCount = 0;
      }

      this.isInitialized = true;
      logger.info('Disk buffer initialized', {
        path: this.bufferPath,
        maxSize: this.maxSize,
        compression: this.compressionEnabled,
        itemCount: this.itemCount
      });
    } catch (error) {
      logger.error('Failed to initialize disk buffer', { error, path: this.bufferPath });
      throw error;
    }
  }

  async write(item: T): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Disk buffer not initialized');
    }

    if (this.itemCount >= this.maxSize) {
      throw new Error('Disk buffer full');
    }

    try {
      const serialized = JSON.stringify(item) + '\n';
      let data = Buffer.from(serialized);

      if (this.compressionEnabled) {
        data = await this.compress(data);
      }

      // Append to file
      const handle = await fs.open(this.bufferPath, 'a');
      await handle.write(data);
      await handle.close();

      this.writePosition += data.length;
      this.itemCount++;
    } catch (error) {
      logger.error('Failed to write to disk buffer', { error, item });
      throw error;
    }
  }

  async read(count: number = 1): Promise<T[]> {
    if (!this.isInitialized) {
      throw new Error('Disk buffer not initialized');
    }

    if (this.itemCount === 0) {
      return [];
    }

    try {
      const items: T[] = [];
      const fileHandle = await fs.open(this.bufferPath, 'r');
      
      try {
        let position = this.readPosition;
        let readCount = 0;

        while (readCount < count && readCount < this.itemCount) {
          // Read length prefix (4 bytes)
          const lengthBuffer = Buffer.alloc(4);
          const { bytesRead } = await fileHandle.read(lengthBuffer, 0, 4, position);
          
          if (bytesRead < 4) {
            break; // EOF or corrupted data
          }

          const dataLength = lengthBuffer.readUInt32BE(0);
          position += 4;

          // Read data
          const dataBuffer = Buffer.alloc(dataLength);
          const { bytesRead: dataBytesRead } = await fileHandle.read(dataBuffer, 0, dataLength, position);
          
          if (dataBytesRead < dataLength) {
            break; // EOF or corrupted data
          }

          position += dataLength;

          // Decompress if needed
          let decompressed = dataBuffer;
          if (this.compressionEnabled) {
            decompressed = await this.decompress(dataBuffer);
          }

          // Parse JSON
          const jsonStr = decompressed.toString('utf8').trim();
          const item = JSON.parse(jsonStr);
          items.push(item);
          
          readCount++;
        }

        this.readPosition = position;
        this.itemCount -= readCount;

        return items;
      } finally {
        await fileHandle.close();
      }
    } catch (error) {
      logger.error('Failed to read from disk buffer', { error, count });
      throw error;
    }
  }

  async getSize(): Promise<number> {
    return this.itemCount;
  }

  async clear(): Promise<void> {
    try {
      await fs.unlink(this.bufferPath);
      this.readPosition = 0;
      this.writePosition = 0;
      this.itemCount = 0;
      logger.info('Disk buffer cleared', { path: this.bufferPath });
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        logger.error('Failed to clear disk buffer', { error, path: this.bufferPath });
        throw error;
      }
    }
  }

  async close(): Promise<void> {
    if (this.writeStream) {
      await this.writeStream.close();
      this.writeStream = undefined;
    }
    this.isInitialized = false;
    logger.info('Disk buffer closed', { path: this.bufferPath });
  }

  private async compress(data: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const gzip = createGzip();
      
      gzip.on('data', chunk => chunks.push(chunk));
      gzip.on('end', () => {
        const compressed = Buffer.concat(chunks);
        // Prepend length for easier reading
        const result = Buffer.alloc(4 + compressed.length);
        result.writeUInt32BE(compressed.length, 0);
        compressed.copy(result, 4);
        resolve(result);
      });
      gzip.on('error', reject);
      
      gzip.end(data);
    });
  }

  private async decompress(data: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const gunzip = createGunzip();
      
      gunzip.on('data', chunk => chunks.push(chunk));
      gunzip.on('end', () => resolve(Buffer.concat(chunks)));
      gunzip.on('error', reject);
      
      gunzip.end(data);
    });
  }

  private async recoverState(): Promise<void> {
    try {
      const stats = await fs.stat(this.bufferPath);
      this.writePosition = stats.size;
      
      // Count items by reading through the file
      this.itemCount = 0;
      this.readPosition = 0;
      
      if (stats.size > 0) {
        const handle = await fs.open(this.bufferPath, 'r');
        try {
          let position = 0;
          
          while (position < stats.size) {
            // Read length prefix
            const lengthBuffer = Buffer.alloc(4);
            const { bytesRead } = await handle.read(lengthBuffer, 0, 4, position);
            
            if (bytesRead < 4) break;
            
            const dataLength = lengthBuffer.readUInt32BE(0);
            position += 4 + dataLength;
            this.itemCount++;
          }
        } finally {
          await handle.close();
        }
      }
      
      logger.info('Disk buffer state recovered', {
        path: this.bufferPath,
        itemCount: this.itemCount,
        fileSize: stats.size
      });
    } catch (error) {
      logger.error('Failed to recover disk buffer state', { error });
      throw error;
    }
  }

  getStats() {
    return {
      path: this.bufferPath,
      maxSize: this.maxSize,
      itemCount: this.itemCount,
      readPosition: this.readPosition,
      writePosition: this.writePosition,
      compressionEnabled: this.compressionEnabled,
      isInitialized: this.isInitialized
    };
  }
}