export interface QueryJob {
    id: string;
    organization_id: string;
    user_id: string;
    query: string;
    query_type: 'kql' | 'sql' | 'opensearch';
    parameters: Record<string, any>;
    time_range: {
        start: string;
        end: string;
    };
    status: JobStatus;
    priority: JobPriority;
    estimated_duration?: number;
    created_at: string;
    started_at?: string;
    completed_at?: string;
    error_message?: string;
    progress: number;
    result_location?: string;
    result_size?: number;
    metadata: Record<string, any>;
}
export type JobStatus = 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
export type JobPriority = 'low' | 'normal' | 'high' | 'urgent';
export interface QueryResult {
    job_id: string;
    data: any[];
    total_rows: number;
    execution_time_ms: number;
    columns: QueryColumn[];
    metadata: {
        query_plan?: string;
        cache_hit?: boolean;
        data_scanned_bytes?: number;
        indices_used?: string[];
    };
}
export interface QueryColumn {
    name: string;
    type: string;
    description?: string;
}
export interface JobProgress {
    job_id: string;
    progress: number;
    status: JobStatus;
    message?: string;
    estimated_completion?: string;
    rows_processed?: number;
    current_operation?: string;
}
export interface QueryExecutor {
    id: string;
    name: string;
    description: string;
    supports_query_type: string[];
    execute(job: QueryJob): Promise<QueryResult>;
    estimate_duration(query: string, parameters: Record<string, any>): Promise<number>;
    validate_query(query: string): Promise<{
        valid: boolean;
        errors: string[];
    }>;
}
export interface JobSchedulerConfig {
    max_concurrent_jobs: number;
    max_queue_size: number;
    job_timeout_ms: number;
    cleanup_completed_after_ms: number;
    retry_attempts: number;
    retry_delay_ms: number;
}
export interface WorkerConfig {
    worker_id: string;
    max_jobs_per_worker: number;
    specialization?: string[];
    resource_limits: {
        memory_mb: number;
        cpu_cores: number;
        disk_space_mb: number;
    };
}
export interface QueryCache {
    get(query_hash: string): Promise<QueryResult | null>;
    set(query_hash: string, result: QueryResult, ttl_seconds: number): Promise<void>;
    invalidate(pattern: string): Promise<void>;
    get_stats(): Promise<CacheStats>;
}
export interface CacheStats {
    total_entries: number;
    hit_rate: number;
    miss_rate: number;
    memory_usage_mb: number;
    oldest_entry: string;
    newest_entry: string;
}
export interface WebSocketMessage {
    type: 'job_update' | 'job_complete' | 'job_error' | 'system_status';
    job_id?: string;
    user_id?: string;
    organization_id?: string;
    data: any;
    timestamp: string;
}
export interface SystemMetrics {
    active_jobs: number;
    queued_jobs: number;
    completed_jobs_last_hour: number;
    failed_jobs_last_hour: number;
    average_execution_time_ms: number;
    queue_processing_rate: number;
    worker_utilization: number;
    memory_usage_mb: number;
    cache_hit_rate: number;
}
//# sourceMappingURL=index.d.ts.map