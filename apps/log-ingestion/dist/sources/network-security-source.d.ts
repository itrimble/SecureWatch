import { DataSource, DataSourceConfig } from '../types/data-source.types';
import { LogEvent } from '../types/log-event.types';
export interface NetworkSecurityConfig {
    deviceType: 'firewall' | 'ids' | 'ips' | 'netflow' | 'router' | 'switch' | 'load_balancer';
    vendor: 'cisco' | 'palo_alto' | 'fortinet' | 'juniper' | 'checkpoint' | 'snort' | 'suricata' | 'generic';
    collection: {
        method: 'syslog' | 'snmp' | 'api' | 'file' | 'netflow';
        endpoint: string;
        port?: number;
        protocol?: 'tcp' | 'udp';
        authentication?: {
            type: 'none' | 'basic' | 'snmpv3' | 'apikey' | 'certificate';
            credentials: Record<string, any>;
        };
    };
    parsing: {
        format: 'syslog' | 'csv' | 'json' | 'xml' | 'cef' | 'leef' | 'netflow' | 'custom';
        customRegex?: string;
        fieldMappings?: Record<string, string>;
    };
    filtering?: {
        severities?: string[];
        actions?: string[];
        sourceIps?: string[];
        destIps?: string[];
        ports?: number[];
        protocols?: string[];
    };
    polling: {
        intervalMs: number;
        maxEvents: number;
        lookbackMs: number;
    };
}
export interface NetworkSecurityEvent {
    id: string;
    timestamp: Date;
    deviceName: string;
    deviceIp: string;
    eventType: string;
    severity: string;
    action: 'allow' | 'deny' | 'drop' | 'alert' | 'block' | 'monitor';
    sourceIp: string;
    sourcePort?: number;
    destIp: string;
    destPort?: number;
    protocol: string;
    bytes?: number;
    packets?: number;
    duration?: number;
    rule?: string;
    signature?: string;
    threat?: {
        category: string;
        name: string;
        severity: string;
        confidence: number;
    };
    geo?: {
        sourceCountry?: string;
        destCountry?: string;
        sourceCity?: string;
        destCity?: string;
    };
    application?: string;
    user?: string;
    rawLog: string;
}
export declare class NetworkSecuritySource extends DataSource {
    private pollingInterval?;
    private isCollecting;
    private networkConfig;
    private connectionPool;
    constructor(config: DataSourceConfig);
    start(): Promise<void>;
    stop(): Promise<void>;
    restart(): Promise<void>;
    collect(): Promise<LogEvent[]>;
    validateConfig(): Promise<boolean>;
    private parseNetworkConfig;
    private initializeConnections;
    private closeConnections;
    private startPolling;
    private stopPolling;
    private collectNetworkEvents;
    private collectSyslogEvents;
    private collectSnmpEvents;
    private collectApiEvents;
    private collectNetflowEvents;
    private collectFileEvents;
    private generateMockEvent;
    private generateMockSnmpEvents;
    private generateMockApiEvents;
    private generateMockNetflowEvents;
    private generateMockFileEvents;
    private generateRandomIP;
    private getCommonPort;
    private getThreatCategory;
    private getThreatName;
    private getRandomCountry;
    private getRandomCity;
    private getRandomApplication;
    private generateRawLog;
    private generateCiscoLog;
    private generatePaloAltoLog;
    private generateFortinetLog;
    private generateCheckpointLog;
    private generateSnortLog;
    private generateGenericLog;
    private getSeverityLevel;
    private testDeviceConnection;
    private convertToLogEvent;
    private mapSeverityToNumber;
    private generateNetworkEventMessage;
    private updateCollectionMetrics;
}
export default NetworkSecuritySource;
//# sourceMappingURL=network-security-source.d.ts.map