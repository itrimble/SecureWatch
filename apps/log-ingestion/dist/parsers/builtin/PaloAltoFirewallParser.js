/**
 * Palo Alto Networks (PAN-OS) Firewall Parser
 *
 * Supports multiple PAN-OS log types including:
 * - Traffic logs (TRAFFIC)
 * - Threat logs (THREAT)
 * - Config logs (CONFIG)
 * - System logs (SYSTEM)
 * - GlobalProtect logs (GLOBALPROTECT)
 * - URL Filtering logs (URL)
 * - Data Filtering logs (DATA)
 * - Wildfire logs (WILDFIRE)
 * - Authentication logs (AUTHENTICATION)
 * - Decryption logs (DECRYPTION)
 *
 * PAN-OS logs are comma-separated with specific field positions
 * that vary by log type and PAN-OS version.
 */
export class PaloAltoFirewallParser {
    id = 'palo-alto-firewall';
    name = 'Palo Alto Networks PAN-OS Firewall';
    vendor = 'Palo Alto Networks';
    logSource = 'palo_alto_firewall';
    version = '1.0.0';
    format = 'syslog';
    category = 'network';
    priority = 85; // High priority for specific vendor
    enabled = true;
    config = {
        enabled: true,
        priority: 85,
        timeout: 5000,
        maxSize: 100000,
        patterns: ['TRAFFIC', 'THREAT', 'SYSTEM', 'CONFIG'],
        fieldMappings: {
            'source_address': 'source.ip',
            'destination_address': 'destination.ip',
            'rule_name': 'rule.name'
        },
        normalization: {
            timestampFormats: ['YYYY/MM/DD HH:mm:ss'],
            severityMapping: {
                'critical': 'critical',
                'high': 'high',
                'medium': 'medium',
                'low': 'low',
                'informational': 'low'
            },
            categoryMapping: {
                'TRAFFIC': 'network',
                'THREAT': 'malware',
                'SYSTEM': 'configuration'
            }
        },
        validation: {
            required: ['type', 'generate_time', 'source_address'],
            optional: ['threat_name', 'rule_name', 'application'],
            formats: {
                'timestamp': /^\d{4}\/\d{2}\/\d{2}\s\d{2}:\d{2}:\d{2}$/,
                'ip_address': /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/
            }
        }
    };
    metadata = {
        description: 'Parser for Palo Alto Networks PAN-OS firewall logs including traffic, threat, and system events',
        author: 'SecureWatch',
        tags: ['firewall', 'network-security', 'palo-alto', 'pan-os'],
        documentation: 'https://docs.paloaltonetworks.com/pan-os/10-0/pan-os-admin/monitoring/use-syslog-for-monitoring/syslog-field-descriptions',
        supportedVersions: ['8.0+', '9.0+', '10.0+', '11.0+'],
        testCases: [
            {
                name: 'PAN-OS Traffic Log',
                input: '1,2023/06/07 14:30:15,007054000116,TRAFFIC,end,2304,2023/06/07 14:30:15,192.168.1.100,203.0.113.50,0.0.0.0,0.0.0.0,Allow_All,,,web-browsing,vsys1,trust,untrust,ethernet1/1,ethernet1/2,Log to Panorama,2023/06/07 14:30:15,12345,1,443,443,0,tcp,"",allow,1234,567,890,2,2023/06/07 14:30:14,1,any,0,4294967295,0x0,10.0.0.0-10.255.255.255,10.0.0.0-10.255.255.255,0,,0,,N/A,0,0,0,0,,PA-VM,from-policy,,,0,,0,,N/A,,,,,,,,,0,0,0,0,0,,PA-VM,,,',
                expectedOutput: {
                    'event.category': ['network'],
                    'event.type': ['allowed', 'connection'],
                    'source.ip': '192.168.1.100',
                    'destination.ip': '203.0.113.50'
                },
                shouldPass: true
            },
            {
                name: 'PAN-OS Threat Log',
                input: '1,2023/06/07 14:30:15,007054000116,THREAT,spyware,2304,2023/06/07 14:30:15,192.168.1.100,203.0.113.50,0.0.0.0,0.0.0.0,Block_Malware,,,web-browsing,vsys1,trust,untrust,ethernet1/1,ethernet1/2,Log to Panorama,2023/06/07 14:30:15,12345,1,80,80,tcp,"",block-ip,C2/Generic-A,Threat Signature,informational,client-to-server,4294967295,"",N/A,0,,0,,N/A,,,0,,0x0,10.0.0.0-10.255.255.255,10.0.0.0-10.255.255.255,0,,,,,,,,PA-VM,7,default,,,,',
                expectedOutput: {
                    'event.category': ['malware', 'intrusion_detection'],
                    'threat.indicator.name': 'C2/Generic-A',
                    'source.ip': '192.168.1.100'
                },
                shouldPass: true
            }
        ]
    };
    // PAN-OS field mapping for different log types
    fieldMappings = {
        TRAFFIC: {
            // Standard fields (positions 0-12)
            0: 'future_use',
            1: 'receive_time',
            2: 'serial_number',
            3: 'type',
            4: 'threat_content_type',
            5: 'config_version',
            6: 'generate_time',
            7: 'source_address',
            8: 'destination_address',
            9: 'nat_source_ip',
            10: 'nat_destination_ip',
            11: 'rule_name',
            12: 'source_user',
            13: 'destination_user',
            14: 'application',
            15: 'virtual_system',
            16: 'source_zone',
            17: 'destination_zone',
            18: 'inbound_interface',
            19: 'outbound_interface',
            20: 'log_action',
            21: 'time_logged',
            22: 'session_id',
            23: 'repeat_count',
            24: 'source_port',
            25: 'destination_port',
            26: 'nat_source_port',
            27: 'nat_destination_port',
            28: 'flags',
            29: 'protocol',
            30: 'action',
            31: 'bytes',
            32: 'bytes_sent',
            33: 'bytes_received',
            34: 'packets',
            35: 'start_time',
            36: 'elapsed_time',
            37: 'category',
            38: 'sequence_number',
            39: 'action_flags',
            40: 'source_country',
            41: 'destination_country',
            42: 'packets_sent',
            43: 'packets_received',
            44: 'session_end_reason',
            45: 'device_group_hierarchy1',
            46: 'device_group_hierarchy2',
            47: 'device_group_hierarchy3',
            48: 'device_group_hierarchy4',
            49: 'virtual_system_name',
            50: 'device_name',
            51: 'action_source',
            52: 'source_vm_uuid',
            53: 'destination_vm_uuid',
            54: 'tunnel_id_imsi',
            55: 'monitor_tag_imei',
            56: 'parent_session_id',
            57: 'parent_start_time',
            58: 'tunnel_type'
        },
        THREAT: {
            0: 'future_use',
            1: 'receive_time',
            2: 'serial_number',
            3: 'type',
            4: 'threat_content_type',
            5: 'config_version',
            6: 'generate_time',
            7: 'source_address',
            8: 'destination_address',
            9: 'nat_source_ip',
            10: 'nat_destination_ip',
            11: 'rule_name',
            12: 'source_user',
            13: 'destination_user',
            14: 'application',
            15: 'virtual_system',
            16: 'source_zone',
            17: 'destination_zone',
            18: 'inbound_interface',
            19: 'outbound_interface',
            20: 'log_action',
            21: 'time_logged',
            22: 'session_id',
            23: 'repeat_count',
            24: 'source_port',
            25: 'destination_port',
            26: 'nat_source_port',
            27: 'nat_destination_port',
            28: 'flags',
            29: 'protocol',
            30: 'action',
            31: 'threat_name',
            32: 'category',
            33: 'severity',
            34: 'direction',
            35: 'sequence_number',
            36: 'action_flags',
            37: 'source_country',
            38: 'destination_country',
            39: 'content_type',
            40: 'pcap_id',
            41: 'file_digest',
            42: 'cloud',
            43: 'url_idx',
            44: 'user_agent',
            45: 'file_type',
            46: 'xff',
            47: 'referer',
            48: 'sender',
            49: 'subject',
            50: 'recipient',
            51: 'report_id',
            52: 'device_group_hierarchy1',
            53: 'device_group_hierarchy2',
            54: 'device_group_hierarchy3',
            55: 'device_group_hierarchy4',
            56: 'virtual_system_name',
            57: 'device_name',
            58: 'source_vm_uuid',
            59: 'destination_vm_uuid',
            60: 'http_method',
            61: 'tunnel_id_imsi',
            62: 'monitor_tag_imei',
            63: 'parent_session_id',
            64: 'parent_start_time',
            65: 'tunnel_type',
            66: 'threat_category',
            67: 'content_ver'
        },
        SYSTEM: {
            0: 'future_use',
            1: 'receive_time',
            2: 'serial_number',
            3: 'type',
            4: 'content_threat_type',
            5: 'config_version',
            6: 'generate_time',
            7: 'virtual_system',
            8: 'event_id',
            9: 'object',
            10: 'format',
            11: 'description',
            12: 'sequence_number',
            13: 'action_flags',
            14: 'device_group_hierarchy1',
            15: 'device_group_hierarchy2',
            16: 'device_group_hierarchy3',
            17: 'device_group_hierarchy4',
            18: 'virtual_system_name',
            19: 'device_name'
        }
    };
    validate(rawLog) {
        if (!rawLog || typeof rawLog !== 'string')
            return false;
        // Remove syslog header if present
        const cleanedLog = this.extractPanLogFromSyslog(rawLog);
        // Basic format validation
        const fields = this.parseCSVLine(cleanedLog);
        if (fields.length < 10)
            return false;
        // Check for PAN-OS specific indicators
        const logType = fields[3]?.toUpperCase();
        const validLogTypes = ['TRAFFIC', 'THREAT', 'SYSTEM', 'CONFIG', 'GLOBALPROTECT', 'URL', 'DATA', 'WILDFIRE', 'AUTHENTICATION', 'DECRYPTION'];
        if (!validLogTypes.includes(logType))
            return false;
        // Validate timestamp format (field 1 or 6)
        const receiveTime = fields[1];
        const generateTime = fields[6];
        const panTimeRegex = /^\d{4}\/\d{2}\/\d{2}\s\d{2}:\d{2}:\d{2}$/;
        if (receiveTime && !panTimeRegex.test(receiveTime))
            return false;
        if (generateTime && !panTimeRegex.test(generateTime))
            return false;
        return true;
    }
    parse(rawLog) {
        try {
            if (!this.validate(rawLog))
                return null;
            const cleanedLog = this.extractPanLogFromSyslog(rawLog);
            const fields = this.parseCSVLine(cleanedLog);
            const logType = fields[3]?.toUpperCase();
            const mapping = this.fieldMappings[logType];
            if (!mapping) {
                // Fallback to TRAFFIC mapping for unknown types
                return this.parseGenericPanLog(fields, rawLog);
            }
            const event = {
                timestamp: this.parseTimestamp(fields[6] || fields[1]), // prefer generate_time over receive_time
                source: fields[7] || 'palo-alto-firewall',
                category: this.mapCategory(logType),
                action: fields[30] || logType.toLowerCase(),
                outcome: this.mapOutcome(fields[30]),
                severity: this.mapSeverity(fields[33], logType),
                rawData: rawLog,
                custom: {
                    parsedFields: this.extractFields(fields, mapping),
                    confidence: this.calculateConfidence(fields, logType),
                    metadata: {
                        parser: this.id,
                        logType: logType,
                        vendor: this.vendor,
                        deviceSerial: fields[2],
                        panOsVersion: this.detectPanOsVersion(fields),
                        fieldCount: fields.length
                    }
                }
            };
            return event;
        }
        catch (error) {
            console.error(`PAN-OS parser error:`, error);
            return null;
        }
    }
    normalize(event) {
        const fields = event.custom?.parsedFields || {};
        const logType = event.custom?.metadata?.logType?.toUpperCase();
        // Base ECS normalization
        const normalized = {
            '@timestamp': event.timestamp.toISOString(),
            'event.kind': 'event',
            'event.category': this.getEventCategory(logType, fields),
            'event.type': this.getEventType(logType, fields),
            'event.action': fields.action || fields.log_action,
            'event.outcome': this.mapOutcome(fields.action),
            'event.severity': this.mapSeverityToNumber(fields.severity, logType),
            'event.dataset': `${this.logSource}.${logType?.toLowerCase()}`,
            'event.module': 'palo_alto',
            'event.provider': this.vendor,
            // Network fields
            'source.ip': fields.source_address,
            'source.port': this.parsePort(fields.source_port),
            'source.user.name': fields.source_user,
            'source.geo.country_name': fields.source_country,
            'source.nat.ip': fields.nat_source_ip,
            'source.nat.port': this.parsePort(fields.nat_source_port),
            'destination.ip': fields.destination_address,
            'destination.port': this.parsePort(fields.destination_port),
            'destination.user.name': fields.destination_user,
            'destination.geo.country_name': fields.destination_country,
            'destination.nat.ip': fields.nat_destination_ip,
            'destination.nat.port': this.parsePort(fields.nat_destination_port),
            'network.protocol': fields.protocol?.toLowerCase(),
            'network.bytes': this.parseNumber(fields.bytes),
            'network.packets': this.parseNumber(fields.packets),
            'network.direction': this.mapDirection(fields.direction),
            // Application fields
            'network.application': fields.application,
            'url.original': fields.url,
            'http.request.method': fields.http_method,
            'user_agent.original': fields.user_agent,
            // Observer (firewall) fields
            'observer.vendor': this.vendor,
            'observer.product': 'PAN-OS',
            'observer.name': fields.device_name,
            'observer.serial_number': fields.serial_number || event.custom?.metadata?.deviceSerial,
            'observer.ingress.interface.name': fields.inbound_interface,
            'observer.egress.interface.name': fields.outbound_interface,
            'observer.ingress.zone': fields.source_zone,
            'observer.egress.zone': fields.destination_zone,
            // Rule and policy fields
            'rule.name': fields.rule_name,
            'rule.category': fields.category,
            // Session fields
            'network.session.id': fields.session_id,
            'event.duration': this.parseNumber(fields.elapsed_time) * 1000000000, // convert to nanoseconds
            // SecureWatch specific fields
            'securewatch.parser.id': this.id,
            'securewatch.parser.version': this.version,
            'securewatch.parser.name': this.name,
            'securewatch.confidence': (event.custom?.confidence || 0.8) / 100, // Convert to 0-1 scale
            'securewatch.severity': this.mapSeverity(fields.severity, logType)
        };
        // Add threat-specific fields for THREAT logs
        if (logType === 'THREAT') {
            Object.assign(normalized, {
                'threat.indicator.name': fields.threat_name,
                'threat.indicator.type': this.mapThreatType(fields.threat_content_type),
                'threat.software.type': fields.threat_category,
                'file.hash.sha256': fields.file_digest,
                'file.type': fields.file_type,
                'email.from.address': fields.sender,
                'email.to.address': fields.recipient,
                'email.subject': fields.subject,
                'http.request.referrer': fields.referer
            });
            // MITRE ATT&CK mapping for threats
            const attackMapping = this.mapToMitreAttack(fields.threat_name, fields.category);
            if (attackMapping) {
                Object.assign(normalized, attackMapping);
            }
        }
        // Add system-specific fields for SYSTEM logs
        if (logType === 'SYSTEM') {
            Object.assign(normalized, {
                'event.id': fields.event_id,
                'message': fields.description,
                'log.level': this.mapSystemLogLevel(fields.event_id)
            });
        }
        return normalized;
    }
    extractPanLogFromSyslog(rawLog) {
        // Remove syslog header and extract PAN-OS log portion
        const panLogMatch = rawLog.match(/^(?:<\d+>)?\w+\s+\d+\s+\d{2}:\d{2}:\d{2}\s+[\w.-]+\s+(.+)$/);
        return panLogMatch ? panLogMatch[1] : rawLog;
    }
    parseCSVLine(line) {
        const fields = [];
        let current = '';
        let inQuotes = false;
        let i = 0;
        while (i < line.length) {
            const char = line[i];
            if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
                inQuotes = !inQuotes;
            }
            else if (char === ',' && !inQuotes) {
                fields.push(current.trim());
                current = '';
            }
            else {
                current += char;
            }
            i++;
        }
        fields.push(current.trim());
        return fields;
    }
    extractFields(fields, mapping) {
        const extracted = {};
        for (let i = 0; i < fields.length; i++) {
            const fieldName = mapping[i];
            if (fieldName && fields[i] && fields[i] !== '') {
                extracted[fieldName] = fields[i];
            }
        }
        return extracted;
    }
    parseTimestamp(timeStr) {
        if (!timeStr)
            return new Date();
        // PAN-OS format: YYYY/MM/DD HH:mm:ss
        const [datePart, timePart] = timeStr.split(' ');
        const [year, month, day] = datePart.split('/').map(Number);
        const [hour, minute, second] = timePart.split(':').map(Number);
        return new Date(year, month - 1, day, hour, minute, second);
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
    calculateConfidence(fields, logType) {
        let confidence = 80; // Base confidence for PAN-OS logs
        // Higher confidence for complete logs
        if (fields.length > 30)
            confidence += 10;
        // Known log types get higher confidence
        const knownTypes = ['TRAFFIC', 'THREAT', 'SYSTEM'];
        if (knownTypes.includes(logType))
            confidence += 5;
        // Valid timestamps increase confidence
        if (fields[1] && fields[6])
            confidence += 5;
        return Math.min(confidence, 95);
    }
    detectPanOsVersion(fields) {
        // Heuristics to detect PAN-OS version based on field count and content
        const fieldCount = fields.length;
        if (fieldCount > 65)
            return '11.0+';
        if (fieldCount > 60)
            return '10.0+';
        if (fieldCount > 50)
            return '9.0+';
        return '8.0+';
    }
    getEventCategory(logType, fields) {
        switch (logType) {
            case 'TRAFFIC': return ['network'];
            case 'THREAT': return ['malware', 'intrusion_detection'];
            case 'SYSTEM': return ['configuration'];
            case 'AUTHENTICATION': return ['authentication'];
            case 'GLOBALPROTECT': return ['authentication', 'network'];
            default: return ['network'];
        }
    }
    getEventType(logType, fields) {
        switch (logType) {
            case 'TRAFFIC':
                return fields?.action === 'allow' ? ['allowed', 'connection'] : ['denied', 'connection'];
            case 'THREAT':
                return ['info'];
            case 'SYSTEM':
                return ['info'];
            default:
                return ['info'];
        }
    }
    mapOutcome(action) {
        if (!action)
            return 'unknown';
        const actionLower = action.toLowerCase();
        if (['allow', 'permit'].includes(actionLower))
            return 'success';
        if (['deny', 'drop', 'block', 'reset'].includes(actionLower))
            return 'failure';
        return 'unknown';
    }
    mapDirection(direction) {
        if (!direction)
            return 'unknown';
        const dirLower = direction.toLowerCase();
        if (dirLower.includes('client-to-server'))
            return 'outbound';
        if (dirLower.includes('server-to-client'))
            return 'inbound';
        return 'unknown';
    }
    mapSeverity(severity, logType) {
        if (!severity)
            return 'low';
        const sevLower = severity.toLowerCase();
        if (['critical', 'high'].includes(sevLower))
            return 'high';
        if (['medium', 'informational'].includes(sevLower))
            return 'medium';
        if (['low'].includes(sevLower))
            return 'low';
        return 'low';
    }
    mapSeverityToNumber(severity, logType) {
        if (!severity)
            return 30;
        const sevLower = severity.toLowerCase();
        if (['critical'].includes(sevLower))
            return 90;
        if (['high'].includes(sevLower))
            return 70;
        if (['medium', 'informational'].includes(sevLower))
            return 50;
        if (['low'].includes(sevLower))
            return 30;
        return 30;
    }
    mapThreatType(threatContentType) {
        if (!threatContentType)
            return 'unknown';
        const typeLower = threatContentType.toLowerCase();
        if (typeLower.includes('virus'))
            return 'file';
        if (typeLower.includes('spyware'))
            return 'malware-sample';
        if (typeLower.includes('vulnerability'))
            return 'vulnerability';
        return 'unknown';
    }
    mapSystemLogLevel(eventId) {
        if (!eventId)
            return 'info';
        // PAN-OS system event ID mapping to log levels
        const criticalEvents = ['system-emergency', 'system-alert'];
        const errorEvents = ['system-critical', 'system-error'];
        const warningEvents = ['system-warning'];
        if (criticalEvents.some(e => eventId.includes(e)))
            return 'critical';
        if (errorEvents.some(e => eventId.includes(e)))
            return 'error';
        if (warningEvents.some(e => eventId.includes(e)))
            return 'warning';
        return 'info';
    }
    mapToMitreAttack(threatName, category) {
        if (!threatName && !category)
            return null;
        // Basic MITRE ATT&CK mapping for common PAN-OS threat categories
        const mappings = {
            'command-and-control': { technique: 'T1071', tactic: 'TA0011' },
            'malware': { technique: 'T1204', tactic: 'TA0002' },
            'spyware': { technique: 'T1056', tactic: 'TA0009' },
            'vulnerability': { technique: 'T1190', tactic: 'TA0001' },
            'trojan': { technique: 'T1204', tactic: 'TA0002' }
        };
        const key = category?.toLowerCase() || threatName?.toLowerCase() || '';
        const mapping = Object.keys(mappings).find(k => key.includes(k));
        if (mapping) {
            return {
                'threat.technique.id': [mappings[mapping].technique],
                'threat.technique.name': [threatName || category],
                'threat.tactic.id': [mappings[mapping].tactic]
            };
        }
        return null;
    }
    extractVendorSpecificFields(fields, logType) {
        // Extract PAN-OS specific fields that don't map to ECS
        const vendorFields = {
            pan_log_type: logType,
            virtual_system: fields.virtual_system,
            virtual_system_name: fields.virtual_system_name,
            device_group_hierarchy: [
                fields.device_group_hierarchy1,
                fields.device_group_hierarchy2,
                fields.device_group_hierarchy3,
                fields.device_group_hierarchy4
            ].filter(Boolean),
            action_flags: fields.action_flags,
            sequence_number: fields.sequence_number,
            repeat_count: fields.repeat_count,
            session_end_reason: fields.session_end_reason
        };
        // Add threat-specific vendor fields
        if (logType === 'THREAT') {
            Object.assign(vendorFields, {
                pcap_id: fields.pcap_id,
                cloud_service: fields.cloud,
                url_idx: fields.url_idx,
                report_id: fields.report_id,
                content_version: fields.content_ver,
                tunnel_type: fields.tunnel_type,
                tunnel_id: fields.tunnel_id_imsi,
                monitor_tag: fields.monitor_tag_imei
            });
        }
        // Remove empty values
        return Object.fromEntries(Object.entries(vendorFields).filter(([_, value]) => value !== undefined && value !== null && value !== ''));
    }
    parseGenericPanLog(fields, rawLog) {
        // Fallback parser for unknown PAN-OS log types
        return {
            timestamp: this.parseTimestamp(fields[6] || fields[1]),
            source: fields[7] || 'palo-alto-firewall',
            category: 'network',
            action: fields[3] || 'unknown',
            outcome: 'unknown',
            severity: 'low',
            rawData: rawLog,
            custom: {
                parsedFields: {
                    log_type: fields[3],
                    generate_time: fields[6],
                    serial_number: fields[2],
                    raw_fields: fields
                },
                confidence: 60, // Lower confidence for unknown types
                metadata: {
                    parser: this.id,
                    logType: fields[3],
                    vendor: this.vendor,
                    deviceSerial: fields[2],
                    fieldCount: fields.length,
                    note: 'Unknown log type - using generic parsing'
                }
            }
        };
    }
    mapCategory(logType) {
        switch (logType?.toUpperCase()) {
            case 'TRAFFIC': return 'network';
            case 'THREAT': return 'malware';
            case 'SYSTEM': return 'configuration';
            case 'AUTHENTICATION': return 'authentication';
            case 'GLOBALPROTECT': return 'authentication';
            default: return 'network';
        }
    }
}
//# sourceMappingURL=PaloAltoFirewallParser.js.map