export { WindowsSecurityEventParser } from './WindowsSecurityEventParser';
export { SysmonEventParser } from './SysmonEventParser';
export { GenericSyslogParser } from './GenericSyslogParser';
export { ApacheAccessLogParser } from './ApacheAccessLogParser';
export { PaloAltoFirewallParser } from './PaloAltoFirewallParser';
export { CiscoASAFirewallParser } from './CiscoASAFirewallParser';
export { FortiGateFirewallParser } from './FortiGateFirewallParser';
export { CheckPointFirewallParser } from './CheckPointFirewallParser';
export { CrowdStrikeFalconEDRParser } from './CrowdStrikeFalconEDRParser';
export { F5BigIPParser } from './F5BigIPParser';
export { MicrosoftSQLServerAuditParser } from './MicrosoftSQLServerAuditParser';
export { OktaIAMParser } from './OktaIAMParser';
export { PfSenseFirewallParser } from './PfSenseFirewallParser';
export { PiholeDnsParser } from './PiholeDnsParser';
export { PostgreSQLAuditParser } from './PostgreSQLAuditParser';
export { ProofpointEmailSecurityParser } from './ProofpointEmailSecurityParser';
export { SentinelOneEDRParser } from './SentinelOneEDRParser';
export { SplunkUFParser } from './SplunkUFParser';
export { SquidProxyParser } from './SquidProxyParser';
export { VMwareESXiParser } from './VMwareESXiParser';
export { ZscalerCloudSecurityParser } from './ZscalerCloudSecurityParser';
export { LEEFParser } from './LEEFParser';
export { EnhancedJSONParser } from './EnhancedJSONParser';
export { AzureActivityLogsParser } from './AzureActivityParsers';
export { GoogleCloudAuditLogsParser } from './GoogleCloudAuditLogsParser';
export { Microsoft365EntraIDParser } from './Microsoft365EntraIDParser';
export { NginxLogParser } from './NginxLogParser';
export { IISLogParser } from './IISLogParser';
export declare class LinuxAuthLogParser {
    id: string;
    name: string;
    vendor: string;
    logSource: string;
    version: string;
    format: "syslog";
    category: "authentication";
    priority: number;
    enabled: boolean;
    validate(rawLog: string): boolean;
    parse(rawLog: string): any;
    normalize(event: any): any;
}
export declare class AWSCloudTrailParser {
    id: string;
    name: string;
    vendor: string;
    logSource: string;
    version: string;
    format: "json";
    category: "cloud";
    priority: number;
    enabled: boolean;
    validate(rawLog: string): boolean;
    parse(rawLog: string): any;
    normalize(event: any): any;
}
export declare class Office365AuditParser {
    id: string;
    name: string;
    vendor: string;
    logSource: string;
    version: string;
    format: "json";
    category: "cloud";
    priority: number;
    enabled: boolean;
    validate(rawLog: string): boolean;
    parse(rawLog: string): any;
    normalize(event: any): any;
}
export declare class PaloAltoFirewallParserLegacy {
    id: string;
    name: string;
    vendor: string;
    logSource: string;
    version: string;
    format: "syslog";
    category: "network";
    priority: number;
    enabled: boolean;
    validate(rawLog: string): boolean;
    parse(rawLog: string): any;
    normalize(event: any): any;
}
export declare class CiscoASAParser {
    id: string;
    name: string;
    vendor: string;
    logSource: string;
    version: string;
    format: "syslog";
    category: "network";
    priority: number;
    enabled: boolean;
    validate(rawLog: string): boolean;
    parse(rawLog: string): any;
    normalize(event: any): any;
}
export declare class NginxAccessLogParser {
    id: string;
    name: string;
    vendor: string;
    logSource: string;
    version: string;
    format: "custom";
    category: "web";
    priority: number;
    enabled: boolean;
    validate(rawLog: string): boolean;
    parse(rawLog: string): any;
    normalize(event: any): any;
}
//# sourceMappingURL=index.d.ts.map