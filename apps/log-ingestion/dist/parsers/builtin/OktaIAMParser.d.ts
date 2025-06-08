import { LogParser, ParsedEvent, NormalizedEvent, ParserConfig } from '../types';
/**
 * Okta Identity and Access Management (IAM) Parser
 *
 * Parses JSON-formatted logs from the Okta Identity Cloud. These logs are typically
 * forwarded via Syslog but contain a rich JSON payload covering user authentication,
 * application access, and administrative changes.
 */
export declare class OktaIAMParser implements LogParser {
    id: string;
    name: string;
    vendor: string;
    logSource: string;
    version: string;
    format: "json";
    category: "identity";
    priority: number;
    enabled: boolean;
    config: ParserConfig;
    validate(rawLog: string): boolean;
    parse(rawLog: string): ParsedEvent | null;
    normalize(event: ParsedEvent): NormalizedEvent;
    private mapSeverityToNumber;
}
//# sourceMappingURL=OktaIAMParser.d.ts.map