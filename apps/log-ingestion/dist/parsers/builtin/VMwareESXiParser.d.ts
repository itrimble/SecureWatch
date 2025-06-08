import { LogParser, ParsedEvent, NormalizedEvent, ParserConfig } from '../types';
/**
 * VMware vSphere/ESXi Parser
 *
 * Parses syslog-formatted logs from VMware ESXi hosts and vCenter servers.
 * It identifies key event types like hostd, vpxa, and vmkernel messages.
 */
export declare class VMwareESXiParser implements LogParser {
    id: string;
    name: string;
    vendor: string;
    logSource: string;
    version: string;
    format: "syslog";
    category: "endpoint";
    priority: number;
    enabled: boolean;
    config: ParserConfig;
    private readonly syslogRegex;
    validate(rawLog: string): boolean;
    parse(rawLog: string): ParsedEvent | null;
    normalize(event: ParsedEvent): NormalizedEvent;
}
//# sourceMappingURL=VMwareESXiParser.d.ts.map