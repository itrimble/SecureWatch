/**
 * Squid Proxy Access Log Parser
 *
 * Parses the native log format for Squid, a widely used open-source
 * web proxy. This format is space-delimited.
 * Format: timestamp elapsed client action/code size method URL user hierarchy/host content-type
 */
export class SquidProxyParser {
    id = 'squid-proxy';
    name = 'Squid Proxy';
    vendor = 'Squid-Cache';
    logSource = 'squid:access';
    version = '1.0.0';
    format = 'custom';
    category = 'network';
    priority = 80;
    enabled = true;
    config = {
        enabled: true,
        priority: 80,
        timeout: 5000,
        maxSize: 50000,
    };
    squidRegex = /^(\d+\.\d+)\s+(\d+)\s+([\d\.]+)\s+([A-Z_]+)\/(\d+)\s+(\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\/(\S+)\s+(.+)$/;
    validate(rawLog) {
        return this.squidRegex.test(rawLog);
    }
    parse(rawLog) {
        const match = rawLog.match(this.squidRegex);
        if (!match)
            return null;
        const [, timestamp, elapsed, clientIp, actionCode, status, size, method, url, user, hierarchyHost, contentType] = match;
        const action = actionCode.split('/')[0];
        const statusCode = parseInt(status, 10);
        return {
            timestamp: new Date(parseFloat(timestamp) * 1000),
            source: 'squid-proxy',
            category: 'network',
            action: 'proxy_request',
            outcome: statusCode >= 400 ? 'failure' : 'success',
            severity: action.includes('DENIED') ? 'medium' : 'low',
            rawData: rawLog,
            custom: {
                squid: {
                    elapsed: parseInt(elapsed, 10),
                    clientIp,
                    action,
                    status: statusCode,
                    size: parseInt(size, 10),
                    method,
                    url,
                    user,
                    hierarchyHost,
                    contentType
                }
            }
        };
    }
    normalize(event) {
        const data = event.custom.squid;
        return {
            '@timestamp': event.timestamp.toISOString(),
            'message': `Squid proxy request from ${data.clientIp} to ${data.url} resulted in ${data.action}/${data.status}`,
            'event.kind': 'event',
            'event.category': ['network', 'web'],
            'event.type': ['access'],
            'event.action': event.action,
            'event.outcome': event.outcome,
            'event.duration': data.elapsed * 1000000, // ms to ns
            'event.severity': this.mapSeverityToNumber(event.severity),
            'log.level': event.severity,
            'log.original': event.rawData,
            'http.request.method': data.method,
            'http.response.status_code': data.status,
            'http.response.bytes': data.size,
            'url.full': data.url,
            'source.ip': data.clientIp,
            'user.name': data.user === '-' ? undefined : data.user,
            'observer.vendor': this.vendor,
            'observer.product': 'Squid',
            'observer.type': 'proxy',
            'securewatch.parser.id': this.id,
            'securewatch.parser.name': this.name,
            'securewatch.parser.version': this.version,
            'securewatch.confidence': 0.84,
            'securewatch.severity': event.severity,
        };
    }
    mapSeverityToNumber(severity) {
        const mapping = { 'low': 25, 'medium': 50, 'high': 75 };
        return mapping[severity] || 25;
    }
}
//# sourceMappingURL=SquidProxyParser.js.map