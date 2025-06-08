import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as csvParser from 'csv-parser';
import * as fastCsv from 'fast-csv';
import { LogSource } from '../types/log-event.types';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
export class CSVAdapter extends EventEmitter {
    config;
    producerPool;
    bufferManager;
    metrics;
    isRunning = false;
    watchInterval;
    processedFiles = new Map();
    constructor(config, producerPool, bufferManager, metrics) {
        super();
        this.config = {
            delimiter: ',',
            quoteChar: '"',
            escapeChar: '"',
            hasHeaders: true,
            skipEmptyLines: true,
            encoding: 'utf8',
            maxFileSize: 100 * 1024 * 1024, // 100MB default
            fileExtensions: ['.csv', '.tsv', '.txt'],
            ...config,
        };
        this.producerPool = producerPool;
        this.bufferManager = bufferManager;
        this.metrics = metrics;
    }
    async start() {
        if (this.isRunning) {
            logger.warn('CSV adapter is already running');
            return;
        }
        this.isRunning = true;
        logger.info('Starting CSV adapter', this.config);
        // Start file watching if directory is configured
        if (this.config.watchDirectory) {
            await this.startFileWatching();
        }
        this.emit('started');
    }
    async stop() {
        if (!this.isRunning) {
            return;
        }
        this.isRunning = false;
        logger.info('Stopping CSV adapter');
        // Stop file watching
        if (this.watchInterval) {
            clearInterval(this.watchInterval);
        }
        // Flush remaining events
        await this.bufferManager.flush();
        this.emit('stopped');
    }
    /**
     * Process a single CSV file
     */
    async processFile(filePath, options = {}) {
        const mergedConfig = { ...this.config, ...options };
        const errors = [];
        let rowsProcessed = 0;
        try {
            // Check file existence and size
            const stats = await fs.promises.stat(filePath);
            if (stats.size > (mergedConfig.maxFileSize || 100 * 1024 * 1024)) {
                throw new Error(`File size ${stats.size} exceeds maximum allowed size ${mergedConfig.maxFileSize}`);
            }
            logger.info(`Processing CSV file: ${filePath}`, {
                size: stats.size,
                lastModified: stats.mtime,
            });
            // Process the CSV file
            const rows = await this.parseCSVFile(filePath, mergedConfig);
            // Convert rows to log events
            const events = [];
            for (const [index, row] of rows.entries()) {
                try {
                    const event = this.createLogEvent(row, filePath, index, mergedConfig);
                    events.push(event);
                    rowsProcessed++;
                    // Process in batches
                    if (events.length >= mergedConfig.batchSize) {
                        await this.processBatch(events);
                        events.length = 0; // Clear the array
                    }
                }
                catch (error) {
                    const errorMsg = `Error processing row ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                    errors.push(errorMsg);
                    logger.warn(errorMsg, { row });
                }
            }
            // Process remaining events
            if (events.length > 0) {
                await this.processBatch(events);
            }
            // Update file tracking
            this.processedFiles.set(filePath, {
                filePath,
                size: stats.size,
                lastModified: stats.mtime,
                processed: true,
                rowCount: rowsProcessed,
                errors: errors.length > 0 ? errors : undefined,
            });
            this.metrics.incrementCounter('csv.files_processed');
            this.metrics.incrementCounter('csv.rows_processed', {}, rowsProcessed);
            logger.info(`Successfully processed CSV file: ${filePath}`, {
                rowsProcessed,
                errors: errors.length,
            });
            return {
                success: true,
                rowsProcessed,
                errors,
            };
        }
        catch (error) {
            const errorMsg = `Failed to process CSV file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            errors.push(errorMsg);
            logger.error(errorMsg, error);
            this.metrics.incrementCounter('csv.file_errors');
            return {
                success: false,
                rowsProcessed,
                errors,
            };
        }
    }
    /**
     * Process CSV data from a string
     */
    async processCSVString(csvData, source = 'string', options = {}) {
        const mergedConfig = { ...this.config, ...options };
        const errors = [];
        let rowsProcessed = 0;
        try {
            const rows = await this.parseCSVString(csvData, mergedConfig);
            const events = [];
            for (const [index, row] of rows.entries()) {
                try {
                    const event = this.createLogEvent(row, source, index, mergedConfig);
                    events.push(event);
                    rowsProcessed++;
                    if (events.length >= mergedConfig.batchSize) {
                        await this.processBatch(events);
                        events.length = 0;
                    }
                }
                catch (error) {
                    const errorMsg = `Error processing row ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                    errors.push(errorMsg);
                }
            }
            if (events.length > 0) {
                await this.processBatch(events);
            }
            this.metrics.incrementCounter('csv.strings_processed');
            this.metrics.incrementCounter('csv.rows_processed', {}, rowsProcessed);
            return {
                success: true,
                rowsProcessed,
                errors,
            };
        }
        catch (error) {
            const errorMsg = `Failed to process CSV string: ${error instanceof Error ? error.message : 'Unknown error'}`;
            errors.push(errorMsg);
            logger.error(errorMsg, error);
            return {
                success: false,
                rowsProcessed,
                errors,
            };
        }
    }
    /**
     * Start file watching for automatic CSV processing
     */
    async startFileWatching() {
        if (!this.config.watchDirectory) {
            return;
        }
        const watchDir = this.config.watchDirectory;
        // Check if directory exists
        try {
            await fs.promises.access(watchDir);
        }
        catch {
            logger.warn(`Watch directory does not exist: ${watchDir}`);
            return;
        }
        logger.info(`Starting file watching on directory: ${watchDir}`);
        // Initial scan
        await this.scanDirectory();
        // Set up periodic scanning
        this.watchInterval = setInterval(() => {
            if (this.isRunning) {
                this.scanDirectory().catch(error => {
                    logger.error('Error during directory scan', error);
                });
            }
        }, this.config.flushInterval);
    }
    /**
     * Scan directory for new CSV files
     */
    async scanDirectory() {
        if (!this.config.watchDirectory) {
            return;
        }
        try {
            const files = await fs.promises.readdir(this.config.watchDirectory);
            for (const file of files) {
                const filePath = path.join(this.config.watchDirectory, file);
                const ext = path.extname(file).toLowerCase();
                // Check if file has valid extension
                if (!this.config.fileExtensions?.includes(ext)) {
                    continue;
                }
                try {
                    const stats = await fs.promises.stat(filePath);
                    // Skip directories
                    if (stats.isDirectory()) {
                        continue;
                    }
                    // Check if file has been processed or modified
                    const existingInfo = this.processedFiles.get(filePath);
                    if (existingInfo && existingInfo.processed &&
                        existingInfo.lastModified.getTime() === stats.mtime.getTime()) {
                        continue;
                    }
                    // Process the file
                    logger.debug(`Found new/modified CSV file: ${filePath}`);
                    await this.processFile(filePath);
                }
                catch (error) {
                    logger.warn(`Error processing file ${filePath}`, error);
                }
            }
        }
        catch (error) {
            logger.error(`Error scanning directory ${this.config.watchDirectory}`, error);
        }
    }
    /**
     * Parse CSV file and return rows
     */
    async parseCSVFile(filePath, config) {
        return new Promise((resolve, reject) => {
            const rows = [];
            const parseOptions = {
                separator: config.delimiter,
                quote: config.quoteChar,
                escape: config.escapeChar,
                headers: config.hasHeaders,
                skipEmptyLines: config.skipEmptyLines,
            };
            fs.createReadStream(filePath, { encoding: config.encoding })
                .pipe(csvParser(parseOptions))
                .on('data', (row) => {
                rows.push(row);
            })
                .on('end', () => {
                resolve(rows);
            })
                .on('error', (error) => {
                reject(error);
            });
        });
    }
    /**
     * Parse CSV string and return rows
     */
    async parseCSVString(csvData, config) {
        return new Promise((resolve, reject) => {
            const rows = [];
            fastCsv
                .parseString(csvData, {
                delimiter: config.delimiter,
                quote: config.quoteChar,
                escape: config.escapeChar,
                headers: config.hasHeaders,
                skipEmptyLines: config.skipEmptyLines,
            })
                .on('data', (row) => {
                rows.push(row);
            })
                .on('end', () => {
                resolve(rows);
            })
                .on('error', (error) => {
                reject(error);
            });
        });
    }
    /**
     * Create a log event from a CSV row
     */
    createLogEvent(row, source, index, config) {
        // Extract timestamp if configured
        let timestamp = new Date();
        if (config.timestampField && row[config.timestampField]) {
            try {
                timestamp = config.timestampFormat
                    ? this.parseCustomTimestamp(row[config.timestampField], config.timestampFormat)
                    : new Date(row[config.timestampField]);
            }
            catch (error) {
                logger.warn(`Failed to parse timestamp from field ${config.timestampField}`, {
                    value: row[config.timestampField],
                    error,
                });
            }
        }
        // Create normalized field names
        const normalizedRow = {};
        for (const [key, value] of Object.entries(row)) {
            const normalizedKey = key.toLowerCase().replace(/[^a-z0-9_]/g, '_');
            normalizedRow[normalizedKey] = value;
        }
        return {
            id: uuidv4(),
            source: LogSource.CSV,
            timestamp,
            rawData: JSON.stringify(row),
            metadata: {
                ingestionId: uuidv4(),
                ingestionTime: new Date(),
                collector: 'csv-adapter',
                collectorVersion: '1.0.0',
                organizationId: process.env.ORGANIZATION_ID || 'default',
                environment: process.env.ENVIRONMENT || 'production',
                retention: {
                    tier: 'hot',
                    days: 7,
                    compressed: false,
                    encrypted: false,
                },
                csv: {
                    source,
                    rowIndex: index,
                    fieldCount: Object.keys(row).length,
                    hasHeaders: config.hasHeaders,
                    delimiter: config.delimiter,
                },
            },
            receivedAt: new Date(),
            fields: normalizedRow,
        };
    }
    /**
     * Parse custom timestamp format
     */
    parseCustomTimestamp(value, format) {
        // Simple timestamp parsing - in production, consider using moment.js or date-fns
        const commonFormats = {
            'YYYY-MM-DD HH:mm:ss': /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/,
            'MM/DD/YYYY HH:mm:ss': /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/,
            'DD-MM-YYYY HH:mm:ss': /^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2})$/,
            'YYYY-MM-DD': /^(\d{4})-(\d{2})-(\d{2})$/,
            'MM/DD/YYYY': /^(\d{2})\/(\d{2})\/(\d{4})$/,
        };
        const pattern = commonFormats[format];
        if (pattern) {
            const match = value.match(pattern);
            if (match) {
                // Parse based on format
                if (format.includes('YYYY-MM-DD')) {
                    const [, year, month, day, hour = '0', minute = '0', second = '0'] = match;
                    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
                }
                else if (format.includes('MM/DD/YYYY')) {
                    const [, month, day, year, hour = '0', minute = '0', second = '0'] = match;
                    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
                }
                else if (format.includes('DD-MM-YYYY')) {
                    const [, day, month, year, hour = '0', minute = '0', second = '0'] = match;
                    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
                }
            }
        }
        // Fallback to standard Date parsing
        return new Date(value);
    }
    /**
     * Process a batch of events
     */
    async processBatch(events) {
        try {
            // Add to buffer
            await this.bufferManager.addEvents(events);
            // Send to Kafka
            await this.sendToKafka(events);
            logger.debug(`Processed batch of ${events.length} CSV events`);
        }
        catch (error) {
            logger.error('Error processing CSV batch', error);
            this.metrics.incrementCounter('csv.batch_errors');
            throw error;
        }
    }
    /**
     * Send events to Kafka
     */
    async sendToKafka(events) {
        try {
            const messages = events.map(event => ({
                key: event.metadata.organizationId,
                value: JSON.stringify(event),
                timestamp: event.timestamp.toISOString(),
                headers: {
                    source: 'csv',
                    ingestionId: event.metadata.ingestionId,
                },
            }));
            await this.producerPool.sendBatch('log-events-raw', messages);
            this.metrics.incrementCounter('csv.events_sent', {}, events.length);
        }
        catch (error) {
            logger.error('Error sending CSV events to Kafka', error);
            this.metrics.incrementCounter('csv.kafka_errors');
            // Re-queue events for retry
            await this.bufferManager.requeueEvents(events);
            throw error;
        }
    }
    /**
     * Get adapter statistics
     */
    getStats() {
        return {
            isRunning: this.isRunning,
            watchDirectory: this.config.watchDirectory,
            processedFiles: this.processedFiles.size,
            fileDetails: Array.from(this.processedFiles.values()),
            bufferSize: this.bufferManager.getSize(),
            metrics: this.metrics.getMetrics(),
        };
    }
    /**
     * Get list of processed files
     */
    getProcessedFiles() {
        return Array.from(this.processedFiles.values());
    }
    /**
     * Reset processed files tracking
     */
    resetProcessedFiles() {
        this.processedFiles.clear();
        logger.info('Reset processed files tracking');
    }
}
export default CSVAdapter;
//# sourceMappingURL=csv.adapter.js.map