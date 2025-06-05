// Simple logger utility for the educational system
// In production, this would likely use a more sophisticated logging library
class SimpleLogger {
    formatMessage(level, message) {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [${level.toUpperCase()}] [EDUCATIONAL] ${message}`;
    }
    debug(message, ...args) {
        if (process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL === 'debug') {
            console.debug(this.formatMessage('debug', message), ...args);
        }
    }
    info(message, ...args) {
        console.info(this.formatMessage('info', message), ...args);
    }
    warn(message, ...args) {
        console.warn(this.formatMessage('warn', message), ...args);
    }
    error(message, error) {
        if (error) {
            console.error(this.formatMessage('error', message), error);
        }
        else {
            console.error(this.formatMessage('error', message));
        }
    }
}
// Export a singleton logger instance
export const logger = new SimpleLogger();
// Export the logger class for custom instances if needed
export { SimpleLogger };
//# sourceMappingURL=logger.js.map