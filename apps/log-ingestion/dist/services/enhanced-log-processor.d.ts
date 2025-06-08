import { TimescaleDBService } from './database.service';
import { Producer } from 'kafkajs';
export interface ProcessingResult {
    success: boolean;
    eventId?: string;
    parserId?: string;
    confidence?: number;
    error?: string;
    processingTime: number;
}
export interface ProcessingStats {
    totalProcessed: number;
    successful: number;
    failed: number;
    averageProcessingTime: number;
    parserStats: Record<string, {
        count: number;
        successRate: number;
        averageConfidence: number;
    }>;
}
export declare class EnhancedLogProcessor {
    private parserManager;
    private dbService;
    private kafkaProducer?;
    private processingStats;
    private isInitialized;
    constructor(dbService: TimescaleDBService, kafkaProducer?: Producer);
    initialize(): Promise<void>;
    processLog(rawLog: string, sourceHint?: string, categoryHint?: string): Promise<ProcessingResult>;
    processLogsBatch(logs: Array<{
        rawLog: string;
        sourceHint?: string;
        categoryHint?: string;
    }>, batchSize?: number): Promise<ProcessingResult[]>;
    processFromAdapter(rawLog: string, adapterType: 'syslog' | 'csv' | 'xml' | 'json' | 'evtx', metadata?: Record<string, any>): Promise<ProcessingResult>;
    getParserStats(): import("../parsers/types").ParserStats;
    getProcessingStats(): ProcessingStats;
    resetStats(): void;
    getParserMetrics(parserId?: string): import("../parsers/metrics/ParserMetrics").ParserMetric[];
    testParser(parserId: string, testData: string[]): Promise<any>;
    listParsers(): import("../parsers/types").LogParser[];
    setParserEnabled(parserId: string, enabled: boolean): boolean;
    getHealthStatus(): {
        initialized: boolean;
        parsersLoaded: number;
        activeParsers: number;
        processingStats: ProcessingStats;
    };
    shutdown(): Promise<void>;
    private storeEvent;
    private sendToKafka;
    private transformForDatabase;
    private extractCustomFields;
    private isStandardField;
    private generateEventId;
    private updateStats;
    private initializeStats;
}
//# sourceMappingURL=enhanced-log-processor.d.ts.map