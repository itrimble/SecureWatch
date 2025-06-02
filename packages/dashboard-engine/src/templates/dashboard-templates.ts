import { DashboardTemplate, DashboardConfig } from '../types/dashboard.types';

export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  {
    id: 'soc-overview',
    name: 'SOC Overview Dashboard',
    description: 'Comprehensive Security Operations Center overview with key metrics, alerts, and threat monitoring',
    category: 'Security',
    tags: ['soc', 'security', 'overview', 'monitoring'],
    difficulty: 'intermediate',
    estimatedSetupTime: 15,
    config: {
      title: 'SOC Overview Dashboard',
      description: 'Real-time security operations center monitoring and alerting',
      layout: {
        breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480 },
        rows: [
          {
            id: 'row-1',
            height: 4,
            columns: [
              {
                id: 'col-1-1',
                width: 3,
                widgetId: 'active-alerts',
                widgetConfig: {
                  id: 'active-alerts',
                  type: 'metric',
                  title: 'Active Alerts',
                  description: 'Current number of active security alerts',
                  dataSource: {
                    type: 'query',
                    value: 'alerts | where status == "open" | summarize count()'
                  },
                  visualization: {
                    type: 'metric',
                    options: {
                      format: 'number',
                      precision: 0,
                      thresholds: [
                        { min: 0, max: 10, color: '#10b981', label: 'Low' },
                        { min: 11, max: 50, color: '#f59e0b', label: 'Medium' },
                        { min: 51, max: Infinity, color: '#ef4444', label: 'High' }
                      ]
                    }
                  }
                }
              },
              {
                id: 'col-1-2',
                width: 3,
                widgetId: 'critical-alerts',
                widgetConfig: {
                  id: 'critical-alerts',
                  type: 'metric',
                  title: 'Critical Alerts',
                  description: 'High priority security incidents requiring immediate attention',
                  dataSource: {
                    type: 'query',
                    value: 'alerts | where severity == "critical" and status == "open" | summarize count()'
                  },
                  visualization: {
                    type: 'metric',
                    options: {
                      format: 'number',
                      precision: 0,
                      thresholds: [
                        { min: 0, max: 0, color: '#10b981', label: 'None' },
                        { min: 1, max: 5, color: '#f59e0b', label: 'Some' },
                        { min: 6, max: Infinity, color: '#ef4444', label: 'Many' }
                      ]
                    }
                  }
                }
              },
              {
                id: 'col-1-3',
                width: 3,
                widgetId: 'security-score',
                widgetConfig: {
                  id: 'security-score',
                  type: 'security-score',
                  title: 'Security Score',
                  description: 'Overall security posture assessment',
                  dataSource: {
                    type: 'api',
                    value: '/api/security-score'
                  },
                  visualization: {
                    type: 'security-score',
                    options: {}
                  }
                }
              },
              {
                id: 'col-1-4',
                width: 3,
                widgetId: 'incident-response-time',
                widgetConfig: {
                  id: 'incident-response-time',
                  type: 'metric',
                  title: 'Avg Response Time',
                  description: 'Average time to respond to security incidents',
                  dataSource: {
                    type: 'query',
                    value: 'incidents | where timestamp > ago(24h) | extend response_time = resolved_time - created_time | summarize avg(response_time)'
                  },
                  visualization: {
                    type: 'metric',
                    options: {
                      format: 'duration',
                      precision: 1,
                      thresholds: [
                        { min: 0, max: 900, color: '#10b981', label: 'Excellent' },
                        { min: 901, max: 3600, color: '#f59e0b', label: 'Good' },
                        { min: 3601, max: Infinity, color: '#ef4444', label: 'Slow' }
                      ]
                    }
                  }
                }
              }
            ]
          },
          {
            id: 'row-2',
            height: 8,
            columns: [
              {
                id: 'col-2-1',
                width: 8,
                widgetId: 'alert-timeline',
                widgetConfig: {
                  id: 'alert-timeline',
                  type: 'chart',
                  title: 'Alert Volume Over Time',
                  description: '24-hour alert volume trend by severity',
                  dataSource: {
                    type: 'query',
                    value: 'alerts | where timestamp > ago(24h) | summarize count() by bin(timestamp, 1h), severity'
                  },
                  visualization: {
                    type: 'area',
                    options: {
                      stacked: true,
                      colors: ['#ef4444', '#f59e0b', '#ffc107', '#10b981'],
                      showGrid: true,
                      showLegend: true
                    }
                  }
                }
              },
              {
                id: 'col-2-2',
                width: 4,
                widgetId: 'threat-feed',
                widgetConfig: {
                  id: 'threat-feed',
                  type: 'threat-feed',
                  title: 'Live Threat Feed',
                  description: 'Latest threat intelligence indicators',
                  dataSource: {
                    type: 'streaming',
                    value: '/api/threat-feed/stream'
                  },
                  visualization: {
                    type: 'threat-feed',
                    options: {
                      maxItems: 10,
                      autoRefresh: true
                    }
                  }
                }
              }
            ]
          },
          {
            id: 'row-3',
            height: 8,
            columns: [
              {
                id: 'col-3-1',
                width: 6,
                widgetId: 'alert-summary',
                widgetConfig: {
                  id: 'alert-summary',
                  type: 'alert-summary',
                  title: 'Alert Summary',
                  description: 'Breakdown of alerts by severity and status',
                  dataSource: {
                    type: 'query',
                    value: 'alerts | where timestamp > ago(24h)'
                  },
                  visualization: {
                    type: 'alert-summary',
                    options: {
                      severityField: 'severity',
                      statusField: 'status',
                      timeField: 'timestamp',
                      showTrend: true,
                      maxAlerts: 10
                    }
                  }
                }
              },
              {
                id: 'col-3-2',
                width: 6,
                widgetId: 'top-attack-types',
                widgetConfig: {
                  id: 'top-attack-types',
                  type: 'chart',
                  title: 'Top Attack Types',
                  description: 'Most common attack patterns detected',
                  dataSource: {
                    type: 'query',
                    value: 'security_events | where timestamp > ago(24h) | summarize count() by attack_type | top 10 by count_'
                  },
                  visualization: {
                    type: 'bar',
                    options: {
                      colors: ['#ef4444'],
                      showGrid: true,
                      showDataLabels: true
                    }
                  }
                }
              }
            ]
          }
        ]
      },
      refreshInterval: 30,
      timeRange: {
        type: 'relative',
        value: '24h'
      },
      filters: [],
      permissions: {
        owner: 'system',
        isPublic: true,
        sharedWith: []
      },
      theme: 'dark',
      tags: ['soc', 'security', 'monitoring'],
      createdBy: 'system',
      version: 1
    }
  },
  {
    id: 'authentication-monitoring',
    name: 'Authentication Monitoring',
    description: 'Monitor authentication events, failed logins, and account security metrics',
    category: 'Security',
    tags: ['authentication', 'login', 'security', 'identity'],
    difficulty: 'beginner',
    estimatedSetupTime: 10,
    config: {
      title: 'Authentication Monitoring Dashboard',
      description: 'Track login attempts, authentication failures, and identity security',
      layout: {
        breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480 },
        rows: [
          {
            id: 'row-1',
            height: 4,
            columns: [
              {
                id: 'col-1-1',
                width: 3,
                widgetId: 'total-logins',
                widgetConfig: {
                  id: 'total-logins',
                  type: 'metric',
                  title: 'Total Logins (24h)',
                  description: 'Total authentication attempts in the last 24 hours',
                  dataSource: {
                    type: 'query',
                    value: 'auth_events | where timestamp > ago(24h) | summarize count()'
                  },
                  visualization: {
                    type: 'metric',
                    options: {
                      format: 'number',
                      precision: 0,
                      showTrend: true,
                      sparkline: { enabled: true, type: 'line', height: 30 }
                    }
                  }
                }
              },
              {
                id: 'col-1-2',
                width: 3,
                widgetId: 'failed-logins',
                widgetConfig: {
                  id: 'failed-logins',
                  type: 'metric',
                  title: 'Failed Logins',
                  description: 'Authentication failures requiring investigation',
                  dataSource: {
                    type: 'query',
                    value: 'auth_events | where timestamp > ago(24h) and result == "failure" | summarize count()'
                  },
                  visualization: {
                    type: 'metric',
                    options: {
                      format: 'number',
                      precision: 0,
                      thresholds: [
                        { min: 0, max: 10, color: '#10b981', label: 'Normal' },
                        { min: 11, max: 100, color: '#f59e0b', label: 'Elevated' },
                        { min: 101, max: Infinity, color: '#ef4444', label: 'High' }
                      ]
                    }
                  }
                }
              },
              {
                id: 'col-1-3',
                width: 3,
                widgetId: 'unique-users',
                widgetConfig: {
                  id: 'unique-users',
                  type: 'metric',
                  title: 'Active Users',
                  description: 'Unique users with authentication activity',
                  dataSource: {
                    type: 'query',
                    value: 'auth_events | where timestamp > ago(24h) | summarize dcount(user_id)'
                  },
                  visualization: {
                    type: 'metric',
                    options: {
                      format: 'number',
                      precision: 0
                    }
                  }
                }
              },
              {
                id: 'col-1-4',
                width: 3,
                widgetId: 'brute-force-attempts',
                widgetConfig: {
                  id: 'brute-force-attempts',
                  type: 'metric',
                  title: 'Brute Force Attempts',
                  description: 'Detected brute force attack attempts',
                  dataSource: {
                    type: 'query',
                    value: 'auth_events | where timestamp > ago(24h) | summarize failed_attempts = countif(result == "failure") by user_id, src_ip | where failed_attempts > 5 | summarize count()'
                  },
                  visualization: {
                    type: 'metric',
                    options: {
                      format: 'number',
                      precision: 0,
                      thresholds: [
                        { min: 0, max: 0, color: '#10b981', label: 'None' },
                        { min: 1, max: Infinity, color: '#ef4444', label: 'Active' }
                      ]
                    }
                  }
                }
              }
            ]
          },
          {
            id: 'row-2',
            height: 8,
            columns: [
              {
                id: 'col-2-1',
                width: 8,
                widgetId: 'login-timeline',
                widgetConfig: {
                  id: 'login-timeline',
                  type: 'chart',
                  title: 'Authentication Timeline',
                  description: 'Login attempts over time (success vs failure)',
                  dataSource: {
                    type: 'query',
                    value: 'auth_events | where timestamp > ago(24h) | summarize count() by bin(timestamp, 1h), result'
                  },
                  visualization: {
                    type: 'line',
                    options: {
                      colors: ['#10b981', '#ef4444'],
                      showGrid: true,
                      showLegend: true
                    }
                  }
                }
              },
              {
                id: 'col-2-2',
                width: 4,
                widgetId: 'authentication-methods',
                widgetConfig: {
                  id: 'authentication-methods',
                  type: 'chart',
                  title: 'Authentication Methods',
                  description: 'Breakdown of authentication methods used',
                  dataSource: {
                    type: 'query',
                    value: 'auth_events | where timestamp > ago(24h) | summarize count() by auth_method'
                  },
                  visualization: {
                    type: 'pie',
                    options: {
                      colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
                      showLegend: true
                    }
                  }
                }
              }
            ]
          },
          {
            id: 'row-3',
            height: 8,
            columns: [
              {
                id: 'col-3-1',
                width: 6,
                widgetId: 'failed-login-table',
                widgetConfig: {
                  id: 'failed-login-table',
                  type: 'table',
                  title: 'Recent Failed Logins',
                  description: 'Latest authentication failures for investigation',
                  dataSource: {
                    type: 'query',
                    value: 'auth_events | where timestamp > ago(24h) and result == "failure" | project timestamp, user_id, src_ip, reason | top 100 by timestamp desc'
                  },
                  visualization: {
                    type: 'table',
                    options: {
                      columns: [
                        { key: 'timestamp', title: 'Time', dataType: 'date', sortable: true },
                        { key: 'user_id', title: 'User', dataType: 'user', sortable: true },
                        { key: 'src_ip', title: 'Source IP', dataType: 'ip', sortable: true },
                        { key: 'reason', title: 'Failure Reason', dataType: 'string', sortable: true }
                      ],
                      pagination: { enabled: true, pageSize: 10 },
                      sorting: { enabled: true, defaultSort: { column: 'timestamp', direction: 'desc' } }
                    }
                  }
                }
              },
              {
                id: 'col-3-2',
                width: 6,
                widgetId: 'top-source-ips',
                widgetConfig: {
                  id: 'top-source-ips',
                  type: 'chart',
                  title: 'Top Source IPs',
                  description: 'IP addresses with most authentication attempts',
                  dataSource: {
                    type: 'query',
                    value: 'auth_events | where timestamp > ago(24h) | summarize total = count(), failures = countif(result == "failure") by src_ip | top 10 by total desc'
                  },
                  visualization: {
                    type: 'bar',
                    options: {
                      colors: ['#3b82f6', '#ef4444'],
                      showGrid: true,
                      showLegend: true
                    }
                  }
                }
              }
            ]
          }
        ]
      },
      refreshInterval: 60,
      timeRange: {
        type: 'relative',
        value: '24h'
      },
      filters: [],
      permissions: {
        owner: 'system',
        isPublic: true,
        sharedWith: []
      },
      theme: 'light',
      tags: ['authentication', 'identity', 'security'],
      createdBy: 'system',
      version: 1
    }
  },
  {
    id: 'malware-defense',
    name: 'Malware Defense Dashboard',
    description: 'Monitor malware detection, endpoint protection, and threat mitigation efforts',
    category: 'Security',
    tags: ['malware', 'endpoint', 'protection', 'threats'],
    difficulty: 'advanced',
    estimatedSetupTime: 20,
    config: {
      title: 'Malware Defense Dashboard',
      description: 'Comprehensive malware detection and endpoint protection monitoring',
      layout: {
        breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480 },
        rows: [
          {
            id: 'row-1',
            height: 4,
            columns: [
              {
                id: 'col-1-1',
                width: 3,
                widgetId: 'malware-detections',
                widgetConfig: {
                  id: 'malware-detections',
                  type: 'metric',
                  title: 'Malware Detections',
                  description: 'Total malware samples detected in the last 24 hours',
                  dataSource: {
                    type: 'query',
                    value: 'malware_events | where timestamp > ago(24h) | summarize count()'
                  },
                  visualization: {
                    type: 'metric',
                    options: {
                      format: 'number',
                      precision: 0,
                      showTrend: true,
                      thresholds: [
                        { min: 0, max: 10, color: '#10b981', label: 'Low' },
                        { min: 11, max: 50, color: '#f59e0b', label: 'Medium' },
                        { min: 51, max: Infinity, color: '#ef4444', label: 'High' }
                      ]
                    }
                  }
                }
              },
              {
                id: 'col-1-2',
                width: 3,
                widgetId: 'quarantined-files',
                widgetConfig: {
                  id: 'quarantined-files',
                  type: 'metric',
                  title: 'Quarantined Files',
                  description: 'Files currently in quarantine',
                  dataSource: {
                    type: 'query',
                    value: 'quarantine_events | where status == "quarantined" | summarize count()'
                  },
                  visualization: {
                    type: 'metric',
                    options: {
                      format: 'number',
                      precision: 0
                    }
                  }
                }
              },
              {
                id: 'col-1-3',
                width: 3,
                widgetId: 'infected-endpoints',
                widgetConfig: {
                  id: 'infected-endpoints',
                  type: 'metric',
                  title: 'Infected Endpoints',
                  description: 'Endpoints with active malware infections',
                  dataSource: {
                    type: 'query',
                    value: 'endpoint_status | where malware_status == "infected" | summarize dcount(endpoint_id)'
                  },
                  visualization: {
                    type: 'metric',
                    options: {
                      format: 'number',
                      precision: 0,
                      thresholds: [
                        { min: 0, max: 0, color: '#10b981', label: 'Clean' },
                        { min: 1, max: Infinity, color: '#ef4444', label: 'Infected' }
                      ]
                    }
                  }
                }
              },
              {
                id: 'col-1-4',
                width: 3,
                widgetId: 'protection-coverage',
                widgetConfig: {
                  id: 'protection-coverage',
                  type: 'metric',
                  title: 'Protection Coverage',
                  description: 'Percentage of endpoints with active protection',
                  dataSource: {
                    type: 'query',
                    value: 'endpoint_status | summarize protected = countif(protection_status == "active"), total = count() | extend coverage = (protected * 100.0) / total | project coverage'
                  },
                  visualization: {
                    type: 'metric',
                    options: {
                      format: 'percentage',
                      precision: 1,
                      thresholds: [
                        { min: 95, max: 100, color: '#10b981', label: 'Excellent' },
                        { min: 90, max: 94, color: '#f59e0b', label: 'Good' },
                        { min: 0, max: 89, color: '#ef4444', label: 'Poor' }
                      ]
                    }
                  }
                }
              }
            ]
          },
          {
            id: 'row-2',
            height: 8,
            columns: [
              {
                id: 'col-2-1',
                width: 8,
                widgetId: 'malware-timeline',
                widgetConfig: {
                  id: 'malware-timeline',
                  type: 'chart',
                  title: 'Malware Detection Timeline',
                  description: 'Malware detections over time by type',
                  dataSource: {
                    type: 'query',
                    value: 'malware_events | where timestamp > ago(7d) | summarize count() by bin(timestamp, 1h), malware_type'
                  },
                  visualization: {
                    type: 'area',
                    options: {
                      stacked: true,
                      colors: ['#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4'],
                      showGrid: true,
                      showLegend: true
                    }
                  }
                }
              },
              {
                id: 'col-2-2',
                width: 4,
                widgetId: 'malware-families',
                widgetConfig: {
                  id: 'malware-families',
                  type: 'chart',
                  title: 'Top Malware Families',
                  description: 'Most detected malware families',
                  dataSource: {
                    type: 'query',
                    value: 'malware_events | where timestamp > ago(7d) | summarize count() by malware_family | top 10 by count_'
                  },
                  visualization: {
                    type: 'donut',
                    options: {
                      colors: ['#ef4444', '#f59e0b', '#fbbf24', '#34d399', '#60a5fa'],
                      showLegend: true
                    }
                  }
                }
              }
            ]
          },
          {
            id: 'row-3',
            height: 8,
            columns: [
              {
                id: 'col-3-1',
                width: 6,
                widgetId: 'recent-detections',
                widgetConfig: {
                  id: 'recent-detections',
                  type: 'table',
                  title: 'Recent Malware Detections',
                  description: 'Latest malware samples detected by the system',
                  dataSource: {
                    type: 'query',
                    value: 'malware_events | where timestamp > ago(24h) | project timestamp, endpoint_id, malware_family, file_path, action_taken | top 50 by timestamp desc'
                  },
                  visualization: {
                    type: 'table',
                    options: {
                      columns: [
                        { key: 'timestamp', title: 'Detection Time', dataType: 'date', sortable: true },
                        { key: 'endpoint_id', title: 'Endpoint', dataType: 'host', sortable: true },
                        { key: 'malware_family', title: 'Malware Family', dataType: 'string', sortable: true },
                        { key: 'file_path', title: 'File Path', dataType: 'string', ellipsis: true },
                        { key: 'action_taken', title: 'Action', dataType: 'string', sortable: true }
                      ],
                      pagination: { enabled: true, pageSize: 10 },
                      sorting: { enabled: true, defaultSort: { column: 'timestamp', direction: 'desc' } }
                    }
                  }
                }
              },
              {
                id: 'col-3-2',
                width: 6,
                widgetId: 'endpoint-status',
                widgetConfig: {
                  id: 'endpoint-status',
                  type: 'chart',
                  title: 'Endpoint Protection Status',
                  description: 'Distribution of endpoint protection states',
                  dataSource: {
                    type: 'query',
                    value: 'endpoint_status | summarize count() by protection_status'
                  },
                  visualization: {
                    type: 'bar',
                    options: {
                      colors: ['#10b981', '#f59e0b', '#ef4444'],
                      showGrid: true,
                      showDataLabels: true
                    }
                  }
                }
              }
            ]
          }
        ]
      },
      refreshInterval: 30,
      timeRange: {
        type: 'relative',
        value: '24h'
      },
      filters: [],
      permissions: {
        owner: 'system',
        isPublic: true,
        sharedWith: []
      },
      theme: 'dark',
      tags: ['malware', 'endpoint', 'protection'],
      createdBy: 'system',
      version: 1
    }
  },
  {
    id: 'network-security',
    name: 'Network Security Monitoring',
    description: 'Monitor network traffic, intrusions, and firewall activity',
    category: 'Security',
    tags: ['network', 'firewall', 'intrusion', 'traffic'],
    difficulty: 'intermediate',
    estimatedSetupTime: 15,
    config: {
      title: 'Network Security Dashboard',
      description: 'Real-time network security monitoring and threat detection',
      layout: {
        breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480 },
        rows: [
          {
            id: 'row-1',
            height: 6,
            columns: [
              {
                id: 'col-1-1',
                width: 12,
                widgetId: 'network-topology',
                widgetConfig: {
                  id: 'network-topology',
                  type: 'network-graph',
                  title: 'Network Topology & Threat Map',
                  description: 'Real-time network connections and threat indicators',
                  dataSource: {
                    type: 'streaming',
                    value: '/api/network/topology'
                  },
                  visualization: {
                    type: 'network-graph',
                    options: {
                      showThreats: true,
                      showTraffic: true,
                      clustering: true
                    }
                  }
                }
              }
            ]
          }
        ]
      },
      refreshInterval: 15,
      timeRange: {
        type: 'relative',
        value: '1h'
      },
      filters: [],
      permissions: {
        owner: 'system',
        isPublic: true,
        sharedWith: []
      },
      theme: 'dark',
      tags: ['network', 'security', 'monitoring'],
      createdBy: 'system',
      version: 1
    }
  }
];

export function getDashboardTemplate(id: string): DashboardTemplate | null {
  return DASHBOARD_TEMPLATES.find(template => template.id === id) || null;
}

export function getDashboardTemplatesByCategory(category: string): DashboardTemplate[] {
  return DASHBOARD_TEMPLATES.filter(template => template.category === category);
}

export function searchDashboardTemplates(query: string): DashboardTemplate[] {
  const searchLower = query.toLowerCase();
  return DASHBOARD_TEMPLATES.filter(template =>
    template.name.toLowerCase().includes(searchLower) ||
    template.description.toLowerCase().includes(searchLower) ||
    template.tags.some(tag => tag.includes(searchLower))
  );
}

export function createDashboardFromTemplate(
  templateId: string,
  customizations: Partial<DashboardConfig> = {}
): DashboardConfig | null {
  const template = getDashboardTemplate(templateId);
  if (!template) return null;

  const now = new Date().toISOString();
  const dashboardId = `${templateId}-${Date.now()}`;

  return {
    ...template.config,
    ...customizations,
    id: dashboardId,
    createdAt: now,
    updatedAt: now,
    version: 1
  } as DashboardConfig;
}