import { LogParser, ParsedEvent, NormalizedEvent, ParserConfig } from '../types';
/**
 * Zscaler Cloud Security Parser
 *
 * Parses logs from Zscaler Internet Access (ZIA), which are typically in a
 * key-value pair format and sent via Syslog.
 */
export declare class ZscalerCloudSecurityParser implements LogParser {
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
//# sourceMappingURL=ZscalerCloudSecurityParser.d.ts.map