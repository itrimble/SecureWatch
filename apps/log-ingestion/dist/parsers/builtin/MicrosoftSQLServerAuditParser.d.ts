import { LogParser, ParsedEvent, NormalizedEvent, ParserConfig } from '../types';
/**
 * Microsoft SQL Server Audit Parser
 *
 * Parses audit logs from MS SQL Server. The format can vary depending on the audit
 * destination (file, application log), but this parser focuses on key-value pairs
 * or structured text common in these logs.
 */
export declare class MicrosoftSQLServerAuditParser implements LogParser {
    id: string;
    name: string;
    vendor: string;
    logSource: string;
    version: string;
    format: "custom";
    category: "database";
    priority: number;
    enabled: boolean;
    config: ParserConfig;
    validate(rawLog: string): boolean;
    parse(rawLog: string): ParsedEvent | null;
    normalize(event: ParsedEvent): NormalizedEvent;
}
//# sourceMappingURL=MicrosoftSQLServerAuditParser.d.ts.map