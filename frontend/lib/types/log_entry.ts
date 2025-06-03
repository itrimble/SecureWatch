export interface LogEntry {
  id: string; // Unique ID for the log entry
  timestamp: string; // ISO 8601 format
  source_identifier: string; // e.g., 'webserver-01', 'pi-hole'
  log_file: string; // e.g., 'syslog', 'auth.log', 'application.log'
  message: string; // The raw log message
  enriched_data?: any; // Placeholder for future data like threat intel, parsed fields
}
