import { LogParser, ParsedEvent, NormalizedEvent, ParserConfig } from '../types';
/**
 * Suricata IDS/IPS Parser
 *
 * Parses EVE JSON output from Suricata, a high-performance Network Intrusion
 * Detection and Prevention System. This parser handles various event types
 * including 'alert', 'http', 'dns', 'tls', and 'fileinfo'.
 */
export declare class SuricataIDSParser implements LogParser {
    id: string;
    name: string;
    vendor: string;
    logSource: string;
    version: string;
    format: "json";
    category: "network";
    priority: number;
    enabled: boolean;
    config: ParserConfig;
    validate(rawLog: string): boolean;
    parse(rawLog: string): ParsedEvent | null;
    normalize(event: ParsedEvent): NormalizedEvent;
    private mapSeverity;
    private mapSeverityToNumber;
}
//# sourceMappingURL=SuricataIDSParser.d.ts.map