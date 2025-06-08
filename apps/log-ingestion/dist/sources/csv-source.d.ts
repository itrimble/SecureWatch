import { DataSource, DataSourceConfig } from '../types/data-source.types';
import { LogEvent } from '../types/log-event.types';
import { CSVConfig } from '../adapters/csv.adapter';
export interface CSVSourceConfig extends CSVConfig {
    kafkaConfig?: {
        brokers: string[];
        topic: string;
    };
    bufferConfig?: {
        maxSize: number;
        flushInterval: number;
    };
}
export declare class CSVSource extends DataSource {
    private csvAdapter?;
    private csvConfig;
    private producerPool?;
    private bufferManager?;
    private metricsCollector?;
    constructor(config: DataSourceConfig);
    start(): Promise<void>;
    stop(): Promise<void>;
    restart(): Promise<void>;
    collect(): Promise<LogEvent[]>;
    validateConfig(): Promise<boolean>;
    /**
     * Process a CSV file directly
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
    getStats(): object;
    private parseCSVConfig;
}
export default CSVSource;
//# sourceMappingURL=csv-source.d.ts.map