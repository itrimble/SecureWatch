import Bull from 'bull';
import { QueryJob, JobStatus } from '../types';
export declare class JobQueue {
    private queue;
    private redis;
    private isInitialized;
    constructor();
    initialize(): Promise<void>;
    submitJob(job: Omit<QueryJob, 'id' | 'status' | 'created_at' | 'progress'>): Promise<string>;
    getJob(jobId: string): Promise<QueryJob | null>;
    cancelJob(jobId: string): Promise<boolean>;
    private sanitizeErrorMessage;
    updateJobStatus(jobId: string, status: JobStatus, errorMessage?: string, resultLocation?: string, resultSize?: number): Promise<void>;
    updateJobProgress(jobId: string, progress: number, message?: string): Promise<void>;
    getUserJobs(userId: string, status?: JobStatus, limit?: number): Promise<QueryJob[]>;
    getQueueStats(): Promise<{
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
    }>;
    private getPriorityValue;
    private getDelayForPriority;
    private publishJobUpdate;
    private publishProgressUpdate;
    private setupEventHandlers;
    private cleanupOldJobs;
    shutdown(): Promise<void>;
    getQueue(): Bull.Queue;
}
//# sourceMappingURL=JobQueue.d.ts.map