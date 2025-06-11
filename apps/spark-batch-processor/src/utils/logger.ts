import winston from 'winston';
import { config } from '../config/spark.config';

export class Logger {
  private static instance: winston.Logger;

  static getInstance(): winston.Logger {
    if (!Logger.instance) {
      Logger.instance = winston.createLogger({
        level: config.logLevel,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json(),
          winston.format.printf((info: any) => {
            const { timestamp, level, message, stack, ...meta } = info;
            const logEntry: Record<string, any> = {
              timestamp,
              level,
              message,
              service: 'spark-batch-processor',
              ...(stack && { stack }),
              ...(typeof meta === 'object' && meta !== null ? meta : {}),
            };
            return JSON.stringify(logEntry);
          })
        ),
        defaultMeta: {
          service: 'spark-batch-processor',
          environment: config.environment,
        },
        transports: [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.simple()
            ),
          }),
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 10485760, // 10MB
            maxFiles: 5,
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 10485760, // 10MB
            maxFiles: 10,
          }),
        ],
        exceptionHandlers: [
          new winston.transports.File({ filename: 'logs/exceptions.log' }),
        ],
        rejectionHandlers: [
          new winston.transports.File({ filename: 'logs/rejections.log' }),
        ],
      });
    }

    return Logger.instance;
  }
}

export default Logger;
