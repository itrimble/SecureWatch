/**
 * Azure Activity Logs Parser
 *
 * Parses JSON-formatted logs from Azure Monitor. These logs cover a wide range of
 * activities, including administrative actions, service health events, and policy alerts.
 * The parser handles the complex, nested structure of Azure log records.
 */
export class AzureActivityLogsParser {
    id = 'azure-activity-logs';
    name = 'Azure Activity Logs';
    vendor = 'Microsoft';
    logSource = 'azure:activity';
    version = '1.0.0';
    format = 'json';
    category = 'cloud';
    priority = 88;
    enabled = true;
    config = {
        enabled: true,
        priority: 88,
        timeout: 5000,
        maxSize: 100000,
    };
    /**
     * Validates that the log is a valid JSON object and contains key Azure Activity Log fields.
     * @param rawLog The raw log string.
     * @returns True if the log is a valid Azure Activity Log, false otherwise.
     */
    validate(rawLog) {
        try {
            const data = JSON.parse(rawLog);
            return data.records && Array.isArray(data.records) && data.records.length > 0 &&
                data.records[0].category === 'Administrative';
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Parses the raw JSON log into a structured ParsedEvent object.
     * @param rawLog The raw log string.
     * @returns A ParsedEvent object or null if parsing fails.
     */
    parse(rawLog) {
        try {
            const data = JSON.parse(rawLog);
            const record = data.records[0]; // Process the first record in the bundle
            if (!record)
                return null;
            const event = {
                timestamp: new Date(record.time),
                source: record.properties?.service || 'azure',
                category: record.category.toLowerCase() || 'cloud',
                action: record.operationName,
                outcome: record.resultType === 'Success' ? 'success' : 'failure',
                severity: this.mapSeverity(record.level),
                rawData: rawLog,
                custom: {
                    azure: record
                }
            };
            return event;
        }
        catch (error) {
            console.error('Error parsing Azure Activity Log:', error);
            return null;
        }
    }
    /**
     * Normalizes the parsed event into the SecureWatch Common Event Format (SCEF).
     * @param event The parsed event object.
     * @returns A NormalizedEvent object.
     */
    normalize(event) {
        const record = event.custom.azure;
        const properties = record.properties || {};
        const normalized = {
            '@timestamp': event.timestamp.toISOString(),
            'event.kind': 'event',
            'event.category': [event.category, 'cloud'],
            'event.type': ['access'],
            'event.action': event.action,
            'event.outcome': event.outcome,
            'event.severity_name': event.severity,
            'event.severity': this.mapSeverityToNumber(event.severity),
            'cloud.provider': 'azure',
            'cloud.service.name': record.resourceId.split('/')[2] || 'unknown',
            'cloud.region': record.location,
            'cloud.account.id': properties.subscriptionId,
            'user.name': record.identity?.claims?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn'] || 'N/A',
            'source.ip': properties.clientIp,
            'observer.vendor': this.vendor,
            'observer.product': 'Azure Monitor',
            'observer.type': 'cloud',
            'securewatch.parser.id': this.id,
            'securewatch.parser.version': this.version,
            'securewatch.parser.name': this.name,
            'securewatch.confidence': 0.9,
            'securewatch.severity': event.severity,
            'raw_log': event.rawData,
        };
        return normalized;
    }
    mapSeverity(level) {
        const severity = level.toLowerCase();
        if (severity === 'critical' || severity === 'error')
            return 'high';
        if (severity === 'warning')
            return 'medium';
        return 'low';
    }
    mapSeverityToNumber(severity) {
        const mapping = {
            'low': 25,
            'medium': 50,
            'high': 75,
            'critical': 100
        };
        return mapping[severity] || 25;
    }
}
//# sourceMappingURL=AzureActivityParsers.js.map