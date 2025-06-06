// Job Queue Service using Bull for Redis-backed job processing
// Handles async query execution with priority queues and retry logic

import Bull from 'bull';
import Redis from 'redis';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { QueryJob, JobStatus, JobPriority, JobProgress, QueryResult } from '../types';

export class JobQueue {
  private queue: Bull.Queue;
  private redis: Redis.RedisClientType;
  private isInitialized = false;

  constructor() {
    // Initialize Redis connection
    this.redis = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      retry_delay_on_failure: 1000,
      retry_unfulfilled_commands: true,
    });

    // Initialize Bull queue
    this.queue = new Bull('query-processing', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0', 10),
      },
      defaultJobOptions: {
        removeOnComplete: 50, // Keep last 50 completed jobs
        removeOnFail: 100,    // Keep last 100 failed jobs
        attempts: 3,          // Retry failed jobs 3 times
        backoff: {
          type: 'exponential',
          delay: 5000,        // Start with 5s delay, then 25s, 125s
        },
      },
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Connect to Redis
      await this.redis.connect();
      logger.info('Connected to Redis for job queue');

      // Setup queue event handlers
      this.setupEventHandlers();

      // Clean up old jobs on startup
      await this.cleanupOldJobs();

      this.isInitialized = true;
      logger.info('Job queue initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize job queue:', error);
      throw error;
    }
  }

  // Submit a new query job to the queue
  async submitJob(job: Omit<QueryJob, 'id' | 'status' | 'created_at' | 'progress'>): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Job queue not initialized');
    }

    const jobId = uuidv4();
    const fullJob: QueryJob = {
      ...job,
      id: jobId,
      status: 'pending',
      created_at: new Date().toISOString(),
      progress: 0,
    };

    try {
      // Store job metadata in Redis
      await this.redis.hSet(`job:${jobId}`, {
        id: jobId,
        organization_id: fullJob.organization_id,
        user_id: fullJob.user_id,
        query: fullJob.query,
        query_type: fullJob.query_type,
        parameters: JSON.stringify(fullJob.parameters),
        time_range: JSON.stringify(fullJob.time_range),
        status: fullJob.status,
        priority: fullJob.priority,
        created_at: fullJob.created_at,
        progress: '0',
        metadata: JSON.stringify(fullJob.metadata),
      });

      // Add job to Bull queue with priority
      const bullJob = await this.queue.add('execute-query', fullJob, {
        priority: this.getPriorityValue(fullJob.priority),
        delay: this.getDelayForPriority(fullJob.priority),
        jobId: jobId,
      });

      await this.updateJobStatus(jobId, 'queued');
      
      logger.info(`Job ${jobId} submitted to queue`, {
        jobId,
        priority: fullJob.priority,
        queryType: fullJob.query_type,
        userId: fullJob.user_id,
      });

      return jobId;

    } catch (error) {
      logger.error(`Failed to submit job ${jobId}:`, error);
      await this.updateJobStatus(jobId, 'failed', `Failed to queue job: ${error}`);
      throw error;
    }
  }

  // Get job status and details
  async getJob(jobId: string): Promise<QueryJob | null> {
    try {
      const jobData = await this.redis.hGetAll(`job:${jobId}`);
      
      if (!jobData || Object.keys(jobData).length === 0) {
        return null;
      }

      return {
        id: jobData.id,
        organization_id: jobData.organization_id,
        user_id: jobData.user_id,
        query: jobData.query,
        query_type: jobData.query_type as any,
        parameters: JSON.parse(jobData.parameters || '{}'),
        time_range: JSON.parse(jobData.time_range || '{}'),
        status: jobData.status as JobStatus,
        priority: jobData.priority as JobPriority,
        estimated_duration: jobData.estimated_duration ? parseInt(jobData.estimated_duration, 10) : undefined,
        created_at: jobData.created_at,
        started_at: jobData.started_at,
        completed_at: jobData.completed_at,
        error_message: jobData.error_message,
        progress: parseInt(jobData.progress || '0', 10),
        result_location: jobData.result_location,
        result_size: jobData.result_size ? parseInt(jobData.result_size, 10) : undefined,
        metadata: JSON.parse(jobData.metadata || '{}'),
      };

    } catch (error) {
      logger.error(`Failed to get job ${jobId}:`, error);
      return null;
    }
  }

  // Cancel a job
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const bullJob = await this.queue.getJob(jobId);
      
      if (bullJob) {
        await bullJob.remove();
        logger.info(`Removed job ${jobId} from queue`);
      }

      await this.updateJobStatus(jobId, 'cancelled');
      return true;

    } catch (error) {
      logger.error(`Failed to cancel job ${jobId}:`, error);
      return false;
    }
  }

  // Update job status and metadata
  async updateJobStatus(
    jobId: string, 
    status: JobStatus, 
    errorMessage?: string,
    resultLocation?: string,
    resultSize?: number
  ): Promise<void> {
    try {
      const updates: Record<string, string> = { status };

      if (status === 'running' && !await this.redis.hGet(`job:${jobId}`, 'started_at')) {
        updates.started_at = new Date().toISOString();
      }

      if (status === 'completed' || status === 'failed') {
        updates.completed_at = new Date().toISOString();
        updates.progress = '100';
      }

      if (errorMessage) {
        updates.error_message = errorMessage;
      }

      if (resultLocation) {
        updates.result_location = resultLocation;
      }

      if (resultSize !== undefined) {
        updates.result_size = resultSize.toString();
      }

      await this.redis.hSet(`job:${jobId}`, updates);

      // Publish status update to subscribers
      await this.publishJobUpdate(jobId, status);

    } catch (error) {
      logger.error(`Failed to update job ${jobId} status:`, error);
    }
  }

  // Update job progress
  async updateJobProgress(jobId: string, progress: number, message?: string): Promise<void> {
    try {
      const updates: Record<string, string> = {
        progress: Math.min(100, Math.max(0, progress)).toString(),
      };

      if (message) {
        updates.progress_message = message;
      }

      await this.redis.hSet(`job:${jobId}`, updates);

      // Publish progress update
      await this.publishProgressUpdate(jobId, progress, message);

    } catch (error) {
      logger.error(`Failed to update job ${jobId} progress:`, error);
    }
  }

  // Get jobs for a user
  async getUserJobs(userId: string, status?: JobStatus, limit: number = 50): Promise<QueryJob[]> {
    try {
      const pattern = 'job:*';
      const keys = await this.redis.keys(pattern);
      const jobs: QueryJob[] = [];

      for (const key of keys.slice(0, limit * 2)) { // Get more keys to filter
        const jobData = await this.redis.hGetAll(key);
        
        if (jobData.user_id === userId) {
          if (!status || jobData.status === status) {
            const job = await this.getJob(jobData.id);
            if (job) {
              jobs.push(job);
            }
          }
        }

        if (jobs.length >= limit) break;
      }

      // Sort by created_at descending
      return jobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    } catch (error) {
      logger.error(`Failed to get jobs for user ${userId}:`, error);
      return [];
    }
  }

  // Get queue statistics
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.queue.getWaiting(),
        this.queue.getActive(),
        this.queue.getCompleted(),
        this.queue.getFailed(),
        this.queue.getDelayed(),
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
      };

    } catch (error) {
      logger.error('Failed to get queue stats:', error);
      return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
    }
  }

  // Private helper methods
  private getPriorityValue(priority: JobPriority): number {
    switch (priority) {
      case 'urgent': return 1;
      case 'high': return 2;
      case 'normal': return 3;
      case 'low': return 4;
      default: return 3;
    }
  }

  private getDelayForPriority(priority: JobPriority): number {
    switch (priority) {
      case 'urgent': return 0;
      case 'high': return 1000;    // 1 second
      case 'normal': return 5000;  // 5 seconds
      case 'low': return 30000;    // 30 seconds
      default: return 5000;
    }
  }

  private async publishJobUpdate(jobId: string, status: JobStatus): Promise<void> {
    try {
      const job = await this.getJob(jobId);
      if (!job) return;

      const message = {
        type: 'job_update',
        job_id: jobId,
        user_id: job.user_id,
        organization_id: job.organization_id,
        data: { status, progress: job.progress },
        timestamp: new Date().toISOString(),
      };

      await this.redis.publish('job-updates', JSON.stringify(message));

    } catch (error) {
      logger.error(`Failed to publish job update for ${jobId}:`, error);
    }
  }

  private async publishProgressUpdate(jobId: string, progress: number, message?: string): Promise<void> {
    try {
      const job = await this.getJob(jobId);
      if (!job) return;

      const updateMessage = {
        type: 'job_update',
        job_id: jobId,
        user_id: job.user_id,
        organization_id: job.organization_id,
        data: { status: job.status, progress, message },
        timestamp: new Date().toISOString(),
      };

      await this.redis.publish('job-updates', JSON.stringify(updateMessage));

    } catch (error) {
      logger.error(`Failed to publish progress update for ${jobId}:`, error);
    }
  }

  private setupEventHandlers(): void {
    this.queue.on('completed', async (job) => {
      logger.info(`Job ${job.id} completed successfully`);
      await this.updateJobStatus(job.id, 'completed');
    });

    this.queue.on('failed', async (job, err) => {
      logger.error(`Job ${job.id} failed:`, err);
      await this.updateJobStatus(job.id, 'failed', err.message);
    });

    this.queue.on('progress', async (job, progress) => {
      await this.updateJobProgress(job.id, progress);
    });

    this.queue.on('stalled', (job) => {
      logger.warn(`Job ${job.id} stalled`);
    });
  }

  private async cleanupOldJobs(): Promise<void> {
    try {
      // Clean jobs older than 7 days
      const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000);
      await this.queue.clean(cutoffTime, 'completed');
      await this.queue.clean(cutoffTime, 'failed');
      
      logger.info('Cleaned up old jobs from queue');

    } catch (error) {
      logger.error('Failed to cleanup old jobs:', error);
    }
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    try {
      await this.queue.close();
      await this.redis.disconnect();
      logger.info('Job queue shut down gracefully');

    } catch (error) {
      logger.error('Error during job queue shutdown:', error);
    }
  }

  // Get the Bull queue instance for worker registration
  getQueue(): Bull.Queue {
    return this.queue;
  }
}