import * as tls from 'tls';
import { EventEmitter } from 'events';
import { KafkaProducerPool } from '../utils/kafka-producer-pool';
import { BufferManager } from '../buffers/buffer-manager';
import { MetricsCollector } from '../monitoring/metrics-collector';
interface SyslogConfig {
    udpPort?: number;
    tcpPort?: number;
    rfc5425Port?: number;
    tlsPort?: number;
    tlsOptions?: tls.TlsOptions;
    maxMessageSize: number;
    batchSize: number;
    flushInterval: number;
    rfc: 'RFC3164' | 'RFC5424';
    enableJsonPayloadParsing?: boolean;
    jsonPayloadDelimiter?: string;
}
export declare class SyslogAdapter extends EventEmitter {
    private config;
    private producerPool;
    private bufferManager;
    private metrics;
    private udpServer?;
    private tcpServer?;
    private rfc5425Server?;
    private tlsServer?;
    private tcpConnections;
    private rfc5425Connections;
    private isRunning;
    private flushInterval?;
    constructor(config: SyslogConfig, producerPool: KafkaProducerPool, bufferManager: BufferManager, metrics: MetricsCollector);
    start(): Promise<void>;
    stop(): Promise<void>;
    private startUdpServer;
    private startTcpServer;
    private startRfc5425Server;
    private startTlsServer;
    private handleTcpConnection;
    private handleSyslogMessage;
    private parseSyslogMessage;
    private parseRFC3164;
    private parseRFC5424;
    private parseRFC3164Timestamp;
    private parseStructuredData;
    /**
     * Extract JSON payload from syslog message content
     */
    private extractJsonPayload;
    private flushBufferedEvents;
    private sendToKafka;
    getStats(): object;
}
export {};
//# sourceMappingURL=syslog.adapter.d.ts.map