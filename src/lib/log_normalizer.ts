// src/lib/log_normalizer.ts

// --- Define the structure of our normalized event (matches events table, excluding db defaults) ---
export interface NormalizedEvent {
  timestamp: string;
  event_source_name: string;
  event_type_id: string;
  hostname?: string;
  ip_address?: string;
  user_id?: string;
  process_id?: number;
  process_name?: string;
  severity?: string;
  message_short?: string;
  message_full?: string;
  tags?: string[];
  parsed_fields: Record<string, any>;
  raw_log?: string;
}

// --- Normalization Function for Windows JSON Events ---
// (This logic is similar to what was in ingest-poc.ts)
function normalizeWindowsEventJson(rawEvent: any): NormalizedEvent | null {
  if (!rawEvent || typeof rawEvent.Id === 'undefined' || !rawEvent.TimeCreated) {
    console.warn('[LogNormalizer] Skipping invalid raw Windows event (missing Id or TimeCreated):', JSON.stringify(rawEvent).substring(0, 500));
    return null;
  }

  const parsed_fields: Record<string, any> = {};
  if (rawEvent.Properties && Array.isArray(rawEvent.Properties)) {
    for (const prop of rawEvent.Properties) {
      if (prop && typeof prop.Name === 'string' && typeof prop.Value !== 'undefined') {
        parsed_fields[prop.Name] = prop.Value;
      }
    }
  } else if (rawEvent.EventData && typeof rawEvent.EventData === 'object' && rawEvent.EventData !== null) {
     for (const key in rawEvent.EventData) {
        if (Object.prototype.hasOwnProperty.call(rawEvent.EventData, key)) {
            parsed_fields[key] = rawEvent.EventData[key];
        }
     }
  }
  // Also capture top-level properties not in Properties/EventData if they are useful and not duplicates
  for (const key in rawEvent) {
    if (key !== 'Properties' && key !== 'EventData' && !parsed_fields.hasOwnProperty(key) && Object.prototype.hasOwnProperty.call(rawEvent, key)) {
        // Avoid overwriting already parsed properties, and common ones handled by direct mapping.
        if (['Id', 'TimeCreated', 'MachineName', 'Message', 'ProviderName', 'LogName', 'Level', 'Task', 'Opcode', 'RecordId', 'ProcessId', 'ThreadId'].includes(key)) continue;
        parsed_fields[`Raw_${key}`] = rawEvent[key]; // Prefix to avoid collision
    }
  }


  const normalized: Partial<NormalizedEvent> = { // Use Partial initially
    timestamp: new Date(rawEvent.TimeCreated).toISOString(),
    event_source_name: rawEvent.ProviderName || 'Windows EventLog',
    event_type_id: String(rawEvent.Id),
    hostname: rawEvent.MachineName,
    message_short: rawEvent.Message?.substring(0, 255) || `Event ID ${rawEvent.Id} from ${rawEvent.ProviderName || 'Unknown Provider'}`,
    message_full: rawEvent.Message || undefined,
    parsed_fields: parsed_fields,
    raw_log: JSON.stringify(rawEvent),
  };

  // Event-specific normalization (refining fields based on event ID)
  switch (rawEvent.Id) {
    case 4624: // Successful Logon
      normalized.user_id = parsed_fields.TargetUserName || undefined;
      normalized.ip_address = parsed_fields.IpAddress !== '-' && parsed_fields.IpAddress !== '::1' && parsed_fields.IpAddress ? parsed_fields.IpAddress : undefined;
      normalized.severity = 'Low';
      normalized.tags = ['authentication', 'windows', 'logon_success'];
      normalized.message_short = `Successful logon for user '${normalized.user_id || 'N/A'}' from IP '${normalized.ip_address || 'N/A'}' (Workstation: ${parsed_fields.WorkstationName || 'N/A'})`;
      break;
    case 4625: // Failed Logon
      normalized.user_id = parsed_fields.TargetUserName || parsed_fields.SubjectUserName || undefined;
      normalized.ip_address = parsed_fields.IpAddress !== '-' && parsed_fields.IpAddress !== '::1' && parsed_fields.IpAddress ? parsed_fields.IpAddress : undefined;
      normalized.severity = 'Medium';
      normalized.tags = ['authentication', 'windows', 'logon_failure'];
      normalized.message_short = `Failed logon for user '${normalized.user_id || 'N/A'}' from IP '${normalized.ip_address || 'N/A'}' (Workstation: ${parsed_fields.WorkstationName || 'N/A'})`;
      break;
    case 4688: // Process Create
      normalized.user_id = parsed_fields.SubjectUserName || undefined;
      normalized.process_name = parsed_fields.NewProcessName || parsed_fields.ProcessName || undefined;
      const newProcessIdHex = parsed_fields.NewProcessId || parsed_fields.ProcessId; // ProcessId in properties can be parent for 4688
      if (newProcessIdHex && typeof newProcessIdHex === 'string' && !isNaN(parseInt(newProcessIdHex, 16))) {
         normalized.process_id = parseInt(newProcessIdHex, 16);
      } else if (typeof newProcessIdHex === 'number') {
         normalized.process_id = newProcessIdHex;
      }
      // Parent process info often under rawEvent.ProcessId (the logging process) or specific fields
      if (parsed_fields.ParentProcessName) { // If explicitly provided
          parsed_fields.ParentProcessName = parsed_fields.ParentProcessName;
      } else if (rawEvent.ProcessId && rawEvent.ProviderName === "Microsoft-Windows-Security-Auditing" && rawEvent.Id === 4688) {
          // For 4688, the top-level rawEvent.ProcessId is the Creator Process ID (Parent)
          // We need to ensure we don't confuse it with the NewProcessId in parsed_fields.
          // Let's store it in parsed_fields if not already there.
          if (!parsed_fields.CreatorProcessId) parsed_fields.CreatorProcessId = rawEvent.ProcessId;
      }

      normalized.severity = 'Information';
      normalized.tags = ['process', 'windows', 'process_create'];
      normalized.message_short = `Process '${normalized.process_name || 'N/A'}' (PID: ${normalized.process_id || 'N/A'}) created by user '${normalized.user_id || 'N/A'}'`;
      if (parsed_fields.CommandLine) {
        normalized.message_short += ` CMD: ${String(parsed_fields.CommandLine).substring(0,100)}${String(parsed_fields.CommandLine).length > 100 ? '...' : ''}`;
      }
      break;
    default:
      normalized.severity = parsed_fields.LevelDisplayName || 'Information'; // Use LevelDisplayName if present
      normalized.tags = ['windows', `event_id_${rawEvent.Id}`];
      if (rawEvent.TaskDisplayName) {
        normalized.tags.push(rawEvent.TaskDisplayName.toLowerCase().replace(/\s+/g, '_'));
      }
      break;
  }

  if (typeof normalized.message_full === 'undefined' && normalized.message_short) {
    normalized.message_full = normalized.message_short;
  }

  return normalized as NormalizedEvent;
}

// --- Placeholder Normalization Function for Syslog ---
function normalizeSyslog(rawEvent: any): NormalizedEvent | null {
  // Basic check, assuming rawEvent is a string for syslog lines
  if (typeof rawEvent !== 'string') {
    console.warn('[LogNormalizer] Skipping invalid raw Syslog event (expected string):', typeof rawEvent);
    return null;
  }
  // VERY basic placeholder parsing - a real syslog parser is much more complex (RFC5424, BSD style, etc.)
  const syslogRegex = /<\d+>(\d)\s*(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+([\w.-]+)\s+([\w.-]+)(?:\[(\d+)\])?:\s*(.*)/;
  const match = rawEvent.match(syslogRegex);

  if (match) {
    const priority = parseInt(match[1]);
    const timestampStr = match[2]; // Needs proper year handling and parsing to ISO
    const hostname = match[3];
    const appName = match[4];
    const pid = match[5] ? parseInt(match[5]) : undefined;
    const message = match[6];

    // Placeholder severity mapping from syslog priority (very simplified)
    let severity = 'Information';
    if (priority >= 0 && priority <= 3) severity = 'Critical'; // Emergency, Alert, Critical
    else if (priority === 4) severity = 'High';     // Error
    else if (priority === 5) severity = 'Medium';   // Warning
    else if (priority === 6) severity = 'Low';      // Notice

    // Attempt to make timestamp ISO - THIS IS VERY NAIVE, needs a robust date parser
    // Assuming logs are from current year. Production needs proper syslog timestamp parsing.
    const currentYear = new Date().getFullYear();
    const parsedTimestamp = new Date(`${timestampStr} ${currentYear}`);
    const isoTimestamp = !isNaN(parsedTimestamp.getTime()) ? parsedTimestamp.toISOString() : new Date().toISOString();


    return {
      timestamp: isoTimestamp,
      event_source_name: appName || 'Syslog',
      event_type_id: `Syslog-${appName || 'Generic'}`, // Create a generic event type
      hostname: hostname,
      process_id: pid,
      process_name: appName,
      severity: severity,
      message_short: message.substring(0, 255),
      message_full: message,
      tags: ['syslog', appName ? appName.toLowerCase() : 'generic'],
      parsed_fields: {
        syslog_priority: priority,
        syslog_app_name: appName,
        // Add more parsed fields if regex captures more from message
      },
      raw_log: rawEvent,
    };
  }
  console.warn('[LogNormalizer] Failed to parse syslog line:', rawEvent.substring(0, 200));
  return null;
}

// --- Normalization Function for macOS Logs ---
function normalizeMacOSLog(rawEvent: any, sourceType: string): NormalizedEvent | null {
  // Handle both string (file logs) and JSON (unified log) formats
  let message: string;
  let timestamp: string;
  let parsed_fields: Record<string, any> = {};

  if (typeof rawEvent === 'string') {
    // File-based log entry (like system.log, install.log)
    message = rawEvent;
    timestamp = new Date().toISOString(); // Use current time for now, could parse from log line
    
    // Extract basic fields from log line if possible
    const logLineRegex = /^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+([\w.-]+)\s+(.*)/;
    const match = rawEvent.match(logLineRegex);
    
    if (match) {
      const timeStr = match[1];
      const hostname = match[2];
      const logMessage = match[3];
      
      // Parse timestamp (simplified - assumes current year)
      const currentYear = new Date().getFullYear();
      const dateWithYear = `${currentYear} ${timeStr}`;
      const parsedDate = new Date(dateWithYear);
      if (!isNaN(parsedDate.getTime())) {
        timestamp = parsedDate.toISOString();
      }
      
      parsed_fields.hostname = hostname;
      message = logMessage;
    }
  } else if (typeof rawEvent === 'object' && rawEvent.raw_message) {
    // Object with raw_message (from file collection)
    message = rawEvent.raw_message;
    timestamp = rawEvent.timestamp_collected || new Date().toISOString();
    parsed_fields.source_file = rawEvent.source_file;
  } else if (typeof rawEvent === 'object') {
    // JSON formatted log (from unified log)
    message = rawEvent.eventMessage || rawEvent.message || JSON.stringify(rawEvent);
    timestamp = rawEvent.timestamp || rawEvent.machTimestamp || new Date().toISOString();
    
    // Copy all fields as parsed data
    Object.assign(parsed_fields, rawEvent);
  } else {
    console.warn(`[LogNormalizer] Unsupported macOS log format for ${sourceType}:`, typeof rawEvent);
    return null;
  }

  // Determine event type and severity based on source and content
  let event_type_id = 'macos_log';
  let severity = 'Information';
  let tags = ['macos'];

  // Source-specific processing
  if (sourceType.includes('auth')) {
    tags.push('authentication');
    event_type_id = 'macos_auth';
    if (message.toLowerCase().includes('fail') || message.toLowerCase().includes('error')) {
      severity = 'Medium';
    }
  } else if (sourceType.includes('security')) {
    tags.push('security');
    event_type_id = 'macos_security';
    severity = 'High';
  } else if (sourceType.includes('install')) {
    tags.push('software', 'installation');
    event_type_id = 'macos_install';
  } else if (sourceType.includes('system')) {
    tags.push('system');
    event_type_id = 'macos_system';
  } else if (sourceType.includes('process')) {
    tags.push('process');
    event_type_id = 'macos_process';
  } else if (sourceType.includes('network')) {
    tags.push('network');
    event_type_id = 'macos_network';
  } else if (sourceType.includes('firewall')) {
    tags.push('firewall', 'network');
    event_type_id = 'macos_firewall';
    severity = 'Medium';
  }

  return {
    timestamp,
    event_source_name: sourceType,
    event_type_id,
    hostname: parsed_fields.hostname || parsed_fields.machineID || undefined,
    severity,
    message_short: message.substring(0, 255),
    message_full: message,
    tags,
    parsed_fields,
    raw_log: typeof rawEvent === 'string' ? rawEvent : JSON.stringify(rawEvent),
  };
}

// --- Main Exported Normalization Function ---
export async function normalizeEvent(
  rawEvent: any,
  logSourceIdentifier: string
): Promise<NormalizedEvent | null> {
  if (!rawEvent) return null;

  switch (logSourceIdentifier.toLowerCase()) {
    case 'windows_event_json':
      return normalizeWindowsEventJson(rawEvent);
    case 'syslog_rfc5424': // Or just 'syslog'
      return normalizeSyslog(rawEvent);
    // macOS log sources
    case 'macos_auth_events':
    case 'macos_security_events':
    case 'macos_process_events':
    case 'macos_network_events':
    case 'macos_firewall_events':
    case 'macos_install_events':
    case 'macos_system_log':
    case 'macos_security_log':
    case 'macos_audit_trail':
    case 'macos_kernel_events':
    case 'macos_crash_events':
    case 'macos_xpc_events':
    case 'macos_fs_events':
    case 'macos_bluetooth_events':
    case 'macos_usb_events':
    case 'macos_spotlight_events':
    case 'macos_generic_log':
      return normalizeMacOSLog(rawEvent, logSourceIdentifier);
    // Add more cases for other log sources here
    // case 'firewall_asa_csv':
    //   return normalizeFirewallAsaCsv(rawEvent);
    default:
      console.error(`[LogNormalizer] Unknown log source identifier: ${logSourceIdentifier}`);
      return null;
  }
}
