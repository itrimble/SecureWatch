import { DataSource, DataSourceConfig } from '../types/data-source.types';
import { LogEvent } from '../types/log-event.types';
export interface SyslogConfig {
    protocol: 'udp' | 'tcp' | 'tls';
    port: number;
    bindAddress?: string;
    maxConnections?: number;
    timeout?: number;
    tls?: {
        cert?: string;
        key?: string;
        ca?: string;
        rejectUnauthorized?: boolean;
    };
    parsing: {
        rfc: '3164' | '5424' | 'auto';
        encoding: 'utf8' | 'ascii' | 'latin1';
        maxMessageSize: number;
        preserveOriginal: boolean;
    };
    filtering?: {
        facilities?: number[];
        severities?: number[];
        hosts?: string[];
        tags?: string[];
    };
}
export interface SyslogMessage {
    raw: string;
    facility: number;
    severity: number;
    priority: number;
    version?: number;
    timestamp?: Date;
    hostname?: string;
    appName?: string;
    procId?: string;
    msgId?: string;
    structuredData?: Record<string, Record<string, string>>;
    message: string;
    rfc: '3164' | '5424';
}
export declare class SyslogSource extends DataSource {
    private server?;
    private connections;
    private syslogConfig;
    private messageBuffer;
    constructor(config: DataSourceConfig);
    start(): Promise<void>;
    stop(): Promise<void>;
    restart(): Promise<void>;
    collect(): Promise<LogEvent[]>;
    validateConfig(): Promise<boolean>;
    private parseSyslogConfig;
    private startServer;
    private startUdpServer;
    private startTcpServer;
    private startTlsServer;
    private setupTcpConnection;
    private stopServer;
    private processMessage;
    private parseSyslogMessage;
    private detectRfc;
    private parseRfc3164;
    private parseRfc5424;
    private parseRfc3164Timestamp;
    private parseRfc5424Timestamp;
    private parseStructuredData;
    private shouldFilterMessage;
    private convertToLogEvent;
    private mapFacilityToCategory;
    private mapSeverityToNumber;
    private updateMessageMetrics;
}
export default SyslogSource;
//# sourceMappingURL=syslog-source.d.ts.map