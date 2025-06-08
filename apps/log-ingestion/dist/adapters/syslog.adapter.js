import * as dgram from 'dgram';
import * as net from 'net';
import * as tls from 'tls';
import { EventEmitter } from 'events';
import { LogSource } from '../types/log-event.types';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
export class SyslogAdapter extends EventEmitter {
    config;
    producerPool;
    bufferManager;
    metrics;
    udpServer;
    tcpServer;
    rfc5425Server; // RFC 5425 TCP server (port 601)
    tlsServer;
    tcpConnections = new Set();
    rfc5425Connections = new Set();
    isRunning = false;
    flushInterval;
    constructor(config, producerPool, bufferManager, metrics) {
        super();
        this.config = config;
        this.producerPool = producerPool;
        this.bufferManager = bufferManager;
        this.metrics = metrics;
    }
    async start() {
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
        // Start TCP server (port 514)
        if (this.config.tcpPort) {
            await this.startTcpServer();
        }
        // Start RFC 5425 TCP server (port 601)
        if (this.config.rfc5425Port) {
            await this.startRfc5425Server();
        }
        // Start TLS server (port 6514)
        if (this.config.tlsPort) {
            await this.startTlsServer();
        }
        // Start flush interval
        this.flushInterval = setInterval(() => {
            this.flushBufferedEvents();
        }, this.config.flushInterval);
        this.emit('started');
    }
    async stop() {
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
        // Stop RFC 5425 server
        if (this.rfc5425Server) {
            this.rfc5425Server.close();
            // Close all active connections
            for (const connection of this.rfc5425Connections) {
                connection.destroy();
            }
            this.rfc5425Connections.clear();
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
    async startUdpServer() {
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
                const address = this.udpServer.address();
                logger.info(`Syslog UDP server listening on ${address.address}:${address.port}`);
                resolve();
            });
            this.udpServer.bind(this.config.udpPort);
        });
    }
    async startTcpServer() {
        return new Promise((resolve, reject) => {
            this.tcpServer = net.createServer((socket) => {
                this.handleTcpConnection(socket, 'tcp_514', this.tcpConnections);
            });
            this.tcpServer.on('error', (error) => {
                logger.error('TCP server error', error);
                this.metrics.incrementCounter('syslog.tcp_errors');
                reject(error);
            });
            this.tcpServer.on('listening', () => {
                const address = this.tcpServer.address();
                logger.info(`Syslog TCP server listening on ${address.address}:${address.port}`);
                resolve();
            });
            this.tcpServer.listen(this.config.tcpPort);
        });
    }
    async startRfc5425Server() {
        return new Promise((resolve, reject) => {
            this.rfc5425Server = net.createServer((socket) => {
                this.handleTcpConnection(socket, 'tcp_601', this.rfc5425Connections);
            });
            this.rfc5425Server.on('error', (error) => {
                logger.error('RFC 5425 TCP server error', error);
                this.metrics.incrementCounter('syslog.rfc5425_errors');
                reject(error);
            });
            this.rfc5425Server.on('listening', () => {
                const address = this.rfc5425Server.address();
                logger.info(`Syslog RFC 5425 TCP server listening on ${address.address}:${address.port}`);
                resolve();
            });
            this.rfc5425Server.listen(this.config.rfc5425Port);
        });
    }
    async startTlsServer() {
        return new Promise((resolve, reject) => {
            this.tlsServer = tls.createServer(this.config.tlsOptions || {}, (socket) => {
                this.handleTcpConnection(socket, 'tls_6514', new Set());
            });
            this.tlsServer.on('error', (error) => {
                logger.error('TLS server error', error);
                this.metrics.incrementCounter('syslog.tls_errors');
                reject(error);
            });
            this.tlsServer.on('listening', () => {
                const address = this.tlsServer.address();
                logger.info(`Syslog TLS server listening on ${address.address}:${address.port}`);
                resolve();
            });
            this.tlsServer.listen(this.config.tlsPort);
        });
    }
    handleTcpConnection(socket, protocol, connections) {
        const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
        logger.debug(`New ${protocol} connection from ${clientId}`);
        connections.add(socket);
        this.metrics.incrementCounter(`syslog.${protocol}_connections`);
        let buffer = '';
        socket.on('data', (data) => {
            buffer += data.toString();
            // Process complete messages (terminated by newline)
            let newlineIndex;
            while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
                const message = buffer.substring(0, newlineIndex);
                buffer = buffer.substring(newlineIndex + 1);
                if (message.trim()) {
                    this.handleSyslogMessage(message, protocol, socket.remoteAddress || '');
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
            logger.debug(`${protocol} connection closed from ${clientId}`);
            connections.delete(socket);
        });
    }
    async handleSyslogMessage(message, protocol, sourceIp) {
        try {
            const syslogEvent = this.parseSyslogMessage(message);
            // Build fields from syslog event and JSON payload if present
            const fields = {
                facility: syslogEvent.facility,
                severity: syslogEvent.severity,
                hostname: syslogEvent.hostname,
                appName: syslogEvent.appName,
                message: syslogEvent.message,
                sourceIp,
                protocol,
            };
            // Add RFC5424 specific fields if present
            if ('version' in syslogEvent) {
                fields.version = syslogEvent.version;
                fields.procId = syslogEvent.procId;
                fields.msgId = syslogEvent.msgId;
                if (syslogEvent.structuredData) {
                    fields.structuredData = syslogEvent.structuredData;
                }
            }
            // Merge JSON payload fields if present
            if (syslogEvent.jsonPayload) {
                if (typeof syslogEvent.jsonPayload === 'object' && !Array.isArray(syslogEvent.jsonPayload)) {
                    // Flatten JSON payload into fields
                    for (const [key, value] of Object.entries(syslogEvent.jsonPayload)) {
                        fields[`json_${key}`] = value;
                    }
                }
                fields.jsonPayload = syslogEvent.jsonPayload;
            }
            const rawEvent = {
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
                    syslog: {
                        facility: syslogEvent.facility,
                        severity: syslogEvent.severity,
                        protocol,
                        sourceIp,
                        hasJsonPayload: !!syslogEvent.jsonPayload,
                    },
                },
                receivedAt: new Date(),
                fields,
            };
            // Add to buffer
            await this.bufferManager.addEvent(rawEvent);
            // Update metrics
            this.metrics.incrementCounter('syslog.messages_received', {
                protocol,
                facility: syslogEvent.facility.toString(),
                severity: syslogEvent.severity.toString(),
                hasJsonPayload: !!syslogEvent.jsonPayload ? 'true' : 'false',
            });
        }
        catch (error) {
            logger.error('Error parsing syslog message', { message, error });
            this.metrics.incrementCounter('syslog.parse_errors');
        }
    }
    parseSyslogMessage(message) {
        if (this.config.rfc === 'RFC5424') {
            return this.parseRFC5424(message);
        }
        else {
            return this.parseRFC3164(message);
        }
    }
    parseRFC3164(message) {
        // RFC3164 format: <priority>timestamp hostname tag: message
        const match = message.match(/^<(\d{1,3})>(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+([^:\s]+):\s*(.*)$/);
        if (!match) {
            throw new Error('Invalid RFC3164 syslog format');
        }
        const priority = parseInt(match[1], 10);
        const facility = Math.floor(priority / 8);
        const severity = priority % 8;
        let messageContent = match[5];
        let jsonPayload = undefined;
        // Check if JSON payload parsing is enabled
        if (this.config.enableJsonPayloadParsing) {
            const result = this.extractJsonPayload(messageContent);
            messageContent = result.message;
            jsonPayload = result.jsonPayload;
        }
        return {
            facility,
            severity,
            timestamp: this.parseRFC3164Timestamp(match[2]),
            hostname: match[3],
            appName: match[4],
            message: messageContent,
            jsonPayload,
        };
    }
    parseRFC5424(message) {
        // RFC5424 format: <priority>version timestamp hostname app-name procid msgid structured-data msg
        const match = message.match(/^<(\d{1,3})>(\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\[.*?\]|-)\s*(.*)$/);
        if (!match) {
            throw new Error('Invalid RFC5424 syslog format');
        }
        const priority = parseInt(match[1], 10);
        const facility = Math.floor(priority / 8);
        const severity = priority % 8;
        let messageContent = match[9];
        let jsonPayload = undefined;
        const structuredData = match[8] !== '-' ? this.parseStructuredData(match[8]) : undefined;
        // Check if JSON payload parsing is enabled
        if (this.config.enableJsonPayloadParsing) {
            const result = this.extractJsonPayload(messageContent);
            messageContent = result.message;
            jsonPayload = result.jsonPayload;
        }
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
            message: messageContent,
            jsonPayload,
        };
    }
    parseRFC3164Timestamp(timestamp) {
        // Convert RFC3164 timestamp to Date
        const currentYear = new Date().getFullYear();
        const date = new Date(`${timestamp} ${currentYear}`);
        // Handle year rollover
        if (date > new Date()) {
            date.setFullYear(currentYear - 1);
        }
        return date;
    }
    parseStructuredData(data) {
        const result = {};
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
    /**
     * Extract JSON payload from syslog message content
     */
    extractJsonPayload(message) {
        const delimiter = this.config.jsonPayloadDelimiter || ' JSON:';
        const delimiterIndex = message.indexOf(delimiter);
        if (delimiterIndex === -1) {
            // No delimiter found, check if entire message is JSON
            try {
                const trimmedMessage = message.trim();
                if (trimmedMessage.startsWith('{') || trimmedMessage.startsWith('[')) {
                    const jsonPayload = JSON.parse(trimmedMessage);
                    return { message: '', jsonPayload };
                }
            }
            catch (e) {
                // Not valid JSON, return as is
            }
            return { message };
        }
        // Split message at delimiter
        const textPart = message.substring(0, delimiterIndex).trim();
        const jsonPart = message.substring(delimiterIndex + delimiter.length).trim();
        try {
            const jsonPayload = JSON.parse(jsonPart);
            return { message: textPart, jsonPayload };
        }
        catch (error) {
            logger.warn('Failed to parse JSON payload in syslog message', {
                jsonPart,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            // Return original message if JSON parsing fails
            return { message };
        }
    }
    async flushBufferedEvents() {
        try {
            const batches = await this.bufferManager.getBatches(this.config.batchSize);
            for (const batch of batches) {
                await this.sendToKafka(batch);
            }
        }
        catch (error) {
            logger.error('Error flushing buffered events', error);
            this.metrics.incrementCounter('syslog.flush_errors');
        }
    }
    async sendToKafka(events) {
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
        }
        catch (error) {
            logger.error('Error sending syslog events to Kafka', error);
            this.metrics.incrementCounter('syslog.kafka_errors');
            // Re-queue events for retry
            await this.bufferManager.requeueEvents(events);
        }
    }
    getStats() {
        return {
            isRunning: this.isRunning,
            ports: {
                udp: this.config.udpPort,
                tcp: this.config.tcpPort,
                rfc5425: this.config.rfc5425Port,
                tls: this.config.tlsPort,
            },
            activeConnections: {
                tcp: this.tcpConnections.size,
                rfc5425: this.rfc5425Connections.size,
            },
            bufferSize: this.bufferManager.getSize(),
            metrics: this.metrics.getMetrics(),
        };
    }
}
//# sourceMappingURL=syslog.adapter.js.map