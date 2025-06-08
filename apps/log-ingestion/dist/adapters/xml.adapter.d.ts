import { EventEmitter } from 'events';
import { KafkaProducerPool } from '../utils/kafka-producer-pool';
import { BufferManager } from '../buffers/buffer-manager';
import { MetricsCollector } from '../monitoring/metrics-collector';
export interface XMLConfig {
    watchDirectory?: string;
    batchSize: number;
    flushInterval: number;
    explicitArray?: boolean;
    tagNameProcessors?: Array<(name: string) => string>;
    attrNameProcessors?: Array<(name: string) => string>;
    valueProcessors?: Array<(value: string, name: string) => any>;
    attrValueProcessors?: Array<(value: string, name: string) => any>;
    preserveChildrenOrder?: boolean;
    rootName?: string;
    renderOpts?: {
        pretty?: boolean;
        indent?: string;
        newline?: string;
    };
    includeAttributes?: boolean;
    mergeAttributes?: boolean;
    timestampField?: string;
    timestampFormat?: string;
    encoding?: BufferEncoding;
    maxFileSize?: number;
    fileExtensions?: string[];
    recordPath?: string;
}
interface XMLFileInfo {
    filePath: string;
    size: number;
    lastModified: Date;
    processed: boolean;
    recordCount?: number;
    errors?: string[];
}
export declare class XMLAdapter extends EventEmitter {
    private config;
    private producerPool;
    private bufferManager;
    private metrics;
    private isRunning;
    private watchInterval?;
    private processedFiles;
    private parser;
    constructor(config: XMLConfig, producerPool: KafkaProducerPool, bufferManager: BufferManager, metrics: MetricsCollector);
    start(): Promise<void>;
    stop(): Promise<void>;
    /**
     * Process a single XML file
     */
    processFile(filePath: string, options?: Partial<XMLConfig>): Promise<{
        success: boolean;
        recordsProcessed: number;
        errors: string[];
    }>;
    /**
     * Process XML data from a string
     */
    processXMLString(xmlData: string, source?: string, options?: Partial<XMLConfig>): Promise<{
        success: boolean;
        recordsProcessed: number;
        errors: string[];
    }>;
    /**
     * Start file watching for automatic XML processing
     */
    private startFileWatching;
    /**
     * Scan directory for new XML files
     */
    private scanDirectory;
    /**
     * Parse XML content
     */
    private parseXML;
    /**
     * Extract records from parsed XML based on configuration
     */
    private extractRecords;
    /**
     * Create a log event from an XML record
     */
    private createLogEvent;
    /**
     * Get nested value from object using dot notation
     */
    private getNestedValue;
    /**
     * Flatten nested object structure
     */
    private flattenObject;
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
    getProcessedFiles(): XMLFileInfo[];
    /**
     * Reset processed files tracking
     */
    resetProcessedFiles(): void;
}
export default XMLAdapter;
//# sourceMappingURL=xml.adapter.d.ts.map