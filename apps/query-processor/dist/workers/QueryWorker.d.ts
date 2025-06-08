import { QueryExecutorService } from '../services/QueryExecutor';
import { JobQueue } from '../services/JobQueue';
import { WebSocketService } from '../services/WebSocketService';
export declare class QueryWorker {
    private jobQueue;
    private queryExecutor;
    private wsService;
    private isRunning;
    private currentJobs;
    private maxConcurrentJobs;
    constructor(jobQueue: JobQueue, queryExecutor: QueryExecutorService, wsService: WebSocketService, maxConcurrentJobs?: number);
    start(): Promise<void>;
    private processJob;
    private storeResult;
    private calculateResultSize;
    getStats(): {
        is_running: boolean;
        current_jobs: number;
        max_concurrent_jobs: number;
        active_job_ids: string[];
    };
    shutdown(): Promise<void>;
}
//# sourceMappingURL=QueryWorker.d.ts.map