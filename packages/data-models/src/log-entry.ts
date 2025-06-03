export interface LogEntry {
  id: string;
  timestamp: string;
  source: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  metadata?: Record<string, any>;
  userId?: string;
  ip?: string;
  userAgent?: string;
}

export interface WindowsEventLogEntry extends LogEntry {
  eventId: number;
  taskCategory: string;
  keywords: string[];
  computerName: string;
  channel: string;
}

export interface SyslogEntry extends LogEntry {
  facility: number;
  severity: number;
  hostname: string;
  tag?: string;
}