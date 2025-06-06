import { Kafka, Producer, Message } from 'kafkajs';
import { ProcessedHECEvent } from '../types/hec.types';
import logger from '../utils/logger';

export class KafkaService {
  private kafka: Kafka;
  private producer: Producer;
  private isConnected: boolean = false;
  private connectionAttempts: number = 0;
  private maxRetries: number = 5;
  private retryDelayMs: number = 5000;

  constructor(brokers: string[], clientId: string = 'hec-service') {
    this.kafka = new Kafka({
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

  /**
   * Connect to Kafka
   */
  async connect(): Promise<void> {
    try {
      logger.info('Connecting to Kafka...');
      await this.producer.connect();
      this.isConnected = true;
      this.connectionAttempts = 0;
      logger.info('Successfully connected to Kafka');
    } catch (error) {
      this.isConnected = false;
      this.connectionAttempts++;
      logger.error('Failed to connect to Kafka', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        attempt: this.connectionAttempts,
        maxRetries: this.maxRetries
      });

      if (this.connectionAttempts < this.maxRetries) {
        logger.info(`Retrying Kafka connection in ${this.retryDelayMs}ms...`);
        setTimeout(() => this.connect(), this.retryDelayMs);
      } else {
        throw new Error(`Failed to connect to Kafka after ${this.maxRetries} attempts`);
      }
    }
  }

  /**
   * Disconnect from Kafka
   */
  async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.producer.disconnect();
        this.isConnected = false;
        logger.info('Disconnected from Kafka');
      }
    } catch (error) {
      logger.error('Error disconnecting from Kafka', error);
    }
  }

  /**
   * Send a single HEC event to Kafka
   */
  async sendEvent(topic: string, event: ProcessedHECEvent): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka producer is not connected');
    }

    try {
      const message: Message = {
        key: Buffer.from(event.metadata.organizationId),
        value: Buffer.from(JSON.stringify(event)),
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

      logger.debug('Sent HEC event to Kafka', {
        topic,
        eventId: event.id,
        source: event.metadata.source,
        size: event.metadata.eventSize
      });
    } catch (error) {
      logger.error('Failed to send HEC event to Kafka', {
        topic,
        eventId: event.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Send multiple HEC events to Kafka as a batch
   */
  async sendBatch(topic: string, events: ProcessedHECEvent[]): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka producer is not connected');
    }

    if (events.length === 0) {
      return;
    }

    try {
      const messages: Message[] = events.map(event => ({
        key: Buffer.from(event.metadata.organizationId),
        value: Buffer.from(JSON.stringify(event)),
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

      logger.info('Sent HEC event batch to Kafka', {
        topic,
        eventCount: events.length,
        totalSize,
        firstEventId: events[0].id,
        lastEventId: events[events.length - 1].id
      });
    } catch (error) {
      logger.error('Failed to send HEC event batch to Kafka', {
        topic,
        eventCount: events.length,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get connection status
   */
  isKafkaConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get connection attempts count
   */
  getConnectionAttempts(): number {
    return this.connectionAttempts;
  }

  /**
   * Health check for Kafka connection
   */
  async healthCheck(): Promise<{ connected: boolean; lastError?: string }> {
    try {
      if (!this.isConnected) {
        return {
          connected: false,
          lastError: 'Producer not connected'
        };
      }

      // Try to get metadata to verify connection
      const admin = this.kafka.admin();
      await admin.connect();
      await admin.listTopics();
      await admin.disconnect();

      return { connected: true };
    } catch (error) {
      return {
        connected: false,
        lastError: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create topic if it doesn't exist
   */
  async ensureTopic(topic: string, numPartitions: number = 3, replicationFactor: number = 1): Promise<void> {
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
              { name: 'retention.ms', value: '604800000' }, // 7 days
              { name: 'segment.ms', value: '86400000' }, // 1 day
            ]
          }]
        });

        logger.info('Created Kafka topic', { 
          topic, 
          numPartitions, 
          replicationFactor 
        });
      }

      await admin.disconnect();
    } catch (error) {
      logger.error('Failed to ensure Kafka topic exists', {
        topic,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}