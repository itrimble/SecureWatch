"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationMiddleware = void 0;
const express_validator_1 = require("express-validator");
const joi_1 = __importDefault(require("joi"));
const logger_1 = __importDefault(require("../utils/logger"));
class ValidationMiddleware {
    constructor(maxEventSize = 1048576, maxBatchSize = 104857600, maxEventsPerBatch = 1000) {
        this.hecEventSchema = joi_1.default.object({
            time: joi_1.default.alternatives().try(joi_1.default.number().integer().min(0), joi_1.default.string().isoDate(), joi_1.default.string().regex(/^\d{10}$|^\d{13}$/)).optional(),
            host: joi_1.default.string().max(255).optional(),
            source: joi_1.default.string().max(255).optional(),
            sourcetype: joi_1.default.string().max(255).optional(),
            index: joi_1.default.string().max(255).optional(),
            event: joi_1.default.any().required(),
            fields: joi_1.default.object().optional()
        });
        this.checkRequestSize = (req, res, next) => {
            const contentLength = parseInt(req.headers['content-length'] || '0');
            if (contentLength > this.maxBatchSize) {
                logger_1.default.warn('Request size exceeds limit', {
                    contentLength,
                    maxBatchSize: this.maxBatchSize,
                    ip: req.clientIp,
                    tokenId: req.hecToken?.id
                });
                res.status(413).json({
                    text: `Request entity too large. Maximum size is ${this.maxBatchSize} bytes`,
                    code: 413
                });
                return;
            }
            next();
        };
        this.validateSingleEvent = (req, res, next) => {
            try {
                const errors = (0, express_validator_1.validationResult)(req);
                if (!errors.isEmpty()) {
                    logger_1.default.warn('Query parameter validation failed', {
                        errors: errors.array(),
                        ip: req.clientIp,
                        tokenId: req.hecToken?.id
                    });
                    res.status(400).json({
                        text: 'Invalid query parameters',
                        code: 400,
                        invalid: true,
                        errors: errors.array()
                    });
                    return;
                }
                const eventData = req.body;
                const { error, value } = this.hecEventSchema.validate(eventData, {
                    allowUnknown: true,
                    stripUnknown: false
                });
                if (error) {
                    logger_1.default.warn('Single event validation failed', {
                        error: error.details,
                        ip: req.clientIp,
                        tokenId: req.hecToken?.id
                    });
                    res.status(400).json({
                        text: `Invalid event format: ${error.details[0].message}`,
                        code: 400,
                        invalid: true
                    });
                    return;
                }
                const eventSize = JSON.stringify(value).length;
                if (eventSize > this.maxEventSize) {
                    logger_1.default.warn('Single event size exceeds limit', {
                        eventSize,
                        maxEventSize: this.maxEventSize,
                        ip: req.clientIp,
                        tokenId: req.hecToken?.id
                    });
                    res.status(413).json({
                        text: `Event size ${eventSize} bytes exceeds maximum ${this.maxEventSize} bytes`,
                        code: 413,
                        invalid: true
                    });
                    return;
                }
                req.body = value;
                next();
            }
            catch (error) {
                logger_1.default.error('Event validation error', {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    ip: req.clientIp,
                    tokenId: req.hecToken?.id
                });
                res.status(500).json({
                    text: 'Internal Server Error during validation',
                    code: 500
                });
            }
        };
        this.validateBatchEvents = (req, res, next) => {
            try {
                const errors = (0, express_validator_1.validationResult)(req);
                if (!errors.isEmpty()) {
                    logger_1.default.warn('Query parameter validation failed', {
                        errors: errors.array(),
                        ip: req.clientIp,
                        tokenId: req.hecToken?.id
                    });
                    res.status(400).json({
                        text: 'Invalid query parameters',
                        code: 400,
                        invalid: true,
                        errors: errors.array()
                    });
                    return;
                }
                const batchData = req.body;
                const { error, value } = this.hecBatchSchema.validate(batchData, {
                    allowUnknown: true,
                    stripUnknown: false
                });
                if (error) {
                    logger_1.default.warn('Batch events validation failed', {
                        error: error.details,
                        eventCount: Array.isArray(batchData?.events) ? batchData.events.length : 'unknown',
                        ip: req.clientIp,
                        tokenId: req.hecToken?.id
                    });
                    res.status(400).json({
                        text: `Invalid batch format: ${error.details[0].message}`,
                        code: 400,
                        invalid: true
                    });
                    return;
                }
                const batchValidationResult = this.validateBatchContent(value.events);
                if (!batchValidationResult.isValid) {
                    logger_1.default.warn('Batch content validation failed', {
                        errors: batchValidationResult.errors,
                        eventCount: value.events.length,
                        estimatedSize: batchValidationResult.estimatedSize,
                        ip: req.clientIp,
                        tokenId: req.hecToken?.id
                    });
                    res.status(400).json({
                        text: `Batch validation failed: ${batchValidationResult.errors.join(', ')}`,
                        code: 400,
                        invalid: true,
                        errors: batchValidationResult.errors
                    });
                    return;
                }
                logger_1.default.debug('Batch validation successful', {
                    eventCount: batchValidationResult.eventCount,
                    estimatedSize: batchValidationResult.estimatedSize,
                    ip: req.clientIp,
                    tokenId: req.hecToken?.id
                });
                req.body = value;
                next();
            }
            catch (error) {
                logger_1.default.error('Batch validation error', {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    ip: req.clientIp,
                    tokenId: req.hecToken?.id
                });
                res.status(500).json({
                    text: 'Internal Server Error during validation',
                    code: 500
                });
            }
        };
        this.validateRawEvent = (req, res, next) => {
            try {
                const rawData = req.body;
                if (typeof rawData !== 'string') {
                    res.status(400).json({
                        text: 'Raw event must be a string',
                        code: 400,
                        invalid: true
                    });
                    return;
                }
                if (rawData.length > this.maxEventSize) {
                    logger_1.default.warn('Raw event size exceeds limit', {
                        eventSize: rawData.length,
                        maxEventSize: this.maxEventSize,
                        ip: req.clientIp,
                        tokenId: req.hecToken?.id
                    });
                    res.status(413).json({
                        text: `Raw event size ${rawData.length} bytes exceeds maximum ${this.maxEventSize} bytes`,
                        code: 413,
                        invalid: true
                    });
                    return;
                }
                if (rawData.trim().length === 0) {
                    res.status(400).json({
                        text: 'Raw event cannot be empty',
                        code: 400,
                        invalid: true
                    });
                    return;
                }
                next();
            }
            catch (error) {
                logger_1.default.error('Raw event validation error', {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    ip: req.clientIp,
                    tokenId: req.hecToken?.id
                });
                res.status(500).json({
                    text: 'Internal Server Error during validation',
                    code: 500
                });
            }
        };
        this.maxEventSize = maxEventSize;
        this.maxBatchSize = maxBatchSize;
        this.maxEventsPerBatch = maxEventsPerBatch;
    }
    get hecBatchSchema() {
        return joi_1.default.object({
            events: joi_1.default.array().items(this.hecEventSchema).min(1).max(this.maxEventsPerBatch).required(),
            metadata: joi_1.default.object({
                source: joi_1.default.string().max(255).optional(),
                sourcetype: joi_1.default.string().max(255).optional(),
                index: joi_1.default.string().max(255).optional(),
                host: joi_1.default.string().max(255).optional()
            }).optional()
        });
    }
    getQueryValidation() {
        return [
            (0, express_validator_1.query)('source')
                .optional()
                .isString()
                .isLength({ max: 255 })
                .withMessage('Source must be a string with maximum 255 characters'),
            (0, express_validator_1.query)('sourcetype')
                .optional()
                .isString()
                .isLength({ max: 255 })
                .withMessage('Sourcetype must be a string with maximum 255 characters'),
            (0, express_validator_1.query)('index')
                .optional()
                .isString()
                .isLength({ max: 255 })
                .withMessage('Index must be a string with maximum 255 characters'),
            (0, express_validator_1.query)('host')
                .optional()
                .isString()
                .isLength({ max: 255 })
                .withMessage('Host must be a string with maximum 255 characters')
        ];
    }
    validateBatchContent(events) {
        const errors = [];
        let totalSize = 0;
        for (let i = 0; i < events.length; i++) {
            const event = events[i];
            const eventSize = JSON.stringify(event).length;
            totalSize += eventSize;
            if (eventSize > this.maxEventSize) {
                errors.push(`Event ${i} size ${eventSize} bytes exceeds maximum ${this.maxEventSize} bytes`);
            }
            if (!event.event) {
                errors.push(`Event ${i} missing required 'event' field`);
            }
            if (event.time) {
                if (typeof event.time === 'string') {
                    const timeNum = Number(event.time);
                    if (!isNaN(timeNum)) {
                        events[i].time = timeNum;
                    }
                    else {
                        const date = new Date(event.time);
                        if (isNaN(date.getTime())) {
                            errors.push(`Event ${i} has invalid timestamp format`);
                        }
                    }
                }
            }
        }
        if (totalSize > this.maxBatchSize) {
            errors.push(`Total batch size ${totalSize} bytes exceeds maximum ${this.maxBatchSize} bytes`);
        }
        return {
            isValid: errors.length === 0,
            errors,
            eventCount: events.length,
            estimatedSize: totalSize
        };
    }
    getConfig() {
        return {
            maxEventSize: this.maxEventSize,
            maxBatchSize: this.maxBatchSize,
            maxEventsPerBatch: this.maxEventsPerBatch
        };
    }
}
exports.ValidationMiddleware = ValidationMiddleware;
//# sourceMappingURL=validation.middleware.js.map