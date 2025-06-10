/**
 * osquery Log Parser
 *
 * Parses JSON-formatted logs from osquery, an operating system instrumentation
 * framework that exposes an OS as a high-performance relational database.
 */
export class OsqueryLogParser {
    id = 'osquery';
    name = 'osquery';
    vendor = 'The Linux Foundation';
    logSource = 'osquery:result';
    version = '1.0.0';
    format = 'json';
    category = 'endpoint';
    priority = 88;
    enabled = true;
    config = {
        enabled: true,
        priority: 88,
        timeout: 5000,
        maxSize: 100000,
    };
    validate(rawLog) {
        try {
            const data = JSON.parse(rawLog);
            return data.name && data.hostIdentifier && data.calendarTime;
        }
        catch (error) {
            return false;
        }
    }
    parse(rawLog) {
        try {
            const data = JSON.parse(rawLog);
            return {
                timestamp: new Date(data.calendarTime),
                source: data.hostIdentifier,
                category: 'endpoint',
                action: data.name, // The name of the query
                outcome: 'success',
                severity: 'low',
                rawData: rawLog,
                custom: {
                    osquery: data
                }
            };
        }
        catch (error) {
            console.error('Error parsing osquery log:', error);
            return null;
        }
    }
    normalize(event) {
        const data = event.custom.osquery;
        const columns = data.columns || {};
        return {
            '@timestamp': event.timestamp.toISOString(),
            'message': `osquery query '${data.name}' executed on ${data.hostIdentifier}`,
            'event.kind': 'event',
            'event.category': ['endpoint'],
            'event.type': ['info'],
            'event.action': event.action,
            'event.outcome': event.outcome,
            'event.severity': 25,
            'log.level': 'low',
            'log.original': event.rawData,
            'host.hostname': data.hostIdentifier,
            'process.name': columns.name,
            'process.pid': columns.pid ? parseInt(columns.pid, 10) : undefined,
            'process.path': columns.path,
            'user.name': columns.username,
            'observer.vendor': this.vendor,
            'observer.product': 'osquery',
            'observer.type': 'endpoint',
            'securewatch.parser.id': this.id,
            'securewatch.parser.name': this.name,
            'securewatch.parser.version': this.version,
        };
    }
}
//# sourceMappingURL=OsqueryLogParser.js.map