export interface RawLogEvent {
  id: string;
  source: LogSource;
  timestamp: Date;
  rawData: string | Buffer;
  metadata: LogMetadata;
  receivedAt: Date;
  fields?: Record<string, any>;
}

export interface NormalizedLogEvent {
  id: string;
  timestamp: Date;
  source: LogSource;
  severity: LogSeverity;
  category: LogCategory;
  message: string;
  fields: Record<string, any>;
  tags: string[];
  host: HostInfo;
  process?: ProcessInfo;
  user?: UserInfo;
  network?: NetworkInfo;
  file?: FileInfo;
  registry?: RegistryInfo;
  metadata: LogMetadata;
  rawEvent?: string;
}

export interface EnrichedLogEvent extends NormalizedLogEvent {
  enrichments: {
    geoIp?: GeoIpInfo;
    threatIntel?: ThreatIntelInfo;
    assetInfo?: AssetInfo;
    userContext?: UserContext;
    anomalyScore?: number;
    relatedEvents?: string[];
  };
  riskScore: number;
  compliance: ComplianceInfo;
}

export enum LogSource {
  WINDOWS_EVENT_LOG = 'windows_event_log',
  SYSLOG = 'syslog',
  AWS_CLOUDTRAIL = 'aws_cloudtrail',
  AZURE_ACTIVITY = 'azure_activity',
  GCP_LOGGING = 'gcp_logging',
  OFFICE365 = 'office365',
  FIREWALL = 'firewall',
  IDS_IPS = 'ids_ips',
  ENDPOINT = 'endpoint',
  APPLICATION = 'application',
  CSV = 'csv',
  XML = 'xml',
  JSON = 'json',
  CUSTOM = 'custom',
}

export enum LogSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
  DEBUG = 'debug',
}

export enum LogCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  SYSTEM = 'system',
  APPLICATION = 'application',
  SECURITY = 'security',
  NETWORK = 'network',
  FILE = 'file',
  PROCESS = 'process',
  REGISTRY = 'registry',
  AUDIT = 'audit',
  THREAT = 'threat',
  COMPLIANCE = 'compliance',
}

export interface LogMetadata {
  ingestionId: string;
  ingestionTime: Date;
  collector: string;
  collectorVersion: string;
  organizationId: string;
  tenantId?: string;
  dataCenter?: string;
  environment?: string;
  retention: RetentionPolicy;
  compression?: CompressionInfo;
  encryption?: EncryptionInfo;
}

export interface HostInfo {
  hostname: string;
  ip: string[];
  mac?: string[];
  os?: {
    name: string;
    version: string;
    architecture: string;
  };
  domain?: string;
  fqdn?: string;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  path?: string;
  commandLine?: string;
  parentPid?: number;
  parentName?: string;
  user?: string;
  startTime?: Date;
  hash?: {
    md5?: string;
    sha1?: string;
    sha256?: string;
  };
}

export interface UserInfo {
  username: string;
  userId?: string;
  domain?: string;
  email?: string;
  groups?: string[];
  privileges?: string[];
}

export interface NetworkInfo {
  protocol?: string;
  sourceIp?: string;
  sourcePort?: number;
  destinationIp?: string;
  destinationPort?: number;
  direction?: 'inbound' | 'outbound' | 'internal';
  bytesIn?: number;
  bytesOut?: number;
  packetsIn?: number;
  packetsOut?: number;
}

export interface FileInfo {
  path: string;
  name: string;
  extension?: string;
  size?: number;
  hash?: {
    md5?: string;
    sha1?: string;
    sha256?: string;
  };
  permissions?: string;
  owner?: string;
  createdAt?: Date;
  modifiedAt?: Date;
  accessedAt?: Date;
}

export interface RegistryInfo {
  key: string;
  value?: string;
  operation?: 'create' | 'modify' | 'delete' | 'read';
  oldValue?: string;
  dataType?: string;
}

export interface GeoIpInfo {
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  asn?: number;
  organization?: string;
}

export interface ThreatIntelInfo {
  isMalicious: boolean;
  threatScore: number;
  indicators: string[];
  sources: string[];
  lastSeen?: Date;
  tags?: string[];
}

export interface AssetInfo {
  assetId: string;
  assetType: string;
  criticality: 'critical' | 'high' | 'medium' | 'low';
  businessUnit?: string;
  location?: string;
  tags?: string[];
}

export interface UserContext {
  isPrivileged: boolean;
  department?: string;
  manager?: string;
  lastLogin?: Date;
  riskScore?: number;
  anomalous?: boolean;
}

export interface ComplianceInfo {
  frameworks: string[];
  controls: string[];
  violations?: string[];
  tags?: string[];
}

export interface RetentionPolicy {
  tier: 'hot' | 'warm' | 'cold' | 'frozen';
  days: number;
  compressed: boolean;
  encrypted: boolean;
}

export interface CompressionInfo {
  algorithm: 'zstd' | 'gzip' | 'snappy' | 'lz4';
  level?: number;
  originalSize: number;
  compressedSize: number;
}

export interface EncryptionInfo {
  algorithm: string;
  keyId: string;
  encrypted: boolean;
}

// Windows Event Log specific types
export interface WindowsEventLog {
  eventId: number;
  eventRecordId: number;
  level: number;
  task: number;
  opcode: number;
  keywords: string[];
  channel: string;
  provider: {
    name: string;
    guid?: string;
  };
  computer: string;
  security?: {
    userId?: string;
    userSid?: string;
  };
  eventData?: Record<string, any>;
  userDefinedData?: Record<string, any>;
}

// Syslog specific types
export interface SyslogEvent {
  facility: number;
  severity: number;
  version?: number;
  timestamp: Date;
  hostname: string;
  appName?: string;
  procId?: string;
  msgId?: string;
  structuredData?: Record<string, Record<string, string>>;
  message: string;
  jsonPayload?: any;
}