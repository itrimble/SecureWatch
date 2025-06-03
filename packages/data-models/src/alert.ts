export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
  source: string;
  tags: string[];
  assignedTo?: string;
  metadata?: Record<string, any>;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  query: string;
  severity: Alert['severity'];
  enabled: boolean;
  threshold?: number;
  timeWindow?: string;
  createdAt: string;
  updatedAt: string;
}