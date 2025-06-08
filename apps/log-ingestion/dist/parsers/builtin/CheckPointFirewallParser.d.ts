import { LogParser, ParsedEvent, NormalizedEvent, ParserConfig } from '../types';
/**
 * Check Point Firewall Parser
 *
 * Parses logs from Check Point firewalls, which typically use a semi-structured,
 * delimited format (often using semicolons).
 */
export declare class CheckPointFirewallParser implements LogParser {
    id: string;
    name: string;
    vendor: string;
    logSource: string;
    version: string;
    format: "custom";
    category: "network";
    priority: number;
    enabled: boolean;
    config: ParserConfig;
    validate(rawLog: string): boolean;
    parse(rawLog: string): ParsedEvent | null;
    normalize(event: ParsedEvent): NormalizedEvent;
    private parseKeyValue;
    private mapSeverityToNumber;
}
//# sourceMappingURL=CheckPointFirewallParser.d.ts.map