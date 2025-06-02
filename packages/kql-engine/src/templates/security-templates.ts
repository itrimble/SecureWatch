export interface SecurityTemplate {
  id: string;
  name: string;
  description: string;
  category: SecurityCategory;
  query: string;
  parameters?: TemplateParameter[];
  tags: string[];
  mitreTactics?: string[];
  mitreAttackIds?: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  useCase: string;
}

export interface TemplateParameter {
  name: string;
  type: 'string' | 'number' | 'timespan' | 'datetime' | 'boolean';
  description: string;
  defaultValue?: any;
  required: boolean;
  options?: any[];
}

export enum SecurityCategory {
  AUTHENTICATION = 'Authentication',
  NETWORK_SECURITY = 'Network Security',
  MALWARE_DETECTION = 'Malware Detection',
  DATA_EXFILTRATION = 'Data Exfiltration',
  PRIVILEGE_ESCALATION = 'Privilege Escalation',
  LATERAL_MOVEMENT = 'Lateral Movement',
  PERSISTENCE = 'Persistence',
  RECONNAISSANCE = 'Reconnaissance',
  THREAT_HUNTING = 'Threat Hunting',
  COMPLIANCE = 'Compliance',
  INCIDENT_RESPONSE = 'Incident Response',
  ANOMALY_DETECTION = 'Anomaly Detection'
}

export const SECURITY_TEMPLATES: SecurityTemplate[] = [
  {
    id: 'failed-logins-high-volume',
    name: 'High Volume Failed Login Attempts',
    description: 'Detect accounts with an unusually high number of failed login attempts within a time window',
    category: SecurityCategory.AUTHENTICATION,
    query: `log_events
| where timestamp > ago({timeRange})
| where category == "authentication" 
| where severity in ("medium", "high", "critical")
| where message contains "failed" or message contains "denied"
| summarize FailedAttempts = count(), 
           DistinctSources = dcount(host_ip),
           FirstAttempt = min(timestamp),
           LastAttempt = max(timestamp)
    by user_name
| where FailedAttempts > {threshold}
| order by FailedAttempts desc`,
    parameters: [
      {
        name: 'timeRange',
        type: 'timespan',
        description: 'Time window to analyze',
        defaultValue: '1h',
        required: true,
        options: ['15m', '30m', '1h', '6h', '24h']
      },
      {
        name: 'threshold',
        type: 'number',
        description: 'Minimum number of failed attempts to alert on',
        defaultValue: 10,
        required: true
      }
    ],
    tags: ['brute-force', 'authentication', 'security-monitoring'],
    mitreTactics: ['Credential Access'],
    mitreAttackIds: ['T1110'],
    difficulty: 'beginner',
    useCase: 'Identify potential brute force attacks against user accounts'
  },
  
  {
    id: 'suspicious-network-connections',
    name: 'Suspicious Outbound Network Connections',
    description: 'Detect unusual outbound network connections to suspicious domains or IP ranges',
    category: SecurityCategory.NETWORK_SECURITY,
    query: `log_events
| where timestamp > ago({timeRange})
| where category == "network"
| where event_data.direction == "outbound"
| where event_data.destination_ip !startswith "10."
    and event_data.destination_ip !startswith "192.168."
    and event_data.destination_ip !startswith "172.16."
| summarize ConnectionCount = count(),
           DistinctPorts = dcount(event_data.destination_port),
           Ports = make_set(event_data.destination_port),
           BytesTransferred = sum(event_data.bytes)
    by host_name, event_data.destination_ip, event_data.destination_domain
| where ConnectionCount > {connectionThreshold} or BytesTransferred > {bytesThreshold}
| extend RiskScore = case(
    BytesTransferred > 1000000, 90,
    ConnectionCount > 100, 80,
    DistinctPorts > 10, 70,
    60
)
| order by RiskScore desc, BytesTransferred desc`,
    parameters: [
      {
        name: 'timeRange',
        type: 'timespan',
        description: 'Time window to analyze',
        defaultValue: '1h',
        required: true
      },
      {
        name: 'connectionThreshold',
        type: 'number',
        description: 'Minimum connection count to alert on',
        defaultValue: 50,
        required: true
      },
      {
        name: 'bytesThreshold',
        type: 'number',
        description: 'Minimum bytes transferred to alert on',
        defaultValue: 100000,
        required: true
      }
    ],
    tags: ['network', 'data-exfiltration', 'c2-communication'],
    mitreTactics: ['Command and Control', 'Exfiltration'],
    mitreAttackIds: ['T1041', 'T1071'],
    difficulty: 'intermediate',
    useCase: 'Detect potential data exfiltration or command and control communications'
  },

  {
    id: 'privilege-escalation-detection',
    name: 'Privilege Escalation Attempts',
    description: 'Identify attempts to escalate privileges or access sensitive resources',
    category: SecurityCategory.PRIVILEGE_ESCALATION,
    query: `log_events
| where timestamp > ago({timeRange})
| where category in ("authentication", "process", "file")
| where message contains "privilege" 
    or message contains "admin" 
    or message contains "root"
    or message contains "escalation"
    or event_data.process_name in ("sudo", "su", "runas", "psexec")
| extend IsHighPrivilegeProcess = event_data.process_name in ("sudo", "su", "runas", "psexec", "cmd.exe", "powershell.exe")
| extend IsAdminUser = user_name contains "admin" or user_name contains "root"
| extend IsSuspiciousTime = hourofday(timestamp) < 6 or hourofday(timestamp) > 22
| summarize EventCount = count(),
           DistinctProcesses = dcount(event_data.process_name),
           Processes = make_set(event_data.process_name),
           FirstEvent = min(timestamp),
           LastEvent = max(timestamp),
           HighPrivilegeEvents = countif(IsHighPrivilegeProcess),
           SuspiciousTimeEvents = countif(IsSuspiciousTime)
    by user_name, host_name
| extend RiskScore = case(
    HighPrivilegeEvents > 10 and SuspiciousTimeEvents > 5, 95,
    HighPrivilegeEvents > 5, 80,
    EventCount > 20, 70,
    50
)
| where RiskScore >= {riskThreshold}
| order by RiskScore desc, EventCount desc`,
    parameters: [
      {
        name: 'timeRange',
        type: 'timespan',
        description: 'Time window to analyze',
        defaultValue: '6h',
        required: true
      },
      {
        name: 'riskThreshold',
        type: 'number',
        description: 'Minimum risk score to alert on (0-100)',
        defaultValue: 70,
        required: true
      }
    ],
    tags: ['privilege-escalation', 'process-monitoring', 'insider-threat'],
    mitreTactics: ['Privilege Escalation', 'Defense Evasion'],
    mitreAttackIds: ['T1068', 'T1134', 'T1548'],
    difficulty: 'advanced',
    useCase: 'Detect unauthorized attempts to gain elevated privileges'
  },

  {
    id: 'malware-process-indicators',
    name: 'Malware Process Indicators',
    description: 'Detect processes with characteristics commonly associated with malware',
    category: SecurityCategory.MALWARE_DETECTION,
    query: `log_events
| where timestamp > ago({timeRange})
| where category == "process"
| where event_data.action in ("created", "started")
| extend ProcessPath = tolower(event_data.process_path)
| extend ProcessName = tolower(event_data.process_name)
| extend IsSuspiciousLocation = ProcessPath contains "temp" 
    or ProcessPath contains "downloads" 
    or ProcessPath contains "appdata\\\\local\\\\temp"
    or ProcessPath contains "recycle"
| extend HasSuspiciousName = ProcessName matches regex @"^[a-f0-9]{8,}\\\\.(exe|dll|scr)$"
    or ProcessName contains "svchost" and not ProcessPath contains "system32"
    or ProcessName contains "rundll32" and event_data.command_line contains ".tmp"
| extend IsUnsignedBinary = event_data.signed == false or isnull(event_data.signature)
| extend HasSuspiciousCommandLine = event_data.command_line contains "powershell -enc"
    or event_data.command_line contains "cmd /c echo"
    or event_data.command_line contains "wscript"
    or event_data.command_line contains "cscript"
| extend RiskIndicators = toint(IsSuspiciousLocation) + toint(HasSuspiciousName) + 
                         toint(IsUnsignedBinary) + toint(HasSuspiciousCommandLine)
| where RiskIndicators >= {indicatorThreshold}
| summarize ProcessCount = count(),
           DistinctHosts = dcount(host_name),
           Hosts = make_set(host_name),
           FirstSeen = min(timestamp),
           LastSeen = max(timestamp)
    by ProcessName, event_data.process_path, event_data.parent_process, RiskIndicators
| extend RiskScore = case(
    RiskIndicators >= 3, 90,
    RiskIndicators >= 2, 75,
    60
)
| order by RiskScore desc, ProcessCount desc`,
    parameters: [
      {
        name: 'timeRange',
        type: 'timespan',
        description: 'Time window to analyze',
        defaultValue: '24h',
        required: true
      },
      {
        name: 'indicatorThreshold',
        type: 'number',
        description: 'Minimum number of risk indicators to alert on',
        defaultValue: 2,
        required: true,
        options: [1, 2, 3, 4]
      }
    ],
    tags: ['malware', 'process-analysis', 'threat-hunting'],
    mitreTactics: ['Execution', 'Defense Evasion'],
    mitreAttackIds: ['T1055', 'T1036', 'T1027'],
    difficulty: 'advanced',
    useCase: 'Identify potentially malicious processes based on behavioral indicators'
  },

  {
    id: 'data-exfiltration-patterns',
    name: 'Data Exfiltration Patterns',
    description: 'Detect patterns indicative of large-scale data theft or unauthorized data movement',
    category: SecurityCategory.DATA_EXFILTRATION,
    query: `log_events
| where timestamp > ago({timeRange})
| where category in ("file", "network")
| where event_data.action in ("read", "copy", "upload", "transfer", "download")
| extend FileSize = tolong(event_data.file_size)
| extend IsLargeFile = FileSize > {fileSizeThreshold}
| extend IsSensitiveFile = event_data.file_path contains "confidential"
    or event_data.file_path contains "secret"
    or event_data.file_extension in (".xlsx", ".docx", ".pdf", ".sql", ".csv")
| extend IsExternalTransfer = event_data.destination_ip !startswith "10."
    and event_data.destination_ip !startswith "192.168."
    and event_data.destination_ip !startswith "172.16."
| summarize TotalFiles = count(),
           TotalBytes = sum(FileSize),
           LargeFiles = countif(IsLargeFile),
           SensitiveFiles = countif(IsSensitiveFile),
           ExternalTransfers = countif(IsExternalTransfer),
           DistinctDestinations = dcount(event_data.destination_ip),
           FilePaths = make_set(event_data.file_path, 20)
    by user_name, host_name, bin(timestamp, {timeBin})
| extend DataVolumeMB = TotalBytes / (1024 * 1024)
| extend RiskScore = case(
    DataVolumeMB > 1000 and ExternalTransfers > 0, 95,
    SensitiveFiles > 10 and ExternalTransfers > 0, 90,
    DataVolumeMB > 500, 80,
    LargeFiles > 20, 70,
    50
)
| where RiskScore >= {riskThreshold}
| order by RiskScore desc, DataVolumeMB desc`,
    parameters: [
      {
        name: 'timeRange',
        type: 'timespan',
        description: 'Time window to analyze',
        defaultValue: '6h',
        required: true
      },
      {
        name: 'fileSizeThreshold',
        type: 'number',
        description: 'File size threshold in bytes for large files',
        defaultValue: 10485760,
        required: true
      },
      {
        name: 'timeBin',
        type: 'timespan',
        description: 'Time bin for aggregation',
        defaultValue: '1h',
        required: true,
        options: ['15m', '30m', '1h', '2h']
      },
      {
        name: 'riskThreshold',
        type: 'number',
        description: 'Minimum risk score to alert on',
        defaultValue: 70,
        required: true
      }
    ],
    tags: ['data-exfiltration', 'file-monitoring', 'insider-threat'],
    mitreTactics: ['Collection', 'Exfiltration'],
    mitreAttackIds: ['T1005', 'T1041', 'T1052'],
    difficulty: 'intermediate',
    useCase: 'Detect unauthorized movement of sensitive data'
  },

  {
    id: 'lateral-movement-detection',
    name: 'Lateral Movement Detection',
    description: 'Identify attempts to move laterally through the network using compromised credentials',
    category: SecurityCategory.LATERAL_MOVEMENT,
    query: `log_events
| where timestamp > ago({timeRange})
| where category in ("authentication", "network", "process")
| where event_data.action in ("logon", "connect", "execute_remote")
| extend SourceHost = coalesce(event_data.source_host, host_name)
| extend TargetHost = coalesce(event_data.target_host, event_data.destination_host)
| extend IsRemoteAccess = isnotnull(TargetHost) and SourceHost != TargetHost
| extend IsAdminLogin = user_name contains "admin" or event_data.logon_type in ("2", "10")
| extend IsSuspiciousService = event_data.service_name in ("psexec", "wmi", "winrm", "rdp", "ssh")
| where IsRemoteAccess
| summarize RemoteConnections = count(),
           DistinctTargets = dcount(TargetHost),
           DistinctSources = dcount(SourceHost),
           Targets = make_set(TargetHost),
           Sources = make_set(SourceHost),
           AdminLogins = countif(IsAdminLogin),
           SuspiciousServices = countif(IsSuspiciousService),
           FirstConnection = min(timestamp),
           LastConnection = max(timestamp)
    by user_name
| extend ConnectionVelocity = RemoteConnections / (datetime_diff('minute', LastConnection, FirstConnection) + 1)
| extend RiskScore = case(
    DistinctTargets > 10 and AdminLogins > 5, 95,
    ConnectionVelocity > 5 and DistinctTargets > 5, 90,
    SuspiciousServices > 0 and DistinctTargets > 3, 85,
    DistinctTargets > 5, 75,
    50
)
| where RiskScore >= {riskThreshold}
| order by RiskScore desc, DistinctTargets desc`,
    parameters: [
      {
        name: 'timeRange',
        type: 'timespan',
        description: 'Time window to analyze',
        defaultValue: '4h',
        required: true
      },
      {
        name: 'riskThreshold',
        type: 'number',
        description: 'Minimum risk score to alert on',
        defaultValue: 75,
        required: true
      }
    ],
    tags: ['lateral-movement', 'network-analysis', 'threat-hunting'],
    mitreTactics: ['Lateral Movement'],
    mitreAttackIds: ['T1021', 'T1047', 'T1028'],
    difficulty: 'advanced',
    useCase: 'Detect attackers moving laterally through the network'
  },

  {
    id: 'anomalous-user-behavior',
    name: 'Anomalous User Behavior Detection',
    description: 'Identify users exhibiting unusual behavior patterns that may indicate compromise',
    category: SecurityCategory.ANOMALY_DETECTION,
    query: `let UserBaseline = log_events
| where timestamp between (ago({baselineWindow}) .. ago({timeRange}))
| where category in ("authentication", "file", "process", "network")
| summarize BaselineLogins = dcount(host_name),
           BaselineProcesses = dcount(event_data.process_name),
           BaselineFiles = dcount(event_data.file_path),
           BaselineHours = dcount(hourofday(timestamp))
    by user_name;
log_events
| where timestamp > ago({timeRange})
| where category in ("authentication", "file", "process", "network")
| summarize CurrentLogins = dcount(host_name),
           CurrentProcesses = dcount(event_data.process_name),
           CurrentFiles = dcount(event_data.file_path),
           CurrentHours = dcount(hourofday(timestamp)),
           TotalEvents = count(),
           OffHoursEvents = countif(hourofday(timestamp) < 6 or hourofday(timestamp) > 22),
           WeekendEvents = countif(dayofweek(timestamp) in (0, 6))
    by user_name
| join kind=inner UserBaseline on user_name
| extend LoginAnomaly = todouble(CurrentLogins) / (BaselineLogins + 1)
| extend ProcessAnomaly = todouble(CurrentProcesses) / (BaselineProcesses + 1)
| extend FileAnomaly = todouble(CurrentFiles) / (BaselineFiles + 1)
| extend TimeAnomaly = todouble(CurrentHours) / (BaselineHours + 1)
| extend OffHoursRatio = todouble(OffHoursEvents) / TotalEvents
| extend WeekendRatio = todouble(WeekendEvents) / TotalEvents
| extend AnomalyScore = case(
    LoginAnomaly > 3 or ProcessAnomaly > 3 or FileAnomaly > 3, 90,
    OffHoursRatio > 0.5 and WeekendRatio > 0.3, 85,
    LoginAnomaly > 2 or ProcessAnomaly > 2, 75,
    TimeAnomaly > 2, 70,
    50
)
| where AnomalyScore >= {anomalyThreshold}
| project user_name, AnomalyScore, LoginAnomaly, ProcessAnomaly, FileAnomaly, 
          OffHoursRatio, WeekendRatio, TotalEvents
| order by AnomalyScore desc`,
    parameters: [
      {
        name: 'timeRange',
        type: 'timespan',
        description: 'Recent time window to analyze',
        defaultValue: '24h',
        required: true
      },
      {
        name: 'baselineWindow',
        type: 'timespan',
        description: 'Historical baseline window',
        defaultValue: '7d',
        required: true
      },
      {
        name: 'anomalyThreshold',
        type: 'number',
        description: 'Minimum anomaly score to alert on',
        defaultValue: 70,
        required: true
      }
    ],
    tags: ['behavioral-analysis', 'user-monitoring', 'anomaly-detection'],
    mitreTactics: ['Initial Access', 'Persistence'],
    mitreAttackIds: ['T1078', 'T1133'],
    difficulty: 'advanced',
    useCase: 'Detect compromised user accounts through behavioral analysis'
  }
];

export class SecurityTemplateProvider {
  private templates: SecurityTemplate[];

  constructor() {
    this.templates = SECURITY_TEMPLATES;
  }

  getTemplates(): SecurityTemplate[] {
    return this.templates;
  }

  getTemplatesByCategory(category: SecurityCategory): SecurityTemplate[] {
    return this.templates.filter(t => t.category === category);
  }

  getTemplatesByTag(tag: string): SecurityTemplate[] {
    return this.templates.filter(t => t.tags.includes(tag));
  }

  getTemplatesByDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced'): SecurityTemplate[] {
    return this.templates.filter(t => t.difficulty === difficulty);
  }

  getTemplate(id: string): SecurityTemplate | undefined {
    return this.templates.find(t => t.id === id);
  }

  renderTemplate(templateId: string, parameters: Record<string, any>): string {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    let query = template.query;
    
    // Replace parameters
    for (const [key, value] of Object.entries(parameters)) {
      const placeholder = `{${key}}`;
      query = query.replace(new RegExp(placeholder.replace(/[{}]/g, '\\\\$&'), 'g'), String(value));
    }

    return query;
  }

  getCategories(): SecurityCategory[] {
    return Object.values(SecurityCategory);
  }

  searchTemplates(searchTerm: string): SecurityTemplate[] {
    const term = searchTerm.toLowerCase();
    return this.templates.filter(t => 
      t.name.toLowerCase().includes(term) ||
      t.description.toLowerCase().includes(term) ||
      t.tags.some(tag => tag.toLowerCase().includes(term)) ||
      t.useCase.toLowerCase().includes(term)
    );
  }
}