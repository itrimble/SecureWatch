"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaService = void 0;
const kafkajs_1 = require("kafkajs");
const logger_1 = __importDefault(require("../utils/logger"));
class KafkaService {
    constructor(brokers, clientId = 'hec-service') {
        this.isConnected = false;
        this.connectionAttempts = 0;
        this.maxRetries = 5;
        this.retryDelayMs = 5000;
        this.kafka = new kafkajs_1.Kafka({
            clientId,
            brokers,
            retry: {
                initialRetryTime: 100,
                retries: 8,
            },
            connectionTimeout: 30000,
            requestTimeout: 30000,
        });
        this.producer = this.kafka.producer({
            allowAutoTopicCreation: true,
            transactionTimeout: 30000,
            maxInFlightRequests: 5,
            idempotent: false,
            retry: {
                initialRetryTime: 100,
                retries: 5,
            },
        });
    }
    async connect() {
        try {
            logger_1.default.info('Connecting to Kafka...');
            await this.producer.connect();
            this.isConnected = true;
            this.connectionAttempts = 0;
            logger_1.default.info('Successfully connected to Kafka');
        }
        catch (error) {
            this.isConnected = false;
            this.connectionAttempts++;
            logger_1.default.error('Failed to connect to Kafka', {
                error: error instanceof Error ? error.message : 'Unknown error',
                attempt: this.connectionAttempts,
                maxRetries: this.maxRetries
            });
            if (this.connectionAttempts < this.maxRetries) {
                logger_1.default.info(`Retrying Kafka connection in ${this.retryDelayMs}ms...`);
                setTimeout(() => this.connect(), this.retryDelayMs);
            }
            else {
                throw new Error(`Failed to connect to Kafka after ${this.maxRetries} attempts`);
            }
        }
    }
    async disconnect() {
        try {
            if (this.isConnected) {
                await this.producer.disconnect();
                this.isConnected = false;
                logger_1.default.info('Disconnected from Kafka');
            }
        }
        catch (error) {
            logger_1.default.error('Error disconnecting from Kafka', error);
        }
    }
    async sendEvent(topic, event) {
        if (!this.isConnected) {
            throw new Error('Kafka producer is not connected');
        }
        try {
            const message = {
                key: event.metadata.organizationId,
                value: JSON.stringify(event),
                timestamp: event.metadata.receivedAt.getTime().toString(),
                headers: {
                    'event-type': 'hec-event',
                    'source': event.metadata.source,
                    'sourcetype': event.metadata.sourcetype,
                    'token-id': event.metadata.token,
                    'organization-id': event.metadata.organizationId,
                    'format': event.metadata.format,
                    'client-ip': event.metadata.clientIp,
                    'user-agent': event.metadata.userAgent || 'unknown'
                }
            };
            await this.producer.send({
                topic,
                messages: [message]
            });
            logger_1.default.debug('Sent HEC event to Kafka', {
                topic,
                eventId: event.id,
                source: event.metadata.source,
                size: event.metadata.eventSize
            });
        }
        catch (error) {
            logger_1.default.error('Failed to send HEC event to Kafka', {
                topic,
                eventId: event.id,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    async sendBatch(topic, events) {
        if (!this.isConnected) {
            throw new Error('Kafka producer is not connected');
        }
        if (events.length === 0) {
            return;
        }
        try {
            const messages = events.map(event => ({
                key: event.metadata.organizationId,
                value: JSON.stringify(event),
                timestamp: event.metadata.receivedAt.getTime().toString(),
                headers: {
                    'event-type': 'hec-event',
                    'source': event.metadata.source,
                    'sourcetype': event.metadata.sourcetype,
                    'token-id': event.metadata.token,
                    'organization-id': event.metadata.organizationId,
                    'format': event.metadata.format,
                    'client-ip': event.metadata.clientIp,
                    'user-agent': event.metadata.userAgent || 'unknown'
                }
            }));
            await this.producer.send({
                topic,
                messages
            });
            const totalSize = events.reduce((sum, event) => sum + event.metadata.eventSize, 0);
            logger_1.default.info('Sent HEC event batch to Kafka', {
                topic,
                eventCount: events.length,
                totalSize,
                firstEventId: events[0].id,
                lastEventId: events[events.length - 1].id
            });
        }
        catch (error) {
            logger_1.default.error('Failed to send HEC event batch to Kafka', {
                topic,
                eventCount: events.length,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    isKafkaConnected() {
        return this.isConnected;
    }
    getConnectionAttempts() {
        return this.connectionAttempts;
    }
    async healthCheck() {
        try {
            if (!this.isConnected) {
                return {
                    connected: false,
                    lastError: 'Producer not connected'
                };
            }
            const admin = this.kafka.admin();
            await admin.connect();
            await admin.listTopics();
            await admin.disconnect();
            return { connected: true };
        }
        catch (error) {
            return {
                connected: false,
                lastError: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async ensureTopic(topic, numPartitions = 3, replicationFactor = 1) {
        try {
            const admin = this.kafka.admin();
            await admin.connect();
            const topics = await admin.listTopics();
            if (!topics.includes(topic)) {
                await admin.createTopics({
                    topics: [{
                            topic,
                            numPartitions,
                            replicationFactor,
                            configEntries: [
                                { name: 'cleanup.policy', value: 'delete' },
                                { name: 'retention.ms', value: '604800000' },
                                { name: 'segment.ms', value: '86400000' },
                            ]
                        }]
                });
                logger_1.default.info('Created Kafka topic', {
                    topic,
                    numPartitions,
                    replicationFactor
                });
            }
            await admin.disconnect();
        }
        catch (error) {
            logger_1.default.error('Failed to ensure Kafka topic exists', {
                topic,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
}
exports.KafkaService = KafkaService;
//# sourceMappingURL=kafka.service.js.map