const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};
const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL] ?? LOG_LEVELS.INFO;
class Logger {
    formatMessage(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const formattedArgs = args.length > 0 ? ' ' + args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ') : '';
        return `[${timestamp}] [${level.padEnd(5)}] [MCP-Marketplace] ${message}${formattedArgs}`;
    }
    error(message, ...args) {
        if (currentLogLevel >= LOG_LEVELS.ERROR) {
            console.error(this.formatMessage('ERROR', message, ...args));
        }
    }
    warn(message, ...args) {
        if (currentLogLevel >= LOG_LEVELS.WARN) {
            console.warn(this.formatMessage('WARN', message, ...args));
        }
    }
    info(message, ...args) {
        if (currentLogLevel >= LOG_LEVELS.INFO) {
            console.info(this.formatMessage('INFO', message, ...args));
        }
    }
    debug(message, ...args) {
        if (currentLogLevel >= LOG_LEVELS.DEBUG) {
            console.debug(this.formatMessage('DEBUG', message, ...args));
        }
    }
}
export const logger = new Logger();
//# sourceMappingURL=logger.js.map