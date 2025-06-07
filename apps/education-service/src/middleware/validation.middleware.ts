import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from './error-handler';

/**
 * Middleware to validate request data using Joi schemas
 */
export const validateRequest = (schema: {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const validationErrors: any[] = [];

    // Validate request body
    if (schema.body) {
      const { error } = schema.body.validate(req.body, { abortEarly: false });
      if (error) {
        validationErrors.push({
          location: 'body',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value,
          })),
        });
      }
    }

    // Validate query parameters
    if (schema.query) {
      const { error } = schema.query.validate(req.query, { abortEarly: false });
      if (error) {
        validationErrors.push({
          location: 'query',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value,
          })),
        });
      }
    }

    // Validate path parameters
    if (schema.params) {
      const { error } = schema.params.validate(req.params, { abortEarly: false });
      if (error) {
        validationErrors.push({
          location: 'params',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value,
          })),
        });
      }
    }

    // If there are validation errors, throw a ValidationError
    if (validationErrors.length > 0) {
      throw new ValidationError('Request validation failed', validationErrors);
    }

    next();
  };
};

/**
 * Common validation schemas
 */

// Pagination schema
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

// Search schema
export const searchSchema = Joi.object({
  q: Joi.string().min(2).max(100).required(),
  type: Joi.string().valid('all', 'courses', 'paths', 'articles', 'labs').default('all'),
}).concat(paginationSchema);

// ID parameter schema
export const idParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

// Date range schema
export const dateRangeSchema = Joi.object({
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')),
});

// Filter schema for learning content
export const learningFilterSchema = Joi.object({
  category: Joi.string().max(50),
  difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced'),
  skillLevel: Joi.string().valid('beginner', 'intermediate', 'advanced'),
  duration: Joi.string().valid('short', 'medium', 'long'), // < 1hr, 1-4hr, > 4hr
  search: Joi.string().min(2).max(100),
  tags: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string())
  ),
  instructor: Joi.string().uuid(),
  status: Joi.string().valid('draft', 'published', 'archived'),
}).concat(paginationSchema);

/**
 * Middleware to validate file uploads
 */
export const validateFileUpload = (options: {
  allowedTypes?: string[];
  maxSize?: number; // in bytes
  required?: boolean;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const files = req.files as Express.Multer.File[] | undefined;
    const file = req.file as Express.Multer.File | undefined;

    // Check if file is required
    if (options.required && !file && (!files || files.length === 0)) {
      throw new ValidationError('File upload is required');
    }

    // If no file provided and not required, continue
    if (!file && (!files || files.length === 0)) {
      return next();
    }

    const filesToValidate = file ? [file] : files || [];

    for (const uploadedFile of filesToValidate) {
      // Check file type
      if (options.allowedTypes && !options.allowedTypes.includes(uploadedFile.mimetype)) {
        throw new ValidationError(`File type ${uploadedFile.mimetype} is not allowed`, {
          allowedTypes: options.allowedTypes,
          receivedType: uploadedFile.mimetype,
        });
      }

      // Check file size
      if (options.maxSize && uploadedFile.size > options.maxSize) {
        throw new ValidationError(`File size exceeds maximum allowed size`, {
          maxSize: options.maxSize,
          receivedSize: uploadedFile.size,
          fileName: uploadedFile.originalname,
        });
      }
    }

    next();
  };
};

/**
 * Sanitize input to prevent XSS and other attacks
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Basic input sanitization
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      // Remove potentially dangerous characters
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .trim();
    }
    
    if (typeof value === 'object' && value !== null) {
      const sanitized: any = Array.isArray(value) ? [] : {};
      for (const key in value) {
        sanitized[key] = sanitizeValue(value[key]);
      }
      return sanitized;
    }
    
    return value;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }

  next();
};