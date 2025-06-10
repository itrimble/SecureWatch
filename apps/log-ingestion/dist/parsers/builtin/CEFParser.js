/**
 * Common Event Format (CEF) Parser
 * * Parses CEF messages, which are often transported over syslog.
 * CEF Format: CEF:Version|Device Vendor|Device Product|Device Version|Signature ID|Name|Severity|Extension
 */
export class CEFParser {
    id = 'cef-parser';
    name = 'Common Event Format (CEF)';
    vendor = 'ArcSight';
    logSource = 'cef';
    version = '1.0.0';
    format = 'syslog';
    category = 'network'; // Default, can be overridden by CEF fields
    priority = 90; // High priority for this specific format
    enabled = true;
    // Simplified regex to find the CEF header
    cefPattern = /CEF:\d+\|/;
    validate(rawLog) {
        return this.cefPattern.test(rawLog);
    }
    parse(rawLog) {
        const cefMatch = rawLog.match(/CEF:(\d+)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|(.*)/);
        if (!cefMatch) {
            return null;
        }
        const [, version, vendor, product, deviceVersion, signatureId, name, severity, extension] = cefMatch;
        const extensionFields = this.parseCEFExtension(extension);
        const event = {
            timestamp: new Date(), // CEF timestamp is often in the extension
            source: extensionFields.dvc || 'unknown',
            category: 'network', // Will be refined in normalization
            action: name || signatureId || 'unknown',
            outcome: this.getOutcome(extensionFields),
            severity: this.mapSeverity(severity),
            rawData: rawLog,
            custom: {
                cef: {
                    version,
                    vendor,
                    product,
                    deviceVersion,
                    signatureId,
                    name,
                    severity,
                    ...extensionFields
                }
            }
        };
        // Prefer timestamp from the extension if available
        const eventTimestamp = extensionFields.end || extensionFields.rt;
        if (eventTimestamp) {
            // Attempt to parse various timestamp formats
            const parsedTimestamp = new Date(isNaN(eventTimestamp) ? eventTimestamp : Number(eventTimestamp));
            if (!isNaN(parsedTimestamp.getTime())) {
                event.timestamp = parsedTimestamp;
            }
        }
        return event;
    }
    normalize(event) {
        const cef = event.custom?.cef || {};
        const normalized = {
            '@timestamp': event.timestamp.toISOString(),
            'event.kind': 'event',
            'event.category': this.mapToECSCategory(cef.cat),
            'event.type': ['info'],
            'event.action': cef.name || cef.signatureId,
            'event.outcome': event.outcome,
            'event.severity': this.mapSeverityToNumber(cef.severity),
            'event.provider': cef.vendor,
            'event.dataset': `${cef.product || 'cef'}.${cef.cat || 'generic'}`,
            'event.module': 'cef',
            'source.ip': cef.src,
            'source.port': cef.spt,
            'source.mac': cef.smac,
            'user.name': cef.suser,
            'destination.ip': cef.dst,
            'destination.port': cef.dpt,
            'destination.mac': cef.dmac,
            'user.target.name': cef.duser,
            'network.protocol': cef.proto,
            'network.transport': cef.proto,
            'network.bytes': cef.bytes,
            'network.packets': cef.pkts,
            'network.direction': this.mapDirection(cef.deviceDirection),
            'host.name': cef.dvc,
            'host.hostname': cef.dvchost,
            'rule.id': cef.signatureId,
            'rule.name': cef.name,
            'message': cef.msg || event.rawData,
            'securewatch.parser.id': this.id,
            'securewatch.parser.version': this.version,
            'securewatch.parser.name': this.name,
            'securewatch.confidence': 0.9,
            'securewatch.severity': event.severity,
        };
        // Clean up undefined fields
        Object.keys(normalized).forEach(key => (normalized[key] === undefined) && delete normalized[key]);
        return normalized;
    }
    parseCEFExtension(extension) {
        const fields = {};
        const regex = /(\w+)=((?:[\\]=|[^=])+)(?=\s\w+=|$)/g;
        let match;
        while ((match = regex.exec(extension)) !== null) {
            const key = match[1];
            const value = match[2].replace(/\\=/g, '=');
            fields[key] = value;
        }
        return fields;
    }
    mapSeverity(severity) {
        const severityNum = parseInt(severity, 10);
        if (isNaN(severityNum)) {
            const lowerSeverity = severity.toLowerCase();
            if (lowerSeverity === 'low')
                return 'low';
            if (lowerSeverity === 'medium')
                return 'medium';
            if (lowerSeverity === 'high')
                return 'high';
            if (lowerSeverity === 'very-high' || lowerSeverity === 'critical')
                return 'critical';
        }
        if (severityNum >= 9)
            return 'critical';
        if (severityNum >= 7)
            return 'high';
        if (severityNum >= 4)
            return 'medium';
        return 'low';
    }
    mapSeverityToNumber(severity) {
        switch (this.mapSeverity(severity)) {
            case 'critical': return 90;
            case 'high': return 75;
            case 'medium': return 50;
            case 'low': return 25;
            default: return 10;
        }
    }
    getOutcome(fields) {
        if (fields.outcome) {
            const outcome = fields.outcome.toLowerCase();
            if (outcome === 'success')
                return 'success';
            if (outcome === 'failure')
                return 'failure';
        }
        return 'unknown';
    }
    mapToECSCategory(category) {
        return category ? [category] : ['network'];
    }
    mapDirection(direction) {
        if (direction === 0 || direction === 'inbound')
            return 'inbound';
        if (direction === 1 || direction === 'outbound')
            return 'outbound';
        return undefined;
    }
}
//# sourceMappingURL=CEFParser.js.map