import * as dgram from 'dgram';
import * as net from 'net';
import * as tls from 'tls';
import { EventEmitter } from 'events';
import { RawLogEvent, LogSource, SyslogEvent } from '../types/log-event.types';
import { KafkaProducerPool } from '../utils/kafka-producer-pool';
import { BufferManager } from '../buffers/buffer-manager';
import { MetricsCollector } from '../monitoring/metrics-collector';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

interface SyslogConfig {
  udpPort?: number;
  tcpPort?: number;
  tlsPort?: number;
  tlsOptions?: tls.TlsOptions;
  maxMessageSize: number;
  batchSize: number;
  flushInterval: number;
  rfc: 'RFC3164' | 'RFC5424';
}

export class SyslogAdapter extends EventEmitter {
  private config: SyslogConfig;
  private producerPool: KafkaProducerPool;
  private bufferManager: BufferManager;
  private metrics: MetricsCollector;
  private udpServer?: dgram.Socket;
  private tcpServer?: net.Server;
  private tlsServer?: tls.Server;
  private tcpConnections: Set<net.Socket> = new Set();
  private isRunning: boolean = false;
  private flushInterval?: NodeJS.Timer;

  constructor(
    config: SyslogConfig,
    producerPool: KafkaProducerPool,
    bufferManager: BufferManager,
    metrics: MetricsCollector
  ) {
    super();
    this.config = config;
    this.producerPool = producerPool;
    this.bufferManager = bufferManager;
    this.metrics = metrics;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Syslog adapter is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting Syslog adapter', this.config);

    // Start UDP server
    if (this.config.udpPort) {
      await this.startUdpServer();
    }

    // Start TCP server
    if (this.config.tcpPort) {
      await this.startTcpServer();
    }

    // Start TLS server
    if (this.config.tlsPort) {
      await this.startTlsServer();
    }

    // Start flush interval
    this.flushInterval = setInterval(() => {
      this.flushBufferedEvents();
    }, this.config.flushInterval);

    this.emit('started');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    logger.info('Stopping Syslog adapter');

    // Stop flush interval
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    // Stop UDP server
    if (this.udpServer) {
      this.udpServer.close();
    }

    // Stop TCP server
    if (this.tcpServer) {
      this.tcpServer.close();
      // Close all active connections
      for (const connection of this.tcpConnections) {
        connection.destroy();
      }
      this.tcpConnections.clear();
    }

    // Stop TLS server
    if (this.tlsServer) {
      this.tlsServer.close();
    }

    // Flush remaining events
    await this.bufferManager.flush();
    await this.flushBufferedEvents();

    this.emit('stopped');
  }

  private async startUdpServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.udpServer = dgram.createSocket('udp4');

      this.udpServer.on('error', (error) => {
        logger.error('UDP server error', error);
        this.metrics.incrementCounter('syslog.udp_errors');
        reject(error);
      });

      this.udpServer.on('message', (msg, rinfo) => {
        this.handleSyslogMessage(msg.toString(), 'udp', rinfo.address);
      });

      this.udpServer.on('listening', () => {
        const address = this.udpServer!.address();
        logger.info(`Syslog UDP server listening on ${address.address}:${address.port}`);
        resolve();
      });

      this.udpServer.bind(this.config.udpPort);
    });
  }

  private async startTcpServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.tcpServer = net.createServer((socket) => {
        this.handleTcpConnection(socket);
      });

      this.tcpServer.on('error', (error) => {
        logger.error('TCP server error', error);
        this.metrics.incrementCounter('syslog.tcp_errors');
        reject(error);
      });

      this.tcpServer.on('listening', () => {
        const address = this.tcpServer!.address() as net.AddressInfo;
        logger.info(`Syslog TCP server listening on ${address.address}:${address.port}`);
        resolve();
      });

      this.tcpServer.listen(this.config.tcpPort);
    });
  }

  private async startTlsServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.tlsServer = tls.createServer(this.config.tlsOptions || {}, (socket) => {
        this.handleTcpConnection(socket);
      });

      this.tlsServer.on('error', (error) => {
        logger.error('TLS server error', error);
        this.metrics.incrementCounter('syslog.tls_errors');
        reject(error);
      });

      this.tlsServer.on('listening', () => {
        const address = this.tlsServer!.address() as net.AddressInfo;
        logger.info(`Syslog TLS server listening on ${address.address}:${address.port}`);
        resolve();
      });

      this.tlsServer.listen(this.config.tlsPort);
    });
  }

  private handleTcpConnection(socket: net.Socket): void {
    const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
    logger.debug(`New TCP connection from ${clientId}`);
    
    this.tcpConnections.add(socket);
    this.metrics.incrementCounter('syslog.tcp_connections');

    let buffer = '';

    socket.on('data', (data) => {
      buffer += data.toString();
      
      // Process complete messages (terminated by newline)
      let newlineIndex;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const message = buffer.substring(0, newlineIndex);
        buffer = buffer.substring(newlineIndex + 1);
        
        if (message.trim()) {
          this.handleSyslogMessage(message, 'tcp', socket.remoteAddress || '');
        }
      }

      // Check buffer size limit
      if (buffer.length > this.config.maxMessageSize) {
        logger.warn(`Buffer overflow from ${clientId}, clearing buffer`);
        buffer = '';
        this.metrics.incrementCounter('syslog.buffer_overflows');
      }
    });

    socket.on('error', (error) => {
      logger.error(`TCP connection error from ${clientId}`, error);
      this.metrics.incrementCounter('syslog.connection_errors');
    });

    socket.on('close', () => {
      logger.debug(`TCP connection closed from ${clientId}`);
      this.tcpConnections.delete(socket);
    });
  }

  private async handleSyslogMessage(
    message: string,
    protocol: string,
    sourceIp: string
  ): Promise<void> {
    try {
      const syslogEvent = this.parseSyslogMessage(message);
      
      const rawEvent: RawLogEvent = {
        id: uuidv4(),
        source: LogSource.SYSLOG,
        timestamp: syslogEvent.timestamp,
        rawData: message,
        metadata: {
          ingestionId: uuidv4(),
          ingestionTime: new Date(),
          collector: 'syslog-adapter',
          collectorVersion: '1.0.0',
          organizationId: process.env.ORGANIZATION_ID || 'default',
          environment: process.env.ENVIRONMENT || 'production',
          retention: {
            tier: 'hot',
            days: 7,
            compressed: false,
            encrypted: false,
          },
        },
        receivedAt: new Date(),
      };

      // Add to buffer
      await this.bufferManager.addEvent(rawEvent);

      // Update metrics
      this.metrics.incrementCounter('syslog.messages_received', {
        protocol,
        facility: syslogEvent.facility.toString(),
        severity: syslogEvent.severity.toString(),
      });
    } catch (error) {
      logger.error('Error parsing syslog message', { message, error });
      this.metrics.incrementCounter('syslog.parse_errors');
    }
  }

  private parseSyslogMessage(message: string): SyslogEvent {
    if (this.config.rfc === 'RFC5424') {
      return this.parseRFC5424(message);
    } else {
      return this.parseRFC3164(message);
    }
  }

  private parseRFC3164(message: string): SyslogEvent {
    // RFC3164 format: <priority>timestamp hostname tag: message
    const match = message.match(
      /^<(\d{1,3})>(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+([^:\s]+):\s*(.*)$/
    );

    if (!match) {
      throw new Error('Invalid RFC3164 syslog format');
    }

    const priority = parseInt(match[1], 10);
    const facility = Math.floor(priority / 8);
    const severity = priority % 8;

    return {
      facility,
      severity,
      timestamp: this.parseRFC3164Timestamp(match[2]),
      hostname: match[3],
      appName: match[4],
      message: match[5],
    };
  }

  private parseRFC5424(message: string): SyslogEvent {
    // RFC5424 format: <priority>version timestamp hostname app-name procid msgid structured-data msg
    const match = message.match(
      /^<(\d{1,3})>(\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\[.*?\]|-)\s*(.*)$/
    );

    if (!match) {
      throw new Error('Invalid RFC5424 syslog format');
    }

    const priority = parseInt(match[1], 10);
    const facility = Math.floor(priority / 8);
    const severity = priority % 8;

    const structuredData = match[8] !== '-' ? this.parseStructuredData(match[8]) : undefined;

    return {
      facility,
      severity,
      version: parseInt(match[2], 10),
      timestamp: new Date(match[3]),
      hostname: match[4],
      appName: match[5] !== '-' ? match[5] : undefined,
      procId: match[6] !== '-' ? match[6] : undefined,
      msgId: match[7] !== '-' ? match[7] : undefined,
      structuredData,
      message: match[9],
    };
  }

  private parseRFC3164Timestamp(timestamp: string): Date {
    // Convert RFC3164 timestamp to Date
    const currentYear = new Date().getFullYear();
    const date = new Date(`${timestamp} ${currentYear}`);
    
    // Handle year rollover
    if (date > new Date()) {
      date.setFullYear(currentYear - 1);
    }
    
    return date;
  }

  private parseStructuredData(data: string): Record<string, Record<string, string>> {
    const result: Record<string, Record<string, string>> = {};
    const regex = /\[([^\s\]]+)(?:\s+([^\]]+))?\]/g;
    let match;

    while ((match = regex.exec(data)) !== null) {
      const id = match[1];
      const params = match[2];
      result[id] = {};

      if (params) {
        const paramRegex = /(\w+)="([^"]*)"/g;
        let paramMatch;
        
        while ((paramMatch = paramRegex.exec(params)) !== null) {
          result[id][paramMatch[1]] = paramMatch[2];
        }
      }
    }

    return result;
  }

  private async flushBufferedEvents(): Promise<void> {
    try {
      const batches = await this.bufferManager.getBatches(this.config.batchSize);
      
      for (const batch of batches) {
        await this.sendToKafka(batch);
      }
    } catch (error) {
      logger.error('Error flushing buffered events', error);
      this.metrics.incrementCounter('syslog.flush_errors');
    }
  }

  private async sendToKafka(events: RawLogEvent[]): Promise<void> {
    try {
      const messages = events.map(event => ({
        key: event.metadata.organizationId,
        value: JSON.stringify(event),
        timestamp: event.timestamp.toISOString(),
        headers: {
          source: LogSource.SYSLOG,
          ingestionId: event.metadata.ingestionId,
        },
      }));

      await this.producerPool.sendBatch('log-events-raw', messages);

      this.metrics.incrementCounter('syslog.events_sent', {}, events.length);
      logger.debug(`Sent ${events.length} syslog events to Kafka`);
    } catch (error) {
      logger.error('Error sending syslog events to Kafka', error);
      this.metrics.incrementCounter('syslog.kafka_errors');
      
      // Re-queue events for retry
      await this.bufferManager.requeueEvents(events);
    }
  }

  getStats(): object {
    return {
      isRunning: this.isRunning,
      udpPort: this.config.udpPort,
      tcpPort: this.config.tcpPort,
      tlsPort: this.config.tlsPort,
      activeTcpConnections: this.tcpConnections.size,
      bufferSize: this.bufferManager.getSize(),
      metrics: this.metrics.getMetrics(),
    };
  }
}