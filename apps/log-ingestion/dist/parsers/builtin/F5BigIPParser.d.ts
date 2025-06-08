import { LogParser, ParsedEvent, NormalizedEvent, ParserConfig } from '../types';
/**
 * F5 BIG-IP Parser
 *
 * Parses logs from F5 BIG-IP devices, including Local Traffic Manager (LTM)
 * and Application Security Manager (ASM) events. Logs are typically sent
 * via syslog.
 */
export declare class F5BigIPParser implements LogParser {
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
    private readonly ltmRegex;
    private readonly asmRegex;
    validate(rawLog: string): boolean;
    parse(rawLog: string): ParsedEvent | null;
    normalize(event: ParsedEvent): NormalizedEvent;
    private mapSeverityToNumber;
}
//# sourceMappingURL=F5BigIPParser.d.ts.map