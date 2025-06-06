import { Client } from '@opensearch-project/opensearch';
export interface LogExportOptions {
    startTime: Date;
    endTime: Date;
    services?: string[];
    logLevels?: ('error' | 'warn' | 'info' | 'debug')[];
    maxDocuments?: number;
    includeStackTraces?: boolean;
}
export interface LogExportResult {
    bundlePath: string;
    totalDocuments: number;
    bundleSize: number;
    exportDuration: number;
    services: string[];
    timeRange: {
        start: string;
        end: string;
    };
}
export interface LogDocument {
    '@timestamp': string;
    level: string;
    message: string;
    service: string;
    hostname?: string;
    pid?: number;
    requestId?: string;
    userId?: string;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
    metadata?: Record<string, any>;
    [key: string]: any;
}
export declare class LogExporter {
    private client;
    private indexPattern;
    constructor(client: Client, indexPattern?: string);
    /**
     * Export logs within the specified time range to a compressed bundle
     */
    exportLogs(options: LogExportOptions): Promise<LogExportResult>;
    /**
     * Build OpenSearch query based on export options
     */
    private buildQuery;
    /**
     * Fetch all documents using OpenSearch scroll API
     */
    private fetchAllDocuments;
    /**
     * Create bundle metadata
     */
    private createBundleMetadata;
    /**
     * Write logs to JSON file with proper formatting
     */
    private writeLogsToFile;
    /**
     * Create README file for the bundle
     */
    private writeReadmeFile;
    /**
     * Create compressed bundle
     */
    private createCompressedBundle;
    /**
     * Extract unique services from documents
     */
    private extractUniqueServices;
    /**
     * Extract unique log levels from documents
     */
    private extractUniqueLogLevels;
    /**
     * Check if the service is healthy and can connect to OpenSearch
     */
    healthCheck(): Promise<{
        healthy: boolean;
        details: any;
    }>;
}
export default LogExporter;
//# sourceMappingURL=index.d.ts.map