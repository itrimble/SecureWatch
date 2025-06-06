import { Request, Response, NextFunction } from 'express';
import { body, query, validationResult, ValidationChain } from 'express-validator';
import Joi from 'joi';
import { HECEvent, HECBatchRequest, HECValidationResult } from '../types/hec.types';
import logger from '../utils/logger';

export class ValidationMiddleware {
  private maxEventSize: number;
  private maxBatchSize: number;
  private maxEventsPerBatch: number;

  constructor(maxEventSize: number = 1048576, maxBatchSize: number = 104857600, maxEventsPerBatch: number = 1000) {
    this.maxEventSize = maxEventSize;
    this.maxBatchSize = maxBatchSize;
    this.maxEventsPerBatch = maxEventsPerBatch;
  }

  /**
   * Joi schema for single HEC event
   */
  private hecEventSchema = Joi.object({
    time: Joi.alternatives().try(
      Joi.number().integer().min(0),
      Joi.string().isoDate(),
      Joi.string().regex(/^\d{10}$|^\d{13}$/) // Unix timestamp
    ).optional(),
    host: Joi.string().max(255).optional(),
    source: Joi.string().max(255).optional(),
    sourcetype: Joi.string().max(255).optional(),
    index: Joi.string().max(255).optional(),
    event: Joi.any().required(),
    fields: Joi.object().optional()
  });

  /**
   * Joi schema for batch request
   */
  private get hecBatchSchema() {
    return Joi.object({
      events: Joi.array().items(this.hecEventSchema).min(1).max(this.maxEventsPerBatch).required(),
      metadata: Joi.object({
        source: Joi.string().max(255).optional(),
        sourcetype: Joi.string().max(255).optional(),
        index: Joi.string().max(255).optional(),
        host: Joi.string().max(255).optional()
      }).optional()
    });
  }

  /**
   * Express validator chains for query parameters
   */
  getQueryValidation(): ValidationChain[] {
    return [
      query('source')
        .optional()
        .isString()
        .isLength({ max: 255 })
        .withMessage('Source must be a string with maximum 255 characters'),
      query('sourcetype')
        .optional()
        .isString()
        .isLength({ max: 255 })
        .withMessage('Sourcetype must be a string with maximum 255 characters'),
      query('index')
        .optional()
        .isString()
        .isLength({ max: 255 })
        .withMessage('Index must be a string with maximum 255 characters'),
      query('host')
        .optional()
        .isString()
        .isLength({ max: 255 })
        .withMessage('Host must be a string with maximum 255 characters')
    ];
  }

  /**
   * Middleware to check request size limits
   */
  checkRequestSize = (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    
    if (contentLength > this.maxBatchSize) {
      logger.warn('Request size exceeds limit', {
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

  /**
   * Middleware to validate single HEC event
   */
  validateSingleEvent = (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Check express-validator results first
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Query parameter validation failed', {
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

      // Validate event data with Joi
      const eventData = req.body;
      const { error, value } = this.hecEventSchema.validate(eventData, { 
        allowUnknown: true,
        stripUnknown: false 
      });

      if (error) {
        logger.warn('Single event validation failed', {
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

      // Check event size
      const eventSize = JSON.stringify(value).length;
      if (eventSize > this.maxEventSize) {
        logger.warn('Single event size exceeds limit', {
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

      // Attach validated event to request
      req.body = value;
      next();
    } catch (error) {
      logger.error('Event validation error', {
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

  /**
   * Middleware to validate batch HEC events
   */
  validateBatchEvents = (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Check express-validator results first
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Query parameter validation failed', {
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

      // Validate batch request with Joi
      const batchData = req.body;
      const { error, value } = this.hecBatchSchema.validate(batchData, { 
        allowUnknown: true,
        stripUnknown: false 
      });

      if (error) {
        logger.warn('Batch events validation failed', {
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

      // Validate individual event sizes and total size
      const batchValidationResult = this.validateBatchContent(value.events);
      if (!batchValidationResult.isValid) {
        logger.warn('Batch content validation failed', {
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

      logger.debug('Batch validation successful', {
        eventCount: batchValidationResult.eventCount,
        estimatedSize: batchValidationResult.estimatedSize,
        ip: req.clientIp,
        tokenId: req.hecToken?.id
      });

      // Attach validated batch to request
      req.body = value;
      next();
    } catch (error) {
      logger.error('Batch validation error', {
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

  /**
   * Validate batch content (individual events and sizes)
   */
  private validateBatchContent(events: HECEvent[]): HECValidationResult {
    const errors: string[] = [];
    let totalSize = 0;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const eventSize = JSON.stringify(event).length;
      totalSize += eventSize;

      // Check individual event size
      if (eventSize > this.maxEventSize) {
        errors.push(`Event ${i} size ${eventSize} bytes exceeds maximum ${this.maxEventSize} bytes`);
      }

      // Validate event structure (basic validation)
      if (!event.event) {
        errors.push(`Event ${i} missing required 'event' field`);
      }

      // Check for potentially problematic fields
      if (event.time) {
        if (typeof event.time === 'string') {
          const timeNum = Number(event.time);
          if (!isNaN(timeNum)) {
            // Convert string timestamp to number if it's a valid number
            events[i].time = timeNum;
          } else {
            // Validate ISO date string
            const date = new Date(event.time);
            if (isNaN(date.getTime())) {
              errors.push(`Event ${i} has invalid timestamp format`);
            }
          }
        }
      }
    }

    // Check total batch size
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

  /**
   * Middleware to validate raw text events
   */
  validateRawEvent = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const rawData = req.body;

      // Check if it's a string
      if (typeof rawData !== 'string') {
        res.status(400).json({
          text: 'Raw event must be a string',
          code: 400,
          invalid: true
        });
        return;
      }

      // Check size
      if (rawData.length > this.maxEventSize) {
        logger.warn('Raw event size exceeds limit', {
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

      // Check for empty content
      if (rawData.trim().length === 0) {
        res.status(400).json({
          text: 'Raw event cannot be empty',
          code: 400,
          invalid: true
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Raw event validation error', {
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

  /**
   * Get current validation configuration
   */
  getConfig() {
    return {
      maxEventSize: this.maxEventSize,
      maxBatchSize: this.maxBatchSize,
      maxEventsPerBatch: this.maxEventsPerBatch
    };
  }
}