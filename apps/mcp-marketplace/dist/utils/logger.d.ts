declare class Logger {
    private formatMessage;
    error(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
}
export declare const logger: Logger;
export {};
//# sourceMappingURL=logger.d.ts.map