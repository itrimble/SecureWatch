// Windows Event Log Types for SecureWatch SIEM
// Based on field mappings for Splunk and Azure Sentinel compatibility

import { ExtendedLogEntry } from './extended_log_entry';

// Base Windows Event Log Entry
export interface WindowsEventLogEntry extends ExtendedLogEntry {
  // Windows-specific core fields
  event_id: number;
  channel: string; // Security, System, Application, etc.
  computer: string;
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
  
  // EVTX import metadata
  source_file?: string;
  parsed_at: string;
  
  // Event data and system data as structured objects
  event_data?: Record<string, any>;
  system_data?: Record<string, any>;
}

// Geographic Location Enhancement
export interface GeoLocation {
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

// Digital Signature Information
export interface DigitalSignature {
  is_signed: boolean;
  signature_valid?: boolean;
  signer_name?: string;
  issuer_name?: string;
  certificate_thumbprint?: string;
  certificate_serial?: string;
  signature_algorithm?: string;
  trusted?: boolean;
}

// Authentication Events

// Event ID 4624 - Successful Logon
export interface WindowsLogonEvent extends WindowsEventLogEntry {
  event_id: 4624;
  channel: "Security";
  
  // Authentication fields
  target_user_name: string;
  target_domain_name: string;
  target_user_sid: string;
  target_logon_id: string;
  logon_type: number;
  logon_type_description: string; // Interactive, Network, Batch, etc.
  
  // Source information
  source_network_address?: string;
  source_port?: number;
  workstation_name?: string;
  
  // Process information
  logon_process_name: string;
  authentication_package_name: string;
  transmitted_services?: string;
  lm_package_name?: string;
  key_length?: number;
  
  // Security identifiers
  subject_user_sid: string;
  subject_user_name: string;
  subject_domain_name: string;
  subject_logon_id: string;
  
  // Enhanced fields
  logon_guid?: string;
  elevated_token?: string;
  virtual_account?: string;
  linked_logon_id?: string;
  network_account_name?: string;
  network_account_domain?: string;
  
  // Threat intelligence
  geo_location?: GeoLocation;
  risk_score?: number;
  is_suspicious?: boolean;
}

// Event ID 4625 - Failed Logon
export interface WindowsLogonFailureEvent extends WindowsEventLogEntry {
  event_id: 4625;
  channel: "Security";
  
  // Failed authentication details
  target_user_name: string;
  target_domain_name: string;
  failure_reason: string;
  status: string; // NTSTATUS code
  sub_status: string; // Sub-status code
  
  // Source information
  source_network_address?: string;
  source_port?: number;
  workstation_name?: string;
  
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

// Process Execution Events

// Event ID 4688 - Process Creation
export interface WindowsProcessCreationEvent extends WindowsEventLogEntry {
  event_id: 4688;
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

// Service Events

// Event ID 7045 - Service Installation
export interface WindowsServiceInstallEvent extends WindowsEventLogEntry {
  event_id: 7045;
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

// Task Scheduler Structures
export interface TaskAction {
  type: "Exec" | "ComHandler" | "SendEmail" | "ShowMessage";
  command?: string;
  arguments?: string;
  working_directory?: string;
  class_id?: string;
}

export interface TaskTrigger {
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

export interface TaskSettings {
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

// Scheduled Task Events

// Event ID 4698 - Scheduled Task Created
export interface WindowsScheduledTaskEvent extends WindowsEventLogEntry {
  event_id: 4698 | 106;
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

// PowerShell Events

// Event ID 4103/4104 - PowerShell Logging
export interface WindowsPowerShellEvent extends WindowsEventLogEntry {
  event_id: 4103 | 4104;
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

// Event Log Clearing

// Event ID 1102 - Audit Log Cleared
export interface WindowsLogClearEvent extends WindowsEventLogEntry {
  event_id: 1102;
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

// Windows Event Log Adapter Configuration
export interface WindowsEventLogConfig {
  // Event log channels to monitor
  channels: string[]; // Security, System, Application, etc.
  
  // Specific event IDs to capture (optional - captures all if empty)
  event_ids?: number[];
  
  // Servers to collect from (for remote collection)
  servers?: string[];
  
  // Collection settings
  batch_size: number;
  poll_interval: number; // milliseconds
  include_event_data: boolean;
  include_raw_xml: boolean;
  
  // Filtering options
  min_level?: number; // Minimum event level to capture
  max_age_hours?: number; // Maximum age of events to capture
  
  // Authentication for remote collection
  domain?: string;
  username?: string;
  password?: string;
  
  // Enhanced processing
  enable_threat_intelligence?: boolean;
  enable_geolocation?: boolean;
  enable_process_enrichment?: boolean;
  enable_user_enrichment?: boolean;
}

// Event Level Mappings
export const WindowsEventLevels: Record<number, string> = {
  0: "LogAlways",
  1: "Critical",
  2: "Error",
  3: "Warning", 
  4: "Information",
  5: "Verbose"
};

// Logon Type Mappings
export const WindowsLogonTypes: Record<number, string> = {
  2: "Interactive",
  3: "Network",
  4: "Batch",
  5: "Service",
  7: "Unlock",
  8: "NetworkCleartext",
  9: "NewCredentials",
  10: "RemoteInteractive",
  11: "CachedInteractive"
};

// Common Windows Event IDs for threat detection
export const CriticalWindowsEventIds = {
  // Authentication
  LOGON_SUCCESS: 4624,
  LOGON_FAILURE: 4625,
  SPECIAL_LOGON: 4672,
  LOGOFF: 4634,
  ACCOUNT_LOCKOUT: 4740,
  
  // Process execution
  PROCESS_CREATION: 4688,
  PROCESS_TERMINATION: 4689,
  
  // Services
  SERVICE_INSTALL: 7045,
  SERVICE_START: 7036,
  
  // Scheduled tasks
  TASK_CREATED: 4698,
  TASK_DELETED: 4699,
  TASK_ENABLED: 4700,
  TASK_DISABLED: 4701,
  TASK_UPDATED: 4702,
  
  // PowerShell
  POWERSHELL_MODULE_LOGGING: 4103,
  POWERSHELL_SCRIPT_BLOCK: 4104,
  
  // Event log management
  LOG_CLEARED: 1102,
  LOG_SERVICE_STOPPED: 1100,
  
  // Object access
  FILE_CREATED: 4656,
  FILE_DELETED: 4660,
  REGISTRY_KEY_CREATED: 4657,
  
  // Policy changes
  AUDIT_POLICY_CHANGE: 4719,
  SYSTEM_TIME_CHANGE: 4616,
  
  // User/Group management
  USER_ACCOUNT_CREATED: 4720,
  USER_ACCOUNT_DELETED: 4726,
  GROUP_CREATED: 4727,
  GROUP_DELETED: 4730,
  
  // Privilege use
  SENSITIVE_PRIVILEGE_USE: 4673,
  OBJECT_PRIVILEGE_USE: 4674
};

// Event severity mappings for threat detection
export const WindowsEventSeverity: Record<number, string> = {
  [CriticalWindowsEventIds.LOG_CLEARED]: "critical",
  [CriticalWindowsEventIds.ACCOUNT_LOCKOUT]: "high",
  [CriticalWindowsEventIds.LOGON_FAILURE]: "medium",
  [CriticalWindowsEventIds.SERVICE_INSTALL]: "medium",
  [CriticalWindowsEventIds.TASK_CREATED]: "medium",
  [CriticalWindowsEventIds.POWERSHELL_SCRIPT_BLOCK]: "medium",
  [CriticalWindowsEventIds.PROCESS_CREATION]: "low",
  [CriticalWindowsEventIds.LOGON_SUCCESS]: "info"
};

// Export all types
export type WindowsEventTypes = 
  | WindowsLogonEvent
  | WindowsLogonFailureEvent
  | WindowsProcessCreationEvent
  | WindowsServiceInstallEvent
  | WindowsScheduledTaskEvent
  | WindowsPowerShellEvent
  | WindowsLogClearEvent;