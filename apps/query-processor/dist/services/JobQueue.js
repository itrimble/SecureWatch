// Job Queue Service using Bull for Redis-backed job processing
// Handles async query execution with priority queues and retry logic
import Bull from 'bull';
import { createClient } from 'redis';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
export class JobQueue {
    queue;
    redis;
    isInitialized = false;
    constructor() {
        // Initialize Redis connection
        this.redis = createClient({
            url: process.env.REDIS_URL || 'redis://:securewatch_dev@localhost:6379',
            socket: {
                reconnectStrategy: () => 1000,
            },
        });
        // Initialize Bull queue
        this.queue = new Bull('query-processing', {
            redis: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379', 10),
                password: process.env.REDIS_PASSWORD || 'securewatch_dev',
                db: parseInt(process.env.REDIS_DB || '0', 10),
            },
            defaultJobOptions: {
                removeOnComplete: 50, // Keep last 50 completed jobs
                removeOnFail: 100, // Keep last 100 failed jobs
                attempts: 3, // Retry failed jobs 3 times
                backoff: {
                    type: 'exponential',
                    delay: 5000, // Start with 5s delay, then 25s, 125s
                },
            },
        });
    }
    async initialize() {
        if (this.isInitialized)
            return;
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
        }
        catch (error) {
            logger.error('Failed to initialize job queue:', error);
            throw error;
        }
    }
    // Submit a new query job to the queue
    async submitJob(job) {
        if (!this.isInitialized) {
            throw new Error('Job queue not initialized');
        }
        const jobId = uuidv4();
        const fullJob = {
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
            await this.queue.add('execute-query', fullJob, {
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
        }
        catch (error) {
            logger.error(`Failed to submit job ${jobId}:`, error);
            await this.updateJobStatus(jobId, 'failed', this.sanitizeErrorMessage(`Failed to queue job: ${error}`));
            throw error;
        }
    }
    // Get job status and details
    async getJob(jobId) {
        try {
            const jobData = await this.redis.hGetAll(`job:${jobId}`);
            if (!jobData || Object.keys(jobData).length === 0) {
                return null;
            }
            return {
                id: jobData.id || '',
                organization_id: jobData.organization_id || '',
                user_id: jobData.user_id || '',
                query: jobData.query || '',
                query_type: (jobData.query_type || 'opensearch'),
                parameters: JSON.parse(jobData.parameters || '{}'),
                time_range: JSON.parse(jobData.time_range || '{}'),
                status: jobData.status,
                priority: jobData.priority,
                estimated_duration: jobData.estimated_duration ? parseInt(jobData.estimated_duration, 10) : undefined,
                created_at: jobData.created_at || new Date().toISOString(),
                started_at: jobData.started_at,
                completed_at: jobData.completed_at,
                error_message: jobData.error_message,
                progress: parseInt(jobData.progress || '0', 10),
                result_location: jobData.result_location,
                result_size: jobData.result_size ? parseInt(jobData.result_size, 10) : undefined,
                metadata: JSON.parse(jobData.metadata || '{}'),
            };
        }
        catch (error) {
            logger.error(`Failed to get job ${jobId}:`, error);
            return null;
        }
    }
    // Cancel a job
    async cancelJob(jobId) {
        try {
            const bullJob = await this.queue.getJob(jobId);
            if (bullJob) {
                await bullJob.remove();
                logger.info(`Removed job ${jobId} from queue`);
            }
            await this.updateJobStatus(jobId, 'cancelled');
            return true;
        }
        catch (error) {
            logger.error(`Failed to cancel job ${jobId}:`, error);
            return false;
        }
    }
    // Update job status and metadata
    // Sanitize error messages to prevent information leakage
    sanitizeErrorMessage(errorMessage) {
        // Common patterns that should not be exposed to clients
        const sensitivePatterns = [
            /password[^\\s]*/gi,
            /secret[^\\s]*/gi,
            /token[^\\s]*/gi,
            /key[^\\s]*/gi,
            /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, // IP addresses
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
            /\/[^\s]+/g, // File paths
        ];
        let sanitized = errorMessage;
        // Replace sensitive patterns
        sensitivePatterns.forEach(pattern => {
            sanitized = sanitized.replace(pattern, '[REDACTED]');
        });
        // Generic error messages for common database errors
        if (sanitized.toLowerCase().includes('connection')) {
            return 'Database connection error';
        }
        if (sanitized.toLowerCase().includes('authentication') || sanitized.toLowerCase().includes('login')) {
            return 'Authentication error';
        }
        if (sanitized.toLowerCase().includes('timeout')) {
            return 'Query timeout error';
        }
        if (sanitized.toLowerCase().includes('syntax') || sanitized.toLowerCase().includes('invalid')) {
            return 'Query syntax error';
        }
        // If message is too long or contains sensitive info, use generic message
        if (sanitized.length > 100 || sanitized.includes('[REDACTED]')) {
            return 'Query processing error';
        }
        return sanitized;
    }
    async updateJobStatus(jobId, status, errorMessage, resultLocation, resultSize) {
        try {
            const updates = { status };
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
        }
        catch (error) {
            logger.error(`Failed to update job ${jobId} status:`, error);
        }
    }
    // Update job progress
    async updateJobProgress(jobId, progress, message) {
        try {
            const updates = {
                progress: Math.min(100, Math.max(0, progress)).toString(),
            };
            if (message) {
                updates.progress_message = message;
            }
            await this.redis.hSet(`job:${jobId}`, updates);
            // Publish progress update
            await this.publishProgressUpdate(jobId, progress, message);
        }
        catch (error) {
            logger.error(`Failed to update job ${jobId} progress:`, error);
        }
    }
    // Get jobs for a user
    async getUserJobs(userId, status, limit = 50) {
        try {
            const pattern = 'job:*';
            const keys = await this.redis.keys(pattern);
            const jobs = [];
            for (const key of keys.slice(0, limit * 2)) { // Get more keys to filter
                const jobData = await this.redis.hGetAll(key);
                if (jobData.user_id === userId) {
                    if (!status || jobData.status === status) {
                        const job = await this.getJob(jobData.id || '');
                        if (job) {
                            jobs.push(job);
                        }
                    }
                }
                if (jobs.length >= limit)
                    break;
            }
            // Sort by created_at descending
            return jobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
        catch (error) {
            logger.error(`Failed to get jobs for user ${userId}:`, error);
            return [];
        }
    }
    // Get queue statistics
    async getQueueStats() {
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
        }
        catch (error) {
            logger.error('Failed to get queue stats:', error);
            return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
        }
    }
    // Private helper methods
    getPriorityValue(priority) {
        switch (priority) {
            case 'urgent': return 1;
            case 'high': return 2;
            case 'normal': return 3;
            case 'low': return 4;
            default: return 3;
        }
    }
    getDelayForPriority(priority) {
        switch (priority) {
            case 'urgent': return 0;
            case 'high': return 1000; // 1 second
            case 'normal': return 5000; // 5 seconds
            case 'low': return 30000; // 30 seconds
            default: return 5000;
        }
    }
    async publishJobUpdate(jobId, status) {
        try {
            const job = await this.getJob(jobId);
            if (!job)
                return;
            const message = {
                type: 'job_update',
                job_id: jobId,
                user_id: job.user_id,
                organization_id: job.organization_id,
                data: { status, progress: job.progress },
                timestamp: new Date().toISOString(),
            };
            await this.redis.publish('job-updates', JSON.stringify(message));
        }
        catch (error) {
            logger.error(`Failed to publish job update for ${jobId}:`, error);
        }
    }
    async publishProgressUpdate(jobId, progress, message) {
        try {
            const job = await this.getJob(jobId);
            if (!job)
                return;
            const updateMessage = {
                type: 'job_update',
                job_id: jobId,
                user_id: job.user_id,
                organization_id: job.organization_id,
                data: { status: job.status, progress, message },
                timestamp: new Date().toISOString(),
            };
            await this.redis.publish('job-updates', JSON.stringify(updateMessage));
        }
        catch (error) {
            logger.error(`Failed to publish progress update for ${jobId}:`, error);
        }
    }
    setupEventHandlers() {
        this.queue.on('completed', async (job) => {
            logger.info(`Job ${job.id} completed successfully`);
            await this.updateJobStatus(String(job.id), 'completed');
        });
        this.queue.on('failed', async (job, err) => {
            logger.error(`Job ${job.id} failed:`, err);
            // Sanitize error message to prevent information leakage
            const sanitizedError = this.sanitizeErrorMessage(err.message);
            await this.updateJobStatus(String(job.id), 'failed', sanitizedError);
        });
        this.queue.on('progress', async (job, progress) => {
            await this.updateJobProgress(String(job.id), progress);
        });
        this.queue.on('stalled', (job) => {
            logger.warn(`Job ${job.id} stalled`);
        });
    }
    async cleanupOldJobs() {
        try {
            // Clean jobs older than 7 days
            const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000);
            await this.queue.clean(cutoffTime, 'completed');
            await this.queue.clean(cutoffTime, 'failed');
            logger.info('Cleaned up old jobs from queue');
        }
        catch (error) {
            logger.error('Failed to cleanup old jobs:', error);
        }
    }
    // Graceful shutdown
    async shutdown() {
        try {
            await this.queue.close();
            await this.redis.disconnect();
            logger.info('Job queue shut down gracefully');
        }
        catch (error) {
            logger.error('Error during job queue shutdown:', error);
        }
    }
    // Get the Bull queue instance for worker registration
    getQueue() {
        return this.queue;
    }
}
//# sourceMappingURL=JobQueue.js.map