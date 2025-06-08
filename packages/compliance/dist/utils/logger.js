"use strict";
// Simple logger utility for the compliance system
// In production, this would likely use a more sophisticated logging library
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleLogger = exports.logger = void 0;
class SimpleLogger {
    formatMessage(level, message) {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [${level.toUpperCase()}] [COMPLIANCE] ${message}`;
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
exports.SimpleLogger = SimpleLogger;
// Export a singleton logger instance
exports.logger = new SimpleLogger();
//# sourceMappingURL=logger.js.map