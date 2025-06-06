import { Router, Request, Response } from 'express';
import { join } from 'path';
import { readFile, writeFile } from 'fs/promises';
import CSVAdapter from '../adapters/csv.adapter';
import XMLAdapter from '../adapters/xml.adapter';
import { KafkaProducerPool } from '../utils/kafka-producer-pool';
import { BufferManager } from '../buffers/buffer-manager';
import { MetricsCollector } from '../monitoring/metrics-collector';
import logger from '../utils/logger';

interface ProcessingRequest {
  fileId: string;
  filePath: string;
  fileName: string;
  fileType: string;
  processor: string;
  options?: {
    delimiter?: string;
    hasHeaders?: boolean;
    timestampField?: string;
    timestampFormat?: string;
    source?: string;
    sourcetype?: string;
    index?: string;
  };
}

interface ProcessingStatus {
  fileId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: {
    eventsProcessed: number;
    errors: string[];
    startTime: string;
    endTime?: string;
    processingTimeMs?: number;
  };
  error?: string;
}

export class UploadRoutes {
  private router: Router;
  private producerPool: KafkaProducerPool;
  private bufferManager: BufferManager;
  private metrics: MetricsCollector;
  private processingStatus: Map<string, ProcessingStatus> = new Map();

  constructor(
    producerPool: KafkaProducerPool,
    bufferManager: BufferManager,
    metrics: MetricsCollector
  ) {
    this.router = Router();
    this.producerPool = producerPool;
    this.bufferManager = bufferManager;
    this.metrics = metrics;
    
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Process uploaded file
    this.router.post('/process-upload', this.processUpload.bind(this));
    
    // Get processing status
    this.router.get('/processing-status/:fileId', this.getProcessingStatus.bind(this));
    
    // List all processing jobs
    this.router.get('/processing-jobs', this.listProcessingJobs.bind(this));
    
    // Cancel processing job
    this.router.delete('/processing-jobs/:fileId', this.cancelProcessingJob.bind(this));
  }

  /**
   * Process an uploaded file
   */
  private async processUpload(req: Request, res: Response): Promise<void> {
    try {
      const request: ProcessingRequest = req.body;
      
      // Validate request
      if (!request.fileId || !request.filePath || !request.processor) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: fileId, filePath, processor'
        });
        return;
      }

      // Check if already processing
      if (this.processingStatus.has(request.fileId)) {
        res.status(409).json({
          success: false,
          error: 'File is already being processed'
        });
        return;
      }

      // Initialize processing status
      const status: ProcessingStatus = {
        fileId: request.fileId,
        status: 'queued',
        progress: 0
      };
      this.processingStatus.set(request.fileId, status);

      // Start processing asynchronously
      this.processFileAsync(request).catch(error => {
        logger.error('File processing failed', { 
          fileId: request.fileId, 
          error: error.message 
        });
        
        const errorStatus = this.processingStatus.get(request.fileId);
        if (errorStatus) {
          errorStatus.status = 'failed';
          errorStatus.error = error.message;
        }
      });

      res.json({
        success: true,
        fileId: request.fileId,
        status: 'queued',
        message: 'File processing started'
      });

    } catch (error) {
      logger.error('Process upload error', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start file processing'
      });
    }
  }

  /**
   * Get processing status for a file
   */
  private async getProcessingStatus(req: Request, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;
      
      const status = this.processingStatus.get(fileId);
      if (!status) {
        res.status(404).json({
          success: false,
          error: 'Processing job not found'
        });
        return;
      }

      res.json({
        success: true,
        status
      });

    } catch (error) {
      logger.error('Get processing status error', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get processing status'
      });
    }
  }

  /**
   * List all processing jobs
   */
  private async listProcessingJobs(req: Request, res: Response): Promise<void> {
    try {
      const jobs = Array.from(this.processingStatus.values());
      
      res.json({
        success: true,
        jobs,
        count: jobs.length
      });

    } catch (error) {
      logger.error('List processing jobs error', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list processing jobs'
      });
    }
  }

  /**
   * Cancel a processing job
   */
  private async cancelProcessingJob(req: Request, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;
      
      const status = this.processingStatus.get(fileId);
      if (!status) {
        res.status(404).json({
          success: false,
          error: 'Processing job not found'
        });
        return;
      }

      if (status.status === 'completed' || status.status === 'failed') {
        res.status(400).json({
          success: false,
          error: 'Cannot cancel completed or failed job'
        });
        return;
      }

      // Mark as cancelled (processing will check this status)
      status.status = 'failed';
      status.error = 'Cancelled by user';

      res.json({
        success: true,
        message: 'Processing job cancelled'
      });

    } catch (error) {
      logger.error('Cancel processing job error', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel processing job'
      });
    }
  }

  /**
   * Process file asynchronously
   */
  private async processFileAsync(request: ProcessingRequest): Promise<void> {
    const startTime = new Date();
    const status = this.processingStatus.get(request.fileId)!;
    
    try {
      status.status = 'processing';
      status.progress = 0;
      status.result = {
        eventsProcessed: 0,
        errors: [],
        startTime: startTime.toISOString()
      };

      logger.info('Starting file processing', {
        fileId: request.fileId,
        fileName: request.fileName,
        processor: request.processor
      });

      let result: { success: boolean; rowsProcessed: number; errors: string[] };

      switch (request.processor) {
        case 'csv':
          result = await this.processCSVFile(request, status);
          break;
          
        case 'xml':
          result = await this.processXMLFile(request, status);
          break;
          
        case 'json':
          result = await this.processJSONFile(request, status);
          break;
          
        case 'text':
          result = await this.processTextFile(request, status);
          break;
          
        case 'evtx':
          result = await this.processEVTXFile(request, status);
          break;
          
        default:
          throw new Error(`Unsupported processor: ${request.processor}`);
      }

      // Update final status
      const endTime = new Date();
      status.status = 'completed';
      status.progress = 100;
      status.result!.eventsProcessed = result.rowsProcessed;
      status.result!.errors = result.errors;
      status.result!.endTime = endTime.toISOString();
      status.result!.processingTimeMs = endTime.getTime() - startTime.getTime();

      logger.info('File processing completed', {
        fileId: request.fileId,
        eventsProcessed: result.rowsProcessed,
        errors: result.errors.length,
        processingTimeMs: status.result!.processingTimeMs
      });

      // Update metrics
      this.metrics.incrementCounter('upload.files_processed');
      this.metrics.incrementCounter('upload.events_processed', {}, result.rowsProcessed);
      this.metrics.recordGauge('upload.processing_time_ms', status.result!.processingTimeMs);

    } catch (error) {
      const endTime = new Date();
      status.status = 'failed';
      status.error = error instanceof Error ? error.message : 'Unknown error';
      
      if (status.result) {
        status.result.endTime = endTime.toISOString();
        status.result.processingTimeMs = endTime.getTime() - startTime.getTime();
      }

      logger.error('File processing failed', {
        fileId: request.fileId,
        error: status.error,
        processingTimeMs: status.result?.processingTimeMs
      });

      this.metrics.incrementCounter('upload.processing_errors');
      throw error;
    }
  }

  /**
   * Process CSV file
   */
  private async processCSVFile(request: ProcessingRequest, status: ProcessingStatus): Promise<{ success: boolean; rowsProcessed: number; errors: string[] }> {
    const adapter = new CSVAdapter(
      {
        batchSize: 100,
        flushInterval: 5000,
        delimiter: request.options?.delimiter || ',',
        hasHeaders: request.options?.hasHeaders ?? true,
        timestampField: request.options?.timestampField,
        timestampFormat: request.options?.timestampFormat
      },
      this.producerPool,
      this.bufferManager,
      this.metrics
    );

    await adapter.start();
    
    try {
      const result = await adapter.processFile(request.filePath);
      return result;
    } finally {
      await adapter.stop();
    }
  }

  /**
   * Process XML file
   */
  private async processXMLFile(request: ProcessingRequest, status: ProcessingStatus): Promise<{ success: boolean; rowsProcessed: number; errors: string[] }> {
    const adapter = new XMLAdapter(
      {
        batchSize: 100,
        flushInterval: 5000,
        timestampField: request.options?.timestampField
      },
      this.producerPool,
      this.bufferManager,
      this.metrics
    );

    await adapter.start();
    
    try {
      const result = await adapter.processFile(request.filePath);
      return result;
    } finally {
      await adapter.stop();
    }
  }

  /**
   * Process JSON file (JSONL/NDJSON)
   */
  private async processJSONFile(request: ProcessingRequest, status: ProcessingStatus): Promise<{ success: boolean; rowsProcessed: number; errors: string[] }> {
    // JSON processing using CSV adapter with special handling
    const fileContent = await readFile(request.filePath, 'utf-8');
    const lines = fileContent.trim().split('\n');
    const errors: string[] = [];
    let eventsProcessed = 0;

    for (const [index, line] of lines.entries()) {
      if (status.status === 'failed') break; // Check for cancellation
      
      try {
        const jsonEvent = JSON.parse(line.trim());
        
        // Convert to CSV adapter format
        const adapter = new CSVAdapter(
          {
            batchSize: 1,
            flushInterval: 1000
          },
          this.producerPool,
          this.bufferManager,
          this.metrics
        );

        await adapter.start();
        
        // Process as string data
        const csvData = Object.entries(jsonEvent)
          .map(([key, value]) => `"${key}","${JSON.stringify(value).replace(/"/g, '""')}"`)
          .join('\n');
        
        const result = await adapter.processCSVString(csvData, request.filePath);
        eventsProcessed += result.rowsProcessed;
        errors.push(...result.errors);
        
        await adapter.stop();
        
        // Update progress
        status.progress = Math.round((index / lines.length) * 100);
        
      } catch (error) {
        errors.push(`Line ${index + 1}: ${error instanceof Error ? error.message : 'Parse error'}`);
      }
    }

    return {
      success: true,
      rowsProcessed: eventsProcessed,
      errors
    };
  }

  /**
   * Process plain text file
   */
  private async processTextFile(request: ProcessingRequest, status: ProcessingStatus): Promise<{ success: boolean; rowsProcessed: number; errors: string[] }> {
    const fileContent = await readFile(request.filePath, 'utf-8');
    const lines = fileContent.trim().split('\n');
    const errors: string[] = [];
    let eventsProcessed = 0;

    // Send each line as a raw event to HEC service (if available)
    const hecUrl = process.env.HEC_SERVICE_URL || 'http://localhost:8888';
    const hecToken = process.env.HEC_DEFAULT_TOKEN || 'default-token';

    for (const [index, line] of lines.entries()) {
      if (status.status === 'failed') break;
      
      try {
        const response = await fetch(`${hecUrl}/services/collector/raw`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${hecToken}`,
            'Content-Type': 'text/plain'
          },
          body: line.trim()
        });

        if (response.ok) {
          eventsProcessed++;
        } else {
          errors.push(`Line ${index + 1}: HTTP ${response.status}`);
        }

        // Update progress
        status.progress = Math.round((index / lines.length) * 100);
        
      } catch (error) {
        errors.push(`Line ${index + 1}: ${error instanceof Error ? error.message : 'Network error'}`);
      }
    }

    return {
      success: true,
      rowsProcessed: eventsProcessed,
      errors
    };
  }

  /**
   * Process EVTX file
   */
  private async processEVTXFile(request: ProcessingRequest, status: ProcessingStatus): Promise<{ success: boolean; rowsProcessed: number; errors: string[] }> {
    // Use existing EVTX parsing endpoint
    try {
      const response = await fetch('http://localhost:4000/api/evtx/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filePath: request.filePath,
          enableAttackDetection: true
        })
      });

      if (!response.ok) {
        throw new Error(`EVTX parsing failed: HTTP ${response.status}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        rowsProcessed: result.totalEvents || 0,
        errors: result.errors || []
      };

    } catch (error) {
      return {
        success: false,
        rowsProcessed: 0,
        errors: [error instanceof Error ? error.message : 'EVTX processing failed']
      };
    }
  }

  getRouter(): Router {
    return this.router;
  }
}