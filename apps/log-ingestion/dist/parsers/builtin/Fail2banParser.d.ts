import { LogParser, ParsedEvent, NormalizedEvent, ParserConfig } from '../types';
/**
 * Fail2ban Log Parser
 *
 * Parses logs from Fail2ban, an intrusion prevention software framework that
 * protects computer servers from brute-force attacks.
 */
export declare class Fail2banParser implements LogParser {
    id: string;
    name: string;
    vendor: string;
    logSource: string;
    version: string;
    format: "syslog";
    category: "host";
    priority: number;
    enabled: boolean;
    config: ParserConfig;
    private readonly fail2banRegex;
    validate(rawLog: string): boolean;
    parse(rawLog: string): ParsedEvent | null;
    normalize(event: ParsedEvent): NormalizedEvent;
    private mapSeverityToNumber;
}
//# sourceMappingURL=Fail2banParser.d.ts.map