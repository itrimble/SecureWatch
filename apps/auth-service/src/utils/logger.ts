import winston from 'winston';

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Define colors for each level
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(logColors);

// Custom format for development
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, stack, ...meta } = info;
    
    let log = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta, null, 2)}`;
    }
    
    // Add stack trace for errors
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// Custom format for production
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    // Ensure sensitive data is not logged
    const sanitized = { ...info };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    // Sanitize nested objects
    if (sanitized.meta && typeof sanitized.meta === 'object') {
      sensitiveFields.forEach(field => {
        if (sanitized.meta[field]) {
          sanitized.meta[field] = '[REDACTED]';
        }
      });
    }
    
    return JSON.stringify(sanitized);
  })
);

// Determine log level
const logLevel = process.env.LOG_LEVEL || 'info';

// Create logger instance
const logger = winston.createLogger({
  levels: logLevels,
  level: logLevel,
  format: process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  defaultMeta: {
    service: 'auth-service',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
  exitOnError: false,
});

// Add file transports for production
if (process.env.NODE_ENV === 'production') {
  // Error log file
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 10485760, // 10MB
    maxFiles: 5,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }));

  // Combined log file
  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    maxsize: 10485760, // 10MB
    maxFiles: 10,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }));

  // Audit log file for security events
  logger.add(new winston.transports.File({
    filename: 'logs/audit.log',
    level: 'info',
    maxsize: 10485760, // 10MB
    maxFiles: 20,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
      winston.format.printf((info) => {
        // Only log audit events
        if (info.eventType || info.auditEvent) {
          return JSON.stringify(info);
        }
        return '';
      })
    ),
  }));
}

// Security logging helper
export const logSecurityEvent = (eventData: {
  eventType: string;
  userId?: string;
  organizationId?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  details?: any;
}) => {
  logger.info('Security Event', {
    auditEvent: true,
    timestamp: new Date().toISOString(),
    ...eventData,
  });
};

// Performance logging helper
export const logPerformance = (operation: string, duration: number, metadata?: any) => {
  logger.info('Performance Metric', {
    performanceMetric: true,
    operation,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
};

// Database logging helper
export const logDatabaseOperation = (operation: string, table: string, duration: number, success: boolean) => {
  logger.debug('Database Operation', {
    databaseOperation: true,
    operation,
    table,
    duration: `${duration}ms`,
    success,
    timestamp: new Date().toISOString(),
  });
};

// HTTP request logging helper
export const logHTTPRequest = (req: any, res: any, duration: number) => {
  const logData = {
    httpRequest: true,
    method: req.method,
    url: req.originalUrl || req.url,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: req.user?.userId,
    organizationId: req.user?.organizationId,
    timestamp: new Date().toISOString(),
  };

  if (res.statusCode >= 400) {
    logger.warn('HTTP Request Error', logData);
  } else {
    logger.info('HTTP Request', logData);
  }
};

// Error logging helper with context
export const logError = (error: Error, context?: any) => {
  logger.error('Application Error', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    context,
    timestamp: new Date().toISOString(),
  });
};

// Authentication event logging helper
export const logAuthEvent = (eventData: {
  eventType: 'login' | 'logout' | 'register' | 'password_reset' | 'mfa_setup' | 'mfa_verify' | 'token_refresh';
  userId?: string;
  organizationId?: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  details?: any;
}) => {
  logger.info('Authentication Event', {
    authEvent: true,
    timestamp: new Date().toISOString(),
    ...eventData,
  });
};

export default logger;