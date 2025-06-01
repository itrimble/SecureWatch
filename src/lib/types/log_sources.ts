export interface LogSource {
  id: string; // e.g., "raspberrypi-01", "varlog-syslog-prod-server"
  name: string; // display name, e.g., "Raspberry Pi 01", "Production Server System Logs"
  type: string; // e.g., "RaspberryPi", "LinuxVarLog", "WindowsEventLog", "CustomApp"
}

export interface LogSourceStatusDetails {
  id: string; // corresponds to LogSource.id
  status: 'Connected' | 'Disconnected' | 'Error' | 'Pending';
  lastSeen: string; // ISO timestamp - when the last log from this source was received
  eventsIngested: number;
  errorCount: number; // e.g., errors in collecting from this source
  details?: string; // optional, for messages like "Monitoring /var/log/syslog" or error details
}
