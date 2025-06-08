/**
 * SentinelOne EDR Parser
 *
 * Parses endpoint detection and response (EDR) events from the
 * SentinelOne Singularity platform.
 */
export class SentinelOneEDRParser {
    id = 'sentinelone-edr';
    name = 'SentinelOne EDR';
    vendor = 'SentinelOne';
    logSource = 'sentinelone:edr';
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
            return data.agent && data.event && data.process;
        }
        catch (error) {
            return false;
        }
    }
    parse(rawLog) {
        try {
            const data = JSON.parse(rawLog);
            return {
                timestamp: new Date(data.createdAt),
                source: data.agent.name || 'unknown-host',
                category: 'endpoint',
                action: data.event.type,
                outcome: 'success',
                severity: 'medium',
                rawData: rawLog,
                custom: {
                    sentinelone: data
                }
            };
        }
        catch (error) {
            console.error('Error parsing SentinelOne log:', error);
            return null;
        }
    }
    normalize(event) {
        const data = event.custom.sentinelone;
        return {
            '@timestamp': event.timestamp.toISOString(),
            'message': `SentinelOne event: ${data.event.type} from process ${data.process.name} on ${data.agent.name}`,
            'event.kind': 'event',
            'event.category': ['endpoint', 'process'],
            'event.type': ['info'],
            'event.action': event.action,
            'event.outcome': event.outcome,
            'event.severity': 50,
            'log.level': event.severity,
            'log.original': event.rawData,
            'host.hostname': data.agent.name,
            'host.id': data.agent.uuid,
            'process.pid': data.process.pid,
            'process.executable': data.process.path,
            'process.command_line': data.process.commandLine,
            'user.name': data.process.user,
            'observer.vendor': this.vendor,
            'observer.product': 'SentinelOne Singularity',
            'observer.type': 'endpoint',
            'securewatch.parser.id': this.id,
            'securewatch.parser.name': this.name,
            'securewatch.parser.version': this.version,
            'securewatch.confidence': 0.92,
            'securewatch.severity': event.severity,
        };
    }
}
//# sourceMappingURL=SentinelOneEDRParser.js.map