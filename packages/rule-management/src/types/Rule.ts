// Rule Management Package - Core Rule Data Model
// Defines the native rule format for SecureWatch SIEM

export interface Rule {
  id: string;
  title: string;
  description: string;
  author: string;
  date: string;
  modified?: string;
  
  // Rule classification
  category: string;
  product: string;
  service: string;
  
  // Severity and risk assessment
  level: 'low' | 'medium' | 'high' | 'critical';
  severity: number; // 1-10 scale
  
  // MITRE ATT&CK mapping
  mitre_attack_techniques: string[];
  mitre_attack_tactics: string[];
  
  // Rule logic
  detection_query: string; // Our native KQL-like query
  condition: string;
  timeframe?: string;
  aggregation?: {
    field: string;
    operation: 'count' | 'sum' | 'avg' | 'min' | 'max';
    threshold: number;
  };
  
  // Source information
  source_type: 'sigma' | 'elastic' | 'ossec' | 'suricata' | 'splunk' | 'chronicle' | 'custom';
  source_url?: string;
  source_version?: string;
  original_rule: string; // JSON serialized original rule
  
  // Rule metadata
  tags: string[];
  references: string[];
  false_positives: string[];
  
  // Management flags
  enabled: boolean;
  custom_modified: boolean;
  last_tested?: string;
  test_status?: 'passed' | 'failed' | 'pending';
  
  // Performance metrics
  match_count?: number;
  last_match?: string;
  average_execution_time?: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  imported_at: string;
}

export interface DetectionCondition {
  field: string;
  operator: 'equals' | 'contains' | 'startswith' | 'endswith' | 'regex' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in';
  value: string | string[] | number;
  case_sensitive?: boolean;
}

export interface DetectionSelection {
  selection_name: string;
  conditions: DetectionCondition[];
  logical_operator: 'and' | 'or';
}

export interface SigmaRule {
  title: string;
  id?: string;
  status?: string;
  description?: string;
  author?: string;
  date?: string;
  modified?: string;
  references?: string[];
  tags?: string[];
  logsource: {
    category?: string;
    product?: string;
    service?: string;
    definition?: string;
  };
  detection: {
    [key: string]: any;
    condition: string;
  };
  fields?: string[];
  falsepositives?: string[];
  level?: string;
}

export interface ElasticRule {
  id: string;
  name: string;
  description: string;
  author: string[];
  version: number;
  created: string;
  updated: string;
  type: string;
  query: string;
  language: string;
  severity: string;
  risk_score: number;
  tags: string[];
  threat: Array<{
    framework: string;
    tactic: {
      id: string;
      name: string;
      reference: string;
    };
    technique: Array<{
      id: string;
      name: string;
      reference: string;
      subtechnique?: Array<{
        id: string;
        name: string;
        reference: string;
      }>;
    }>;
  }>;
  references: string[];
  false_positives: string[];
}

export interface OSSECRule {
  id: number;
  level: number;
  description: string;
  group: string[];
  if_sid?: number;
  if_group?: string;
  regex?: string;
  match?: string;
  decoded_as?: string;
  category?: string;
  srcip?: string;
  dstip?: string;
  user?: string;
  program_name?: string;
  hostname?: string;
  time?: string;
  weekday?: string;
  id_regex?: string;
  url?: string;
  location?: string;
  protocol?: string;
  action?: string;
  status?: string;
  extra_data?: string;
  options?: string[];
}

export interface RuleValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  performance_score?: number;
  estimated_load?: 'low' | 'medium' | 'high';
}

export interface RuleTestResult {
  rule_id: string;
  test_passed: boolean;
  execution_time: number;
  matches_found: number;
  false_positives: number;
  error_message?: string;
  sample_matches?: any[];
}

export interface RuleImportResult {
  total_rules: number;
  successful_imports: number;
  failed_imports: number;
  skipped_rules: number;
  errors: Array<{
    rule_id?: string;
    error: string;
    original_rule?: any;
  }>;
  import_duration: number;
}

// Utility functions for rule management
export class RuleUtils {
  static generateRuleId(title: string, source_type: string): string {
    const cleaned = title.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const timestamp = Date.now().toString(36);
    return `${source_type}_${cleaned}_${timestamp}`;
  }

  static mapSeverityToLevel(severity: string | number): 'low' | 'medium' | 'high' | 'critical' {
    if (typeof severity === 'string') {
      switch (severity.toLowerCase()) {
        case 'low':
        case 'informational':
        case 'info':
          return 'low';
        case 'medium':
        case 'moderate':
          return 'medium';
        case 'high':
          return 'high';
        case 'critical':
        case 'severe':
          return 'critical';
        default:
          return 'medium';
      }
    } else if (typeof severity === 'number') {
      if (severity <= 2) return 'low';
      if (severity <= 5) return 'medium';
      if (severity <= 8) return 'high';
      return 'critical';
    }
    return 'medium';
  }

  static extractMitreTechniques(tags: string[] = []): string[] {
    return tags
      .filter(tag => tag.match(/^(attack\.)?t\d{4}(\.\d{3})?$/i))
      .map(tag => tag.replace(/^attack\./, '').toUpperCase());
  }

  static extractMitreTactics(tags: string[] = []): string[] {
    const tacticMap: Record<string, string> = {
      'initial-access': 'TA0001',
      'execution': 'TA0002',
      'persistence': 'TA0003',
      'privilege-escalation': 'TA0004',
      'defense-evasion': 'TA0005',
      'credential-access': 'TA0006',
      'discovery': 'TA0007',
      'lateral-movement': 'TA0008',
      'collection': 'TA0009',
      'command-and-control': 'TA0011',
      'exfiltration': 'TA0010',
      'impact': 'TA0040'
    };

    return tags
      .filter(tag => tacticMap[tag.toLowerCase().replace('attack.', '')])
      .map(tag => tacticMap[tag.toLowerCase().replace('attack.', '')]);
  }

  static validateRule(rule: Rule): RuleValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!rule.title || rule.title.trim().length === 0) {
      errors.push('Rule title is required');
    }

    if (!rule.detection_query || rule.detection_query.trim().length === 0) {
      errors.push('Detection query is required');
    }

    if (!rule.condition || rule.condition.trim().length === 0) {
      errors.push('Detection condition is required');
    }

    if (!rule.level) {
      warnings.push('Rule severity level not specified, defaulting to medium');
    }

    if (!rule.mitre_attack_techniques || rule.mitre_attack_techniques.length === 0) {
      warnings.push('No MITRE ATT&CK techniques mapped');
    }

    // Estimate performance impact
    let performance_score = 100;
    if (rule.detection_query.includes('*')) performance_score -= 20;
    if (rule.detection_query.includes('regex')) performance_score -= 30;
    if (rule.aggregation) performance_score -= 10;

    const estimated_load = performance_score > 80 ? 'low' : 
                          performance_score > 50 ? 'medium' : 'high';

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      performance_score,
      estimated_load
    };
  }
}