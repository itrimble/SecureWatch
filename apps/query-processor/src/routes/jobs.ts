// REST API routes for job management
// Provides HTTP endpoints for submitting, monitoring, and managing async query jobs

import express from 'express';
import { JobQueue } from '../services/JobQueue';
import { QueryExecutorService } from '../services/QueryExecutor';
import { WebSocketService } from '../services/WebSocketService';
import { logger } from '../utils/logger';
import { QueryJob, JobPriority } from '../types';

const router = express.Router();

let jobQueue: JobQueue;
let queryExecutor: QueryExecutorService;
let wsService: WebSocketService;

// Initialize services (called from main app)
export function initializeJobRoutes(
  queue: JobQueue,
  executor: QueryExecutorService,
  webSocket: WebSocketService
): void {
  jobQueue = queue;
  queryExecutor = executor;
  wsService = webSocket;
}

// Submit a new query job
router.post('/submit', async (req, res) => {
  try {
    const {
      query,
      query_type = 'sql',
      parameters = {},
      time_range,
      priority = 'normal',
      organization_id,
      user_id,
      metadata = {},
    } = req.body;

    // Validation
    if (!query || !organization_id || !user_id) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: query, organization_id, user_id',
      });
    }

    if (!['sql', 'kql', 'opensearch'].includes(query_type)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid query_type. Must be sql, kql, or opensearch',
      });
    }

    // Validate query syntax
    const validation = await queryExecutor.validateQuery(query_type, query);
    if (!validation.valid) {
      return res.status(400).json({
        status: 'error',
        message: 'Query validation failed',
        errors: validation.errors,
      });
    }

    // Estimate query duration
    const estimatedDuration = await queryExecutor.estimateQueryDuration(
      query_type,
      query,
      parameters
    );

    // Create job object
    const job: Omit<QueryJob, 'id' | 'status' | 'created_at' | 'progress'> = {
      organization_id,
      user_id,
      query,
      query_type: query_type as any,
      parameters,
      time_range: time_range || { start: '', end: '' },
      priority: priority as JobPriority,
      estimated_duration: estimatedDuration,
      metadata,
    };

    // Submit to queue
    const jobId = await jobQueue.submitJob(job);

    logger.info(`Job submitted successfully`, {
      jobId,
      userId: user_id,
      queryType: query_type,
      priority,
      estimatedDuration,
    });

    res.status(201).json({
      status: 'success',
      job_id: jobId,
      estimated_duration: estimatedDuration,
      message: 'Job submitted successfully',
    });

  } catch (error) {
    logger.error('Failed to submit job:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to submit job',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get job status
router.get('/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await jobQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job not found',
      });
    }

    res.json({
      status: 'success',
      job,
    });

  } catch (error) {
    logger.error(`Failed to get job ${req.params.jobId}:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve job',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get jobs for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, limit = '50' } = req.query;

    const jobs = await jobQueue.getUserJobs(
      userId,
      status as any,
      parseInt(limit as string, 10)
    );

    res.json({
      status: 'success',
      jobs,
      total: jobs.length,
    });

  } catch (error) {
    logger.error(`Failed to get jobs for user ${req.params.userId}:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve user jobs',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Cancel a job
router.post('/:jobId/cancel', async (req, res) => {
  try {
    const { jobId } = req.params;
    const success = await jobQueue.cancelJob(jobId);

    if (!success) {
      return res.status(404).json({
        status: 'error',
        message: 'Job not found or could not be cancelled',
      });
    }

    logger.info(`Job ${jobId} cancelled`);

    res.json({
      status: 'success',
      message: 'Job cancelled successfully',
    });

  } catch (error) {
    logger.error(`Failed to cancel job ${req.params.jobId}:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to cancel job',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Validate query without submitting
router.post('/validate', async (req, res) => {
  try {
    const { query, query_type = 'sql' } = req.body;

    if (!query) {
      return res.status(400).json({
        status: 'error',
        message: 'Query is required',
      });
    }

    const validation = await queryExecutor.validateQuery(query_type, query);
    const estimatedDuration = validation.valid 
      ? await queryExecutor.estimateQueryDuration(query_type, query, {})
      : null;

    res.json({
      status: 'success',
      validation,
      estimated_duration: estimatedDuration,
    });

  } catch (error) {
    logger.error('Failed to validate query:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to validate query',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get queue statistics
router.get('/admin/stats', async (req, res) => {
  try {
    const queueStats = await jobQueue.getQueueStats();
    const wsStats = wsService.getStats();

    res.json({
      status: 'success',
      queue_stats: queueStats,
      websocket_stats: wsStats,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Failed to get queue stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve statistics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    // Basic health checks
    const queueStats = await jobQueue.getQueueStats();
    const isHealthy = queueStats.active >= 0; // Basic check

    res.json({
      status: 'success',
      health: isHealthy ? 'healthy' : 'unhealthy',
      queue_stats: queueStats,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    res.status(503).json({
      status: 'error',
      health: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// Get job result (for completed jobs)
router.get('/:jobId/result', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await jobQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job not found',
      });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({
        status: 'error',
        message: `Job is not completed. Current status: ${job.status}`,
      });
    }

    if (!job.result_location) {
      return res.status(404).json({
        status: 'error',
        message: 'Job result not available',
      });
    }

    // In a real implementation, you'd fetch the result from storage
    // For now, return a placeholder
    res.json({
      status: 'success',
      job_id: jobId,
      result_location: job.result_location,
      result_size: job.result_size,
      message: 'Use result_location to download full results',
    });

  } catch (error) {
    logger.error(`Failed to get result for job ${req.params.jobId}:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve job result',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export { router as jobsRouter };