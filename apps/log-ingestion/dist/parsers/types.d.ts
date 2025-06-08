export interface LogParser {
    id: string;
    name: string;
    vendor: string;
    logSource: string;
    version: string;
    format: 'syslog' | 'json' | 'csv' | 'xml' | 'evtx' | 'custom';
    category: 'network' | 'endpoint' | 'cloud' | 'application' | 'identity' | 'database' | 'web';
    priority: number;
    enabled: boolean;
    parse(rawLog: string): ParsedEvent | null;
    validate(rawLog: string): boolean;
    normalize(event: ParsedEvent): NormalizedEvent;
    config?: ParserConfig;
    metadata?: ParserMetadata;
}
export interface ParsedEvent {
    timestamp: Date;
    source: string;
    category: string;
    action: string;
    outcome: 'success' | 'failure' | 'unknown';
    severity: 'low' | 'medium' | 'high' | 'critical';
    user?: UserInfo;
    device?: DeviceInfo;
    network?: NetworkInfo;
    process?: ProcessInfo;
    file?: FileInfo;
    registry?: RegistryInfo;
    url?: URLInfo;
    dns?: DNSInfo;
    authentication?: AuthenticationInfo;
    authorization?: AuthorizationInfo;
    threat?: ThreatInfo;
    rawData: string;
    custom?: Record<string, any>;
}
export interface NormalizedEvent {
    '@timestamp': string;
    'event.kind': 'alert' | 'event' | 'metric' | 'state' | 'pipeline_error' | 'signal';
    'event.category': string[];
    'event.type': string[];
    'event.outcome': 'success' | 'failure' | 'unknown';
    'event.severity': number;
    'event.risk_score'?: number;
    'event.provider'?: string;
    'event.dataset'?: string;
    'event.module'?: string;
    'host.name'?: string;
    'host.hostname'?: string;
    'host.ip'?: string[];
    'host.os.family'?: string;
    'host.os.name'?: string;
    'host.os.version'?: string;
    'user.name'?: string;
    'user.domain'?: string;
    'user.id'?: string;
    'user.email'?: string;
    'user.full_name'?: string;
    'user.group.name'?: string[];
    'user.roles'?: string[];
    'source.ip'?: string;
    'source.port'?: number;
    'source.domain'?: string;
    'destination.ip'?: string;
    'destination.port'?: number;
    'destination.domain'?: string;
    'network.protocol'?: string;
    'network.transport'?: string;
    'network.direction'?: 'ingress' | 'egress' | 'inbound' | 'outbound' | 'internal' | 'external' | 'unknown';
    'process.name'?: string;
    'process.pid'?: number;
    'process.ppid'?: number;
    'process.command_line'?: string;
    'process.executable'?: string;
    'process.hash.md5'?: string;
    'process.hash.sha1'?: string;
    'process.hash.sha256'?: string;
    'process.parent.name'?: string;
    'process.parent.pid'?: number;
    'process.parent.command_line'?: string;
    'file.name'?: string;
    'file.path'?: string;
    'file.size'?: number;
    'file.type'?: string;
    'file.extension'?: string;
    'file.hash.md5'?: string;
    'file.hash.sha1'?: string;
    'file.hash.sha256'?: string;
    'file.directory'?: string;
    'registry.key'?: string;
    'registry.value.name'?: string;
    'registry.value.data'?: string;
    'registry.value.type'?: string;
    'url.full'?: string;
    'url.domain'?: string;
    'url.path'?: string;
    'url.query'?: string;
    'url.scheme'?: string;
    'http.request.method'?: string;
    'http.response.status_code'?: number;
    'http.response.body.bytes'?: number;
    'user_agent.original'?: string;
    'dns.question.name'?: string;
    'dns.question.type'?: string;
    'dns.resolved_ip'?: string[];
    'dns.response_code'?: string;
    'authentication.type'?: string;
    'authentication.success'?: boolean;
    'authentication.failure_reason'?: string;
    'authentication.method'?: string;
    'threat.technique.id'?: string[];
    'threat.technique.name'?: string[];
    'threat.tactic.id'?: string[];
    'threat.tactic.name'?: string[];
    'threat.indicator.type'?: string;
    'threat.indicator.value'?: string;
    'threat.group.name'?: string;
    'threat.software.name'?: string;
    'securewatch.parser.id': string;
    'securewatch.parser.version': string;
    'securewatch.parser.name': string;
    'securewatch.confidence': number;
    'securewatch.severity': 'low' | 'medium' | 'high' | 'critical';
    'securewatch.tags'?: string[];
    'securewatch.rule_name'?: string;
    'securewatch.rule_id'?: string;
    'securewatch.enrichment'?: Record<string, any>;
    'labels'?: Record<string, string>;
    'tags'?: string[];
    'related.ip'?: string[];
    'related.user'?: string[];
    'related.hash'?: string[];
    'related.hosts'?: string[];
    [key: string]: any;
}
export interface UserInfo {
    name?: string;
    domain?: string;
    id?: string;
    email?: string;
    fullName?: string;
    groups?: string[];
    roles?: string[];
    sid?: string;
}
export interface DeviceInfo {
    name?: string;
    hostname?: string;
    ip?: string[];
    mac?: string[];
    os?: {
        family?: string;
        name?: string;
        version?: string;
        platform?: string;
    };
    architecture?: string;
    type?: 'desktop' | 'laptop' | 'server' | 'mobile' | 'tablet' | 'iot' | 'unknown';
}
export interface NetworkInfo {
    sourceIp?: string;
    sourcePort?: number;
    sourceDomain?: string;
    destinationIp?: string;
    destinationPort?: number;
    destinationDomain?: string;
    protocol?: string;
    transport?: string;
    direction?: 'inbound' | 'outbound' | 'internal' | 'external';
    bytes?: number;
    packets?: number;
}
export interface ProcessInfo {
    name?: string;
    pid?: number;
    ppid?: number;
    commandLine?: string;
    executable?: string;
    workingDirectory?: string;
    user?: string;
    hashes?: {
        md5?: string;
        sha1?: string;
        sha256?: string;
    };
    parent?: {
        name?: string;
        pid?: number;
        commandLine?: string;
    };
    children?: ProcessInfo[];
}
export interface FileInfo {
    name?: string;
    path?: string;
    directory?: string;
    extension?: string;
    size?: number;
    type?: string;
    created?: Date;
    modified?: Date;
    accessed?: Date;
    hashes?: {
        md5?: string;
        sha1?: string;
        sha256?: string;
    };
    permissions?: string;
    owner?: string;
}
export interface RegistryInfo {
    key?: string;
    valueName?: string;
    valueData?: string;
    valueType?: string;
    operation?: 'create' | 'delete' | 'modify' | 'query';
}
export interface URLInfo {
    full?: string;
    scheme?: string;
    domain?: string;
    port?: number;
    path?: string;
    query?: string;
    fragment?: string;
}
export interface DNSInfo {
    questionName?: string;
    questionType?: string;
    responseCode?: string;
    resolvedIps?: string[];
    ttl?: number;
}
export interface AuthenticationInfo {
    type?: string;
    method?: string;
    success?: boolean;
    failureReason?: string;
    sessionId?: string;
    logonType?: number;
    privilegeLevel?: string;
}
export interface AuthorizationInfo {
    granted?: boolean;
    resource?: string;
    action?: string;
    permissions?: string[];
    reason?: string;
}
export interface ThreatInfo {
    techniques?: MitreTechnique[];
    tactics?: MitreTactic[];
    indicators?: ThreatIndicator[];
    severity?: 'low' | 'medium' | 'high' | 'critical';
    confidence?: number;
    description?: string;
    references?: string[];
}
export interface MitreTechnique {
    id: string;
    name: string;
    subtechnique?: string;
    confidence: number;
}
export interface MitreTactic {
    id: string;
    name: string;
}
export interface ThreatIndicator {
    type: 'domain' | 'ip' | 'hash' | 'url' | 'email' | 'file' | 'registry' | 'process';
    value: string;
    confidence: number;
    source?: string;
    tags?: string[];
}
export interface ParserConfig {
    enabled?: boolean;
    priority?: number;
    timeout?: number;
    maxSize?: number;
    regex?: RegExp[];
    patterns?: string[];
    fieldMappings?: Record<string, string>;
    enrichment?: {
        enabled: boolean;
        sources: string[];
    };
    normalization?: {
        timestampFormats: string[];
        severityMapping: Record<string, string>;
        categoryMapping: Record<string, string>;
    };
    validation?: {
        required: string[];
        optional: string[];
        formats: Record<string, RegExp>;
    };
}
export interface ParserMetadata {
    author?: string;
    license?: string;
    description?: string;
    documentation?: string;
    tags?: string[];
    supportedVersions?: string[];
    testCases?: ParserTestCase[];
    performance?: {
        avgParseTime?: number;
        memoryUsage?: number;
        successRate?: number;
    };
}
export interface ParserTestCase {
    name: string;
    input: string;
    expectedOutput: Partial<NormalizedEvent>;
    shouldPass: boolean;
}
export interface ParserStats {
    totalParsers: number;
    activeParsers: number;
    byCategory: Record<string, number>;
    byVendor: Record<string, number>;
    byFormat: Record<string, number>;
    performance: {
        totalEventsProcessed: number;
        averageParseTime: number;
        successRate: number;
        errorRate: number;
    };
    topPerformers: Array<{
        parserId: string;
        eventsProcessed: number;
        successRate: number;
    }>;
}
export interface SigmaRule {
    title: string;
    id?: string;
    description: string;
    author?: string;
    date?: string;
    modified?: string;
    status?: 'experimental' | 'testing' | 'stable';
    level: 'low' | 'medium' | 'high' | 'critical';
    logsource: {
        category?: string;
        product?: string;
        service?: string;
        definition?: string;
    };
    detection: {
        [key: string]: any;
        condition: string;
    };
    falsepositives?: string[];
    tags?: string[];
    references?: string[];
}
export interface OSSECRule {
    id: number;
    level: number;
    description: string;
    groups?: string[];
    regex?: string;
    match?: string;
    decoded_as?: string;
    category?: string;
    if_sid?: number;
    if_group?: string;
    if_level?: string;
    if_matched_regex?: string;
    srcip?: string;
    dstip?: string;
    user?: string;
    program_name?: string;
    hostname?: string;
    time?: string;
    weekday?: string;
    id_tag?: string;
    fts?: number;
    frequency?: number;
    timeframe?: number;
    ignore?: number;
    check_diff?: boolean;
    options?: string[];
}
export interface ElasticRule {
    id?: string;
    name: string;
    description: string;
    type: 'query' | 'machine_learning' | 'threshold' | 'eql' | 'threat_match';
    language?: 'kuery' | 'lucene' | 'eql';
    query?: string;
    filters?: any[];
    risk_score?: number;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    threat?: Array<{
        framework: string;
        tactic: {
            id: string;
            name: string;
            reference: string;
        };
        technique?: Array<{
            id: string;
            name: string;
            reference: string;
            subtechnique?: Array<{
                id: string;
                name: string;
                reference: string;
            }>;
        }>;
    }>;
    references?: string[];
    author?: string[];
    license?: string;
    version?: number;
    tags?: string[];
    enabled?: boolean;
}
export interface ParserValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    performance: {
        parseTime: number;
        memoryUsage: number;
    };
    coverage: {
        fieldsExtracted: number;
        totalFields: number;
        percentage: number;
    };
}
export interface ParserTestResult {
    parserId: string;
    testCases: Array<{
        name: string;
        passed: boolean;
        error?: string;
        actualOutput?: NormalizedEvent;
        expectedOutput?: Partial<NormalizedEvent>;
    }>;
    summary: {
        total: number;
        passed: number;
        failed: number;
        successRate: number;
    };
}
export declare class ParserError extends Error {
    parserId: string;
    phase: 'validation' | 'parsing' | 'normalization';
    cause?: Error | undefined;
    constructor(parserId: string, phase: 'validation' | 'parsing' | 'normalization', message: string, cause?: Error | undefined);
}
export declare class ParserValidationError extends ParserError {
    constructor(parserId: string, message: string, cause?: Error);
}
export declare class ParserNormalizationError extends ParserError {
    constructor(parserId: string, message: string, cause?: Error);
}
//# sourceMappingURL=types.d.ts.map