import winston from 'winston';

// Define log levels and colors
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Tell winston that you want to link the colors
winston.addColors(logColors);

// Define which logs to display based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

// Create the logger format
const logFormat = winston.format.combine(
  // Add timestamp
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  
  // Add colors (only in console)
  winston.format.colorize({ all: true }),
  
  // Add service name
  winston.format.label({ label: 'education-service' }),
  
  // Define the format of the message
  winston.format.printf((info) => {
    const { timestamp, level, message, label, ...meta } = info;
    
    // Handle object messages
    const formattedMessage = typeof message === 'object' 
      ? JSON.stringify(message, null, 2) 
      : message;
    
    // Include metadata if present
    const metaStr = Object.keys(meta).length > 0 
      ? `\n${JSON.stringify(meta, null, 2)}` 
      : '';
    
    return `${timestamp} [${label}] ${level}: ${formattedMessage}${metaStr}`;
  })
);

// Create different transports for different environments
const transports = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    level: level(),
    format: logFormat,
  })
);

// File transport for production
if (process.env.NODE_ENV === 'production') {
  // Error log file
  transports.push(
    new winston.transports.File({
      filename: 'logs/education-service-error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: 'logs/education-service-combined.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create the logger instance
export const logger = winston.createLogger({
  level: level(),
  levels: logLevels,
  transports,
  
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.Console(),
    ...(process.env.NODE_ENV === 'production' 
      ? [new winston.transports.File({ filename: 'logs/education-service-exceptions.log' })]
      : []
    ),
  ],
  
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.Console(),
    ...(process.env.NODE_ENV === 'production' 
      ? [new winston.transports.File({ filename: 'logs/education-service-rejections.log' })]
      : []
    ),
  ],
  
  // Exit on handled exceptions
  exitOnError: false,
});

// Create a stream object for Morgan (HTTP request logging)
export const loggerStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Helper functions for structured logging
export const loggerHelpers = {
  // Log user actions
  userAction: (userId: string, action: string, details?: any) => {
    logger.info('User Action', {
      userId,
      action,
      timestamp: new Date().toISOString(),
      ...details,
    });
  },

  // Log API requests
  apiRequest: (method: string, path: string, userId?: string, duration?: number) => {
    logger.http('API Request', {
      method,
      path,
      userId,
      duration,
      timestamp: new Date().toISOString(),
    });
  },

  // Log educational system events
  educationEvent: (event: string, details?: any) => {
    logger.info('Education Event', {
      event,
      timestamp: new Date().toISOString(),
      ...details,
    });
  },

  // Log security events
  securityEvent: (event: string, severity: 'low' | 'medium' | 'high' | 'critical', details?: any) => {
    const logMethod = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    logger[logMethod]('Security Event', {
      event,
      severity,
      timestamp: new Date().toISOString(),
      ...details,
    });
  },

  // Log performance metrics
  performance: (operation: string, duration: number, details?: any) => {
    const logMethod = duration > 5000 ? 'warn' : 'info'; // Warn if operation takes > 5 seconds
    logger[logMethod]('Performance Metric', {
      operation,
      duration,
      timestamp: new Date().toISOString(),
      ...details,
    });
  },

  // Log database operations
  database: (operation: string, table?: string, duration?: number, details?: any) => {
    logger.debug('Database Operation', {
      operation,
      table,
      duration,
      timestamp: new Date().toISOString(),
      ...details,
    });
  },

  // Log external service calls
  externalService: (service: string, operation: string, status: 'success' | 'error', duration?: number, details?: any) => {
    const logMethod = status === 'error' ? 'error' : 'info';
    logger[logMethod]('External Service Call', {
      service,
      operation,
      status,
      duration,
      timestamp: new Date().toISOString(),
      ...details,
    });
  },
};

// Export default logger
export default logger;