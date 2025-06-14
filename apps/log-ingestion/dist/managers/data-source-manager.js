import { EventEmitter } from 'events';
import DefaultDataSourceRegistry from '../registry/data-source-registry';
export class DataSourceManager extends EventEmitter {
    dataSources = new Map();
    registry;
    healthCheckInterval;
    metricsCollectionInterval;
    restartAttempts = new Map();
    config;
    constructor(config = {}, registry) {
        super();
        this.config = {
            maxConcurrentSources: 50,
            healthCheckIntervalMs: 30000, // 30 seconds
            metricsCollectionIntervalMs: 60000, // 1 minute
            autoRestartFailedSources: true,
            maxRestartAttempts: 3,
            restartDelayMs: 5000,
            ...config
        };
        this.registry = registry || new DefaultDataSourceRegistry();
        this.startBackgroundTasks();
    }
    /**
     * Register a data source factory for a specific type
     */
    registerDataSourceType(type, factory) {
        this.registry.register(type, factory);
    }
    /**
     * Register and start a new data source
     */
    async registerDataSource(config) {
        if (this.dataSources.has(config.id)) {
            throw new Error(`Data source with ID ${config.id} already exists`);
        }
        if (this.dataSources.size >= this.config.maxConcurrentSources) {
            throw new Error(`Maximum number of data sources (${this.config.maxConcurrentSources}) reached`);
        }
        const dataSource = this.createDataSource(config);
        this.dataSources.set(config.id, dataSource);
        // Set up event listeners for the data source
        this.setupDataSourceEventListeners(dataSource);
        if (config.enabled) {
            try {
                await dataSource.start();
                this.emitSourceEvent(config.id, 'started');
            }
            catch (error) {
                this.emitSourceEvent(config.id, 'error', { error: error.message });
                throw error;
            }
        }
    }
    /**
     * Remove a data source
     */
    async unregisterDataSource(id) {
        const dataSource = this.dataSources.get(id);
        if (!dataSource) {
            throw new Error(`Data source with ID ${id} not found`);
        }
        if (dataSource.getStatus() === 'active') {
            await dataSource.stop();
        }
        this.dataSources.delete(id);
        this.restartAttempts.delete(id);
        this.emitSourceEvent(id, 'stopped');
    }
    /**
     * Get a data source by ID
     */
    getDataSource(id) {
        return this.dataSources.get(id);
    }
    /**
     * Get all registered data sources
     */
    getAllDataSources() {
        return Array.from(this.dataSources.values());
    }
    /**
     * Get data sources by type
     */
    getDataSourcesByType(type) {
        return Array.from(this.dataSources.values()).filter(source => source.getType() === type);
    }
    /**
     * Get data sources by status
     */
    getDataSourcesByStatus(status) {
        return Array.from(this.dataSources.values()).filter(source => source.getStatus() === status);
    }
    /**
     * Start a data source
     */
    async startDataSource(id) {
        const dataSource = this.dataSources.get(id);
        if (!dataSource) {
            throw new Error(`Data source with ID ${id} not found`);
        }
        try {
            await dataSource.start();
            this.restartAttempts.delete(id); // Reset restart attempts on successful start
            this.emitSourceEvent(id, 'started');
        }
        catch (error) {
            this.emitSourceEvent(id, 'error', { error: error.message });
            throw error;
        }
    }
    /**
     * Stop a data source
     */
    async stopDataSource(id) {
        const dataSource = this.dataSources.get(id);
        if (!dataSource) {
            throw new Error(`Data source with ID ${id} not found`);
        }
        try {
            await dataSource.stop();
            this.emitSourceEvent(id, 'stopped');
        }
        catch (error) {
            this.emitSourceEvent(id, 'error', { error: error.message });
            throw error;
        }
    }
    /**
     * Restart a data source
     */
    async restartDataSource(id) {
        const dataSource = this.dataSources.get(id);
        if (!dataSource) {
            throw new Error(`Data source with ID ${id} not found`);
        }
        try {
            await dataSource.restart();
            this.restartAttempts.delete(id); // Reset restart attempts on successful restart
            this.emitSourceEvent(id, 'started');
        }
        catch (error) {
            this.emitSourceEvent(id, 'error', { error: error.message });
            throw error;
        }
    }
    /**
     * Update data source configuration
     */
    async updateDataSourceConfig(id, config) {
        const dataSource = this.dataSources.get(id);
        if (!dataSource) {
            throw new Error(`Data source with ID ${id} not found`);
        }
        await dataSource.updateConfig(config);
    }
    /**
     * Get health status for a data source
     */
    getDataSourceHealth(id) {
        const dataSource = this.dataSources.get(id);
        return dataSource ? dataSource.getHealth() : undefined;
    }
    /**
     * Get metrics for a data source
     */
    getDataSourceMetrics(id) {
        const dataSource = this.dataSources.get(id);
        return dataSource ? dataSource.getMetrics() : undefined;
    }
    /**
     * Get aggregated metrics for all data sources
     */
    getAggregatedMetrics() {
        const sources = Array.from(this.dataSources.values());
        const activeS = sources.filter(s => s.getStatus() === 'active');
        const healthyS = sources.filter(s => s.getHealth().status === 'healthy');
        const totalEvents = sources.reduce((sum, s) => sum + s.getMetrics().statistics.totalEvents, 0);
        const totalEventsToday = sources.reduce((sum, s) => sum + s.getMetrics().statistics.eventsToday, 0);
        const totalEventsPerSecond = sources.reduce((sum, s) => sum + s.getHealth().metrics.eventsPerSecond, 0);
        const totalErrors = sources.reduce((sum, s) => sum + s.getHealth().errorCount, 0);
        const avgLatencyMs = sources.length > 0
            ? sources.reduce((sum, s) => sum + s.getMetrics().statistics.avgLatencyMs, 0) / sources.length
            : 0;
        return {
            totalSources: sources.length,
            activeSources: activeS.length,
            healthySources: healthyS.length,
            totalEvents,
            totalEventsToday,
            avgEventsPerSecond: totalEventsPerSecond,
            totalErrors,
            avgLatencyMs
        };
    }
    /**
     * Get list of supported data source types
     */
    getSupportedTypes() {
        return this.registry.getSupportedTypes();
    }
    /**
     * Validate a data source configuration
     */
    async validateConfig(config) {
        const errors = [];
        // Basic validation
        if (!config.id || config.id.trim() === '') {
            errors.push('Data source ID is required');
        }
        if (!config.name || config.name.trim() === '') {
            errors.push('Data source name is required');
        }
        if (!this.registry.getSupportedTypes().includes(config.type)) {
            errors.push(`Unsupported data source type: ${config.type}`);
        }
        if (this.dataSources.has(config.id)) {
            errors.push(`Data source with ID ${config.id} already exists`);
        }
        // Type-specific validation
        if (errors.length === 0) {
            try {
                const tempSource = this.createDataSource(config);
                const isValid = await tempSource.validateConfig();
                if (!isValid) {
                    errors.push('Data source configuration validation failed');
                }
            }
            catch (error) {
                errors.push(`Configuration validation error: ${error.message}`);
            }
        }
        return {
            valid: errors.length === 0,
            errors
        };
    }
    /**
     * Shutdown the manager and all data sources
     */
    async shutdown() {
        // Stop background tasks
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        if (this.metricsCollectionInterval) {
            clearInterval(this.metricsCollectionInterval);
        }
        // Stop all data sources
        const stopPromises = Array.from(this.dataSources.values()).map(async (source) => {
            try {
                if (source.getStatus() === 'active') {
                    await source.stop();
                }
            }
            catch (error) {
                console.error(`Error stopping data source ${source.getId()}:`, error);
            }
        });
        await Promise.all(stopPromises);
        this.dataSources.clear();
        this.restartAttempts.clear();
    }
    createDataSource(config) {
        return this.registry.create(config);
    }
    setupDataSourceEventListeners(dataSource) {
        // Monitor data source for failures and handle auto-restart
        const checkHealth = () => {
            const health = dataSource.getHealth();
            if (health.status === 'unhealthy' && this.config.autoRestartFailedSources) {
                this.attemptRestart(dataSource.getId());
            }
        };
        // Check health periodically for this specific source
        setInterval(checkHealth, this.config.healthCheckIntervalMs);
    }
    async attemptRestart(sourceId) {
        const attempts = this.restartAttempts.get(sourceId) || 0;
        if (attempts >= this.config.maxRestartAttempts) {
            this.emitSourceEvent(sourceId, 'error', {
                error: `Maximum restart attempts (${this.config.maxRestartAttempts}) reached for source ${sourceId}`
            });
            return;
        }
        this.restartAttempts.set(sourceId, attempts + 1);
        setTimeout(async () => {
            try {
                await this.restartDataSource(sourceId);
            }
            catch (error) {
                this.emitSourceEvent(sourceId, 'error', {
                    error: `Restart attempt ${attempts + 1} failed: ${error.message}`
                });
            }
        }, this.config.restartDelayMs);
    }
    startBackgroundTasks() {
        // Health check task
        this.healthCheckInterval = setInterval(() => {
            this.dataSources.forEach((source) => {
                const previousHealth = source.getHealth();
                // Health is updated internally by the data source
                const currentHealth = source.getHealth();
                if (previousHealth.status !== currentHealth.status) {
                    this.emitSourceEvent(source.getId(), 'healthChange', {
                        previous: previousHealth.status,
                        current: currentHealth.status
                    });
                }
            });
        }, this.config.healthCheckIntervalMs);
        // Metrics collection task
        this.metricsCollectionInterval = setInterval(() => {
            this.dataSources.forEach((source) => {
                const metrics = source.getMetrics();
                this.emitSourceEvent(source.getId(), 'metricsUpdate', { metrics });
            });
        }, this.config.metricsCollectionIntervalMs);
    }
    emitSourceEvent(sourceId, type, data) {
        const event = {
            sourceId,
            timestamp: new Date(),
            type,
            data
        };
        this.emit('sourceEvent', event);
        this.emit(type, event);
    }
}
export default DataSourceManager;
//# sourceMappingURL=data-source-manager.js.map