import { LogParser, ParsedEvent, NormalizedEvent, ParserConfig } from '../types';
/**
 * Pi-hole DNS Parser
 *
 * Parses DNS query logs from Pi-hole, a popular open-source network-wide
 * ad blocker and DNS sinkhole.
 * Example Format: MMM DD HH:mm:ss dnsmasq[PID]: query[TYPE] domain.com from client-ip
 * Example Format: MMM DD HH:mm:ss dnsmasq[PID]: /etc/pihole/gravity.list domain.com is client-ip
 */
export declare class PiholeDnsParser implements LogParser {
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
//# sourceMappingURL=PiholeDnsParser.d.ts.map