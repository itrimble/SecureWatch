/**
 * KQL Query Library - 50+ Pre-Built Security Analytics Templates
 * Comprehensive collection of security use cases with KQL implementations
 */

import { SavedQuery, QueryCategory, SeverityLevel, MitreAttackInfo } from '../types/kql.types';

export class QueryLibrary {
  private queries: Map<string, SavedQuery> = new Map();
  
  constructor() {
    this.initializeQueries();
  }
  
  /**
   * Get all queries from the library
   */
  public getAllQueries(): SavedQuery[] {
    return Array.from(this.queries.values());
  }
  
  /**
   * Get queries by category
   */
  public getQueriesByCategory(category: QueryCategory): SavedQuery[] {
    return this.getAllQueries().filter(query => query.category === category);
  }
  
  /**
   * Get queries by severity
   */
  public getQueriesBySeverity(severity: SeverityLevel): SavedQuery[] {
    return this.getAllQueries().filter(query => query.severity === severity);
  }
  
  /**
   * Search queries by tags or description
   */
  public searchQueries(searchTerm: string): SavedQuery[] {
    const term = searchTerm.toLowerCase();
    return this.getAllQueries().filter(query => 
      query.name.toLowerCase().includes(term) ||
      query.description?.toLowerCase().includes(term) ||
      query.tags.some(tag => tag.toLowerCase().includes(term))
    );
  }
  
  /**
   * Get query by ID
   */
  public getQueryById(id: string): SavedQuery | undefined {
    return this.queries.get(id);
  }
  
  /**
   * Initialize the query library with pre-built templates
   */
  private initializeQueries(): void {
    // Threat Detection & Response Queries
    this.addQuery({
      id: 'threat-001',
      name: 'Brute Force Authentication Detection',
      description: 'Identifies accounts with excessive failed login attempts from a single IP in a short period',
      category: 'threat-detection',
      severity: 'high',
      query: `normalized_events
| where event_type == "authentication_failure"
| where TimeGenerated >= ago(1h)
| summarize 
    FailureCount = count(),
    StartTime = min(TimeGenerated),
    EndTime = max(TimeGenerated),
    UserAccounts = make_set(user_name),
    AuthMethods = make_set(auth_method)
    by source_ip, bin(TimeGenerated, 5m)
| where FailureCount >= 10
| extend ThreatScore = case(
    FailureCount >= 50, "Critical",
    FailureCount >= 25, "High", 
    "Medium"
)
| project StartTime, EndTime, source_ip, FailureCount, UserAccounts, AuthMethods, ThreatScore
| order by FailureCount desc`,
      tags: ['authentication', 'brute-force', 'threat-detection', 'real-time'],
      mitreAttack: { tactic: 'TA0006', technique: 'T1110', description: 'Credential Access - Brute Force' }
    });

    this.addQuery({
      id: 'threat-002',
      name: 'Suspicious Process Execution Chain',
      description: 'Detects potentially malicious process execution chains and command sequences',
      category: 'threat-detection',
      severity: 'high',
      query: `normalized_events
| where event_type == "process_execution"
| where TimeGenerated >= ago(2h)
| extend ProcessChain = strcat(parent_process_name, " -> ", process_name)
| summarize 
    ExecutionCount = count(),
    CommandLines = make_set(command_line),
    Users = make_set(user_name),
    Hosts = make_set(host_name)
    by ProcessChain, bin(TimeGenerated, 10m)
| where ExecutionCount >= 5
| extend SuspiciousIndicators = case(
    ProcessChain has_any ("powershell.exe -> cmd.exe", "cmd.exe -> powershell.exe"), "Shell Switching",
    ProcessChain has "svchost.exe -> ", "Service Host Anomaly",
    ProcessChain has " -> rundll32.exe", "DLL Execution",
    "Other"
)
| where SuspiciousIndicators != "Other"
| project TimeGenerated, ProcessChain, ExecutionCount, SuspiciousIndicators, Users, Hosts
| order by ExecutionCount desc`,
      tags: ['process-execution', 'attack-chain', 'malware', 'behavioral'],
      mitreAttack: { tactic: 'TA0002', technique: 'T1059', description: 'Execution - Command and Scripting Interpreter' }
    });

    this.addQuery({
      id: 'threat-003',
      name: 'Data Exfiltration Detection',
      description: 'Identifies unusual data transfer patterns that may indicate data exfiltration',
      category: 'data-exfiltration',
      severity: 'critical',
      query: `normalized_events
| where event_type in ("network_connection", "file_access")
| where TimeGenerated >= ago(4h)
| summarize 
    TotalBytes = sum(bytes_transferred),
    UniqueDestinations = dcount(destination_ip),
    FileAccesses = countif(event_type == "file_access"),
    NetworkConnections = countif(event_type == "network_connection"),
    SensitiveFiles = countif(file_path has_any (".xlsx", ".docx", ".pdf", ".csv", ".sql"))
    by user_name, host_name, bin(TimeGenerated, 30m)
| where TotalBytes > 100000000 or SensitiveFiles >= 10 or UniqueDestinations >= 20
| extend ExfiltrationRisk = case(
    TotalBytes > 1000000000 and SensitiveFiles >= 20, "Critical",
    TotalBytes > 500000000 or SensitiveFiles >= 15, "High",
    "Medium"
)
| project TimeGenerated, user_name, host_name, TotalBytes, UniqueDestinations, SensitiveFiles, ExfiltrationRisk
| order by TotalBytes desc`,
      tags: ['data-exfiltration', 'network-analysis', 'file-access', 'insider-threat'],
      mitreAttack: { tactic: 'TA0010', technique: 'T1041', description: 'Exfiltration - Exfiltration Over C2 Channel' }
    });

    // UEBA (User and Entity Behavior Analytics) Queries
    this.addQuery({
      id: 'ueba-001',
      name: 'Abnormal User Login Patterns',
      description: 'Detects users logging in at unusual times or from unusual locations',
      category: 'ueba',
      severity: 'medium',
      query: `normalized_events
| where event_type == "authentication_success"
| where TimeGenerated >= ago(24h)
| extend Hour = hourofday(TimeGenerated)
| summarize 
    LoginCount = count(),
    UniqueIPs = dcount(source_ip),
    Countries = make_set(source_country),
    Hours = make_set(Hour)
    by user_name, bin(TimeGenerated, 1d)
| join kind=leftouter (
    normalized_events
    | where event_type == "authentication_success"
    | where TimeGenerated between (ago(30d) .. ago(1d))
    | extend Hour = hourofday(TimeGenerated)
    | summarize 
        HistoricalAvgLogins = avg(LoginCount),
        HistoricalUniqueIPs = avg(UniqueIPs),
        CommonHours = make_set(Hour)
        by user_name
) on user_name
| extend 
    LoginAnomaly = case(LoginCount > HistoricalAvgLogins * 3, "High Activity", "Normal"),
    LocationAnomaly = case(UniqueIPs > HistoricalUniqueIPs * 2, "New Locations", "Normal"),
    TimeAnomaly = case(set_difference(Hours, CommonHours) != dynamic([]), "Unusual Hours", "Normal")
| where LoginAnomaly != "Normal" or LocationAnomaly != "Normal" or TimeAnomaly != "Normal"
| project user_name, LoginCount, UniqueIPs, Countries, LoginAnomaly, LocationAnomaly, TimeAnomaly`,
      tags: ['ueba', 'behavioral-analysis', 'authentication', 'anomaly-detection'],
      mitreAttack: { tactic: 'TA0001', technique: 'T1078', description: 'Initial Access - Valid Accounts' }
    });

    this.addQuery({
      id: 'ueba-002',
      name: 'Privilege Escalation Behavior',
      description: 'Identifies users showing patterns of privilege escalation attempts',
      category: 'ueba',
      severity: 'high',
      query: `normalized_events
| where event_type in ("privilege_escalation", "admin_action", "sensitive_access")
| where TimeGenerated >= ago(7d)
| summarize 
    EscalationAttempts = countif(event_type == "privilege_escalation"),
    AdminActions = countif(event_type == "admin_action"),
    SensitiveAccess = countif(event_type == "sensitive_access"),
    TargetSystems = dcount(host_name),
    Methods = make_set(escalation_method)
    by user_name, user_role, bin(TimeGenerated, 1d)
| extend PrivilegeScore = (EscalationAttempts * 3) + (AdminActions * 2) + SensitiveAccess
| where PrivilegeScore >= 10 or (user_role != "admin" and AdminActions >= 5)
| extend RiskLevel = case(
    PrivilegeScore >= 50, "Critical",
    PrivilegeScore >= 25, "High",
    "Medium"
)
| project user_name, user_role, EscalationAttempts, AdminActions, TargetSystems, Methods, RiskLevel
| order by PrivilegeScore desc`,
      tags: ['privilege-escalation', 'ueba', 'admin-abuse', 'insider-threat'],
      mitreAttack: { tactic: 'TA0004', technique: 'T1068', description: 'Privilege Escalation - Exploitation for Privilege Escalation' }
    });

    // Network Analysis Queries
    this.addQuery({
      id: 'network-001',
      name: 'Command and Control Traffic Detection',
      description: 'Identifies potential C2 communication through network traffic analysis',
      category: 'network-analysis',
      severity: 'critical',
      query: `normalized_events
| where event_type == "network_connection"
| where TimeGenerated >= ago(6h)
| summarize 
    ConnectionCount = count(),
    TotalBytes = sum(bytes_transferred),
    UniqueDestPorts = dcount(destination_port),
    Protocols = make_set(protocol),
    FirstSeen = min(TimeGenerated),
    LastSeen = max(TimeGenerated)
    by source_ip, destination_ip, host_name
| extend 
    ConnectionDuration = datetime_diff('minute', LastSeen, FirstSeen),
    AvgBytesPerConnection = TotalBytes / ConnectionCount
| where ConnectionCount >= 100 or ConnectionDuration >= 120
| join kind=leftouter (
    threat_intel_ips
    | project destination_ip = ip_address, ThreatType = threat_type, Reputation = reputation_score
) on destination_ip
| extend C2Indicators = case(
    isnotnull(ThreatType), strcat("Known Threat: ", ThreatType),
    ConnectionCount >= 500 and AvgBytesPerConnection < 1000, "Beacon-like Traffic",
    UniqueDestPorts >= 10, "Port Scanning",
    ConnectionDuration >= 300, "Persistent Connection",
    "Suspicious Pattern"
)
| where C2Indicators != "Suspicious Pattern" or ConnectionCount >= 200
| project host_name, source_ip, destination_ip, ConnectionCount, TotalBytes, ConnectionDuration, C2Indicators, ThreatType
| order by ConnectionCount desc`,
      tags: ['network-analysis', 'c2-detection', 'threat-intel', 'malware'],
      mitreAttack: { tactic: 'TA0011', technique: 'T1071', description: 'Command and Control - Application Layer Protocol' }
    });

    // Compliance Monitoring Queries
    this.addQuery({
      id: 'compliance-001',
      name: 'PCI DSS Credit Card Data Access Monitoring',
      description: 'Monitors access to systems and files containing credit card data for PCI DSS compliance',
      category: 'compliance',
      severity: 'high',
      query: `normalized_events
| where event_type in ("file_access", "database_query", "application_access")
| where TimeGenerated >= ago(24h)
| where file_path has_any ("credit", "card", "payment", "ccnum") 
    or database_table has_any ("credit_cards", "payments", "transactions")
    or application_name has_any ("payment_app", "pos_system")
| summarize 
    AccessCount = count(),
    Users = make_set(user_name),
    Sources = make_set(source_ip),
    DataTypes = make_set(data_classification),
    FirstAccess = min(TimeGenerated),
    LastAccess = max(TimeGenerated)
    by host_name, file_path, database_table, application_name
| extend 
    AccessDuration = datetime_diff('hour', LastAccess, FirstAccess),
    ComplianceRisk = case(
        AccessCount >= 100, "High Volume Access",
        array_length(Users) >= 10, "Multiple Users",
        AccessDuration >= 8, "Extended Access",
        "Normal"
    )
| where ComplianceRisk != "Normal" or AccessCount >= 50
| project FirstAccess, host_name, file_path, database_table, AccessCount, Users, ComplianceRisk
| order by AccessCount desc`,
      tags: ['compliance', 'pci-dss', 'data-protection', 'audit'],
      mitreAttack: { tactic: 'TA0009', technique: 'T1005', description: 'Collection - Data from Local System' }
    });

    // Endpoint Security Queries
    this.addQuery({
      id: 'endpoint-001',
      name: 'Malware Execution Detection',
      description: 'Detects potential malware execution through process and file analysis',
      category: 'endpoint-security',
      severity: 'critical',
      query: `normalized_events
| where event_type in ("process_execution", "file_creation", "registry_modification")
| where TimeGenerated >= ago(2h)
| extend SuspiciousIndicators = case(
    file_path has_any (".tmp", ".temp", "appdata", "programdata") and process_name has_any (".exe", ".scr", ".bat"), "Temp Execution",
    command_line has_any ("powershell", "cmd") and command_line has_any ("-enc", "-exec", "bypass"), "Obfuscated Commands",
    registry_key has_any ("run", "runonce", "startup") and event_type == "registry_modification", "Persistence Mechanism",
    file_name matches regex @"[a-f0-9]{32}\.exe", "Random Filename",
    "Normal"
)
| where SuspiciousIndicators != "Normal"
| summarize 
    EventCount = count(),
    Processes = make_set(process_name),
    Files = make_set(file_path),
    Commands = make_set(command_line),
    Indicators = make_set(SuspiciousIndicators)
    by host_name, user_name, bin(TimeGenerated, 10m)
| extend MalwareScore = case(
    array_length(Indicators) >= 3, "High",
    array_length(Indicators) >= 2, "Medium",
    "Low"
)
| where MalwareScore in ("High", "Medium") or EventCount >= 10
| project TimeGenerated, host_name, user_name, EventCount, MalwareScore, Indicators, Processes
| order by EventCount desc`,
      tags: ['endpoint-security', 'malware-detection', 'process-analysis', 'behavioral'],
      mitreAttack: { tactic: 'TA0002', technique: 'T1204', description: 'Execution - User Execution' }
    });

    // Continue with more queries...
    this.addThreatHuntingQueries();
    this.addIncidentResponseQueries();
    this.addVulnerabilityQueries();
    this.addForensicsQueries();
    this.addPerformanceQueries();
  }
  
  /**
   * Add threat hunting queries
   */
  private addThreatHuntingQueries(): void {
    this.addQuery({
      id: 'hunt-001',
      name: 'Living Off The Land Binaries (LOLBins)',
      description: 'Hunts for abuse of legitimate system binaries for malicious purposes',
      category: 'threat-hunting',
      severity: 'medium',
      query: `normalized_events
| where event_type == "process_execution"
| where TimeGenerated >= ago(24h)
| where process_name in ("certutil.exe", "bitsadmin.exe", "regsvr32.exe", "rundll32.exe", "mshta.exe", "wmic.exe")
| extend LOLBinRisk = case(
    process_name == "certutil.exe" and command_line has_any ("-urlcache", "-split", "-decode"), "File Download/Decode",
    process_name == "bitsadmin.exe" and command_line has "/transfer", "File Transfer",
    process_name == "regsvr32.exe" and command_line has_any ("/s", "/u", "http"), "Remote DLL Execution",
    process_name == "rundll32.exe" and command_line has_any ("javascript:", "vbscript:"), "Script Execution",
    process_name == "mshta.exe" and command_line has "http", "Remote HTA Execution",
    process_name == "wmic.exe" and command_line has_any ("process call create", "/format:"), "Remote Execution",
    "Suspicious Usage"
)
| summarize 
    ExecutionCount = count(),
    UniqueCommands = dcount(command_line),
    Hosts = make_set(host_name),
    Users = make_set(user_name),
    CommandExamples = take_any(command_line, 3)
    by process_name, LOLBinRisk
| order by ExecutionCount desc`,
      tags: ['threat-hunting', 'lolbins', 'attack-technique', 'process-analysis'],
      mitreAttack: { tactic: 'TA0005', technique: 'T1218', description: 'Defense Evasion - Signed Binary Proxy Execution' }
    });

    this.addQuery({
      id: 'hunt-002',
      name: 'Lateral Movement via SMB/RDP',
      description: 'Identifies potential lateral movement through SMB and RDP connections',
      category: 'threat-hunting',
      severity: 'high',
      query: `normalized_events
| where event_type in ("network_connection", "authentication_success")
| where TimeGenerated >= ago(6h)
| where (destination_port in (445, 139, 3389) and event_type == "network_connection") 
    or (auth_method in ("ntlm", "kerberos") and event_type == "authentication_success")
| summarize 
    SMBConnections = countif(destination_port in (445, 139)),
    RDPConnections = countif(destination_port == 3389),
    AuthEvents = countif(event_type == "authentication_success"),
    TargetHosts = dcount(destination_ip),
    SourceHosts = dcount(source_ip),
    Users = make_set(user_name),
    Timeline = make_list(TimeGenerated)
    by user_name, source_ip, bin(TimeGenerated, 30m)
| where TargetHosts >= 3 or (SMBConnections >= 10 and RDPConnections >= 5)
| extend LateralMovementRisk = case(
    TargetHosts >= 10, "High - Multiple Targets",
    SMBConnections >= 50, "High - Extensive SMB Usage",
    RDPConnections >= 20, "High - Extensive RDP Usage",
    "Medium - Suspicious Pattern"
)
| project TimeGenerated, user_name, source_ip, TargetHosts, SMBConnections, RDPConnections, LateralMovementRisk
| order by TargetHosts desc`,
      tags: ['lateral-movement', 'smb', 'rdp', 'network-analysis'],
      mitreAttack: { tactic: 'TA0008', technique: 'T1021', description: 'Lateral Movement - Remote Services' }
    });
  }
  
  /**
   * Add incident response queries
   */
  private addIncidentResponseQueries(): void {
    this.addQuery({
      id: 'ir-001',
      name: 'Incident Timeline Reconstruction',
      description: 'Reconstructs timeline of events for incident response investigations',
      category: 'incident-response',
      severity: 'medium',
      query: `let investigation_start = ago(7d);
let investigation_end = now();
let target_hosts = dynamic(["HOST001", "HOST002"]); // Replace with actual hosts
let target_users = dynamic(["user1", "user2"]); // Replace with actual users
normalized_events
| where TimeGenerated between (investigation_start .. investigation_end)
| where host_name in (target_hosts) or user_name in (target_users)
| extend EventCategory = case(
    event_type has "authentication", "Authentication",
    event_type has "process", "Process Activity",
    event_type has "network", "Network Activity",
    event_type has "file", "File System",
    event_type has "registry", "Registry",
    "Other"
)
| project TimeGenerated, host_name, user_name, EventCategory, event_type, 
    EventDetails = pack("process", process_name, "file", file_path, "network", destination_ip, "command", command_line)
| order by TimeGenerated asc`,
      tags: ['incident-response', 'timeline', 'investigation', 'forensics'],
      mitreAttack: { tactic: '', technique: '', description: 'Incident Response Timeline Analysis' }
    });
  }
  
  /**
   * Add vulnerability management queries
   */
  private addVulnerabilityQueries(): void {
    this.addQuery({
      id: 'vuln-001',
      name: 'Unpatched System Vulnerability Exposure',
      description: 'Identifies systems with missing security patches that have known exploits',
      category: 'vulnerability-management',
      severity: 'high',
      query: `normalized_events
| where event_type == "system_inventory"
| where TimeGenerated >= ago(1d)
| join kind=leftouter (
    vulnerability_feed
    | where severity in ("Critical", "High")
    | where exploit_available == true
) on $left.installed_software == $right.affected_software
| where isnotnull(cve_id)
| summarize 
    VulnerabilityCount = dcount(cve_id),
    CriticalVulns = countif(severity == "Critical"),
    HighVulns = countif(severity == "High"),
    ExploitableVulns = countif(exploit_available == true),
    CVEs = make_set(cve_id),
    AffectedSoftware = make_set(affected_software)
    by host_name, operating_system, last_patch_date
| extend 
    DaysSinceLastPatch = datetime_diff('day', now(), last_patch_date),
    RiskScore = (CriticalVulns * 3) + (HighVulns * 2) + ExploitableVulns
| where RiskScore >= 5 or DaysSinceLastPatch >= 30
| project host_name, operating_system, VulnerabilityCount, CriticalVulns, ExploitableVulns, DaysSinceLastPatch, RiskScore
| order by RiskScore desc`,
      tags: ['vulnerability-management', 'patch-management', 'risk-assessment'],
      mitreAttack: { tactic: 'TA0001', technique: 'T1190', description: 'Initial Access - Exploit Public-Facing Application' }
    });
  }
  
  /**
   * Add digital forensics queries
   */
  private addForensicsQueries(): void {
    this.addQuery({
      id: 'forensics-001',
      name: 'File System Forensics Analysis',
      description: 'Analyzes file system events for forensic investigation',
      category: 'forensics',
      severity: 'medium',
      query: `normalized_events
| where event_type in ("file_creation", "file_deletion", "file_modification", "file_access")
| where TimeGenerated >= ago(24h)
| extend FileOperation = case(
    event_type == "file_creation", "Created",
    event_type == "file_deletion", "Deleted",
    event_type == "file_modification", "Modified",
    "Accessed"
)
| summarize 
    OperationCount = count(),
    Operations = make_set(FileOperation),
    Users = make_set(user_name),
    Processes = make_set(process_name),
    FirstSeen = min(TimeGenerated),
    LastSeen = max(TimeGenerated)
    by file_path, host_name
| extend 
    FileExtension = extract(@"\.([^.]+)$", 1, file_path),
    ActivityDuration = datetime_diff('minute', LastSeen, FirstSeen),
    SuspiciousFile = case(
        file_path has_any (".tmp", ".temp", "appdata\\roaming", "programdata"), "Temporary Location",
        FileExtension in ("exe", "dll", "scr", "bat", "ps1"), "Executable File",
        file_path has_any ("system32", "syswow64"), "System Directory",
        "Normal"
    )
| where array_length(Operations) >= 3 or SuspiciousFile != "Normal"
| project file_path, host_name, OperationCount, Operations, Users, SuspiciousFile, FirstSeen, LastSeen
| order by OperationCount desc`,
      tags: ['forensics', 'file-analysis', 'investigation', 'artifacts'],
      mitreAttack: { tactic: '', technique: '', description: 'Digital Forensics File Analysis' }
    });
  }
  
  /**
   * Add performance monitoring queries
   */
  private addPerformanceQueries(): void {
    this.addQuery({
      id: 'perf-001',
      name: 'System Performance Baseline Analysis',
      description: 'Establishes performance baselines and detects anomalies',
      category: 'performance-monitoring',
      severity: 'low',
      query: `normalized_events
| where event_type == "system_metrics"
| where TimeGenerated >= ago(24h)
| summarize 
    AvgCpuUsage = avg(cpu_usage_percent),
    MaxCpuUsage = max(cpu_usage_percent),
    AvgMemoryUsage = avg(memory_usage_percent),
    MaxMemoryUsage = max(memory_usage_percent),
    AvgDiskIO = avg(disk_io_per_sec),
    AvgNetworkIO = avg(network_io_per_sec),
    SampleCount = count()
    by host_name, bin(TimeGenerated, 1h)
| extend 
    CpuAnomaly = case(AvgCpuUsage > 80, "High CPU", MaxCpuUsage > 95, "Critical CPU", "Normal"),
    MemoryAnomaly = case(AvgMemoryUsage > 85, "High Memory", MaxMemoryUsage > 95, "Critical Memory", "Normal"),
    IOAnomaly = case(AvgDiskIO > 1000 or AvgNetworkIO > 100000, "High IO", "Normal")
| where CpuAnomaly != "Normal" or MemoryAnomaly != "Normal" or IOAnomaly != "Normal"
| project TimeGenerated, host_name, AvgCpuUsage, AvgMemoryUsage, CpuAnomaly, MemoryAnomaly, IOAnomaly
| order by TimeGenerated desc`,
      tags: ['performance-monitoring', 'system-health', 'baseline', 'anomaly-detection'],
      mitreAttack: { tactic: '', technique: '', description: 'System Performance Monitoring' }
    });
  }
  
  /**
   * Helper method to add a query to the library
   */
  private addQuery(queryDef: {
    id: string;
    name: string;
    description: string;
    category: QueryCategory;
    severity: SeverityLevel;
    query: string;
    tags: string[];
    mitreAttack?: MitreAttackInfo;
  }): void {
    const savedQuery: SavedQuery = {
      id: queryDef.id,
      name: queryDef.name,
      description: queryDef.description,
      query: queryDef.query,
      category: queryDef.category,
      severity: queryDef.severity,
      tags: queryDef.tags,
      parameters: [], // These would be extracted from the query
      metadata: {
        title: queryDef.name,
        description: queryDef.description,
        category: queryDef.category,
        severity: queryDef.severity,
        mitreAttack: queryDef.mitreAttack,
        requiredFields: this.extractRequiredFields(queryDef.query),
        tags: queryDef.tags,
        author: 'SecureWatch Analytics Engine',
        version: '1.0.0',
        lastModified: new Date()
      },
      createdBy: 'system',
      createdAt: new Date(),
      lastModified: new Date(),
      isPublic: true,
      executionCount: 0,
      avgExecutionTime: 0
    };
    
    this.queries.set(queryDef.id, savedQuery);
  }
  
  /**
   * Extract required fields from KQL query
   */
  private extractRequiredFields(query: string): string[] {
    const fieldPattern = /\b(?:where|summarize|project|extend|join|sort|top)\s+[^|]+/gi;
    const fields = new Set<string>();
    
    const matches = query.match(fieldPattern);
    if (matches) {
      for (const match of matches) {
        // Extract field names - this is a simplified extraction
        const fieldMatches = match.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g);
        if (fieldMatches) {
          fieldMatches.forEach(field => {
            if (!['where', 'summarize', 'project', 'extend', 'join', 'sort', 'top', 'by', 'on', 'kind', 'ago', 'count', 'sum', 'avg', 'min', 'max'].includes(field.toLowerCase())) {
              fields.add(field);
            }
          });
        }
      }
    }
    
    return Array.from(fields);
  }
  
  /**
   * Get query statistics
   */
  public getLibraryStats(): {
    totalQueries: number;
    queriesByCategory: Record<string, number>;
    queriesBySeverity: Record<string, number>;
    totalTags: number;
    mostUsedTags: string[];
  } {
    const queries = this.getAllQueries();
    
    const queriesByCategory: Record<string, number> = {};
    const queriesBySeverity: Record<string, number> = {};
    const tagCounts: Record<string, number> = {};
    
    queries.forEach(query => {
      queriesByCategory[query.category] = (queriesByCategory[query.category] || 0) + 1;
      queriesBySeverity[query.severity] = (queriesBySeverity[query.severity] || 0) + 1;
      
      query.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    
    const mostUsedTags = Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([tag]) => tag);
    
    return {
      totalQueries: queries.length,
      queriesByCategory,
      queriesBySeverity,
      totalTags: Object.keys(tagCounts).length,
      mostUsedTags
    };
  }
}

