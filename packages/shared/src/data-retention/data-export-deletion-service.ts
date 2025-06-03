/**
 * SecureWatch Data Export and Deletion Service
 * Handles data export for compliance and secure data deletion
 */

import { EventEmitter } from 'events';
import { Pool } from 'pg';
import { createWriteStream, createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createGzip } from 'zlib';
import { Transform } from 'stream';
import * as XLSX from 'xlsx';
import { createHash, randomBytes } from 'crypto';
import { TieredStorageManager, StoredData } from './tiered-storage-manager';
import { DataAnonymizationService } from './data-anonymization-service';

// Export Formats
export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  XML = 'xml',
  XLSX = 'xlsx',
  PDF = 'pdf',
  PARQUET = 'parquet'
}

// Export Types
export enum ExportType {
  COMPLIANCE = 'compliance',
  BACKUP = 'backup',
  MIGRATION = 'migration',
  ANALYTICS = 'analytics',
  AUDIT = 'audit',
  DISCOVERY = 'discovery'
}

// Export Request
export interface ExportRequest {
  id: string;
  tenantId: string;
  userId: string;
  type: ExportType;
  format: ExportFormat;
  filters: {
    dateRange?: {
      start: Date;
      end: Date;
    };
    dataTypes?: string[];
    classifications?: string[];
    tags?: string[];
    customQuery?: string;
  };
  options: {
    includeMetadata: boolean;
    anonymize: boolean;
    anonymizationPolicyId?: string;
    compress: boolean;
    encrypt: boolean;
    splitSize?: number; // MB
    includePII: boolean;
    watermark?: boolean;
  };
  purpose: string;
  legalBasis?: string;
  requestedAt: Date;
  expiresAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
  progress?: {
    total: number;
    processed: number;
    percentage: number;
  };
  result?: {
    files: ExportFile[];
    totalSize: number;
    recordCount: number;
    checksum: string;
  };
  error?: string;
}

// Export File
export interface ExportFile {
  id: string;
  name: string;
  path: string;
  size: number;
  checksum: string;
  format: ExportFormat;
  encrypted: boolean;
  compressed: boolean;
  partNumber?: number;
  totalParts?: number;
  downloadUrl?: string;
  expiresAt: Date;
}

// Deletion Request
export interface DeletionRequest {
  id: string;
  tenantId: string;
  userId: string;
  type: 'selective' | 'bulk' | 'right_to_erasure' | 'retention_expiry';
  criteria: {
    dataIds?: string[];
    dateRange?: {
      start: Date;
      end: Date;
    };
    dataTypes?: string[];
    classifications?: string[];
    tags?: string[];
    userIds?: string[];
    customQuery?: string;
  };
  verification: {
    requireApproval: boolean;
    approvers?: string[];
    approved?: boolean;
    approvedBy?: string;
    approvedAt?: Date;
  };
  safety: {
    dryRun: boolean;
    backupBeforeDelete: boolean;
    backupRetentionDays: number;
    confirmationRequired: boolean;
    multiStageApproval: boolean;
  };
  legalBasis?: string;
  requestedAt: Date;
  scheduledAt?: Date;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress?: {
    total: number;
    processed: number;
    failed: number;
    percentage: number;
  };
  result?: {
    deletedCount: number;
    failedCount: number;
    spaceSaved: number;
    backupLocation?: string;
    deletionCertificate?: string;
  };
  error?: string;
}

// Deletion Certificate
export interface DeletionCertificate {
  id: string;
  requestId: string;
  tenantId: string;
  issuedAt: Date;
  dataDescription: string;
  deletionMethod: string;
  deletedCount: number;
  verificationHash: string;
  issuedBy: string;
  digitalSignature?: string;
}

export class DataExportDeletionService extends EventEmitter {
  private database: Pool;
  private storageManager: TieredStorageManager;
  private anonymizationService: DataAnonymizationService;
  private exportRequests: Map<string, ExportRequest> = new Map();
  private deletionRequests: Map<string, DeletionRequest> = new Map();
  private exportPath: string;
  private encryptionKey: Buffer;

  constructor(
    database: Pool,
    storageManager: TieredStorageManager,
    anonymizationService: DataAnonymizationService,
    exportPath: string,
    encryptionKey: string
  ) {
    super();
    this.database = database;
    this.storageManager = storageManager;
    this.anonymizationService = anonymizationService;
    this.exportPath = exportPath;
    this.encryptionKey = Buffer.from(encryptionKey, 'hex');
  }

  /**
   * Request data export
   */
  async requestExport(request: Omit<ExportRequest, 'id' | 'requestedAt' | 'status'>): Promise<ExportRequest> {
    const exportRequest: ExportRequest = {
      ...request,
      id: this.generateExportId(),
      requestedAt: new Date(),
      status: 'pending',
    };

    this.exportRequests.set(exportRequest.id, exportRequest);
    
    // Store in database
    await this.storeExportRequest(exportRequest);
    
    // Start export processing
    this.processExportRequest(exportRequest);
    
    this.emit('exportRequested', exportRequest);
    
    return exportRequest;
  }

  /**
   * Process export request
   */
  private async processExportRequest(request: ExportRequest): Promise<void> {
    try {
      request.status = 'processing';
      await this.updateExportRequest(request);
      
      // Get data to export
      const data = await this.queryDataForExport(request);
      
      // Initialize progress
      request.progress = {
        total: data.length,
        processed: 0,
        percentage: 0,
      };
      
      // Process data based on format
      const files = await this.generateExportFiles(request, data);
      
      // Finalize export
      request.status = 'completed';
      request.result = {
        files,
        totalSize: files.reduce((sum, file) => sum + file.size, 0),
        recordCount: data.length,
        checksum: this.calculateResultChecksum(files),
      };
      
      await this.updateExportRequest(request);
      
      this.emit('exportCompleted', request);
      
    } catch (error) {
      request.status = 'failed';
      request.error = error instanceof Error ? error.message : 'Unknown error';
      await this.updateExportRequest(request);
      
      this.emit('exportFailed', { request, error });
    }
  }

  /**
   * Generate export files
   */
  private async generateExportFiles(request: ExportRequest, data: any[]): Promise<ExportFile[]> {
    const files: ExportFile[] = [];
    
    // Apply anonymization if requested
    let processedData = data;
    if (request.options.anonymize && request.options.anonymizationPolicyId) {
      processedData = [];
      for (const item of data) {
        const result = await this.anonymizationService.anonymizeData(item, request.options.anonymizationPolicyId);
        processedData.push(result.anonymized);
      }
    }
    
    // Split data if size limit specified
    const chunks = request.options.splitSize ? 
      this.splitDataBySize(processedData, request.options.splitSize * 1024 * 1024) : 
      [processedData];
    
    // Generate file for each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const fileName = this.generateFileName(request, i, chunks.length);
      const filePath = `${this.exportPath}/${fileName}`;
      
      // Convert to requested format
      await this.writeDataToFile(chunk, filePath, request.format, request.options);
      
      // Calculate file stats
      const stats = await this.getFileStats(filePath);
      
      const exportFile: ExportFile = {
        id: this.generateFileId(),
        name: fileName,
        path: filePath,
        size: stats.size,
        checksum: stats.checksum,
        format: request.format,
        encrypted: request.options.encrypt,
        compressed: request.options.compress,
        partNumber: chunks.length > 1 ? i + 1 : undefined,
        totalParts: chunks.length > 1 ? chunks.length : undefined,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      };
      
      files.push(exportFile);
      
      // Update progress
      request.progress!.processed = (i + 1) * chunk.length;
      request.progress!.percentage = Math.round((request.progress!.processed / request.progress!.total) * 100);
      await this.updateExportRequest(request);
    }
    
    return files;
  }

  /**
   * Write data to file in specified format
   */
  private async writeDataToFile(
    data: any[],
    filePath: string,
    format: ExportFormat,
    options: ExportRequest['options']
  ): Promise<void> {
    let stream = createWriteStream(filePath);
    
    // Add compression if requested
    if (options.compress) {
      const gzipStream = createGzip();
      stream = gzipStream.pipe(stream) as any;
    }
    
    switch (format) {
      case ExportFormat.JSON:
        await this.writeJSONFile(data, stream, options);
        break;
        
      case ExportFormat.CSV:
        await this.writeCSVFile(data, stream, options);
        break;
        
      case ExportFormat.XML:
        await this.writeXMLFile(data, stream, options);
        break;
        
      case ExportFormat.XLSX:
        await this.writeXLSXFile(data, filePath, options);
        break;
        
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
    
    // Encrypt file if requested
    if (options.encrypt) {
      await this.encryptFile(filePath);
    }
  }

  /**
   * Request data deletion
   */
  async requestDeletion(request: Omit<DeletionRequest, 'id' | 'requestedAt' | 'status'>): Promise<DeletionRequest> {
    const deletionRequest: DeletionRequest = {
      ...request,
      id: this.generateDeletionId(),
      requestedAt: new Date(),
      status: 'pending',
    };

    this.deletionRequests.set(deletionRequest.id, deletionRequest);
    
    // Store in database
    await this.storeDeletionRequest(deletionRequest);
    
    // Check if approval is required
    if (deletionRequest.verification.requireApproval) {
      await this.requestDeletionApproval(deletionRequest);
    } else {
      // Start deletion processing
      this.processDeletionRequest(deletionRequest);
    }
    
    this.emit('deletionRequested', deletionRequest);
    
    return deletionRequest;
  }

  /**
   * Approve deletion request
   */
  async approveDeletion(requestId: string, approverId: string): Promise<void> {
    const request = this.deletionRequests.get(requestId);
    if (!request) {
      throw new Error(`Deletion request not found: ${requestId}`);
    }
    
    request.verification.approved = true;
    request.verification.approvedBy = approverId;
    request.verification.approvedAt = new Date();
    request.status = 'approved';
    
    await this.updateDeletionRequest(request);
    
    // Start deletion processing
    this.processDeletionRequest(request);
    
    this.emit('deletionApproved', { request, approverId });
  }

  /**
   * Process deletion request
   */
  private async processDeletionRequest(request: DeletionRequest): Promise<void> {
    try {
      request.status = 'processing';
      await this.updateDeletionRequest(request);
      
      // Get data to delete
      const dataToDelete = await this.queryDataForDeletion(request);
      
      // Initialize progress
      request.progress = {
        total: dataToDelete.length,
        processed: 0,
        failed: 0,
        percentage: 0,
      };
      
      // Create backup if requested
      let backupLocation: string | undefined;
      if (request.safety.backupBeforeDelete && !request.safety.dryRun) {
        backupLocation = await this.createDeletionBackup(dataToDelete, request);
      }
      
      // Perform deletion
      let deletedCount = 0;
      let failedCount = 0;
      let spaceSaved = 0;
      
      for (const data of dataToDelete) {
        try {
          if (!request.safety.dryRun) {
            const result = await this.storageManager.deleteData(data.id, true);
            if (result.success) {
              deletedCount++;
              spaceSaved += result.size || 0;
            } else {
              failedCount++;
            }
          } else {
            deletedCount++; // Simulate successful deletion in dry run
          }
          
          request.progress!.processed++;
          request.progress!.percentage = Math.round((request.progress!.processed / request.progress!.total) * 100);
          
          // Update progress every 100 items
          if (request.progress!.processed % 100 === 0) {
            await this.updateDeletionRequest(request);
          }
          
        } catch (error) {
          failedCount++;
          request.progress!.failed++;
          console.error(`Failed to delete data ${data.id}:`, error);
        }
      }
      
      // Generate deletion certificate
      const certificate = await this.generateDeletionCertificate(request, deletedCount);
      
      // Finalize deletion
      request.status = 'completed';
      request.result = {
        deletedCount,
        failedCount,
        spaceSaved,
        backupLocation,
        deletionCertificate: certificate.id,
      };
      
      await this.updateDeletionRequest(request);
      
      this.emit('deletionCompleted', request);
      
    } catch (error) {
      request.status = 'failed';
      request.error = error instanceof Error ? error.message : 'Unknown error';
      await this.updateDeletionRequest(request);
      
      this.emit('deletionFailed', { request, error });
    }
  }

  /**
   * Generate deletion certificate
   */
  private async generateDeletionCertificate(
    request: DeletionRequest,
    deletedCount: number
  ): Promise<DeletionCertificate> {
    const certificate: DeletionCertificate = {
      id: this.generateCertificateId(),
      requestId: request.id,
      tenantId: request.tenantId,
      issuedAt: new Date(),
      dataDescription: this.generateDataDescription(request),
      deletionMethod: request.safety.dryRun ? 'simulation' : 'secure_deletion',
      deletedCount,
      verificationHash: this.generateVerificationHash(request, deletedCount),
      issuedBy: 'SecureWatch Data Retention System',
    };
    
    // Store certificate
    await this.storeDeletionCertificate(certificate);
    
    return certificate;
  }

  /**
   * Get export status
   */
  async getExportStatus(exportId: string): Promise<ExportRequest | null> {
    return this.exportRequests.get(exportId) || null;
  }

  /**
   * Get deletion status
   */
  async getDeletionStatus(deletionId: string): Promise<DeletionRequest | null> {
    return this.deletionRequests.get(deletionId) || null;
  }

  /**
   * Cancel export request
   */
  async cancelExport(exportId: string): Promise<void> {
    const request = this.exportRequests.get(exportId);
    if (!request) {
      throw new Error(`Export request not found: ${exportId}`);
    }
    
    if (request.status === 'processing') {
      request.status = 'failed';
      request.error = 'Cancelled by user';
      await this.updateExportRequest(request);
      
      this.emit('exportCancelled', request);
    }
  }

  /**
   * Cancel deletion request
   */
  async cancelDeletion(deletionId: string): Promise<void> {
    const request = this.deletionRequests.get(deletionId);
    if (!request) {
      throw new Error(`Deletion request not found: ${deletionId}`);
    }
    
    if (request.status === 'pending' || request.status === 'approved') {
      request.status = 'cancelled';
      await this.updateDeletionRequest(request);
      
      this.emit('deletionCancelled', request);
    }
  }

  /**
   * Helper methods for file operations
   */
  private async writeJSONFile(data: any[], stream: any, options: ExportRequest['options']): Promise<void> {
    const jsonString = JSON.stringify(data, null, options.includeMetadata ? 2 : 0);
    stream.write(jsonString);
    stream.end();
  }

  private async writeCSVFile(data: any[], stream: any, options: ExportRequest['options']): Promise<void> {
    if (data.length === 0) return;
    
    // Get headers from first object
    const headers = Object.keys(data[0]);
    
    // Write CSV header
    stream.write(headers.join(',') + '\n');
    
    // Write data rows
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      });
      stream.write(values.join(',') + '\n');
    }
    
    stream.end();
  }

  private async writeXMLFile(data: any[], stream: any, options: ExportRequest['options']): Promise<void> {
    stream.write('<?xml version="1.0" encoding="UTF-8"?>\n');
    stream.write('<data>\n');
    
    for (const item of data) {
      stream.write('  <record>\n');
      for (const [key, value] of Object.entries(item)) {
        stream.write(`    <${key}>${this.escapeXML(String(value))}</${key}>\n`);
      }
      stream.write('  </record>\n');
    }
    
    stream.write('</data>\n');
    stream.end();
  }

  private async writeXLSXFile(data: any[], filePath: string, options: ExportRequest['options']): Promise<void> {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    XLSX.writeFile(workbook, filePath);
  }

  private escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private splitDataBySize(data: any[], maxSize: number): any[][] {
    const chunks: any[][] = [];
    let currentChunk: any[] = [];
    let currentSize = 0;
    
    for (const item of data) {
      const itemSize = JSON.stringify(item).length;
      
      if (currentSize + itemSize > maxSize && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = [];
        currentSize = 0;
      }
      
      currentChunk.push(item);
      currentSize += itemSize;
    }
    
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }

  private generateFileName(request: ExportRequest, partNumber: number, totalParts: number): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = this.getFileExtension(request.format, request.options.compress);
    
    if (totalParts > 1) {
      return `export_${request.id}_${timestamp}_part${partNumber + 1}of${totalParts}.${extension}`;
    } else {
      return `export_${request.id}_${timestamp}.${extension}`;
    }
  }

  private getFileExtension(format: ExportFormat, compressed: boolean): string {
    const extensions = {
      [ExportFormat.JSON]: 'json',
      [ExportFormat.CSV]: 'csv',
      [ExportFormat.XML]: 'xml',
      [ExportFormat.XLSX]: 'xlsx',
      [ExportFormat.PDF]: 'pdf',
      [ExportFormat.PARQUET]: 'parquet',
    };
    
    const baseExt = extensions[format];
    return compressed ? `${baseExt}.gz` : baseExt;
  }

  private async getFileStats(filePath: string): Promise<{ size: number; checksum: string }> {
    // Implementation would use fs.stat and calculate file checksum
    return { size: 0, checksum: '' };
  }

  private async encryptFile(filePath: string): Promise<void> {
    // Implementation would encrypt file using AES
  }

  private calculateResultChecksum(files: ExportFile[]): string {
    const combined = files.map(f => f.checksum).join('');
    return createHash('sha256').update(combined).digest('hex');
  }

  private generateDataDescription(request: DeletionRequest): string {
    const parts: string[] = [];
    
    if (request.criteria.dataTypes?.length) {
      parts.push(`Data types: ${request.criteria.dataTypes.join(', ')}`);
    }
    
    if (request.criteria.dateRange) {
      parts.push(`Date range: ${request.criteria.dateRange.start.toISOString()} to ${request.criteria.dateRange.end.toISOString()}`);
    }
    
    if (request.criteria.userIds?.length) {
      parts.push(`User IDs: ${request.criteria.userIds.length} users`);
    }
    
    return parts.join('; ') || 'Data matching deletion criteria';
  }

  private generateVerificationHash(request: DeletionRequest, deletedCount: number): string {
    const data = JSON.stringify({
      requestId: request.id,
      tenantId: request.tenantId,
      deletedCount,
      timestamp: new Date().toISOString(),
    });
    
    return createHash('sha256').update(data + this.encryptionKey.toString()).digest('hex');
  }

  // ID generators
  private generateExportId(): string {
    return `exp_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateDeletionId(): string {
    return `del_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateFileId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateCertificateId(): string {
    return `cert_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  // Database operation stubs - would be implemented with actual SQL
  private async storeExportRequest(request: ExportRequest): Promise<void> {
    // Implementation would insert into export_requests table
  }

  private async updateExportRequest(request: ExportRequest): Promise<void> {
    // Implementation would update export_requests table
  }

  private async storeDeletionRequest(request: DeletionRequest): Promise<void> {
    // Implementation would insert into deletion_requests table
  }

  private async updateDeletionRequest(request: DeletionRequest): Promise<void> {
    // Implementation would update deletion_requests table
  }

  private async storeDeletionCertificate(certificate: DeletionCertificate): Promise<void> {
    // Implementation would insert into deletion_certificates table
  }

  private async queryDataForExport(request: ExportRequest): Promise<any[]> {
    // Implementation would query data based on request filters
    return [];
  }

  private async queryDataForDeletion(request: DeletionRequest): Promise<StoredData[]> {
    // Implementation would query data based on deletion criteria
    return [];
  }

  private async createDeletionBackup(data: StoredData[], request: DeletionRequest): Promise<string> {
    // Implementation would create backup of data before deletion
    return 'backup_location';
  }

  private async requestDeletionApproval(request: DeletionRequest): Promise<void> {
    // Implementation would send approval requests to specified approvers
  }
}

// Export factory function
export const createDataExportDeletionService = (
  database: Pool,
  storageManager: TieredStorageManager,
  anonymizationService: DataAnonymizationService,
  exportPath: string,
  encryptionKey: string
) => new DataExportDeletionService(database, storageManager, anonymizationService, exportPath, encryptionKey);