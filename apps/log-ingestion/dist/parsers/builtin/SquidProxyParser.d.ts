import { LogParser, ParsedEvent, NormalizedEvent, ParserConfig } from '../types';
/**
 * Squid Proxy Access Log Parser
 *
 * Parses the native log format for Squid, a widely used open-source
 * web proxy. This format is space-delimited.
 * Format: timestamp elapsed client action/code size method URL user hierarchy/host content-type
 */
export declare class SquidProxyParser implements LogParser {
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
    private readonly squidRegex;
    validate(rawLog: string): boolean;
    parse(rawLog: string): ParsedEvent | null;
    normalize(event: ParsedEvent): NormalizedEvent;
    private mapSeverityToNumber;
}
//# sourceMappingURL=SquidProxyParser.d.ts.map