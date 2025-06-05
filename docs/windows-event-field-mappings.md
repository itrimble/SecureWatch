# Windows Event ID Field Mappings for SecureWatch SIEM

## Overview
This document maps Windows Event Log fields to Splunk TA (Technology Add-on) and Azure Sentinel equivalents to ensure compatibility and comprehensive field coverage in SecureWatch SIEM.

## Critical Security Event IDs

### Authentication Events

#### Event ID 4624 - An account was successfully logged on
**Splunk Common Information Model (CIM) Fields:**
- `action` = "success"
- `app` = "Windows"
- `dest` = Computer name
- `user` = Account Name
- `src_ip` = Source Network Address
- `src_port` = Source Port
- `authentication_method` = Authentication Package
- `logon_type` = Logon Type
- `signature_id` = "4624"
- `vendor_product` = "Microsoft Windows"

**Azure Sentinel SecurityEvent Schema:**
- `Activity` = "4624 - An account was successfully logged on"
- `Computer` = Computer name
- `Account` = Account Name (TargetUserName)
- `LogonType` = Logon Type
- `IpAddress` = Source Network Address
- `LogonProcessName` = Logon Process
- `AuthenticationPackageName` = Authentication Package
- `WorkstationName` = Workstation Name
- `LogonGuid` = Logon GUID
- `TransmittedServices` = Transmitted Services
- `LmPackageName` = LM Package Name
- `KeyLength` = Key Length
- `ProcessId` = Process ID
- `ProcessName` = Process Name

**SecureWatch Enhanced Schema:**
```typescript
interface WindowsLogonEvent {
  // Core fields
  event_id: 4624;
  timestamp: string;
  computer: string;
  channel: "Security";
  
  // Authentication fields
  target_user_name: string;
  target_domain_name: string;
  target_user_sid: string;
  target_logon_id: string;
  logon_type: number;
  logon_type_description: string; // Interactive, Network, Batch, etc.
  
  // Source information
  source_network_address: string;
  source_port: number;
  workstation_name: string;
  
  // Process information
  logon_process_name: string;
  authentication_package_name: string;
  transmitted_services: string;
  lm_package_name: string;
  key_length: number;
  
  // Security identifiers
  subject_user_sid: string;
  subject_user_name: string;
  subject_domain_name: string;
  subject_logon_id: string;
  
  // Enhanced fields
  logon_guid: string;
  elevated_token: string;
  virtual_account: string;
  linked_logon_id: string;
  network_account_name: string;
  network_account_domain: string;
  
  // Threat intelligence
  geo_location?: GeoLocation;
  risk_score?: number;
  is_suspicious?: boolean;
}
```

#### Event ID 4625 - An account failed to log on
**Splunk CIM Fields:**
- `action` = "failure"
- `app` = "Windows"
- `dest` = Computer name
- `user` = Account Name
- `src_ip` = Source Network Address
- `failure_reason` = Failure Reason
- `sub_status` = Sub Status
- `signature_id` = "4625"

**Azure Sentinel SecurityEvent Schema:**
- `Activity` = "4625 - An account failed to log on"
- `Computer` = Computer name
- `Account` = Account Name (TargetUserName)
- `LogonType` = Logon Type
- `Status` = Status (hex)
- `SubStatus` = Sub Status (hex)
- `FailureReason` = Failure Reason
- `IpAddress` = Source Network Address
- `WorkstationName` = Workstation Name

**SecureWatch Enhanced Schema:**
```typescript
interface WindowsLogonFailureEvent {
  // Core fields
  event_id: 4625;
  timestamp: string;
  computer: string;
  channel: "Security";
  
  // Failed authentication details
  target_user_name: string;
  target_domain_name: string;
  failure_reason: string;
  status: string; // NTSTATUS code
  sub_status: string; // Sub-status code
  
  // Source information
  source_network_address: string;
  source_port: number;
  workstation_name: string;
  
  // Logon attempt details
  logon_type: number;
  logon_process_name: string;
  authentication_package_name: string;
  
  // Subject (requesting account)
  subject_user_sid: string;
  subject_user_name: string;
  subject_domain_name: string;
  subject_logon_id: string;
  
  // Enhanced fields for threat detection
  attempt_count?: number;
  is_brute_force?: boolean;
  geo_location?: GeoLocation;
  risk_score?: number;
}
```

### Process Execution Events

#### Event ID 4688 - A new process has been created
**Splunk CIM Fields:**
- `action` = "allowed"
- `app` = "Windows"
- `dest` = Computer name
- `user` = Subject User Name
- `process` = New Process Name
- `process_id` = New Process ID
- `parent_process` = Creator Process Name
- `parent_process_id` = Creator Process ID
- `command_line` = Process Command Line
- `signature_id` = "4688"

**Azure Sentinel SecurityEvent Schema:**
- `Activity` = "4688 - A new process has been created"
- `Computer` = Computer name
- `Account` = Subject User Name
- `NewProcessName` = New Process Name
- `NewProcessId` = New Process ID
- `ParentProcessName` = Creator Process Name
- `CommandLine` = Process Command Line
- `TokenElevationType` = Token Elevation Type

**SecureWatch Enhanced Schema:**
```typescript
interface WindowsProcessCreationEvent {
  // Core fields
  event_id: 4688;
  timestamp: string;
  computer: string;
  channel: "Security";
  
  // Subject (user who created process)
  subject_user_sid: string;
  subject_user_name: string;
  subject_domain_name: string;
  subject_logon_id: string;
  
  // New process details
  new_process_id: string;
  new_process_name: string;
  token_elevation_type: string;
  process_id: string; // Creator Process ID
  command_line?: string; // If command line auditing enabled
  
  // Creator process details
  creator_process_id: string;
  creator_process_name: string;
  
  // Enhanced fields
  mandatory_label: string;
  target_user_sid?: string;
  target_user_name?: string;
  target_domain_name?: string;
  target_logon_id?: string;
  
  // Threat intelligence
  file_hash?: string;
  digital_signature?: DigitalSignature;
  is_suspicious?: boolean;
  mitre_tactics?: string[];
  mitre_techniques?: string[];
}
```

### Service Events

#### Event ID 7045 - A service was installed on the system
**Splunk CIM Fields:**
- `action` = "created"
- `app` = "Windows"
- `dest` = Computer name
- `service_name` = Service Name
- `service_file_name` = Service File Name
- `service_type` = Service Type
- `service_start_type` = Service Start Type
- `signature_id` = "7045"

**Azure Sentinel SecurityEvent Schema:**
- `Activity` = "7045 - A service was installed on the system"
- `Computer` = Computer name
- `ServiceName` = Service Name
- `ServiceFileName` = Image Path
- `ServiceType` = Service Type
- `ServiceStartType` = Start Type
- `ServiceAccount` = Service Account

**SecureWatch Enhanced Schema:**
```typescript
interface WindowsServiceInstallEvent {
  // Core fields
  event_id: 7045;
  timestamp: string;
  computer: string;
  channel: "System";
  
  // Service details
  service_name: string;
  image_path: string; // Service File Name
  service_type: string;
  start_type: string;
  account_name: string;
  
  // Enhanced fields
  service_description?: string;
  service_sid_type?: string;
  binary_path_name?: string;
  load_order_group?: string;
  tag_id?: number;
  dependencies?: string[];
  
  // Threat intelligence
  file_hash?: string;
  digital_signature?: DigitalSignature;
  is_suspicious?: boolean;
  persistence_indicator?: boolean;
}
```

### Scheduled Task Events

#### Event ID 4698 - A scheduled task was created
**Splunk CIM Fields:**
- `action` = "created"
- `app` = "Windows"
- `dest` = Computer name
- `user` = Subject User Name
- `task_name` = Task Name
- `signature_id` = "4698"

#### Event ID 106 - Task Scheduler registered a task
**Azure Sentinel SecurityEvent Schema:**
- `Activity` = "4698 - A scheduled task was created"
- `Computer` = Computer name
- `Account` = Subject User Name
- `TaskName` = Task Name
- `TaskContent` = Task Content (XML)

**SecureWatch Enhanced Schema:**
```typescript
interface WindowsScheduledTaskEvent {
  // Core fields
  event_id: 4698 | 106;
  timestamp: string;
  computer: string;
  channel: "Security" | "Microsoft-Windows-TaskScheduler/Operational";
  
  // Subject (user who created task)
  subject_user_sid: string;
  subject_user_name: string;
  subject_domain_name: string;
  subject_logon_id: string;
  
  // Task details
  task_name: string;
  task_content?: string; // XML content
  
  // Parsed task information
  task_actions?: TaskAction[];
  task_triggers?: TaskTrigger[];
  task_settings?: TaskSettings;
  
  // Enhanced fields
  run_as_user?: string;
  highest_privilege?: boolean;
  hidden?: boolean;
  
  // Threat intelligence
  is_suspicious?: boolean;
  persistence_indicator?: boolean;
  mitre_techniques?: string[];
}
```

### PowerShell Events

#### Event ID 4103 - Module Logging
#### Event ID 4104 - Script Block Logging
**Splunk CIM Fields:**
- `action` = "allowed"
- `app` = "PowerShell"
- `dest` = Computer name
- `user` = User Name
- `script_block_text` = Script Block Text
- `signature_id` = "4104"

**Azure Sentinel SecurityEvent Schema:**
- `Activity` = "4104 - PowerShell Script Block"
- `Computer` = Computer name
- `ScriptBlockText` = Script Block Text
- `ScriptBlockId` = Script Block ID
- `Path` = Script Path

**SecureWatch Enhanced Schema:**
```typescript
interface WindowsPowerShellEvent {
  // Core fields
  event_id: 4103 | 4104;
  timestamp: string;
  computer: string;
  channel: "Microsoft-Windows-PowerShell/Operational";
  
  // PowerShell context
  engine_version: string;
  runspace_id: string;
  pipeline_id: string;
  command_name?: string;
  command_type?: string;
  script_block_text?: string;
  script_block_id?: string;
  
  // User context
  user_name: string;
  user_id: string;
  
  // Enhanced fields
  script_path?: string;
  command_line?: string;
  host_name?: string;
  host_version?: string;
  
  // Threat intelligence
  contains_base64?: boolean;
  contains_obfuscation?: boolean;
  suspicious_functions?: string[];
  is_malicious?: boolean;
  mitre_techniques?: string[];
}
```

### Event Log Clearing

#### Event ID 1102 - The audit log was cleared
**Splunk CIM Fields:**
- `action` = "deleted"
- `app` = "Windows"
- `dest` = Computer name
- `user` = Subject User Name
- `signature_id` = "1102"

**Azure Sentinel SecurityEvent Schema:**
- `Activity` = "1102 - The audit log was cleared"
- `Computer` = Computer name
- `Account` = Subject User Name
- `LogFileCleared` = Security

**SecureWatch Enhanced Schema:**
```typescript
interface WindowsLogClearEvent {
  // Core fields
  event_id: 1102;
  timestamp: string;
  computer: string;
  channel: "Security";
  
  // Subject (user who cleared log)
  subject_user_sid: string;
  subject_user_name: string;
  subject_domain_name: string;
  subject_logon_id: string;
  
  // Enhanced fields
  backup_path?: string;
  cleared_by_process?: string;
  
  // Threat intelligence
  is_suspicious: boolean; // Always true for log clearing
  anti_forensics_indicator: boolean;
  incident_priority: "high";
}
```

## Common Field Mappings

### Standard Windows Event Fields
```typescript
interface BaseWindowsEvent {
  // Event metadata
  event_id: number;
  timestamp: string; // ISO 8601 format
  computer: string;
  channel: string; // Security, System, Application, etc.
  record_id: number;
  
  // System information
  provider_name: string;
  provider_guid?: string;
  version: number;
  level: number; // 0=LogAlways, 1=Critical, 2=Error, 3=Warning, 4=Information, 5=Verbose
  level_text: string;
  task: number;
  task_text?: string;
  opcode: number;
  opcode_text?: string;
  keywords: string; // Hex value
  
  // Execution context
  process_id: number;
  thread_id: number;
  
  // Correlation
  activity_id?: string;
  related_activity_id?: string;
  
  // Security context
  user_id?: string;
  
  // Raw data
  raw_xml: string;
  
  // SecureWatch enhancements
  source_file?: string; // For EVTX imports
  parsed_at: string;
  normalized_at: string;
  correlation_id?: string;
  
  // Threat intelligence
  geo_location?: GeoLocation;
  risk_score?: number;
  is_suspicious?: boolean;
  mitre_tactics?: string[];
  mitre_techniques?: string[];
  
  // Compliance frameworks
  nist_controls?: string[];
  iso27001_controls?: string[];
  cis_controls?: string[];
}
```

### Geographic Location Enhancement
```typescript
interface GeoLocation {
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
  organization?: string;
  asn?: number;
}
```

### Digital Signature Information
```typescript
interface DigitalSignature {
  is_signed: boolean;
  signature_valid?: boolean;
  signer_name?: string;
  issuer_name?: string;
  certificate_thumbprint?: string;
  certificate_serial?: string;
  signature_algorithm?: string;
  trusted?: boolean;
}
```

### Task Scheduler Structures
```typescript
interface TaskAction {
  type: "Exec" | "ComHandler" | "SendEmail" | "ShowMessage";
  command?: string;
  arguments?: string;
  working_directory?: string;
  class_id?: string;
}

interface TaskTrigger {
  type: "TimeTrigger" | "DailyTrigger" | "WeeklyTrigger" | "MonthlyTrigger" | "IdleTrigger" | "RegistrationTrigger" | "BootTrigger" | "LogonTrigger";
  start_boundary?: string;
  end_boundary?: string;
  enabled: boolean;
  repetition?: {
    interval?: string;
    duration?: string;
    stop_at_duration_end?: boolean;
  };
}

interface TaskSettings {
  allow_demand_start?: boolean;
  allow_hard_terminate?: boolean;
  compatibility?: number;
  delete_expired_task_after?: string;
  enabled?: boolean;
  execution_time_limit?: string;
  hidden?: boolean;
  idle_settings?: {
    duration?: string;
    wait_timeout?: string;
    stop_on_idle_end?: boolean;
    restart_on_idle?: boolean;
  };
  multiple_instances_policy?: "Parallel" | "Queue" | "IgnoreNew" | "StopExisting";
  priority?: number;
  restart_count?: number;
  restart_interval?: string;
  run_only_if_idle?: boolean;
  run_only_if_network_available?: boolean;
  start_when_available?: boolean;
  stop_if_going_on_batteries?: boolean;
  wake_to_run?: boolean;
}
```

## Field Priority Matrix

### Critical Fields (Always Include)
1. `event_id` - Event identifier
2. `timestamp` - Event occurrence time  
3. `computer` - Source system
4. `user` fields - Associated user account
5. `process` fields - Process information
6. `source_ip` - Network source (if applicable)

### High Priority Fields (Include When Available)
1. `command_line` - Process command line
2. `parent_process` - Parent process information
3. `logon_type` - Authentication method
4. `failure_reason` - Failure details
5. `file_hash` - File integrity verification

### Medium Priority Fields (Include for Enrichment)
1. `geo_location` - Geographic context
2. `risk_score` - Threat assessment
3. `mitre_*` - ATT&CK framework mapping
4. `digital_signature` - Code signing status

### Low Priority Fields (Include for Completeness)
1. `raw_xml` - Original event data
2. `keywords` - Event keywords
3. `correlation_id` - Event correlation
4. `compliance_*` - Regulatory mapping

This comprehensive field mapping ensures SecureWatch maintains compatibility with Splunk and Azure Sentinel while providing enhanced threat detection capabilities.