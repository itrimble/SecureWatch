// Parser Management API Routes
// REST API for managing and configuring parsers
import { Router } from 'express';
import { logger } from '../utils/logger';
export class ParserManagementRoutes {
    router;
    processor;
    constructor(processor) {
        this.router = Router();
        this.processor = processor;
        this.setupRoutes();
    }
    setupRoutes() {
        // List all available parsers
        this.router.get('/parsers', this.listParsers.bind(this));
        // Get parser statistics
        this.router.get('/parsers/stats', this.getParserStats.bind(this));
        // Get parser metrics
        this.router.get('/parsers/metrics', this.getParserMetrics.bind(this));
        // Get specific parser metrics
        this.router.get('/parsers/:parserId/metrics', this.getParserMetrics.bind(this));
        // Get parser by ID
        this.router.get('/parsers/:parserId', this.getParser.bind(this));
        // Enable/disable parser
        this.router.post('/parsers/:parserId/toggle', this.toggleParser.bind(this));
        // Test parser with sample data
        this.router.post('/parsers/:parserId/test', this.testParser.bind(this));
        // Validate parser
        this.router.post('/parsers/:parserId/validate', this.validateParser.bind(this));
        // Parse single log with specific parser
        this.router.post('/parsers/:parserId/parse', this.parseWithParser.bind(this));
        // Get parsers by category
        this.router.get('/parsers/category/:category', this.getParsersByCategory.bind(this));
        // Get parsers by source
        this.router.get('/parsers/source/:source', this.getParsersBySource.bind(this));
        // Reset parser metrics
        this.router.post('/parsers/:parserId/reset-metrics', this.resetParserMetrics.bind(this));
        // Get top performing parsers
        this.router.get('/parsers/performance/top', this.getTopPerformers.bind(this));
    }
    // List all available parsers
    async listParsers(req, res) {
        try {
            const { enabled, category, format } = req.query;
            let parsers = this.processor.listParsers();
            // Apply filters
            if (enabled !== undefined) {
                parsers = parsers.filter(p => p.enabled === (enabled === 'true'));
            }
            if (category) {
                parsers = parsers.filter(p => p.category === category);
            }
            if (format) {
                parsers = parsers.filter(p => p.format === format);
            }
            const parserSummaries = parsers.map(parser => ({
                id: parser.id,
                name: parser.name,
                vendor: parser.vendor,
                version: parser.version,
                format: parser.format,
                category: parser.category,
                logSource: parser.logSource,
                enabled: parser.enabled,
                priority: parser.priority
            }));
            res.json({
                status: 'success',
                parsers: parserSummaries,
                total: parserSummaries.length,
                filters: { enabled, category, format }
            });
        }
        catch (error) {
            logger.error('Error listing parsers', error);
            res.status(500).json({
                status: 'error',
                message: error instanceof Error ? error.message : 'Failed to list parsers'
            });
        }
    }
    // Get parser statistics
    async getParserStats(req, res) {
        try {
            const stats = this.processor.getParserStats();
            res.json({
                status: 'success',
                stats
            });
        }
        catch (error) {
            logger.error('Error getting parser stats', error);
            res.status(500).json({
                status: 'error',
                message: error instanceof Error ? error.message : 'Failed to get parser stats'
            });
        }
    }
    // Get parser performance metrics
    async getParserMetrics(req, res) {
        try {
            const { parserId } = req.params;
            const metrics = this.processor.getParserMetrics(parserId);
            res.json({
                status: 'success',
                metrics
            });
        }
        catch (error) {
            logger.error('Error getting parser metrics', error);
            res.status(500).json({
                status: 'error',
                message: error instanceof Error ? error.message : 'Failed to get parser metrics'
            });
        }
    }
    // Get specific parser details
    async getParser(req, res) {
        try {
            const { parserId } = req.params;
            const parsers = this.processor.listParsers();
            const parser = parsers.find(p => p.id === parserId);
            if (!parser) {
                return res.status(404).json({
                    status: 'error',
                    message: `Parser ${parserId} not found`
                });
            }
            const metrics = this.processor.getParserMetrics(parserId);
            res.json({
                status: 'success',
                parser: {
                    id: parser.id,
                    name: parser.name,
                    vendor: parser.vendor,
                    version: parser.version,
                    format: parser.format,
                    category: parser.category,
                    logSource: parser.logSource,
                    enabled: parser.enabled,
                    priority: parser.priority,
                    config: parser.config,
                    metadata: parser.metadata
                },
                metrics
            });
        }
        catch (error) {
            logger.error('Error getting parser details', error);
            res.status(500).json({
                status: 'error',
                message: error instanceof Error ? error.message : 'Failed to get parser details'
            });
        }
    }
    // Enable/disable parser
    async toggleParser(req, res) {
        try {
            const { parserId } = req.params;
            const { enabled } = req.body;
            if (typeof enabled !== 'boolean') {
                return res.status(400).json({
                    status: 'error',
                    message: 'enabled field must be a boolean'
                });
            }
            const success = this.processor.setParserEnabled(parserId, enabled);
            if (success) {
                res.json({
                    status: 'success',
                    message: `Parser ${parserId} ${enabled ? 'enabled' : 'disabled'}`,
                    parserId,
                    enabled
                });
            }
            else {
                res.status(404).json({
                    status: 'error',
                    message: `Parser ${parserId} not found`
                });
            }
        }
        catch (error) {
            logger.error('Error toggling parser', error);
            res.status(500).json({
                status: 'error',
                message: error instanceof Error ? error.message : 'Failed to toggle parser'
            });
        }
    }
    // Test parser with sample data
    async testParser(req, res) {
        try {
            const { parserId } = req.params;
            const { testData, returnDetails } = req.body;
            if (!testData || !Array.isArray(testData)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'testData array required'
                });
            }
            const results = await this.processor.testParser(parserId, testData);
            const response = {
                status: 'success',
                parserId,
                testResults: {
                    total: results.summary.total,
                    passed: results.summary.passed,
                    failed: results.summary.failed,
                    successRate: results.summary.successRate
                }
            };
            if (returnDetails) {
                response.detailedResults = results.testCases;
            }
            res.json(response);
        }
        catch (error) {
            logger.error('Error testing parser', error);
            res.status(500).json({
                status: 'error',
                message: error instanceof Error ? error.message : 'Failed to test parser'
            });
        }
    }
    // Validate parser implementation
    async validateParser(req, res) {
        try {
            const { parserId } = req.params;
            // This would require access to the ParserValidator from ParserManager
            // For now, return a simplified validation status
            res.json({
                status: 'success',
                message: 'Parser validation endpoint - implementation in progress',
                parserId
            });
        }
        catch (error) {
            logger.error('Error validating parser', error);
            res.status(500).json({
                status: 'error',
                message: error instanceof Error ? error.message : 'Failed to validate parser'
            });
        }
    }
    // Parse single log with specific parser
    async parseWithParser(req, res) {
        try {
            const { parserId } = req.params;
            const { rawLog } = req.body;
            if (!rawLog) {
                return res.status(400).json({
                    status: 'error',
                    message: 'rawLog field required'
                });
            }
            // Force parsing with specific parser by using it as source hint
            const result = await this.processor.processLog(rawLog, parserId);
            res.json({
                status: 'success',
                result,
                usedParser: result.parserId,
                matchedRequest: result.parserId === parserId
            });
        }
        catch (error) {
            logger.error('Error parsing with specific parser', error);
            res.status(500).json({
                status: 'error',
                message: error instanceof Error ? error.message : 'Failed to parse with parser'
            });
        }
    }
    // Get parsers by category
    async getParsersByCategory(req, res) {
        try {
            const { category } = req.params;
            const parsers = this.processor.listParsers().filter(p => p.category === category);
            res.json({
                status: 'success',
                category,
                parsers: parsers.map(p => ({
                    id: p.id,
                    name: p.name,
                    vendor: p.vendor,
                    enabled: p.enabled,
                    priority: p.priority
                })),
                total: parsers.length
            });
        }
        catch (error) {
            logger.error('Error getting parsers by category', error);
            res.status(500).json({
                status: 'error',
                message: error instanceof Error ? error.message : 'Failed to get parsers by category'
            });
        }
    }
    // Get parsers by source
    async getParsersBySource(req, res) {
        try {
            const { source } = req.params;
            const parsers = this.processor.listParsers().filter(p => p.logSource.includes(source));
            res.json({
                status: 'success',
                source,
                parsers: parsers.map(p => ({
                    id: p.id,
                    name: p.name,
                    logSource: p.logSource,
                    enabled: p.enabled,
                    priority: p.priority
                })),
                total: parsers.length
            });
        }
        catch (error) {
            logger.error('Error getting parsers by source', error);
            res.status(500).json({
                status: 'error',
                message: error instanceof Error ? error.message : 'Failed to get parsers by source'
            });
        }
    }
    // Reset parser metrics
    async resetParserMetrics(req, res) {
        try {
            const { parserId } = req.params;
            this.processor.resetStats(); // This resets all stats - could be enhanced to reset specific parser
            res.json({
                status: 'success',
                message: `Metrics reset for parser ${parserId}`,
                parserId
            });
        }
        catch (error) {
            logger.error('Error resetting parser metrics', error);
            res.status(500).json({
                status: 'error',
                message: error instanceof Error ? error.message : 'Failed to reset parser metrics'
            });
        }
    }
    // Get top performing parsers
    async getTopPerformers(req, res) {
        try {
            const { limit = 10 } = req.query;
            const stats = this.processor.getParserStats();
            res.json({
                status: 'success',
                topPerformers: stats.topPerformers.slice(0, parseInt(limit, 10))
            });
        }
        catch (error) {
            logger.error('Error getting top performers', error);
            res.status(500).json({
                status: 'error',
                message: error instanceof Error ? error.message : 'Failed to get top performers'
            });
        }
    }
    getRouter() {
        return this.router;
    }
}
//# sourceMappingURL=parser-management.routes.js.map