import { QueryJob, QueryResult } from '../types';
export declare class QueryExecutorService {
    private pgPool;
    private opensearchClient;
    private executors;
    constructor();
    private initializeExecutors;
    executeQuery(job: QueryJob, progressCallback?: (progress: number, message?: string) => void): Promise<QueryResult>;
    estimateQueryDuration(queryType: string, query: string, parameters: Record<string, any>): Promise<number>;
    validateQuery(queryType: string, query: string): Promise<{
        valid: boolean;
        errors: string[];
    }>;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=QueryExecutor.d.ts.map