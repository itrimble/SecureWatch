import { EventEmitter } from 'events';
import { KafkaProducerPool } from '../utils/kafka-producer-pool';
import { BufferManager } from '../buffers/buffer-manager';
import { MetricsCollector } from '../monitoring/metrics-collector';
export interface CSVConfig {
    watchDirectory?: string;
    batchSize: number;
    flushInterval: number;
    delimiter?: string;
    quoteChar?: string;
    escapeChar?: string;
    hasHeaders?: boolean;
    skipEmptyLines?: boolean;
    timestampField?: string;
    timestampFormat?: string;
    encoding?: BufferEncoding;
    maxFileSize?: number;
    fileExtensions?: string[];
}
interface CSVFileInfo {
    filePath: string;
    size: number;
    lastModified: Date;
    processed: boolean;
    rowCount?: number;
    errors?: string[];
}
export declare class CSVAdapter extends EventEmitter {
    private config;
    private producerPool;
    private bufferManager;
    private metrics;
    private isRunning;
    private watchInterval?;
    private processedFiles;
    constructor(config: CSVConfig, producerPool: KafkaProducerPool, bufferManager: BufferManager, metrics: MetricsCollector);
    start(): Promise<void>;
    stop(): Promise<void>;
    /**
     * Process a single CSV file
     */
    processFile(filePath: string, options?: Partial<CSVConfig>): Promise<{
        success: boolean;
        rowsProcessed: number;
        errors: string[];
    }>;
    /**
     * Process CSV data from a string
     */
    processCSVString(csvData: string, source?: string, options?: Partial<CSVConfig>): Promise<{
        success: boolean;
        rowsProcessed: number;
        errors: string[];
    }>;
    /**
     * Start file watching for automatic CSV processing
     */
    private startFileWatching;
    /**
     * Scan directory for new CSV files
     */
    private scanDirectory;
    /**
     * Parse CSV file and return rows
     */
    private parseCSVFile;
    /**
     * Parse CSV string and return rows
     */
    private parseCSVString;
    /**
     * Create a log event from a CSV row
     */
    private createLogEvent;
    /**
     * Parse custom timestamp format
     */
    private parseCustomTimestamp;
    /**
     * Process a batch of events
     */
    private processBatch;
    /**
     * Send events to Kafka
     */
    private sendToKafka;
    /**
     * Get adapter statistics
     */
    getStats(): object;
    /**
     * Get list of processed files
     */
    getProcessedFiles(): CSVFileInfo[];
    /**
     * Reset processed files tracking
     */
    resetProcessedFiles(): void;
}
export default CSVAdapter;
//# sourceMappingURL=csv.adapter.d.ts.map