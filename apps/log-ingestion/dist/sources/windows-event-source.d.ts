import { DataSource, DataSourceConfig } from '../types/data-source.types';
import { LogEvent } from '../types/log-event.types';
export interface WindowsEventConfig {
    servers: Array<{
        hostname: string;
        username?: string;
        password?: string;
        domain?: string;
        useIntegratedAuth?: boolean;
    }>;
    channels: string[];
    eventIds?: number[];
    levels?: ('Critical' | 'Error' | 'Warning' | 'Information' | 'Verbose')[];
    providers?: string[];
    keywords?: string[];
    timeRange?: {
        start?: Date;
        end?: Date;
    };
    polling: {
        intervalMs: number;
        maxEvents: number;
        bookmark?: string;
    };
    formats: {
        primary: 'evtx' | 'xml' | 'json';
        fallback?: ('evtx' | 'xml' | 'json')[];
    };
}
export interface WindowsEventLogEntry {
    eventId: number;
    level: string;
    provider: string;
    channel: string;
    computer: string;
    timeCreated: Date;
    keywords: string[];
    data: Record<string, any>;
    message?: string;
    rawXml?: string;
    rawJson?: string;
}
export declare class WindowsEventSource extends DataSource {
    private pollingInterval?;
    private isCollecting;
    private lastBookmark?;
    private windowsConfig;
    constructor(config: DataSourceConfig);
    start(): Promise<void>;
    stop(): Promise<void>;
    restart(): Promise<void>;
    collect(): Promise<LogEvent[]>;
    validateConfig(): Promise<boolean>;
    private parseWindowsConfig;
    private startPolling;
    private stopPolling;
    private collectFromServer;
    private collectFromChannel;
    private generateMockWindowsEvents;
    private generateKeywords;
    private generateEventData;
    private generateEventMessage;
    private convertToXML;
    private getLevelNumber;
    private convertToLogEvent;
    private mapEventCategory;
    private mapSeverity;
    private mapEventAction;
    private testServerConnection;
    private updateCollectionMetrics;
}
export default WindowsEventSource;
//# sourceMappingURL=windows-event-source.d.ts.map