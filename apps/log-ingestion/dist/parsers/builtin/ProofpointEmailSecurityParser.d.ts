import { LogParser, ParsedEvent, NormalizedEvent, ParserConfig } from '../types';
/**
 * Proofpoint Email Security Parser
 *
 * Parses structured syslog messages from the Proofpoint Protection Server,
 * focusing on email delivery status, spam/phishing classification, and threat detection.
 */
export declare class ProofpointEmailSecurityParser implements LogParser {
    id: string;
    name: string;
    vendor: string;
    logSource: string;
    version: string;
    format: "syslog";
    category: "application";
    priority: number;
    enabled: boolean;
    config: ParserConfig;
    private readonly filterRegex;
    validate(rawLog: string): boolean;
    parse(rawLog: string): ParsedEvent | null;
    normalize(event: ParsedEvent): NormalizedEvent;
    private mapSeverityToNumber;
}
//# sourceMappingURL=ProofpointEmailSecurityParser.d.ts.map