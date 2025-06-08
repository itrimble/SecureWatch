/**
 * Okta Identity and Access Management (IAM) Parser
 *
 * Parses JSON-formatted logs from the Okta Identity Cloud. These logs are typically
 * forwarded via Syslog but contain a rich JSON payload covering user authentication,
 * application access, and administrative changes.
 */
export class OktaIAMParser {
    id = 'okta-iam';
    name = 'Okta IAM';
    vendor = 'Okta';
    logSource = 'okta:iam';
    version = '1.0.0';
    format = 'json';
    category = 'identity';
    priority = 90;
    enabled = true;
    config = {
        enabled: true,
        priority: 90,
        timeout: 5000,
        maxSize: 100000,
    };
    validate(rawLog) {
        try {
            const data = JSON.parse(rawLog);
            return data.eventType && data.actor && data.client;
        }
        catch (error) {
            // It might be a syslog message wrapping JSON
            const match = rawLog.match(/{.*}/);
            if (match) {
                try {
                    const data = JSON.parse(match[0]);
                    return data.eventType && data.actor && data.client;
                }
                catch (e) {
                    return false;
                }
            }
            return false;
        }
    }
    parse(rawLog) {
        try {
            let jsonLog = rawLog;
            const match = rawLog.match(/{.*}/);
            if (match) {
                jsonLog = match[0];
            }
            const data = JSON.parse(jsonLog);
            return {
                timestamp: new Date(data.published),
                source: 'okta',
                category: 'identity',
                action: data.eventType,
                outcome: data.outcome?.result.toLowerCase() || 'unknown',
                severity: data.severity?.toLowerCase() || 'low',
                rawData: rawLog,
                custom: {
                    okta: data
                }
            };
        }
        catch (error) {
            console.error('Error parsing Okta log:', error);
            return null;
        }
    }
    normalize(event) {
        const data = event.custom.okta;
        return {
            '@timestamp': event.timestamp.toISOString(),
            'message': data.displayMessage,
            'event.kind': 'event',
            'event.category': ['identity', 'authentication'],
            'event.type': ['info', 'user', 'access'],
            'event.action': event.action,
            'event.outcome': event.outcome,
            'event.severity': this.mapSeverityToNumber(event.severity),
            'log.level': event.severity,
            'log.original': event.rawData,
            'cloud.provider': 'okta',
            'user.id': data.actor.id,
            'user.name': data.actor.alternateId,
            'source.ip': data.client.ipAddress,
            'source.geo.city_name': data.client.geographicalContext?.city,
            'source.geo.country_name': data.client.geographicalContext?.country,
            'user_agent.original': data.client.userAgent?.rawUserAgent,
            'observer.vendor': this.vendor,
            'observer.product': 'Okta Identity Cloud',
            'observer.type': 'saas',
            'securewatch.parser.id': this.id,
            'securewatch.parser.name': this.name,
            'securewatch.parser.version': this.version,
            'securewatch.confidence': 0.90,
            'securewatch.severity': event.severity,
        };
    }
    mapSeverityToNumber(severity) {
        const mapping = { 'low': 25, 'medium': 50, 'high': 75, 'critical': 100 };
        return mapping[severity] || 25;
    }
}
//# sourceMappingURL=OktaIAMParser.js.map