import { LogParser, ParsedEvent, NormalizedEvent, ParserConfig } from '../types';
/**
 * Microsoft 365 & Entra ID Parser
 *
 * Parses audit logs from the Microsoft 365 and Entra ID (formerly Azure AD) ecosystems.
 * This includes a wide variety of events such as user sign-ins, administrative actions,
 * mailbox access, and SharePoint/OneDrive file activities.
 */
export declare class Microsoft365EntraIDParser implements LogParser {
    id: string;
    name: string;
    vendor: string;
    logSource: string;
    version: string;
    format: "json";
    category: "cloud";
    priority: number;
    enabled: boolean;
    config: ParserConfig;
    validate(rawLog: string): boolean;
    parse(rawLog: string): ParsedEvent | null;
    normalize(event: ParsedEvent): NormalizedEvent;
    private mapSeverityToNumber;
}
//# sourceMappingURL=Microsoft365EntraIDParser.d.ts.map