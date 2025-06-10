import { LogParser, ParsedEvent, NormalizedEvent, ParserConfig } from '../types';
/**
 * AdGuard Home DNS Parser
 *
 * Parses DNS query logs from AdGuard Home, a network-wide ad- and tracker-blocking
 * DNS server. Its logs are similar to Pi-hole but often in a more structured format.
 */
export declare class AdGuardHomeParser implements LogParser {
    id: string;
    name: string;
    vendor: string;
    logSource: string;
    version: string;
    format: "syslog";
    category: "network";
    priority: number;
    enabled: boolean;
    config: ParserConfig;
    private readonly queryRegex;
    private readonly blockRegex;
    validate(rawLog: string): boolean;
    parse(rawLog: string): ParsedEvent | null;
    normalize(event: ParsedEvent): NormalizedEvent;
    private mapSeverityToNumber;
}
//# sourceMappingURL=AdGuardHomeParser.d.ts.map