export interface EventMapping {
  eventId: number
  eventName: string
  description: string
  attackTypes: string[]
  mitreTactics: string[]
  mitreTechniques: string[]
  logSource: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  commonFilters?: Record<string, string[]>
}

export const eventMappings: EventMapping[] = [
  // Authentication Events
  {
    eventId: 4624,
    eventName: "An account was successfully logged on",
    description: "Successful logon event that can help detect legitimate access or potential credential abuse",
    attackTypes: ["credential access", "lateral movement", "initial access"],
    mitreTactics: ["TA0006", "TA0008", "TA0001"],
    mitreTechniques: ["T1078", "T1021", "T1110"],
    logSource: "Security",
    severity: "low",
    commonFilters: {
      LogonType: ["2", "3", "7", "10"],
      AuthenticationPackageName: ["NTLM", "Kerberos", "Negotiate"]
    }
  },
  {
    eventId: 4625,
    eventName: "An account failed to log on",
    description: "Failed logon attempts that may indicate brute force attacks or credential spraying",
    attackTypes: ["credential access", "brute force"],
    mitreTactics: ["TA0006"],
    mitreTechniques: ["T1110", "T1110.001", "T1110.003", "T1110.004"],
    logSource: "Security",
    severity: "medium",
    commonFilters: {
      Status: ["0xC000006A", "0xC000006D", "0xC000006E", "0xC0000072"],
      FailureReason: ["Unknown user name or bad password", "Account logon time restriction violation"]
    }
  },
  {
    eventId: 4648,
    eventName: "A logon was attempted using explicit credentials",
    description: "Detects explicit credential usage, useful for identifying lateral movement",
    attackTypes: ["lateral movement", "credential access"],
    mitreTactics: ["TA0008", "TA0006"],
    mitreTechniques: ["T1021", "T1078"],
    logSource: "Security",
    severity: "medium"
  },
  
  // Process Creation and Execution
  {
    eventId: 4688,
    eventName: "A new process has been created",
    description: "Process creation events crucial for detecting malicious execution",
    attackTypes: ["execution", "defense evasion", "persistence"],
    mitreTactics: ["TA0002", "TA0005", "TA0003"],
    mitreTechniques: ["T1059", "T1055", "T1543"],
    logSource: "Security",
    severity: "low",
    commonFilters: {
      ProcessName: ["cmd.exe", "powershell.exe", "wscript.exe", "cscript.exe"],
      TokenElevationType: ["TokenElevationTypeFull", "TokenElevationTypeLimited"]
    }
  },
  {
    eventId: 4689,
    eventName: "A process has exited",
    description: "Process termination events useful for behavioral analysis",
    attackTypes: ["execution"],
    mitreTactics: ["TA0002"],
    mitreTechniques: ["T1059"],
    logSource: "Security",
    severity: "low"
  },
  
  // Privilege Escalation
  {
    eventId: 4672,
    eventName: "Special privileges assigned to new logon",
    description: "Administrative privileges assignment, critical for privilege escalation detection",
    attackTypes: ["privilege escalation"],
    mitreTactics: ["TA0004"],
    mitreTechniques: ["T1134", "T1078.002", "T1078.003"],
    logSource: "Security",
    severity: "high",
    commonFilters: {
      PrivilegeList: ["SeDebugPrivilege", "SeTakeOwnershipPrivilege", "SeLoadDriverPrivilege"]
    }
  },
  
  // Account Management
  {
    eventId: 4720,
    eventName: "A user account was created",
    description: "New user account creation, potential persistence mechanism",
    attackTypes: ["persistence", "privilege escalation"],
    mitreTactics: ["TA0003", "TA0004"],
    mitreTechniques: ["T1136", "T1136.001"],
    logSource: "Security",
    severity: "medium"
  },
  {
    eventId: 4722,
    eventName: "A user account was enabled",
    description: "Account enablement, potential activation of dormant accounts",
    attackTypes: ["persistence", "defense evasion"],
    mitreTactics: ["TA0003", "TA0005"],
    mitreTechniques: ["T1136", "T1562"],
    logSource: "Security",
    severity: "medium"
  },
  {
    eventId: 4728,
    eventName: "A member was added to a security-enabled global group",
    description: "Group membership changes, critical for privilege escalation monitoring",
    attackTypes: ["privilege escalation", "persistence"],
    mitreTactics: ["TA0004", "TA0003"],
    mitreTechniques: ["T1098", "T1078.002"],
    logSource: "Security",
    severity: "high"
  },
  {
    eventId: 4732,
    eventName: "A member was added to a security-enabled local group",
    description: "Local group membership changes, especially critical for Administrators group",
    attackTypes: ["privilege escalation", "persistence"],
    mitreTactics: ["TA0004", "TA0003"],
    mitreTechniques: ["T1098", "T1078.003"],
    logSource: "Security",
    severity: "high"
  },
  
  // System Events
  {
    eventId: 1102,
    eventName: "The audit log was cleared",
    description: "Security log clearing, strong indicator of anti-forensics activity",
    attackTypes: ["defense evasion", "impact"],
    mitreTactics: ["TA0005", "TA0040"],
    mitreTechniques: ["T1070.001", "T1562.002"],
    logSource: "Security",
    severity: "critical"
  },
  {
    eventId: 104,
    eventName: "The System log file was cleared",
    description: "System log clearing, potential evidence destruction",
    attackTypes: ["defense evasion"],
    mitreTactics: ["TA0005"],
    mitreTechniques: ["T1070.001"],
    logSource: "System",
    severity: "high"
  },
  
  // File and Registry Access
  {
    eventId: 4656,
    eventName: "A handle to an object was requested",
    description: "Object access attempts, useful for sensitive file monitoring",
    attackTypes: ["collection", "credential access"],
    mitreTactics: ["TA0009", "TA0006"],
    mitreTechniques: ["T1005", "T1003"],
    logSource: "Security",
    severity: "low"
  },
  {
    eventId: 4663,
    eventName: "An attempt was made to access an object",
    description: "File and registry access events for data collection detection",
    attackTypes: ["collection", "credential access"],
    mitreTactics: ["TA0009", "TA0006"],
    mitreTechniques: ["T1005", "T1003.002"],
    logSource: "Security",
    severity: "low"
  },
  
  // Network and Shares
  {
    eventId: 5140,
    eventName: "A network share object was accessed",
    description: "Network share access for lateral movement detection",
    attackTypes: ["lateral movement", "collection"],
    mitreTactics: ["TA0008", "TA0009"],
    mitreTechniques: ["T1021.002", "T1039"],
    logSource: "Security",
    severity: "medium",
    commonFilters: {
      ShareName: ["\\\\*\\ADMIN$", "\\\\*\\C$", "\\\\*\\IPC$"]
    }
  },
  {
    eventId: 5145,
    eventName: "A network share object was checked to see whether client can be granted desired access",
    description: "Detailed network share access attempts",
    attackTypes: ["lateral movement", "collection"],
    mitreTactics: ["TA0008", "TA0009"],
    mitreTechniques: ["T1021.002", "T1039"],
    logSource: "Security",
    severity: "medium"
  },
  
  // Scheduled Tasks
  {
    eventId: 4698,
    eventName: "A scheduled task was created",
    description: "Scheduled task creation for persistence mechanism detection",
    attackTypes: ["persistence", "execution"],
    mitreTactics: ["TA0003", "TA0002"],
    mitreTechniques: ["T1053.005"],
    logSource: "Security",
    severity: "medium"
  },
  {
    eventId: 4702,
    eventName: "A scheduled task was updated",
    description: "Scheduled task modification for persistence monitoring",
    attackTypes: ["persistence", "defense evasion"],
    mitreTactics: ["TA0003", "TA0005"],
    mitreTechniques: ["T1053.005"],
    logSource: "Security",
    severity: "medium"
  },
  
  // PowerShell Events
  {
    eventId: 4103,
    eventName: "Module Logging",
    description: "PowerShell module execution logging for script-based attack detection",
    attackTypes: ["execution", "reconnaissance"],
    mitreTactics: ["TA0002", "TA0007"],
    mitreTechniques: ["T1059.001", "T1087"],
    logSource: "Microsoft-Windows-PowerShell/Operational",
    severity: "medium"
  },
  {
    eventId: 4104,
    eventName: "Script Block Logging",
    description: "PowerShell script block execution for detailed command analysis",
    attackTypes: ["execution", "credential access"],
    mitreTactics: ["TA0002", "TA0006"],
    mitreTechniques: ["T1059.001", "T1003.001"],
    logSource: "Microsoft-Windows-PowerShell/Operational",
    severity: "medium"
  },
  
  // Windows Defender
  {
    eventId: 1116,
    eventName: "Antimalware scan started",
    description: "Windows Defender scan initiation",
    attackTypes: ["defense evasion"],
    mitreTactics: ["TA0005"],
    mitreTechniques: ["T1562.001"],
    logSource: "Microsoft-Windows-Windows Defender/Operational",
    severity: "low"
  },
  {
    eventId: 1117,
    eventName: "Antimalware action taken",
    description: "Windows Defender threat detection and action",
    attackTypes: ["malware", "defense evasion"],
    mitreTactics: ["TA0005"],
    mitreTechniques: ["T1562.001"],
    logSource: "Microsoft-Windows-Windows Defender/Operational",
    severity: "high"
  }
]

export function searchEventsByAttackType(attackType: string): EventMapping[] {
  return eventMappings.filter(event => 
    event.attackTypes.some(type => 
      type.toLowerCase().includes(attackType.toLowerCase())
    )
  )
}

export function searchEventsByMitreTechnique(technique: string): EventMapping[] {
  return eventMappings.filter(event => 
    event.mitreTechniques.some(tech => 
      tech.toLowerCase().includes(technique.toLowerCase())
    )
  )
}

export function getEventById(eventId: number): EventMapping | undefined {
  return eventMappings.find(event => event.eventId === eventId)
}