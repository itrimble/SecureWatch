import { EventEmitter } from 'events';
import { DataSource, DataSourceConfig, DataSourceType, DataSourceMetrics, SourceHealth, DataSourceRegistry, SourceStatus } from '../types/data-source.types';
export interface DataSourceManagerConfig {
    maxConcurrentSources: number;
    healthCheckIntervalMs: number;
    metricsCollectionIntervalMs: number;
    autoRestartFailedSources: boolean;
    maxRestartAttempts: number;
    restartDelayMs: number;
}
export interface DataSourceEvent {
    sourceId: string;
    timestamp: Date;
    type: 'started' | 'stopped' | 'error' | 'healthChange' | 'metricsUpdate';
    data?: any;
}
export declare class DataSourceManager extends EventEmitter {
    private dataSources;
    private registry;
    private healthCheckInterval?;
    private metricsCollectionInterval?;
    private restartAttempts;
    private config;
    constructor(config?: Partial<DataSourceManagerConfig>, registry?: DataSourceRegistry);
    /**
     * Register a data source factory for a specific type
     */
    registerDataSourceType(type: DataSourceType, factory: (config: DataSourceConfig) => DataSource): void;
    /**
     * Register and start a new data source
     */
    registerDataSource(config: DataSourceConfig): Promise<void>;
    /**
     * Remove a data source
     */
    unregisterDataSource(id: string): Promise<void>;
    /**
     * Get a data source by ID
     */
    getDataSource(id: string): DataSource | undefined;
    /**
     * Get all registered data sources
     */
    getAllDataSources(): DataSource[];
    /**
     * Get data sources by type
     */
    getDataSourcesByType(type: DataSourceType): DataSource[];
    /**
     * Get data sources by status
     */
    getDataSourcesByStatus(status: SourceStatus): DataSource[];
    /**
     * Start a data source
     */
    startDataSource(id: string): Promise<void>;
    /**
     * Stop a data source
     */
    stopDataSource(id: string): Promise<void>;
    /**
     * Restart a data source
     */
    restartDataSource(id: string): Promise<void>;
    /**
     * Update data source configuration
     */
    updateDataSourceConfig(id: string, config: Partial<DataSourceConfig>): Promise<void>;
    /**
     * Get health status for a data source
     */
    getDataSourceHealth(id: string): SourceHealth | undefined;
    /**
     * Get metrics for a data source
     */
    getDataSourceMetrics(id: string): DataSourceMetrics | undefined;
    /**
     * Get aggregated metrics for all data sources
     */
    getAggregatedMetrics(): {
        totalSources: number;
        activeSources: number;
        healthySources: number;
        totalEvents: number;
        totalEventsToday: number;
        avgEventsPerSecond: number;
        totalErrors: number;
        avgLatencyMs: number;
    };
    /**
     * Get list of supported data source types
     */
    getSupportedTypes(): DataSourceType[];
    /**
     * Validate a data source configuration
     */
    validateConfig(config: DataSourceConfig): Promise<{
        valid: boolean;
        errors: string[];
    }>;
    /**
     * Shutdown the manager and all data sources
     */
    shutdown(): Promise<void>;
    private createDataSource;
    private setupDataSourceEventListeners;
    private attemptRestart;
    private startBackgroundTasks;
    private emitSourceEvent;
}
export default DataSourceManager;
//# sourceMappingURL=data-source-manager.d.ts.map