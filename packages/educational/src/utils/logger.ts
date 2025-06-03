// Simple logger utility for the educational system
// In production, this would likely use a more sophisticated logging library

export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, error?: any): void;
}

class SimpleLogger implements Logger {
  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] [EDUCATIONAL] ${message}`;
  }

  debug(message: string, ...args: any[]): void {
    if (process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL === 'debug') {
      console.debug(this.formatMessage('debug', message), ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    console.info(this.formatMessage('info', message), ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(this.formatMessage('warn', message), ...args);
  }

  error(message: string, error?: any): void {
    if (error) {
      console.error(this.formatMessage('error', message), error);
    } else {
      console.error(this.formatMessage('error', message));
    }
  }
}

// Export a singleton logger instance
export const logger: Logger = new SimpleLogger();

// Export the logger class for custom instances if needed
export { SimpleLogger };