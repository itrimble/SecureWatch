// Enhanced Log Processor with Parser Framework Integration
// Integrates the new parser framework with the existing log ingestion pipeline
import { ParserManager } from '../parsers/ParserManager';
import { logger } from '../utils/logger';
export class EnhancedLogProcessor {
    parserManager;
    dbService;
    kafkaProducer;
    processingStats;
    isInitialized = false;
    constructor(dbService, kafkaProducer) {
        this.parserManager = new ParserManager();
        this.dbService = dbService;
        this.kafkaProducer = kafkaProducer;
        this.processingStats = this.initializeStats();
    }
    // Initialize the enhanced processor
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        try {
            logger.info('Initializing enhanced log processor...');
            // Initialize parser framework
            await this.parserManager.initialize();
            this.isInitialized = true;
            logger.info('Enhanced log processor initialized successfully');
        }
        catch (error) {
            logger.error('Failed to initialize enhanced log processor:', error);
            throw error;
        }
    }
    // Process a single log entry with the new parser framework
    async processLog(rawLog, sourceHint, categoryHint) {
        const startTime = Date.now();
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }
            // Parse log using the parser framework
            const normalizedEvent = await this.parserManager.parseLog(rawLog, sourceHint, categoryHint);
            if (!normalizedEvent) {
                this.updateStats(false, 0, 'no_parser_match');
                return {
                    success: false,
                    error: 'No parser could process this log',
                    processingTime: Date.now() - startTime
                };
            }
            // Store in database
            const eventId = await this.storeEvent(normalizedEvent);
            // Send to Kafka if configured
            if (this.kafkaProducer) {
                await this.sendToKafka(normalizedEvent);
            }
            const processingTime = Date.now() - startTime;
            const confidence = normalizedEvent['securewatch.confidence'];
            const parserId = normalizedEvent['securewatch.parser.id'];
            this.updateStats(true, processingTime, parserId, confidence);
            return {
                success: true,
                eventId,
                parserId,
                confidence,
                processingTime
            };
        }
        catch (error) {
            const processingTime = Date.now() - startTime;
            this.updateStats(false, processingTime, 'error');
            logger.error('Log processing failed:', error);
            return {
                success: false,
                error: error.message,
                processingTime
            };
        }
    }
    // Process multiple logs in batch
    async processLogsBatch(logs, batchSize = 100) {
        const results = [];
        // Process in batches to avoid memory issues
        for (let i = 0; i < logs.length; i += batchSize) {
            const batch = logs.slice(i, i + batchSize);
            const batchPromises = batch.map(logData => this.processLog(logData.rawLog, logData.sourceHint, logData.categoryHint));
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            // Log batch progress
            if (logs.length > batchSize) {
                logger.info(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(logs.length / batchSize)}`);
            }
        }
        return results;
    }
    // Process logs from different adapters
    async processFromAdapter(rawLog, adapterType, metadata) {
        // Map adapter types to categories for better parser selection
        const categoryMap = {
            'syslog': 'network',
            'csv': 'application',
            'xml': 'endpoint',
            'json': 'application',
            'evtx': 'endpoint'
        };
        const sourceHint = metadata?.source || adapterType;
        const categoryHint = categoryMap[adapterType];
        return this.processLog(rawLog, sourceHint, categoryHint);
    }
    // Get parser framework statistics
    getParserStats() {
        return this.parserManager.getParserStats();
    }
    // Get processing statistics
    getProcessingStats() {
        return { ...this.processingStats };
    }
    // Reset processing statistics
    resetStats() {
        this.processingStats = this.initializeStats();
        this.parserManager.resetMetrics();
    }
    // Get parser performance metrics
    getParserMetrics(parserId) {
        return this.parserManager.getParserMetrics(parserId);
    }
    // Test parser with sample data
    async testParser(parserId, testData) {
        return this.parserManager.testParser(parserId, testData);
    }
    // List available parsers
    listParsers() {
        return this.parserManager.listParsers();
    }
    // Enable/disable parser
    setParserEnabled(parserId, enabled) {
        return this.parserManager.setParserEnabled(parserId, enabled);
    }
    // Get health status
    getHealthStatus() {
        const parserStats = this.parserManager.getParserStats();
        return {
            initialized: this.isInitialized,
            parsersLoaded: parserStats.totalParsers,
            activeParsers: parserStats.activeParsers,
            processingStats: this.getProcessingStats()
        };
    }
    // Shutdown the processor
    async shutdown() {
        try {
            await this.parserManager.shutdown();
            this.isInitialized = false;
            logger.info('Enhanced log processor shutdown complete');
        }
        catch (error) {
            logger.error('Error during shutdown:', error);
        }
    }
    // Private helper methods
    async storeEvent(event) {
        try {
            // Transform normalized event to database format
            const dbRecord = this.transformForDatabase(event);
            // Insert into TimescaleDB
            const result = await this.dbService.insertLogEntry(dbRecord);
            return result.id || 'unknown';
        }
        catch (error) {
            logger.error('Failed to store event in database:', error);
            throw error;
        }
    }
    async sendToKafka(event) {
        if (!this.kafkaProducer)
            return;
        try {
            await this.kafkaProducer.send({
                topic: 'processed-logs',
                messages: [{
                        key: event['securewatch.parser.id'],
                        value: JSON.stringify(event),
                        headers: {
                            'parser_id': event['securewatch.parser.id'],
                            'confidence': String(event['securewatch.confidence']),
                            'severity': event['securewatch.severity']
                        }
                    }]
            });
        }
        catch (error) {
            logger.warn('Failed to send event to Kafka:', error);
            // Don't fail the entire processing for Kafka errors
        }
    }
    transformForDatabase(event) {
        // Transform ECS normalized event to our database schema
        return {
            timestamp: event['@timestamp'],
            event_id: this.generateEventId(),
            source: event['host.name'] || event['source.ip'] || 'unknown',
            category: Array.isArray(event['event.category']) ? event['event.category'][0] : event['event.category'],
            action: Array.isArray(event['event.type']) ? event['event.type'][0] : event['event.type'],
            outcome: event['event.outcome'],
            severity: event['securewatch.severity'],
            confidence: event['securewatch.confidence'],
            // User fields
            user_name: event['user.name'],
            user_domain: event['user.domain'],
            user_id: event['user.id'],
            // Host fields
            host_name: event['host.name'],
            host_ip: Array.isArray(event['host.ip']) ? event['host.ip'][0] : event['host.ip'],
            host_os: event['host.os.name'],
            // Network fields
            source_ip: event['source.ip'],
            source_port: event['source.port'],
            destination_ip: event['destination.ip'],
            destination_port: event['destination.port'],
            network_protocol: event['network.protocol'],
            // Process fields
            process_name: event['process.name'],
            process_pid: event['process.pid'],
            process_command_line: event['process.command_line'],
            process_hash: event['process.hash.sha256'] || event['process.hash.sha1'] || event['process.hash.md5'],
            // File fields
            file_name: event['file.name'],
            file_path: event['file.path'],
            file_hash: event['file.hash.sha256'] || event['file.hash.sha1'] || event['file.hash.md5'],
            // HTTP fields
            http_method: event['http.request.method'],
            http_status_code: event['http.response.status_code'],
            url_full: event['url.full'],
            user_agent: event['user_agent.original'],
            // MITRE ATT&CK fields
            mitre_technique: Array.isArray(event['threat.technique.id']) ? event['threat.technique.id'] : [event['threat.technique.id']].filter(Boolean),
            mitre_tactic: Array.isArray(event['threat.tactic.id']) ? event['threat.tactic.id'] : [event['threat.tactic.id']].filter(Boolean),
            // Parser metadata
            parser_id: event['securewatch.parser.id'],
            parser_version: event['securewatch.parser.version'],
            // Raw data and additional fields
            raw_data: event['message'] || JSON.stringify(event),
            enrichment_data: event['securewatch.enrichment'] ? JSON.stringify(event['securewatch.enrichment']) : null,
            tags: event['tags'] || event['securewatch.tags'],
            // Additional custom fields as JSON
            custom_fields: this.extractCustomFields(event)
        };
    }
    extractCustomFields(event) {
        const customFields = {};
        // Extract fields that don't map to standard schema
        Object.entries(event).forEach(([key, value]) => {
            if (key.startsWith('custom.') ||
                key.startsWith('labels.') ||
                (key.includes('.') && !this.isStandardField(key))) {
                customFields[key] = value;
            }
        });
        return Object.keys(customFields).length > 0 ? JSON.stringify(customFields) : null;
    }
    isStandardField(field) {
        const standardFields = [
            '@timestamp', 'event.', 'host.', 'user.', 'source.', 'destination.',
            'network.', 'process.', 'file.', 'http.', 'url.', 'threat.',
            'securewatch.', 'user_agent.', 'registry.', 'dns.'
        ];
        return standardFields.some(prefix => field.startsWith(prefix));
    }
    generateEventId() {
        return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    updateStats(success, processingTime, parserId, confidence) {
        this.processingStats.totalProcessed++;
        if (success) {
            this.processingStats.successful++;
        }
        else {
            this.processingStats.failed++;
        }
        // Update average processing time
        const totalTime = this.processingStats.averageProcessingTime * (this.processingStats.totalProcessed - 1) + processingTime;
        this.processingStats.averageProcessingTime = totalTime / this.processingStats.totalProcessed;
        // Update parser-specific stats
        if (parserId && success) {
            if (!this.processingStats.parserStats[parserId]) {
                this.processingStats.parserStats[parserId] = {
                    count: 0,
                    successRate: 0,
                    averageConfidence: 0
                };
            }
            const parserStat = this.processingStats.parserStats[parserId];
            parserStat.count++;
            // Update confidence
            if (confidence !== undefined) {
                const totalConfidence = parserStat.averageConfidence * (parserStat.count - 1) + confidence;
                parserStat.averageConfidence = totalConfidence / parserStat.count;
            }
            // Success rate is always 100% here since we only update on success
            parserStat.successRate = 100;
        }
    }
    initializeStats() {
        return {
            totalProcessed: 0,
            successful: 0,
            failed: 0,
            averageProcessingTime: 0,
            parserStats: {}
        };
    }
}
//# sourceMappingURL=enhanced-log-processor.js.map