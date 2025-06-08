/**
 * CrowdStrike Falcon EDR Parser
 *
 * Parses detailed endpoint detection and response (EDR) events from the
 * CrowdStrike Falcon platform. It focuses on process creations, network connections,
 * and other security-relevant host activities.
 */
export class CrowdStrikeFalconEDRParser {
    id = 'crowdstrike-falcon-edr';
    name = 'CrowdStrike Falcon EDR';
    vendor = 'CrowdStrike';
    logSource = 'crowdstrike:edr';
    version = '1.0.0';
    format = 'json';
    category = 'endpoint';
    priority = 95;
    enabled = true;
    config = {
        enabled: true,
        priority: 95,
        timeout: 5000,
        maxSize: 100000,
    };
    validate(rawLog) {
        try {
            const data = JSON.parse(rawLog);
            return data.event_simpleName && data.ContextProcessId && data.SensorId;
        }
        catch (error) {
            return false;
        }
    }
    parse(rawLog) {
        try {
            const data = JSON.parse(rawLog);
            return {
                timestamp: new Date(data.timestamp),
                source: data.ComputerName || 'unknown-host',
                category: 'endpoint',
                action: data.event_simpleName,
                outcome: 'success', // EDR events are typically informational
                severity: this.mapSeverity(data.SeverityName),
                rawData: rawLog,
                custom: {
                    crowdstrike: data
                }
            };
        }
        catch (error) {
            console.error('Error parsing CrowdStrike log:', error);
            return null;
        }
    }
    normalize(event) {
        const data = event.custom.crowdstrike;
        return {
            '@timestamp': event.timestamp.toISOString(),
            'message': `CrowdStrike Event: ${event.action} on ${data.ComputerName}`,
            'event.kind': 'event',
            'event.category': ['endpoint', 'process'],
            'event.type': ['info'],
            'event.action': event.action,
            'event.outcome': event.outcome,
            'event.severity': this.mapSeverityToNumber(event.severity),
            'log.level': event.severity,
            'log.original': event.rawData,
            'host.hostname': data.ComputerName,
            'host.id': data.SensorId,
            'process.pid': data.ContextProcessId,
            'process.executable': data.FileName,
            'process.command_line': data.CommandLine,
            'user.name': data.UserName,
            'observer.vendor': this.vendor,
            'observer.product': 'Falcon',
            'observer.type': 'endpoint',
            'securewatch.parser.id': this.id,
            'securewatch.parser.name': this.name,
            'securewatch.parser.version': this.version,
            'securewatch.confidence': 0.92,
            'securewatch.severity': event.severity,
        };
    }
    mapSeverity(level) {
        const severity = level?.toLowerCase();
        if (severity === 'critical' || severity === 'high')
            return 'high';
        if (severity === 'medium' || severity === 'informational')
            return 'medium';
        return 'low';
    }
    mapSeverityToNumber(severity) {
        const mapping = { 'low': 25, 'medium': 50, 'high': 75, 'critical': 100 };
        return mapping[severity] || 25;
    }
}
//# sourceMappingURL=CrowdStrikeFalconEDRParser.js.map