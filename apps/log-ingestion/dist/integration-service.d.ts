import { EventEmitter } from 'events';
import { DataSourceManagerConfig } from './managers/data-source-manager';
import { DataSourceConfig, DataSourceType, SourceHealth, DataSourceMetrics } from './types/data-source.types';
import { LogEvent } from './types/log-event.types';
export interface IntegrationServiceConfig {
    dataSourceManager?: Partial<DataSourceManagerConfig>;
    enablePredefinedProfiles?: boolean;
    customProfiles?: any[];
    outputDestinations?: OutputDestination[];
}
export interface OutputDestination {
    id: string;
    name: string;
    type: 'kafka' | 'opensearch' | 'file' | 'webhook' | 'custom';
    config: Record<string, any>;
    enabled: boolean;
}
export interface IntegrationStats {
    totalSources: number;
    activeSources: number;
    healthySources: number;
    totalEvents: number;
    eventsPerSecond: number;
    totalErrors: number;
    uptime: number;
}
/**
 * Main integration service that coordinates data source management,
 * field mapping, and event processing for the SIEM platform
 */
export declare class IntegrationService extends EventEmitter {
    private dataSourceManager;
    private fieldMapper;
    private outputDestinations;
    private isRunning;
    private startTime?;
    private eventCount;
    private errorCount;
    constructor(config?: IntegrationServiceConfig);
    /**
     * Start the integration service
     */
    start(): Promise<void>;
    /**
     * Stop the integration service
     */
    stop(): Promise<void>;
    /**
     * Register a new data source
     */
    registerDataSource(config: DataSourceConfig): Promise<void>;
    /**
     * Unregister a data source
     */
    unregisterDataSource(id: string): Promise<void>;
    /**
     * Start a specific data source
     */
    startDataSource(id: string): Promise<void>;
    /**
     * Stop a specific data source
     */
    stopDataSource(id: string): Promise<void>;
    /**
     * Get data source health
     */
    getDataSourceHealth(id: string): SourceHealth | undefined;
    /**
     * Get data source metrics
     */
    getDataSourceMetrics(id: string): DataSourceMetrics | undefined;
    /**
     * Get list of all data sources
     */
    getDataSources(): any[];
    /**
     * Get supported data source types
     */
    getSupportedTypes(): DataSourceType[];
    /**
     * Get integration service statistics
     */
    getStats(): IntegrationStats;
    /**
     * Validate a data source configuration
     */
    validateDataSourceConfig(config: DataSourceConfig): Promise<{
        valid: boolean;
        errors: string[];
    }>;
    /**
     * Add an output destination
     */
    addOutputDestination(destination: OutputDestination): void;
    /**
     * Remove an output destination
     */
    removeOutputDestination(id: string): void;
    /**
     * Get available mapping profiles
     */
    getMappingProfiles(): Array<{
        id: string;
        name: string;
        sourceType: string;
        description?: string;
    }>;
    /**
     * Test a data source connection
     */
    testDataSourceConnection(config: DataSourceConfig): Promise<{
        success: boolean;
        message: string;
        latency?: number;
    }>;
    /**
     * Process raw log data through field mapping
     */
    processLogData(rawData: Record<string, any>, sourceType: string, sourceInfo: any): Promise<LogEvent>;
    /**
     * Get service health status
     */
    getServiceHealth(): {
        status: 'healthy' | 'degraded' | 'unhealthy';
        details: any;
    };
    private setupEventHandlers;
    private processEvent;
    private sendToOutputs;
    private sendToOutput;
    private sendToKafka;
    private sendToOpenSearch;
    private sendToFile;
    private sendToWebhook;
    private loadPredefinedProfiles;
    private findMappingProfile;
    private createBasicLogEvent;
}
export default IntegrationService;
//# sourceMappingURL=integration-service.d.ts.map