import { DataSource, DataSourceConfig } from '../types/data-source.types';
import { LogEvent } from '../types/log-event.types';
import { XMLConfig } from '../adapters/xml.adapter';
export interface XMLSourceConfig extends XMLConfig {
    kafkaConfig?: {
        brokers: string[];
        topic: string;
    };
    bufferConfig?: {
        maxSize: number;
        flushInterval: number;
    };
}
export declare class XMLSource extends DataSource {
    private xmlAdapter?;
    private xmlConfig;
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
     * Process an XML file directly
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
    getStats(): object;
    private parseXMLConfig;
}
export default XMLSource;
//# sourceMappingURL=xml-source.d.ts.map