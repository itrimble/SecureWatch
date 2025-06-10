import { LogParser, ParsedEvent, NormalizedEvent, ParserConfig } from '../types';
/**
 * Linux Audit Daemon (auditd) Parser
 *
 * Parses logs from the Linux audit framework. These logs are typically in a
 * key-value pair format and provide highly detailed information about security-relevant
 * events on a system.
 */
export declare class AuditdLogParser implements LogParser {
    id: string;
    name: string;
    vendor: string;
    logSource: string;
    version: string;
    format: "custom";
    category: "host";
    priority: number;
    enabled: boolean;
    config: ParserConfig;
    validate(rawLog: string): boolean;
    parse(rawLog: string): ParsedEvent | null;
    normalize(event: ParsedEvent): NormalizedEvent;
    private parseKeyValue;
}
//# sourceMappingURL=AuditdLogParser.d.ts.map