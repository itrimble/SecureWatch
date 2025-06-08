import { NormalizedLogEvent } from '../types/log-event.types';
export interface DualWriteConfig {
    postgres: {
        connectionString: string;
        poolSize?: number;
    };
    opensearch: {
        node: string | string[];
        auth?: {
            username: string;
            password: string;
        };
    };
}
export declare class DualWriteService {
    private pgPool;
    private opensearchService;
    private logger;
    private writeStats;
    constructor(config: DualWriteConfig);
    initialize(): Promise<void>;
    writeLog(normalizedEvent: NormalizedLogEvent): Promise<void>;
    writeBatch(events: NormalizedLogEvent[]): Promise<void>;
    private preparePostgresData;
    private prepareOpenSearchData;
    private writeToPostgres;
    private batchWriteToPostgres;
    private writeToOpenSearch;
    private startStatsReporting;
    private calculateSuccessRate;
    close(): Promise<void>;
}
//# sourceMappingURL=dual-write.service.d.ts.map