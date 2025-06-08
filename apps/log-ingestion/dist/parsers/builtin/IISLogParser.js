/**
 * Microsoft Internet Information Services (IIS) Log Parser
 *
 * Parses W3C Extended Log Format files from IIS. This format is space-delimited
 * and the fields can vary depending on the server configuration. This parser
 * attempts to handle the most common fields.
 */
export class IISLogParser {
    id = 'microsoft-iis';
    name = 'Microsoft IIS Log Parser';
    vendor = 'Microsoft';
    logSource = 'iis:access';
    version = '1.0.0';
    format = 'custom';
    category = 'web';
    priority = 75;
    enabled = true;
    config = {
        enabled: true,
        priority: 75,
        timeout: 5000,
        maxSize: 50000,
    };
    // Default IIS log fields
    fields = [
        'date', 'time', 's-ip', 'cs-method', 'cs-uri-stem', 'cs-uri-query',
        's-port', 'cs-username', 'c-ip', 'cs(User-Agent)', 'cs(Referer)',
        'sc-status', 'sc-substatus', 'sc-win32-status', 'time-taken'
    ];
    validate(rawLog) {
        // IIS logs typically start with a date in YYYY-MM-DD format, or a #Fields directive
        return /^\d{4}-\d{2}-\d{2}/.test(rawLog) || rawLog.startsWith('#Fields:');
    }
    parse(rawLog) {
        if (rawLog.startsWith('#')) {
            if (rawLog.startsWith('#Fields:')) {
                this.fields = rawLog.substring(9).trim().split(' ');
            }
            return null; // Skip comment lines
        }
        const values = rawLog.split(' ');
        const data = {};
        this.fields.forEach((field, index) => {
            data[field] = values[index] || '-';
        });
        const status = parseInt(data['sc-status'], 10);
        const event = {
            timestamp: new Date(`${data.date}T${data.time}Z`),
            source: data['s-ip'],
            category: 'web',
            action: 'http_request',
            outcome: status >= 400 ? 'failure' : 'success',
            severity: status >= 500 ? 'high' : (status >= 400 ? 'medium' : 'low'),
            rawData: rawLog,
            custom: {
                iis: data
            }
        };
        return event;
    }
    normalize(event) {
        const data = event.custom.iis;
        const normalized = {
            '@timestamp': event.timestamp.toISOString(),
            'event.kind': 'event',
            'event.category': ['web', 'network'],
            'event.type': ['access'],
            'event.action': data['cs-method'],
            'event.outcome': event.outcome,
            'event.severity_name': event.severity,
            'event.severity': this.mapSeverityToNumber(event.severity),
            'event.duration': parseInt(data['time-taken'], 10) * 1000000, // to nanoseconds
            'http.request.method': data['cs-method'],
            'http.response.status_code': parseInt(data['sc-status'], 10),
            'url.full': `${data['s-ip']}:${data['s-port']}${data['cs-uri-stem']}`,
            'url.path': data['cs-uri-stem'],
            'url.query': data['cs-uri-query'] === '-' ? undefined : data['cs-uri-query'],
            'source.ip': data['c-ip'],
            'destination.ip': data['s-ip'],
            'destination.port': parseInt(data['s-port'], 10),
            'user.name': data['cs-username'] === '-' ? undefined : data['cs-username'],
            'user_agent.original': data['cs(User-Agent)'],
            'http.request.referrer': data['cs(Referer)'] === '-' ? undefined : data['cs(Referer)'],
            'observer.vendor': this.vendor,
            'observer.product': 'IIS',
            'observer.type': 'web-server',
            'securewatch.parser.id': this.id,
            'securewatch.parser.version': this.version,
            'securewatch.parser.name': this.name,
            'securewatch.confidence': 0.8,
            'securewatch.severity': event.severity,
            'raw_log': event.rawData,
        };
        return normalized;
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
//# sourceMappingURL=IISLogParser.js.map