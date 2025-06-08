import { EventEmitter } from 'events';
import DataSourceManager from './managers/data-source-manager';
import FieldMapper from './mappers/field-mapper';
import { PREDEFINED_PROFILES } from './mappers/predefined-profiles';
import DefaultDataSourceRegistry from './registry/data-source-registry';
/**
 * Main integration service that coordinates data source management,
 * field mapping, and event processing for the SIEM platform
 */
export class IntegrationService extends EventEmitter {
    dataSourceManager;
    fieldMapper;
    outputDestinations = new Map();
    isRunning = false;
    startTime;
    eventCount = 0;
    errorCount = 0;
    constructor(config = {}) {
        super();
        // Initialize data source manager
        this.dataSourceManager = new DataSourceManager(config.dataSourceManager, new DefaultDataSourceRegistry());
        // Initialize field mapper
        this.fieldMapper = new FieldMapper();
        // Load predefined profiles if enabled
        if (config.enablePredefinedProfiles !== false) {
            this.loadPredefinedProfiles();
        }
        // Load custom profiles
        if (config.customProfiles) {
            config.customProfiles.forEach(profile => {
                this.fieldMapper.registerProfile(profile);
            });
        }
        // Configure output destinations
        if (config.outputDestinations) {
            config.outputDestinations.forEach(dest => {
                this.outputDestinations.set(dest.id, dest);
            });
        }
        this.setupEventHandlers();
    }
    /**
     * Start the integration service
     */
    async start() {
        if (this.isRunning) {
            return;
        }
        this.isRunning = true;
        this.startTime = new Date();
        this.emit('service:started');
    }
    /**
     * Stop the integration service
     */
    async stop() {
        if (!this.isRunning) {
            return;
        }
        await this.dataSourceManager.shutdown();
        this.isRunning = false;
        this.emit('service:stopped');
    }
    /**
     * Register a new data source
     */
    async registerDataSource(config) {
        try {
            await this.dataSourceManager.registerDataSource(config);
            this.emit('source:registered', { sourceId: config.id, config });
        }
        catch (error) {
            this.errorCount++;
            this.emit('source:registration_failed', { sourceId: config.id, error: error.message });
            throw error;
        }
    }
    /**
     * Unregister a data source
     */
    async unregisterDataSource(id) {
        try {
            await this.dataSourceManager.unregisterDataSource(id);
            this.emit('source:unregistered', { sourceId: id });
        }
        catch (error) {
            this.errorCount++;
            this.emit('source:unregistration_failed', { sourceId: id, error: error.message });
            throw error;
        }
    }
    /**
     * Start a specific data source
     */
    async startDataSource(id) {
        try {
            await this.dataSourceManager.startDataSource(id);
        }
        catch (error) {
            this.errorCount++;
            throw error;
        }
    }
    /**
     * Stop a specific data source
     */
    async stopDataSource(id) {
        try {
            await this.dataSourceManager.stopDataSource(id);
        }
        catch (error) {
            this.errorCount++;
            throw error;
        }
    }
    /**
     * Get data source health
     */
    getDataSourceHealth(id) {
        return this.dataSourceManager.getDataSourceHealth(id);
    }
    /**
     * Get data source metrics
     */
    getDataSourceMetrics(id) {
        return this.dataSourceManager.getDataSourceMetrics(id);
    }
    /**
     * Get list of all data sources
     */
    getDataSources() {
        return this.dataSourceManager.getAllDataSources().map(source => ({
            id: source.getId(),
            name: source.getName(),
            type: source.getType(),
            status: source.getStatus(),
            health: source.getHealth(),
            metrics: source.getMetrics()
        }));
    }
    /**
     * Get supported data source types
     */
    getSupportedTypes() {
        return this.dataSourceManager.getSupportedTypes();
    }
    /**
     * Get integration service statistics
     */
    getStats() {
        const aggregated = this.dataSourceManager.getAggregatedMetrics();
        const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;
        return {
            totalSources: aggregated.totalSources,
            activeSources: aggregated.activeSources,
            healthySources: aggregated.healthySources,
            totalEvents: this.eventCount,
            eventsPerSecond: aggregated.avgEventsPerSecond,
            totalErrors: this.errorCount,
            uptime: Math.floor(uptime / 1000) // uptime in seconds
        };
    }
    /**
     * Validate a data source configuration
     */
    async validateDataSourceConfig(config) {
        return this.dataSourceManager.validateConfig(config);
    }
    /**
     * Add an output destination
     */
    addOutputDestination(destination) {
        this.outputDestinations.set(destination.id, destination);
        this.emit('output:destination_added', { destinationId: destination.id });
    }
    /**
     * Remove an output destination
     */
    removeOutputDestination(id) {
        this.outputDestinations.delete(id);
        this.emit('output:destination_removed', { destinationId: id });
    }
    /**
     * Get available mapping profiles
     */
    getMappingProfiles() {
        return PREDEFINED_PROFILES.map(profile => ({
            id: profile.id,
            name: profile.name,
            sourceType: profile.sourceType,
            description: profile.description
        }));
    }
    /**
     * Test a data source connection
     */
    async testDataSourceConnection(config) {
        const startTime = Date.now();
        try {
            const validation = await this.validateDataSourceConfig(config);
            if (!validation.valid) {
                return {
                    success: false,
                    message: `Configuration validation failed: ${validation.errors.join(', ')}`
                };
            }
            // Create a temporary data source for testing
            const tempSource = this.dataSourceManager['createDataSource'](config);
            await tempSource.validateConfig();
            const latency = Date.now() - startTime;
            return {
                success: true,
                message: 'Connection test successful',
                latency
            };
        }
        catch (error) {
            return {
                success: false,
                message: `Connection test failed: ${error.message}`,
                latency: Date.now() - startTime
            };
        }
    }
    /**
     * Process raw log data through field mapping
     */
    async processLogData(rawData, sourceType, sourceInfo) {
        try {
            // Find appropriate mapping profile
            const profileId = this.findMappingProfile(sourceType, rawData);
            if (profileId) {
                return await this.fieldMapper.mapToLogEvent(rawData, profileId, sourceInfo);
            }
            else {
                // Fallback to basic mapping
                return this.createBasicLogEvent(rawData, sourceInfo);
            }
        }
        catch (error) {
            this.errorCount++;
            this.emit('processing:error', { error: error.message, rawData, sourceType });
            throw error;
        }
    }
    /**
     * Get service health status
     */
    getServiceHealth() {
        const stats = this.getStats();
        const errorRate = stats.totalEvents > 0 ? this.errorCount / stats.totalEvents : 0;
        let status;
        if (!this.isRunning) {
            status = 'unhealthy';
        }
        else if (errorRate > 0.1 || stats.activeSources < stats.totalSources * 0.5) {
            status = 'degraded';
        }
        else {
            status = 'healthy';
        }
        return {
            status,
            details: {
                running: this.isRunning,
                uptime: stats.uptime,
                errorRate,
                activeSources: stats.activeSources,
                totalSources: stats.totalSources,
                eventsPerSecond: stats.eventsPerSecond
            }
        };
    }
    setupEventHandlers() {
        // Handle data source events
        this.dataSourceManager.on('sourceEvent', (event) => {
            this.emit('source:event', event);
            if (event.type === 'error') {
                this.errorCount++;
            }
        });
        // Handle data source events for log processing
        this.dataSourceManager.on('events', async (events) => {
            try {
                for (const event of events) {
                    await this.processEvent(event);
                }
            }
            catch (error) {
                this.errorCount++;
                this.emit('processing:error', { error: error.message, events });
            }
        });
    }
    async processEvent(event) {
        this.eventCount++;
        // Emit the processed event
        this.emit('event:processed', event);
        // Send to output destinations
        await this.sendToOutputs(event);
    }
    async sendToOutputs(event) {
        const promises = Array.from(this.outputDestinations.values())
            .filter(dest => dest.enabled)
            .map(dest => this.sendToOutput(event, dest));
        await Promise.allSettled(promises);
    }
    async sendToOutput(event, destination) {
        try {
            switch (destination.type) {
                case 'kafka':
                    await this.sendToKafka(event, destination.config);
                    break;
                case 'opensearch':
                    await this.sendToOpenSearch(event, destination.config);
                    break;
                case 'file':
                    await this.sendToFile(event, destination.config);
                    break;
                case 'webhook':
                    await this.sendToWebhook(event, destination.config);
                    break;
                default:
                    // Custom output handler
                    this.emit('output:custom', { event, destination });
            }
        }
        catch (error) {
            this.errorCount++;
            this.emit('output:error', { destinationId: destination.id, error: error.message });
        }
    }
    async sendToKafka(event, config) {
        // Mock Kafka output implementation
        // In production, this would use the actual Kafka client
        this.logger.debug(`Sending event ${event.id} to Kafka topic: ${config.topic}`);
    }
    async sendToOpenSearch(event, config) {
        // Mock OpenSearch output implementation
        this.logger.debug(`Sending event ${event.id} to OpenSearch index: ${config.index}`);
    }
    async sendToFile(event, config) {
        // Mock file output implementation
        this.logger.debug(`Writing event ${event.id} to file: ${config.path}`);
    }
    async sendToWebhook(event, config) {
        // Mock webhook output implementation
        this.logger.debug(`Sending event ${event.id} to webhook: ${config.url}`);
    }
    loadPredefinedProfiles() {
        PREDEFINED_PROFILES.forEach(profile => {
            this.fieldMapper.registerProfile(profile);
        });
    }
    findMappingProfile(sourceType, rawData) {
        // Simple profile matching logic
        for (const profile of PREDEFINED_PROFILES) {
            if (profile.sourceType === sourceType) {
                return profile.id;
            }
        }
        // Fallback profile selection based on data structure
        if (rawData.eventId && rawData.computer) {
            return 'windows-event-log';
        }
        if (rawData.priority && rawData.facility) {
            return rawData.version ? 'syslog-rfc5424' : 'syslog-rfc3164';
        }
        if (rawData.eventName && rawData.eventSource) {
            return 'aws-cloudtrail';
        }
        return null;
    }
    createBasicLogEvent(rawData, sourceInfo) {
        return {
            id: rawData.id || `${sourceInfo.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: rawData.timestamp || new Date(),
            source: {
                type: sourceInfo.type,
                name: sourceInfo.name,
                version: sourceInfo.version || '1.0'
            },
            event: {
                id: rawData.eventId || rawData.event_id || 'unknown',
                category: 'system',
                type: 'info',
                severity: 4,
                action: 'unknown',
                outcome: 'unknown'
            },
            message: rawData.message || JSON.stringify(rawData),
            labels: {},
            metadata: {
                raw: rawData,
                parsed: rawData,
                enriched: {}
            }
        };
    }
}
export default IntegrationService;
//# sourceMappingURL=integration-service.js.map