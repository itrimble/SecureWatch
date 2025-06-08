/**
 * Microsoft SQL Server Audit Parser
 *
 * Parses audit logs from MS SQL Server. The format can vary depending on the audit
 * destination (file, application log), but this parser focuses on key-value pairs
 * or structured text common in these logs.
 */
export class MicrosoftSQLServerAuditParser {
    id = 'mssql-audit';
    name = 'Microsoft SQL Server Audit';
    vendor = 'Microsoft';
    logSource = 'mssql:audit';
    version = '1.0.0';
    format = 'custom';
    category = 'database';
    priority = 80;
    enabled = true;
    config = {
        enabled: true,
        priority: 80,
        timeout: 5000,
        maxSize: 50000,
    };
    validate(rawLog) {
        return rawLog.includes('Audit event:') && rawLog.includes('server principal name');
    }
    parse(rawLog) {
        try {
            const actionMatch = rawLog.match(/action_id:([A-Z]+)/);
            const userMatch = rawLog.match(/server principal name:([^\r\n]+)/);
            const outcomeMatch = rawLog.match(/succeeded:(\w+)/);
            const statementMatch = rawLog.match(/statement:([^\r\n]+)/);
            return {
                timestamp: new Date(), // NOTE: Timestamp extraction would need a more reliable method
                source: 'mssql-server',
                category: 'database',
                action: actionMatch ? actionMatch[1] : 'unknown',
                outcome: outcomeMatch && outcomeMatch[1] === 'true' ? 'success' : 'failure',
                severity: 'medium',
                rawData: rawLog,
                custom: {
                    mssql: {
                        user: userMatch ? userMatch[1].trim() : 'N/A',
                        statement: statementMatch ? statementMatch[1].trim() : 'N/A',
                    }
                }
            };
        }
        catch (e) {
            return null;
        }
    }
    normalize(event) {
        const data = event.custom.mssql;
        return {
            '@timestamp': event.timestamp.toISOString(),
            'message': `MSSQL audit: User '${data.user}' performed action '${event.action}'`,
            'event.kind': 'event',
            'event.category': ['database'],
            'event.type': ['info', 'access'],
            'event.action': event.action,
            'event.outcome': event.outcome,
            'event.severity': 50,
            'log.level': 'medium',
            'log.original': event.rawData,
            'db.system': 'mssql',
            'db.user.name': data.user,
            'db.statement': data.statement,
            'observer.vendor': this.vendor,
            'observer.product': 'SQL Server',
            'observer.type': 'database',
            'securewatch.parser.id': this.id,
            'securewatch.parser.name': this.name,
            'securewatch.parser.version': this.version,
            'securewatch.confidence': 0.85,
            'securewatch.severity': event.severity,
        };
    }
}
//# sourceMappingURL=MicrosoftSQLServerAuditParser.js.map