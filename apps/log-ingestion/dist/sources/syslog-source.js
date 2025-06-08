import * as net from 'net';
import * as dgram from 'dgram';
import * as tls from 'tls';
import { logger } from '../utils/logger';
import { DataSource } from '../types/data-source.types';
export class SyslogSource extends DataSource {
    server;
    connections = new Set();
    syslogConfig;
    messageBuffer = Buffer.alloc(0);
    constructor(config) {
        super(config);
        this.syslogConfig = this.parseSyslogConfig(config.collection.config);
    }
    async start() {
        if (this.status === 'active') {
            return;
        }
        try {
            await this.validateConfig();
            await this.startServer();
            this.setStatus('active');
        }
        catch (error) {
            this.setStatus('error');
            this.addHealthIssue('error', `Failed to start Syslog source: ${error.message}`);
            throw error;
        }
    }
    async stop() {
        if (this.status === 'inactive') {
            return;
        }
        await this.stopServer();
        this.setStatus('inactive');
    }
    async restart() {
        await this.stop();
        await this.start();
    }
    async collect() {
        // Syslog is event-driven, so this method returns empty array
        // Events are processed in real-time via server callbacks
        return [];
    }
    async validateConfig() {
        const config = this.syslogConfig;
        // Validate port
        if (!config.port || config.port < 1 || config.port > 65535) {
            throw new Error('Port must be between 1 and 65535');
        }
        // Validate protocol
        if (!['udp', 'tcp', 'tls'].includes(config.protocol)) {
            throw new Error('Protocol must be udp, tcp, or tls');
        }
        // Validate TLS configuration
        if (config.protocol === 'tls') {
            if (!config.tls?.cert || !config.tls?.key) {
                throw new Error('TLS certificate and key are required for TLS protocol');
            }
        }
        // Validate parsing configuration
        if (!['3164', '5424', 'auto'].includes(config.parsing.rfc)) {
            throw new Error('RFC must be 3164, 5424, or auto');
        }
        if (config.parsing.maxMessageSize < 1024) {
            throw new Error('Max message size must be at least 1024 bytes');
        }
        return true;
    }
    parseSyslogConfig(config) {
        return {
            protocol: config.protocol || 'udp',
            port: config.port || 514,
            bindAddress: config.bindAddress || '0.0.0.0',
            maxConnections: config.maxConnections || 100,
            timeout: config.timeout || 30000,
            tls: config.tls,
            parsing: {
                rfc: config.parsing?.rfc || 'auto',
                encoding: config.parsing?.encoding || 'utf8',
                maxMessageSize: config.parsing?.maxMessageSize || 8192,
                preserveOriginal: config.parsing?.preserveOriginal ?? true
            },
            filtering: config.filtering
        };
    }
    async startServer() {
        switch (this.syslogConfig.protocol) {
            case 'udp':
                await this.startUdpServer();
                break;
            case 'tcp':
                await this.startTcpServer();
                break;
            case 'tls':
                await this.startTlsServer();
                break;
        }
    }
    async startUdpServer() {
        return new Promise((resolve, reject) => {
            const socket = dgram.createSocket('udp4');
            socket.on('message', (msg, rinfo) => {
                try {
                    const message = msg.toString(this.syslogConfig.parsing.encoding);
                    this.processMessage(message, rinfo.address);
                }
                catch (error) {
                    this.addHealthIssue('warning', `Failed to process UDP message: ${error.message}`);
                }
            });
            socket.on('error', (error) => {
                this.addHealthIssue('error', `UDP server error: ${error.message}`);
                reject(error);
            });
            socket.on('listening', () => {
                const address = socket.address();
                logger.info(`Syslog UDP server listening on ${address.address}:${address.port}`);
                resolve();
            });
            socket.bind(this.syslogConfig.port, this.syslogConfig.bindAddress);
            this.server = socket;
        });
    }
    async startTcpServer() {
        return new Promise((resolve, reject) => {
            const server = net.createServer((socket) => {
                this.connections.add(socket);
                this.setupTcpConnection(socket);
            });
            server.on('error', (error) => {
                this.addHealthIssue('error', `TCP server error: ${error.message}`);
                reject(error);
            });
            server.on('listening', () => {
                const address = server.address();
                const addr = typeof address === 'string' ? address : `${address?.address}:${address?.port}`;
                logger.info(`Syslog TCP server listening on ${addr}`);
                resolve();
            });
            server.maxConnections = this.syslogConfig.maxConnections || 100;
            server.listen(this.syslogConfig.port, this.syslogConfig.bindAddress);
            this.server = server;
        });
    }
    async startTlsServer() {
        return new Promise((resolve, reject) => {
            const options = {
                cert: this.syslogConfig.tls?.cert,
                key: this.syslogConfig.tls?.key,
                ca: this.syslogConfig.tls?.ca,
                rejectUnauthorized: this.syslogConfig.tls?.rejectUnauthorized ?? true
            };
            const server = tls.createServer(options, (socket) => {
                this.connections.add(socket);
                this.setupTcpConnection(socket);
            });
            server.on('error', (error) => {
                this.addHealthIssue('error', `TLS server error: ${error.message}`);
                reject(error);
            });
            server.on('listening', () => {
                const address = server.address();
                const addr = typeof address === 'string' ? address : `${address?.address}:${address?.port}`;
                logger.info(`Syslog TLS server listening on ${addr}`);
                resolve();
            });
            server.maxConnections = this.syslogConfig.maxConnections || 100;
            server.listen(this.syslogConfig.port, this.syslogConfig.bindAddress);
            this.server = server;
        });
    }
    setupTcpConnection(socket) {
        let buffer = Buffer.alloc(0);
        socket.setTimeout(this.syslogConfig.timeout || 30000);
        socket.on('data', (data) => {
            try {
                buffer = Buffer.concat([buffer, data]);
                // Process complete messages (assuming newline delimiter)
                let messages = buffer.toString(this.syslogConfig.parsing.encoding).split('\n');
                buffer = Buffer.from(messages.pop() || '', this.syslogConfig.parsing.encoding);
                for (const message of messages) {
                    if (message.trim()) {
                        this.processMessage(message.trim(), socket.remoteAddress || 'unknown');
                    }
                }
            }
            catch (error) {
                this.addHealthIssue('warning', `Failed to process TCP data: ${error.message}`);
            }
        });
        socket.on('error', (error) => {
            this.addHealthIssue('warning', `TCP connection error: ${error.message}`);
            this.connections.delete(socket);
        });
        socket.on('close', () => {
            this.connections.delete(socket);
        });
        socket.on('timeout', () => {
            socket.destroy();
            this.connections.delete(socket);
        });
    }
    async stopServer() {
        return new Promise((resolve) => {
            // Close all connections
            for (const connection of this.connections) {
                connection.destroy();
            }
            this.connections.clear();
            if (this.server) {
                if ('close' in this.server) {
                    // TCP/TLS server
                    this.server.close(() => resolve());
                }
                else {
                    // UDP socket
                    this.server.close(() => resolve());
                }
                this.server = undefined;
            }
            else {
                resolve();
            }
        });
    }
    processMessage(message, remoteAddress) {
        try {
            const syslogMessage = this.parseSyslogMessage(message);
            // Apply filtering if configured
            if (this.shouldFilterMessage(syslogMessage)) {
                return;
            }
            const logEvent = this.convertToLogEvent(syslogMessage, remoteAddress);
            this.emit('events', [logEvent]);
            // Update metrics
            this.updateMessageMetrics();
        }
        catch (error) {
            this.addHealthIssue('warning', `Failed to parse syslog message: ${error.message}`, { message });
        }
    }
    parseSyslogMessage(message) {
        const rfc = this.syslogConfig.parsing.rfc === 'auto' ? this.detectRfc(message) : this.syslogConfig.parsing.rfc;
        if (rfc === '5424') {
            return this.parseRfc5424(message);
        }
        else {
            return this.parseRfc3164(message);
        }
    }
    detectRfc(message) {
        // RFC 5424 starts with <priority>version (e.g., <34>1)
        // RFC 3164 starts with <priority> followed by timestamp (e.g., <34>Oct 11 22:14:15)
        const rfc5424Pattern = /^<\d+>\d+\s/;
        return rfc5424Pattern.test(message) ? '5424' : '3164';
    }
    parseRfc3164(message) {
        // RFC 3164 format: <priority>timestamp hostname tag: message
        const match = message.match(/^<(\d+)>(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+([^:]+):\s*(.*)$/);
        if (!match) {
            // Fallback parsing for non-standard messages
            const priorityMatch = message.match(/^<(\d+)>(.*)$/);
            if (priorityMatch) {
                const priority = parseInt(priorityMatch[1]);
                return {
                    raw: message,
                    priority,
                    facility: Math.floor(priority / 8),
                    severity: priority % 8,
                    message: priorityMatch[2].trim(),
                    rfc: '3164'
                };
            }
            throw new Error('Invalid RFC 3164 syslog message format');
        }
        const [, priorityStr, timestampStr, hostname, tag, msg] = match;
        const priority = parseInt(priorityStr);
        return {
            raw: message,
            priority,
            facility: Math.floor(priority / 8),
            severity: priority % 8,
            timestamp: this.parseRfc3164Timestamp(timestampStr),
            hostname,
            appName: tag,
            message: msg,
            rfc: '3164'
        };
    }
    parseRfc5424(message) {
        // RFC 5424 format: <priority>version timestamp hostname app-name procid msgid [structured-data] message
        const match = message.match(/^<(\d+)>(\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\[.*?\]|\-)\s*(.*)$/);
        if (!match) {
            throw new Error('Invalid RFC 5424 syslog message format');
        }
        const [, priorityStr, versionStr, timestampStr, hostname, appName, procId, msgId, structuredDataStr, msg] = match;
        const priority = parseInt(priorityStr);
        const version = parseInt(versionStr);
        return {
            raw: message,
            priority,
            facility: Math.floor(priority / 8),
            severity: priority % 8,
            version,
            timestamp: this.parseRfc5424Timestamp(timestampStr),
            hostname: hostname === '-' ? undefined : hostname,
            appName: appName === '-' ? undefined : appName,
            procId: procId === '-' ? undefined : procId,
            msgId: msgId === '-' ? undefined : msgId,
            structuredData: this.parseStructuredData(structuredDataStr),
            message: msg,
            rfc: '5424'
        };
    }
    parseRfc3164Timestamp(timestampStr) {
        // RFC 3164 timestamp: "Oct 11 22:14:15"
        const now = new Date();
        const parts = timestampStr.split(/\s+/);
        if (parts.length !== 3)
            return now;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months.indexOf(parts[0]);
        const day = parseInt(parts[1]);
        const timeParts = parts[2].split(':');
        const hour = parseInt(timeParts[0]);
        const minute = parseInt(timeParts[1]);
        const second = parseInt(timeParts[2]);
        const date = new Date(now.getFullYear(), month, day, hour, minute, second);
        // If the parsed date is in the future, assume it's from the previous year
        if (date > now) {
            date.setFullYear(now.getFullYear() - 1);
        }
        return date;
    }
    parseRfc5424Timestamp(timestampStr) {
        if (timestampStr === '-')
            return undefined;
        // RFC 5424 timestamp: ISO 8601 format
        try {
            return new Date(timestampStr);
        }
        catch {
            return undefined;
        }
    }
    parseStructuredData(structuredDataStr) {
        if (structuredDataStr === '-')
            return undefined;
        const result = {};
        // Parse [sdId param1="value1" param2="value2"] format
        const sdElements = structuredDataStr.match(/\[([^\]]+)\]/g);
        if (!sdElements)
            return undefined;
        for (const element of sdElements) {
            const content = element.slice(1, -1); // Remove [ and ]
            const parts = content.split(/\s+/);
            const sdId = parts[0];
            const params = {};
            for (let i = 1; i < parts.length; i++) {
                const paramMatch = parts[i].match(/^([^=]+)="([^"]*)"$/);
                if (paramMatch) {
                    params[paramMatch[1]] = paramMatch[2];
                }
            }
            result[sdId] = params;
        }
        return Object.keys(result).length > 0 ? result : undefined;
    }
    shouldFilterMessage(message) {
        const filter = this.syslogConfig.filtering;
        if (!filter)
            return false;
        // Filter by facility
        if (filter.facilities && !filter.facilities.includes(message.facility)) {
            return true;
        }
        // Filter by severity
        if (filter.severities && !filter.severities.includes(message.severity)) {
            return true;
        }
        // Filter by hostname
        if (filter.hosts && message.hostname && !filter.hosts.includes(message.hostname)) {
            return true;
        }
        // Filter by app name/tag
        if (filter.tags && message.appName && !filter.tags.includes(message.appName)) {
            return true;
        }
        return false;
    }
    convertToLogEvent(syslogMessage, remoteAddress) {
        return {
            id: `syslog-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: syslogMessage.timestamp || new Date(),
            source: {
                type: 'syslog',
                name: `syslog-${this.syslogConfig.protocol}-${this.syslogConfig.port}`,
                version: syslogMessage.rfc
            },
            event: {
                id: syslogMessage.msgId || 'unknown',
                category: this.mapFacilityToCategory(syslogMessage.facility),
                type: 'info',
                severity: this.mapSeverityToNumber(syslogMessage.severity),
                action: 'log-received',
                outcome: 'success'
            },
            host: {
                name: syslogMessage.hostname || remoteAddress,
                hostname: syslogMessage.hostname || remoteAddress,
                ip: remoteAddress !== 'unknown' ? remoteAddress : undefined
            },
            process: syslogMessage.procId ? {
                pid: parseInt(syslogMessage.procId) || undefined,
                name: syslogMessage.appName
            } : undefined,
            message: syslogMessage.message,
            labels: {
                facility: syslogMessage.facility.toString(),
                severity: syslogMessage.severity.toString(),
                priority: syslogMessage.priority.toString(),
                rfc: syslogMessage.rfc,
                protocol: this.syslogConfig.protocol,
                app_name: syslogMessage.appName
            },
            metadata: {
                raw: this.syslogConfig.parsing.preserveOriginal ? syslogMessage.raw : undefined,
                parsed: {
                    facility: syslogMessage.facility,
                    severity: syslogMessage.severity,
                    priority: syslogMessage.priority,
                    version: syslogMessage.version,
                    structuredData: syslogMessage.structuredData
                },
                enriched: {}
            }
        };
    }
    mapFacilityToCategory(facility) {
        const facilityMap = {
            0: 'system', // kernel messages
            1: 'system', // user-level messages
            2: 'email', // mail system
            3: 'system', // system daemons
            4: 'authentication', // security/authorization messages
            5: 'system', // messages generated internally by syslogd
            6: 'system', // line printer subsystem
            7: 'network', // network news subsystem
            8: 'system', // UUCP subsystem
            9: 'system', // clock daemon
            10: 'authentication', // security/authorization messages
            11: 'system', // FTP daemon
            12: 'network', // NTP subsystem
            13: 'system', // log audit
            14: 'system', // log alert
            15: 'system', // clock daemon
            16: 'application', // local use facility 0
            17: 'application', // local use facility 1
            18: 'application', // local use facility 2
            19: 'application', // local use facility 3
            20: 'application', // local use facility 4
            21: 'application', // local use facility 5
            22: 'application', // local use facility 6
            23: 'application' // local use facility 7
        };
        return facilityMap[facility] || 'system';
    }
    mapSeverityToNumber(severity) {
        // Syslog severity (0-7) maps to our severity (1-8)
        return severity + 1;
    }
    updateMessageMetrics() {
        const metrics = this.getMetrics();
        const health = this.getHealth();
        metrics.statistics.totalEvents++;
        metrics.statistics.eventsToday++; // Simplified
        health.metrics.eventsPerSecond++; // Simplified rate calculation
        health.lastCheck = new Date();
    }
}
export default SyslogSource;
//# sourceMappingURL=syslog-source.js.map