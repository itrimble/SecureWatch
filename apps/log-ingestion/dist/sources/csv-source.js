import { DataSource } from '../types/data-source.types';
import { CSVAdapter } from '../adapters/csv.adapter';
import { KafkaProducerPool } from '../utils/kafka-producer-pool';
import { BufferManager } from '../buffers/buffer-manager';
import { MetricsCollector } from '../monitoring/metrics-collector';
export class CSVSource extends DataSource {
    csvAdapter;
    csvConfig;
    producerPool;
    bufferManager;
    metricsCollector;
    constructor(config) {
        super(config);
        this.csvConfig = this.parseCSVConfig(config.collection.config);
    }
    async start() {
        if (this.status === 'active') {
            return;
        }
        try {
            await this.validateConfig();
            // Initialize dependencies
            this.producerPool = new KafkaProducerPool({
                brokers: this.csvConfig.kafkaConfig?.brokers || ['localhost:9092'],
                clientId: `csv-source-${this.id}`,
                maxPoolSize: 5,
            });
            this.bufferManager = new BufferManager({
                maxSize: this.csvConfig.bufferConfig?.maxSize || 10000,
                flushInterval: this.csvConfig.bufferConfig?.flushInterval || 5000,
                persistPath: `/tmp/csv-buffer-${this.id}`,
            });
            this.metricsCollector = new MetricsCollector({
                prefix: 'csv_source',
                labels: { source_id: this.id, source_name: this.name },
            });
            // Initialize CSV adapter
            this.csvAdapter = new CSVAdapter(this.csvConfig, this.producerPool, this.bufferManager, this.metricsCollector);
            // Start the adapter
            await this.csvAdapter.start();
            this.setStatus('active');
            this.addHealthIssue('info', 'CSV source started successfully');
        }
        catch (error) {
            this.setStatus('error');
            this.addHealthIssue('error', `Failed to start CSV source: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    }
    async stop() {
        if (this.status === 'inactive') {
            return;
        }
        try {
            if (this.csvAdapter) {
                await this.csvAdapter.stop();
            }
            if (this.producerPool) {
                await this.producerPool.close();
            }
            if (this.bufferManager) {
                await this.bufferManager.close();
            }
            this.setStatus('inactive');
        }
        catch (error) {
            this.addHealthIssue('error', `Error stopping CSV source: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    }
    async restart() {
        await this.stop();
        await this.start();
    }
    async collect() {
        // CSV source is file-based, events are collected through file processing
        return [];
    }
    async validateConfig() {
        const config = this.csvConfig;
        // Validate basic configuration
        if (!config.batchSize || config.batchSize < 1) {
            throw new Error('Invalid batch size');
        }
        if (!config.flushInterval || config.flushInterval < 100) {
            throw new Error('Invalid flush interval');
        }
        // Validate file extensions if specified
        if (config.fileExtensions && !Array.isArray(config.fileExtensions)) {
            throw new Error('File extensions must be an array');
        }
        // Validate watch directory if specified
        if (config.watchDirectory) {
            // In production, check if directory exists and is accessible
            // For now, just validate it's a non-empty string
            if (typeof config.watchDirectory !== 'string' || !config.watchDirectory.trim()) {
                throw new Error('Invalid watch directory');
            }
        }
        return true;
    }
    /**
     * Process a CSV file directly
     */
    async processFile(filePath, options) {
        if (!this.csvAdapter) {
            throw new Error('CSV adapter not initialized');
        }
        return this.csvAdapter.processFile(filePath, options);
    }
    /**
     * Process CSV data from a string
     */
    async processCSVString(csvData, source, options) {
        if (!this.csvAdapter) {
            throw new Error('CSV adapter not initialized');
        }
        return this.csvAdapter.processCSVString(csvData, source, options);
    }
    getStats() {
        const baseStats = super.getStats();
        const adapterStats = this.csvAdapter?.getStats() || {};
        return {
            ...baseStats,
            csv: adapterStats,
        };
    }
    parseCSVConfig(config) {
        const defaultConfig = {
            batchSize: 100,
            flushInterval: 5000,
            delimiter: ',',
            quoteChar: '"',
            escapeChar: '"',
            hasHeaders: true,
            skipEmptyLines: true,
            encoding: 'utf8',
            maxFileSize: 100 * 1024 * 1024, // 100MB
            fileExtensions: ['.csv', '.tsv', '.txt'],
        };
        return {
            ...defaultConfig,
            ...config,
        };
    }
}
export default CSVSource;
//# sourceMappingURL=csv-source.js.map