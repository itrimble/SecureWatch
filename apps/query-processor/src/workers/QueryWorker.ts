// Query Worker - Processes async query jobs from the queue
// Handles job execution, progress tracking, and result storage

import Bull from 'bull';
import { QueryExecutorService } from '../services/QueryExecutor';
import { JobQueue } from '../services/JobQueue';
import { WebSocketService } from '../services/WebSocketService';
import { logger } from '../utils/logger';
import { QueryJob, QueryResult } from '../types';
import fs from 'fs/promises';
import path from 'path';

export class QueryWorker {
  private isRunning = false;
  private currentJobs = new Set<string>();
  private maxConcurrentJobs: number;

  constructor(
    private jobQueue: JobQueue,
    private queryExecutor: QueryExecutorService,
    private wsService: WebSocketService,
    maxConcurrentJobs: number = 5
  ) {
    this.maxConcurrentJobs = maxConcurrentJobs;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      const queue = this.jobQueue.getQueue();
      
      // Register job processor
      queue.process('execute-query', this.maxConcurrentJobs, async (job) => {
        return await this.processJob(job);
      });

      // Setup event handlers
      queue.on('active', (job) => {
        this.currentJobs.add(job.id);
        logger.info(`Job ${job.id} started processing`);
      });

      queue.on('completed', (job, result) => {
        this.currentJobs.delete(job.id);
        logger.info(`Job ${job.id} completed successfully`, {
          executionTime: result.execution_time_ms,
          totalRows: result.total_rows,
        });
      });

      queue.on('failed', (job, err) => {
        this.currentJobs.delete(job.id);
        logger.error(`Job ${job.id} failed:`, err);
      });

      queue.on('stalled', (job) => {
        logger.warn(`Job ${job.id} stalled`);
      });

      this.isRunning = true;
      logger.info(`Query worker started with ${this.maxConcurrentJobs} concurrent job slots`);

    } catch (error) {
      logger.error('Failed to start query worker:', error);
      throw error;
    }
  }

  private async processJob(bullJob: Bull.Job<QueryJob>): Promise<QueryResult> {
    const job = bullJob.data;
    const jobId = job.id;

    logger.info(`Processing job ${jobId}`, {
      queryType: job.query_type,
      userId: job.user_id,
      priority: job.priority,
    });

    try {
      // Update job status to running
      await this.jobQueue.updateJobStatus(jobId, 'running');

      // Progress callback for real-time updates
      const progressCallback = async (progress: number, message?: string) => {
        await this.jobQueue.updateJobProgress(jobId, progress, message);
        
        // Update Bull job progress
        await bullJob.progress(progress);
      };

      // Execute the query
      const result = await this.queryExecutor.executeQuery(job, progressCallback);

      // Store result to file system (in production, use cloud storage)
      const resultLocation = await this.storeResult(jobId, result);
      const resultSize = this.calculateResultSize(result);

      // Update job with completion status
      await this.jobQueue.updateJobStatus(
        jobId,
        'completed',
        undefined,
        resultLocation,
        resultSize
      );

      // Send WebSocket notification
      this.wsService.notifyJobComplete(
        jobId,
        job.user_id,
        job.organization_id,
        {
          ...result,
          result_location: resultLocation,
        }
      );

      logger.info(`Job ${jobId} completed successfully`, {
        executionTime: result.execution_time_ms,
        totalRows: result.total_rows,
        resultSize,
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Update job status to failed
      await this.jobQueue.updateJobStatus(jobId, 'failed', errorMessage);

      // Send WebSocket error notification
      this.wsService.notifyJobError(jobId, job.user_id, job.organization_id, errorMessage);

      logger.error(`Job ${jobId} failed:`, error);
      throw error;
    }
  }

  private async storeResult(jobId: string, result: QueryResult): Promise<string> {
    try {
      // Create results directory if it doesn't exist
      const resultsDir = process.env.RESULTS_DIR || './results';
      await fs.mkdir(resultsDir, { recursive: true });

      // Store result as JSON file
      const filename = `job-${jobId}-result.json`;
      const filePath = path.join(resultsDir, filename);

      // Store metadata and paginated data
      const resultData = {
        job_id: jobId,
        execution_time_ms: result.execution_time_ms,
        total_rows: result.total_rows,
        columns: result.columns,
        metadata: result.metadata,
        data: result.data, // In production, you might want to paginate this
        generated_at: new Date().toISOString(),
      };

      await fs.writeFile(filePath, JSON.stringify(resultData, null, 2), 'utf8');

      // Return relative path or URL
      return filePath;

    } catch (error) {
      logger.error(`Failed to store result for job ${jobId}:`, error);
      throw new Error('Failed to store query result');
    }
  }

  private calculateResultSize(result: QueryResult): number {
    // Calculate approximate size in bytes
    const jsonString = JSON.stringify(result);
    return Buffer.byteLength(jsonString, 'utf8');
  }

  // Get worker statistics
  getStats(): {
    is_running: boolean;
    current_jobs: number;
    max_concurrent_jobs: number;
    active_job_ids: string[];
  } {
    return {
      is_running: this.isRunning,
      current_jobs: this.currentJobs.size,
      max_concurrent_jobs: this.maxConcurrentJobs,
      active_job_ids: Array.from(this.currentJobs),
    };
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    if (!this.isRunning) return;

    try {
      logger.info('Shutting down query worker...');

      const queue = this.jobQueue.getQueue();
      
      // Wait for current jobs to complete (with timeout)
      const shutdownTimeout = 30000; // 30 seconds
      const startTime = Date.now();

      while (this.currentJobs.size > 0 && (Date.now() - startTime) < shutdownTimeout) {
        logger.info(`Waiting for ${this.currentJobs.size} jobs to complete...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (this.currentJobs.size > 0) {
        logger.warn(`Forcing shutdown with ${this.currentJobs.size} jobs still running`);
      }

      // Close the queue
      await queue.close();

      this.isRunning = false;
      this.currentJobs.clear();

      logger.info('Query worker shut down successfully');

    } catch (error) {
      logger.error('Error during query worker shutdown:', error);
    }
  }
}

// Standalone worker process entry point
if (require.main === module) {
  async function startWorker() {
    try {
      logger.info('Starting standalone query worker...');

      // Initialize services
      const jobQueue = new JobQueue();
      await jobQueue.initialize();

      const queryExecutor = new QueryExecutorService();
      
      const wsService = new WebSocketService(
        parseInt(process.env.WS_PORT || '8080', 10)
      );
      await wsService.initialize();

      // Start worker
      const worker = new QueryWorker(jobQueue, queryExecutor, wsService);
      await worker.start();

      // Graceful shutdown handlers
      process.on('SIGTERM', async () => {
        logger.info('SIGTERM received, shutting down worker...');
        await worker.shutdown();
        await queryExecutor.shutdown();
        await jobQueue.shutdown();
        await wsService.shutdown();
        process.exit(0);
      });

      process.on('SIGINT', async () => {
        logger.info('SIGINT received, shutting down worker...');
        await worker.shutdown();
        await queryExecutor.shutdown();
        await jobQueue.shutdown();
        await wsService.shutdown();
        process.exit(0);
      });

      logger.info('Standalone query worker started successfully');

    } catch (error) {
      logger.error('Failed to start standalone query worker:', error);
      process.exit(1);
    }
  }

  startWorker();
}