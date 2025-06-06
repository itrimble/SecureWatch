import { ProcessedHECEvent } from '../types/hec.types';
export declare class KafkaService {
    private kafka;
    private producer;
    private isConnected;
    private connectionAttempts;
    private maxRetries;
    private retryDelayMs;
    constructor(brokers: string[], clientId?: string);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    sendEvent(topic: string, event: ProcessedHECEvent): Promise<void>;
    sendBatch(topic: string, events: ProcessedHECEvent[]): Promise<void>;
    isKafkaConnected(): boolean;
    getConnectionAttempts(): number;
    healthCheck(): Promise<{
        connected: boolean;
        lastError?: string;
    }>;
    ensureTopic(topic: string, numPartitions?: number, replicationFactor?: number): Promise<void>;
}
//# sourceMappingURL=kafka.service.d.ts.map