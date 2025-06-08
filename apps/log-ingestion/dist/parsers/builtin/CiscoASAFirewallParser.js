/**
 * Cisco ASA/Firepower Firewall Parser
 *
 * Supports multiple Cisco ASA log types including:
 * - Connection logs (Built/Teardown)
 * - Access Control List (ACL) logs
 * - Authentication logs
 * - VPN logs
 * - Intrusion Prevention System (IPS) logs
 * - System logs
 * - Threat Detection logs
 * - Application logs
 *
 * Cisco ASA logs use syslog format with specific message IDs and structured fields.
 * Message format: %ASA-Level-MessageID: Message_text
 */
export class CiscoASAFirewallParser {
    id = 'cisco-asa-firewall';
    name = 'Cisco ASA/Firepower Firewall';
    vendor = 'Cisco Systems';
    logSource = 'cisco_asa_firewall';
    version = '1.0.0';
    format = 'syslog';
    category = 'network';
    priority = 85; // High priority for specific vendor
    enabled = true;
    config = {
        enabled: true,
        priority: 85,
        timeout: 5000,
        maxSize: 50000,
        patterns: ['%ASA-', '%FWSM-', '%PIX-'],
        fieldMappings: {
            'src': 'source.ip',
            'dst': 'destination.ip',
            'sport': 'source.port',
            'dport': 'destination.port'
        },
        normalization: {
            timestampFormats: ['MMM dd yyyy HH:mm:ss', 'MMM dd HH:mm:ss'],
            severityMapping: {
                '0': 'critical', // Emergency
                '1': 'critical', // Alert
                '2': 'critical', // Critical
                '3': 'high', // Error
                '4': 'medium', // Warning
                '5': 'medium', // Notice
                '6': 'low', // Informational
                '7': 'low' // Debug
            },
            categoryMapping: {
                'connection': 'network',
                'access': 'network',
                'authentication': 'authentication',
                'vpn': 'network',
                'ips': 'intrusion_detection'
            }
        },
        validation: {
            required: ['level', 'message_id', 'message_text'],
            optional: ['src', 'dst', 'sport', 'dport', 'protocol'],
            formats: {
                'message_id': /^\d{6}$/,
                'ip_address': /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/,
                'level': /^[0-7]$/
            }
        }
    };
    metadata = {
        description: 'Parser for Cisco ASA/Firepower firewall logs including connection, ACL, authentication, VPN, and IPS events',
        author: 'SecureWatch',
        tags: ['firewall', 'network-security', 'cisco', 'asa', 'firepower', 'ips'],
        documentation: 'https://www.cisco.com/c/en/us/support/security/asa-5500-series-next-generation-firewalls/products-system-message-guides-list.html',
        supportedVersions: ['9.0+', '9.1+', '9.2+', '9.3+', '9.4+', '9.5+', '9.6+'],
        testCases: [
            {
                name: 'ASA Connection Built',
                input: '%ASA-6-302013: Built outbound TCP connection 12345 for outside:10.1.1.1/80 (10.1.1.1/80) to inside:192.168.1.100/12345 (192.168.1.100/12345)',
                expectedOutput: {
                    'event.category': ['network'],
                    'event.type': ['connection'],
                    'event.action': 'connection_built',
                    'source.ip': '192.168.1.100',
                    'destination.ip': '10.1.1.1'
                },
                shouldPass: true
            },
            {
                name: 'ASA Connection Teardown',
                input: '%ASA-6-302014: Teardown TCP connection 12345 for outside:10.1.1.1/80 to inside:192.168.1.100/12345 duration 0:01:30 bytes 1234 TCP FINs',
                expectedOutput: {
                    'event.category': ['network'],
                    'event.type': ['end'],
                    'event.action': 'connection_teardown',
                    'source.ip': '192.168.1.100',
                    'destination.ip': '10.1.1.1'
                },
                shouldPass: true
            },
            {
                name: 'ASA ACL Deny',
                input: '%ASA-4-106023: Deny tcp src outside:192.168.1.100/12345 dst inside:10.1.1.1/22 by access-group "outside_access_in" [0x0, 0x0]',
                expectedOutput: {
                    'event.category': ['network'],
                    'event.type': ['denied'],
                    'event.action': 'acl_deny',
                    'source.ip': '192.168.1.100',
                    'destination.ip': '10.1.1.1'
                },
                shouldPass: true
            }
        ]
    };
    // Common ASA message ID patterns and their meanings
    messagePatterns = {
        // Connection messages (302xxx series)
        '302013': { action: 'connection_built', category: 'connection', severity: 'low' },
        '302014': { action: 'connection_teardown', category: 'connection', severity: 'low' },
        '302015': { action: 'connection_built', category: 'connection', severity: 'low' },
        '302016': { action: 'connection_teardown', category: 'connection', severity: 'low' },
        '302020': { action: 'connection_built', category: 'connection', severity: 'low' },
        '302021': { action: 'connection_teardown', category: 'connection', severity: 'low' },
        // Access Control List messages (106xxx series)
        '106001': { action: 'acl_deny', category: 'access', severity: 'medium' },
        '106006': { action: 'acl_deny', category: 'access', severity: 'medium' },
        '106007': { action: 'acl_deny', category: 'access', severity: 'medium' },
        '106014': { action: 'acl_deny', category: 'access', severity: 'medium' },
        '106015': { action: 'acl_deny', category: 'access', severity: 'medium' },
        '106021': { action: 'acl_deny', category: 'access', severity: 'medium' },
        '106023': { action: 'acl_deny', category: 'access', severity: 'medium' },
        '106100': { action: 'acl_allow', category: 'access', severity: 'low' },
        // Authentication messages (109xxx, 113xxx series)
        '109001': { action: 'auth_start', category: 'authentication', severity: 'low' },
        '109002': { action: 'auth_stop', category: 'authentication', severity: 'low' },
        '109005': { action: 'auth_success', category: 'authentication', severity: 'low' },
        '109006': { action: 'auth_failure', category: 'authentication', severity: 'medium' },
        '109007': { action: 'auth_failure', category: 'authentication', severity: 'medium' },
        '109008': { action: 'auth_failure', category: 'authentication', severity: 'medium' },
        '109025': { action: 'auth_failure', category: 'authentication', severity: 'medium' },
        '113003': { action: 'aaa_user_locked', category: 'authentication', severity: 'high' },
        '113004': { action: 'aaa_server_failed', category: 'authentication', severity: 'high' },
        '113005': { action: 'aaa_user_auth', category: 'authentication', severity: 'low' },
        // VPN messages (722xxx, 725xxx series)
        '722022': { action: 'vpn_session_start', category: 'vpn', severity: 'low' },
        '722023': { action: 'vpn_session_end', category: 'vpn', severity: 'low' },
        '725001': { action: 'vpn_tunnel_start', category: 'vpn', severity: 'low' },
        '725002': { action: 'vpn_tunnel_end', category: 'vpn', severity: 'low' },
        '725003': { action: 'vpn_tunnel_start', category: 'vpn', severity: 'low' },
        '725004': { action: 'vpn_tunnel_end', category: 'vpn', severity: 'low' },
        // IPS/Threat Detection messages (733xxx series)
        '733100': { action: 'threat_detected', category: 'ips', severity: 'high' },
        '733101': { action: 'object_dropped', category: 'ips', severity: 'high' },
        // System messages (199xxx, 111xxx series)
        '199002': { action: 'translation_failed', category: 'system', severity: 'medium' },
        '111001': { action: 'config_changed', category: 'system', severity: 'medium' },
        '111002': { action: 'config_changed', category: 'system', severity: 'medium' },
        '111003': { action: 'config_changed', category: 'system', severity: 'medium' },
        '111004': { action: 'config_changed', category: 'system', severity: 'medium' },
        '111005': { action: 'user_executed', category: 'system', severity: 'low' },
        '111007': { action: 'user_login', category: 'system', severity: 'low' },
        '111008': { action: 'user_executed', category: 'system', severity: 'low' },
        '111009': { action: 'user_executed', category: 'system', severity: 'low' },
        '111010': { action: 'user_executed', category: 'system', severity: 'low' }
    };
    validate(rawLog) {
        if (!rawLog || typeof rawLog !== 'string')
            return false;
        // Check for ASA/PIX/FWSM message format
        const asaPattern = /%(ASA|PIX|FWSM)-(\d)-(\d{6}):/;
        const match = rawLog.match(asaPattern);
        if (!match)
            return false;
        // Validate severity level (0-7)
        const level = parseInt(match[2], 10);
        if (isNaN(level) || level < 0 || level > 7)
            return false;
        // Validate message ID format (6 digits)
        const messageId = match[3];
        if (!/^\d{6}$/.test(messageId))
            return false;
        return true;
    }
    parse(rawLog) {
        try {
            if (!this.validate(rawLog))
                return null;
            const asaPattern = /%(ASA|PIX|FWSM)-(\d)-(\d{6}):\s*(.+)$/;
            const match = rawLog.match(asaPattern);
            if (!match)
                return null;
            const [, device, level, messageId, messageText] = match;
            const messagePattern = this.messagePatterns[messageId];
            // Extract timestamp from syslog header if present
            const timestamp = this.extractTimestamp(rawLog);
            // Parse message-specific fields
            const parsedFields = this.parseMessageFields(messageId, messageText);
            const event = {
                timestamp: timestamp,
                source: parsedFields.src || 'cisco-asa',
                category: this.mapCategory(messagePattern?.category),
                action: messagePattern?.action || `message_${messageId}`,
                outcome: this.determineOutcome(messageId, messageText),
                severity: this.mapSeverityFromLevel(level),
                rawData: rawLog,
                custom: {
                    parsedFields: {
                        device_type: device,
                        level: level,
                        message_id: messageId,
                        message_text: messageText,
                        ...parsedFields
                    },
                    confidence: this.calculateConfidence(messageId, parsedFields),
                    metadata: {
                        parser: this.id,
                        vendor: this.vendor,
                        messageCategory: messagePattern?.category || 'unknown',
                        messageId: messageId,
                        severityLevel: level
                    }
                }
            };
            return event;
        }
        catch (error) {
            console.error(`Cisco ASA parser error:`, error);
            return null;
        }
    }
    normalize(event) {
        const fields = event.custom?.parsedFields || {};
        const messageId = fields.message_id;
        const messagePattern = this.messagePatterns[messageId];
        // Base ECS normalization
        const normalized = {
            '@timestamp': event.timestamp.toISOString(),
            'event.kind': 'event',
            'event.category': this.getEventCategory(messagePattern?.category),
            'event.type': this.getEventType(messagePattern?.action, fields),
            'event.action': event.action,
            'event.outcome': this.mapOutcome(event.action, fields),
            'event.severity': this.mapSeverityToNumber(fields.level),
            'event.dataset': `${this.logSource}.${messagePattern?.category || 'general'}`,
            'event.module': 'cisco_asa',
            'event.provider': this.vendor,
            // Network fields
            'source.ip': fields.src,
            'source.port': this.parsePort(fields.sport),
            'source.nat.ip': fields.mapped_src,
            'source.nat.port': this.parsePort(fields.mapped_sport),
            'destination.ip': fields.dst,
            'destination.port': this.parsePort(fields.dport),
            'destination.nat.ip': fields.mapped_dst,
            'destination.nat.port': this.parsePort(fields.mapped_dport),
            'network.protocol': fields.protocol?.toLowerCase(),
            'network.bytes': this.parseNumber(fields.bytes),
            'network.packets': this.parseNumber(fields.packets),
            'network.direction': this.mapDirection(fields.direction),
            // Observer (firewall) fields
            'observer.vendor': this.vendor,
            'observer.product': fields.device_type || 'ASA',
            'observer.ingress.interface.name': fields.src_interface,
            'observer.egress.interface.name': fields.dst_interface,
            'observer.ingress.zone': fields.src_zone,
            'observer.egress.zone': fields.dst_zone,
            // Rule and policy fields
            'rule.name': fields.access_group || fields.rule_name,
            'rule.id': fields.rule_id,
            // Connection fields
            'network.connection.id': fields.conn_id,
            'event.duration': this.parseDuration(fields.duration),
            // User fields (for authentication logs)
            'user.name': fields.user || fields.username,
            'user.domain': fields.domain,
            // URL fields (for web traffic)
            'url.original': fields.url,
            'url.domain': fields.fqdn,
            // SecureWatch specific fields
            'securewatch.parser.id': this.id,
            'securewatch.parser.version': this.version,
            'securewatch.parser.name': this.name,
            'securewatch.confidence': (event.custom?.confidence || 0.8) / 100,
            'securewatch.severity': this.mapSeverityFromLevel(fields.level)
        };
        // Add threat-specific fields for IPS logs
        if (messagePattern?.category === 'ips') {
            Object.assign(normalized, {
                'threat.indicator.name': fields.threat_name,
                'threat.indicator.type': 'unknown',
                'threat.software.type': 'ips'
            });
        }
        // Add authentication-specific fields
        if (messagePattern?.category === 'authentication') {
            Object.assign(normalized, {
                'authentication.type': fields.auth_type,
                'authentication.success': this.isAuthSuccess(messageId),
                'authentication.failure_reason': fields.failure_reason
            });
        }
        // Add VPN-specific fields
        if (messagePattern?.category === 'vpn') {
            Object.assign(normalized, {
                'network.tunnel.id': fields.tunnel_id,
                'network.tunnel.type': 'vpn'
            });
        }
        return normalized;
    }
    extractTimestamp(rawLog) {
        // Try to extract timestamp from syslog header
        const timestampPatterns = [
            // Standard syslog: Jan 15 14:30:15
            /(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})/,
            // With year: Jan 15 2024 14:30:15
            /(\w{3}\s+\d{1,2}\s+\d{4}\s+\d{2}:\d{2}:\d{2})/,
            // ISO format: 2024-01-15T14:30:15
            /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/
        ];
        for (const pattern of timestampPatterns) {
            const match = rawLog.match(pattern);
            if (match) {
                const dateStr = match[1];
                try {
                    // Handle different timestamp formats
                    if (dateStr.includes('T')) {
                        return new Date(dateStr);
                    }
                    else if (dateStr.includes(' 2')) {
                        // Has year
                        return new Date(dateStr);
                    }
                    else {
                        // No year, assume current year
                        const currentYear = new Date().getFullYear();
                        return new Date(`${dateStr} ${currentYear}`);
                    }
                }
                catch {
                    // Fall through to default
                }
            }
        }
        return new Date(); // Default to current time
    }
    parseMessageFields(messageId, messageText) {
        const fields = {};
        // Common field extraction patterns
        const patterns = {
            // IP addresses and ports
            src: /(?:src|from)\s+(?:[\w-]+:)?([^/\s]+)(?:\/(\d+))?/i,
            dst: /(?:dst|to)\s+(?:[\w-]+:)?([^/\s]+)(?:\/(\d+))?/i,
            // Connection info
            conn_id: /connection\s+(\d+)/i,
            protocol: /\b(tcp|udp|icmp|gre)\b/i,
            // Traffic metrics
            bytes: /bytes?\s+(\d+)/i,
            packets: /packets?\s+(\d+)/i,
            duration: /duration\s+([\d:]+)/i,
            // Access control
            access_group: /access-group\s+"([^"]+)"/i,
            // User information
            user: /user\s+([^\s,]+)/i,
            username: /username\s+([^\s,]+)/i,
            // VPN information
            tunnel_id: /tunnel-id\s+(\d+)/i,
            // URLs and domains
            url: /URL\s+([^\s]+)/i,
            fqdn: /FQDN\s+([^\s]+)/i,
            // Interfaces and zones
            src_interface: /(?:src|from)\s+([\w-]+):/i,
            dst_interface: /(?:dst|to)\s+([\w-]+):/i
        };
        // Extract fields using patterns
        for (const [fieldName, pattern] of Object.entries(patterns)) {
            const match = messageText.match(pattern);
            if (match) {
                fields[fieldName] = match[1];
                // Handle port extraction for src/dst
                if ((fieldName === 'src' || fieldName === 'dst') && match[2]) {
                    fields[`${fieldName.slice(0, -1)}port`] = match[2]; // sport/dport
                }
            }
        }
        // Message-specific parsing based on message ID
        switch (messageId) {
            case '302013':
            case '302015':
            case '302020':
                // Built connection messages
                this.parseConnectionBuilt(messageText, fields);
                break;
            case '302014':
            case '302016':
            case '302021':
                // Teardown connection messages
                this.parseConnectionTeardown(messageText, fields);
                break;
            case '106001':
            case '106006':
            case '106007':
            case '106014':
            case '106015':
            case '106021':
            case '106023':
                // ACL deny messages
                this.parseACLDeny(messageText, fields);
                break;
            case '109005':
            case '109006':
            case '109007':
            case '109008':
                // Authentication messages
                this.parseAuthentication(messageText, fields);
                break;
        }
        return fields;
    }
    parseConnectionBuilt(messageText, fields) {
        // Built outbound TCP connection 12345 for outside:10.1.1.1/80 (10.1.1.1/80) to inside:192.168.1.100/12345 (192.168.1.100/12345)
        const connPattern = /Built\s+(inbound|outbound)\s+(\w+)\s+connection\s+(\d+)\s+for\s+([\w-]+):([^/\s]+)\/(\d+)\s+\(([^)]+)\)\s+to\s+([\w-]+):([^/\s]+)\/(\d+)\s+\(([^)]+)\)/i;
        const match = messageText.match(connPattern);
        if (match) {
            const [, direction, protocol, connId, srcZone, srcIp, srcPort, srcMapped, dstZone, dstIp, dstPort, dstMapped] = match;
            fields.direction = direction;
            fields.protocol = protocol;
            fields.conn_id = connId;
            fields.src_zone = srcZone;
            fields.src = srcIp;
            fields.sport = srcPort;
            fields.mapped_src = srcMapped.split('/')[0];
            fields.mapped_sport = srcMapped.split('/')[1];
            fields.dst_zone = dstZone;
            fields.dst = dstIp;
            fields.dport = dstPort;
            fields.mapped_dst = dstMapped.split('/')[0];
            fields.mapped_dport = dstMapped.split('/')[1];
        }
    }
    parseConnectionTeardown(messageText, fields) {
        // Teardown TCP connection 12345 for outside:10.1.1.1/80 to inside:192.168.1.100/12345 duration 0:01:30 bytes 1234 TCP FINs
        const teardownPattern = /Teardown\s+(\w+)\s+connection\s+(\d+)\s+for\s+([\w-]+):([^/\s]+)\/(\d+)\s+to\s+([\w-]+):([^/\s]+)\/(\d+)(?:\s+duration\s+([\d:]+))?(?:\s+bytes\s+(\d+))?/i;
        const match = messageText.match(teardownPattern);
        if (match) {
            const [, protocol, connId, srcZone, srcIp, srcPort, dstZone, dstIp, dstPort, duration, bytes] = match;
            fields.protocol = protocol;
            fields.conn_id = connId;
            fields.src_zone = srcZone;
            fields.src = srcIp;
            fields.sport = srcPort;
            fields.dst_zone = dstZone;
            fields.dst = dstIp;
            fields.dport = dstPort;
            if (duration)
                fields.duration = duration;
            if (bytes)
                fields.bytes = bytes;
        }
    }
    parseACLDeny(messageText, fields) {
        // Deny tcp src outside:192.168.1.100/12345 dst inside:10.1.1.1/22 by access-group "outside_access_in"
        const aclPattern = /Deny\s+(\w+)\s+src\s+([\w-]+):([^/\s]+)\/(\d+)\s+dst\s+([\w-]+):([^/\s]+)\/(\d+)(?:\s+by\s+access-group\s+"([^"]+)")?/i;
        const match = messageText.match(aclPattern);
        if (match) {
            const [, protocol, srcZone, srcIp, srcPort, dstZone, dstIp, dstPort, accessGroup] = match;
            fields.protocol = protocol;
            fields.src_zone = srcZone;
            fields.src = srcIp;
            fields.sport = srcPort;
            fields.dst_zone = dstZone;
            fields.dst = dstIp;
            fields.dport = dstPort;
            if (accessGroup)
                fields.access_group = accessGroup;
        }
    }
    parseAuthentication(messageText, fields) {
        // Authentication succeeded for user 'admin' from 192.168.1.100/12345 to 10.1.1.1/80 on interface outside
        const authPattern = /Authentication\s+(succeeded|failed)\s+for\s+user\s+'([^']+)'\s+from\s+([^/\s]+)\/(\d+)\s+to\s+([^/\s]+)\/(\d+)(?:\s+on\s+interface\s+([\w-]+))?/i;
        const match = messageText.match(authPattern);
        if (match) {
            const [, result, user, srcIp, srcPort, dstIp, dstPort, interfaceName] = match;
            fields.auth_result = result;
            fields.user = user;
            fields.src = srcIp;
            fields.sport = srcPort;
            fields.dst = dstIp;
            fields.dport = dstPort;
            if (interfaceName)
                fields.src_interface = interfaceName;
        }
    }
    calculateConfidence(messageId, fields) {
        let confidence = 80; // Base confidence for ASA logs
        // Known message IDs get higher confidence
        if (this.messagePatterns[messageId]) {
            confidence += 10;
        }
        // Complete field extraction increases confidence
        const importantFields = ['src', 'dst', 'protocol'];
        const extractedFields = importantFields.filter(field => fields[field]);
        confidence += (extractedFields.length / importantFields.length) * 10;
        return Math.min(confidence, 95);
    }
    mapCategory(category) {
        switch (category) {
            case 'connection': return 'network';
            case 'access': return 'network';
            case 'authentication': return 'authentication';
            case 'vpn': return 'network';
            case 'ips': return 'malware';
            case 'system': return 'configuration';
            default: return 'network';
        }
    }
    determineOutcome(messageId, messageText) {
        const messagePattern = this.messagePatterns[messageId];
        if (messagePattern?.action.includes('deny') || messagePattern?.action.includes('failure') || messagePattern?.action.includes('failed')) {
            return 'failure';
        }
        if (messagePattern?.action.includes('built') || messagePattern?.action.includes('success') || messagePattern?.action.includes('allow')) {
            return 'success';
        }
        // Check message text for outcome indicators
        if (messageText.toLowerCase().includes('denied') || messageText.toLowerCase().includes('failed') || messageText.toLowerCase().includes('error')) {
            return 'failure';
        }
        if (messageText.toLowerCase().includes('allowed') || messageText.toLowerCase().includes('succeeded') || messageText.toLowerCase().includes('built')) {
            return 'success';
        }
        return 'unknown';
    }
    mapSeverityFromLevel(level) {
        const levelNum = typeof level === 'string' ? parseInt(level, 10) : level;
        switch (levelNum) {
            case 0:
            case 1:
            case 2: return 'critical';
            case 3: return 'high';
            case 4:
            case 5: return 'medium';
            case 6:
            case 7: return 'low';
            default: return 'low';
        }
    }
    mapSeverityToNumber(level) {
        const levelNum = typeof level === 'string' ? parseInt(level, 10) : level;
        switch (levelNum) {
            case 0:
            case 1:
            case 2: return 90;
            case 3: return 70;
            case 4:
            case 5: return 50;
            case 6:
            case 7: return 30;
            default: return 30;
        }
    }
    getEventCategory(category) {
        switch (category) {
            case 'connection': return ['network'];
            case 'access': return ['network'];
            case 'authentication': return ['authentication'];
            case 'vpn': return ['network'];
            case 'ips': return ['malware', 'intrusion_detection'];
            case 'system': return ['configuration'];
            default: return ['network'];
        }
    }
    getEventType(action, fields) {
        if (!action)
            return ['info'];
        if (action.includes('built') || action.includes('start'))
            return ['start', 'connection'];
        if (action.includes('teardown') || action.includes('end'))
            return ['end', 'connection'];
        if (action.includes('deny'))
            return ['denied'];
        if (action.includes('allow'))
            return ['allowed'];
        if (action.includes('auth_success'))
            return ['start'];
        if (action.includes('auth_failure'))
            return ['start'];
        if (action.includes('threat'))
            return ['info'];
        return ['info'];
    }
    mapOutcome(action, fields) {
        if (action.includes('deny') || action.includes('failure') || action.includes('failed')) {
            return 'failure';
        }
        if (action.includes('allow') || action.includes('built') || action.includes('success')) {
            return 'success';
        }
        return 'unknown';
    }
    mapDirection(direction) {
        if (!direction)
            return 'unknown';
        const dirLower = direction.toLowerCase();
        if (dirLower === 'inbound')
            return 'inbound';
        if (dirLower === 'outbound')
            return 'outbound';
        return 'unknown';
    }
    parsePort(portStr) {
        if (!portStr || portStr === '0')
            return undefined;
        const port = parseInt(portStr, 10);
        return isNaN(port) ? undefined : port;
    }
    parseNumber(numStr) {
        if (!numStr || numStr === '')
            return undefined;
        const num = parseInt(numStr, 10);
        return isNaN(num) ? undefined : num;
    }
    parseDuration(durationStr) {
        if (!durationStr)
            return undefined;
        // Parse duration in format H:MM:SS or MM:SS
        const parts = durationStr.split(':').map(p => parseInt(p, 10));
        if (parts.length === 3) {
            // H:MM:SS
            return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000000000; // nanoseconds
        }
        else if (parts.length === 2) {
            // MM:SS
            return (parts[0] * 60 + parts[1]) * 1000000000; // nanoseconds
        }
        return undefined;
    }
    isAuthSuccess(messageId) {
        return ['109005', '113005'].includes(messageId);
    }
}
//# sourceMappingURL=CiscoASAFirewallParser.js.map