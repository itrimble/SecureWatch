import { LogParser, ParsedEvent, NormalizedEvent, ParserConfig } from '../types';
/**
 * Splunk Universal Forwarder (UF) Parser
 *
 * This is a meta-parser designed to handle logs that have already been processed
 * and forwarded by a Splunk UF. It expects a standard Splunk format where
 * metadata like sourcetype, host, and index are available.
 */
export declare class SplunkUFParser implements LogParser {
    id: string;
    name: string;
    vendor: string;
    logSource: string;
    version: string;
    format: "custom";
    category: "application";
    priority: number;
    enabled: boolean;
    config: ParserConfig;
    validate(rawLog: string): boolean;
    parse(rawLog: string): ParsedEvent | null;
    normalize(event: ParsedEvent): NormalizedEvent;
    private parseKeyValue;
}
//# sourceMappingURL=SplunkUFParser.d.ts.map