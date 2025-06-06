// Sigma Rule Converter - Converts Sigma YAML rules to SecureWatch native KQL format
// Handles detection logic, conditions, and field mappings according to Sigma specification

import * as yaml from 'js-yaml';
import { Rule, SigmaRule, RuleUtils, DetectionSelection, DetectionCondition } from '../types/Rule';

export interface SigmaFieldMapping {
  [sigmaField: string]: string; // Maps Sigma fields to our ECS/native fields
}

export interface SigmaConversionResult {
  success: boolean;
  rule?: Rule;
  errors: string[];
  warnings: string[];
  originalRule: SigmaRule;
}

export class SigmaConverter {
  private fieldMappings: SigmaFieldMapping;
  private categoryMappings: Record<string, string>;

  constructor() {
    this.fieldMappings = this.initializeFieldMappings();
    this.categoryMappings = this.initializeCategoryMappings();
  }

  // Convert Sigma YAML rule to our native Rule format
  async convertRule(sigmaYaml: string): Promise<SigmaConversionResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Parse YAML
      const sigmaRule = yaml.load(sigmaYaml) as SigmaRule;
      
      if (!sigmaRule) {
        return {
          success: false,
          errors: ['Failed to parse Sigma YAML'],
          warnings: [],
          originalRule: {} as SigmaRule
        };
      }

      // Validate required fields
      const validationResult = this.validateSigmaRule(sigmaRule);
      if (!validationResult.isValid) {
        return {
          success: false,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          originalRule: sigmaRule
        };
      }

      // Convert detection logic to KQL
      const detectionResult = this.convertDetection(sigmaRule.detection);
      if (!detectionResult.success) {
        errors.push(...detectionResult.errors);
        warnings.push(...detectionResult.warnings);
      }

      // Build native rule
      const nativeRule: Rule = {
        id: RuleUtils.generateRuleId(sigmaRule.title, 'sigma'),
        rule_id: sigmaRule.id || RuleUtils.generateRuleId(sigmaRule.title, 'sigma'),
        title: sigmaRule.title,
        description: sigmaRule.description || '',
        author: sigmaRule.author || 'Unknown',
        date: sigmaRule.date || new Date().toISOString(),
        modified: sigmaRule.modified,

        // Classification
        category: this.mapCategory(sigmaRule.logsource?.category),
        product: sigmaRule.logsource?.product || 'Unknown',
        service: sigmaRule.logsource?.service || 'Unknown',

        // Severity
        level: RuleUtils.mapSeverityToLevel(sigmaRule.level || 'medium'),
        severity: this.mapSeverityToNumber(sigmaRule.level || 'medium'),

        // MITRE ATT&CK
        mitre_attack_techniques: RuleUtils.extractMitreTechniques(sigmaRule.tags),
        mitre_attack_tactics: RuleUtils.extractMitreTactics(sigmaRule.tags),

        // Detection logic
        detection_query: detectionResult.kqlQuery || '',
        condition: this.convertCondition(sigmaRule.detection.condition),
        timeframe: this.extractTimeframe(sigmaRule.detection.condition),
        aggregation: this.extractAggregation(sigmaRule.detection.condition),

        // Source information
        source_type: 'sigma',
        source_url: '',
        source_version: '',
        original_rule: JSON.stringify(sigmaRule),

        // Metadata
        tags: sigmaRule.tags || [],
        references: sigmaRule.references || [],
        false_positives: sigmaRule.falsepositives || [],

        // Management
        enabled: true,
        custom_modified: false,

        // Timestamps
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        imported_at: new Date().toISOString()
      };

      return {
        success: errors.length === 0,
        rule: nativeRule,
        errors,
        warnings,
        originalRule: sigmaRule
      };

    } catch (error) {
      return {
        success: false,
        errors: [`Conversion failed: ${error.message}`],
        warnings: [],
        originalRule: {} as SigmaRule
      };
    }
  }

  // Convert Sigma detection block to KQL query
  private convertDetection(detection: any): { success: boolean; kqlQuery?: string; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const selections: DetectionSelection[] = [];
      
      // Parse detection selections (everything except 'condition')
      for (const [key, value] of Object.entries(detection)) {
        if (key === 'condition') continue;
        
        const selection = this.parseSelection(key, value);
        if (selection) {
          selections.push(selection);
        } else {
          warnings.push(`Could not parse selection: ${key}`);
        }
      }

      // Convert condition to KQL
      const kqlQuery = this.buildKqlFromSelections(selections, detection.condition);

      return {
        success: true,
        kqlQuery,
        errors,
        warnings
      };

    } catch (error) {
      return {
        success: false,
        errors: [`Detection conversion failed: ${error.message}`],
        warnings
      };
    }
  }

  // Parse a Sigma selection into our format
  private parseSelection(selectionName: string, selectionData: any): DetectionSelection | null {
    if (!selectionData || typeof selectionData !== 'object') {
      return null;
    }

    const conditions: DetectionCondition[] = [];

    for (const [field, value] of Object.entries(selectionData)) {
      // Map Sigma field to our native field
      const nativeField = this.fieldMappings[field] || field;
      
      if (Array.isArray(value)) {
        // Multiple values - use 'in' operator
        conditions.push({
          field: nativeField,
          operator: 'in',
          value: value
        });
      } else if (typeof value === 'string') {
        // Single value - determine operator based on content
        const condition = this.parseStringValue(nativeField, value);
        conditions.push(condition);
      } else if (typeof value === 'object') {
        // Modifiers (contains, startswith, etc.)
        const condition = this.parseModifiers(nativeField, value);
        if (condition) {
          conditions.push(condition);
        }
      } else {
        // Direct value match
        conditions.push({
          field: nativeField,
          operator: 'equals',
          value: value
        });
      }
    }

    return {
      selection_name: selectionName,
      conditions,
      logical_operator: 'and' // Default to AND within a selection
    };
  }

  // Parse string values and detect wildcards, regex, etc.
  private parseStringValue(field: string, value: string): DetectionCondition {
    if (value.includes('*')) {
      // Wildcard pattern
      if (value.startsWith('*') && value.endsWith('*')) {
        return {
          field,
          operator: 'contains',
          value: value.slice(1, -1) // Remove wildcards
        };
      } else if (value.startsWith('*')) {
        return {
          field,
          operator: 'endswith',
          value: value.slice(1)
        };
      } else if (value.endsWith('*')) {
        return {
          field,
          operator: 'startswith',
          value: value.slice(0, -1)
        };
      } else {
        // Contains wildcard in middle - use regex
        const regexValue = value.replace(/\*/g, '.*');
        return {
          field,
          operator: 'regex',
          value: regexValue
        };
      }
    } else if (value.startsWith('/') && value.endsWith('/')) {
      // Regex pattern
      return {
        field,
        operator: 'regex',
        value: value.slice(1, -1)
      };
    } else {
      // Exact match
      return {
        field,
        operator: 'equals',
        value
      };
    }
  }

  // Parse Sigma modifiers
  private parseModifiers(field: string, modifiers: any): DetectionCondition | null {
    for (const [modifier, value] of Object.entries(modifiers)) {
      switch (modifier) {
        case 'contains':
          return {
            field,
            operator: 'contains',
            value: Array.isArray(value) ? value : [value]
          };
        case 'startswith':
          return {
            field,
            operator: 'startswith',
            value: Array.isArray(value) ? value : [value]
          };
        case 'endswith':
          return {
            field,
            operator: 'endswith',
            value: Array.isArray(value) ? value : [value]
          };
        case 'all':
          // All values must match - convert to multiple AND conditions
          return {
            field,
            operator: 'in',
            value: Array.isArray(value) ? value : [value]
          };
        case 'lt':
          return {
            field,
            operator: 'lt',
            value: value as number
          };
        case 'lte':
          return {
            field,
            operator: 'lte',
            value: value as number
          };
        case 'gt':
          return {
            field,
            operator: 'gt',
            value: value as number
          };
        case 'gte':
          return {
            field,
            operator: 'gte',
            value: value as number
          };
        case 'regex':
          return {
            field,
            operator: 'regex',
            value: value as string
          };
      }
    }
    return null;
  }

  // Build KQL query from selections and condition
  private buildKqlFromSelections(selections: DetectionSelection[], condition: string): string {
    const selectionQueries: Record<string, string> = {};

    // Build query for each selection
    for (const selection of selections) {
      const conditionStrings = selection.conditions.map(cond => this.buildConditionString(cond));
      const joinOperator = selection.logical_operator === 'or' ? ' or ' : ' and ';
      selectionQueries[selection.selection_name] = `(${conditionStrings.join(joinOperator)})`;
    }

    // Replace selection names in condition with actual queries
    let kqlQuery = condition;
    for (const [selectionName, query] of Object.entries(selectionQueries)) {
      const regex = new RegExp(`\\b${selectionName}\\b`, 'g');
      kqlQuery = kqlQuery.replace(regex, query);
    }

    // Clean up logical operators
    kqlQuery = kqlQuery
      .replace(/\band\b/gi, ' and ')
      .replace(/\bor\b/gi, ' or ')
      .replace(/\bnot\b/gi, ' not ')
      .replace(/\s+/g, ' ')
      .trim();

    return kqlQuery;
  }

  // Build condition string for KQL
  private buildConditionString(condition: DetectionCondition): string {
    const { field, operator, value } = condition;

    switch (operator) {
      case 'equals':
        return `${field} == "${value}"`;
      case 'contains':
        if (Array.isArray(value)) {
          return value.map(v => `${field} contains "${v}"`).join(' or ');
        }
        return `${field} contains "${value}"`;
      case 'startswith':
        if (Array.isArray(value)) {
          return value.map(v => `${field} startswith "${v}"`).join(' or ');
        }
        return `${field} startswith "${value}"`;
      case 'endswith':
        if (Array.isArray(value)) {
          return value.map(v => `${field} endswith "${v}"`).join(' or ');
        }
        return `${field} endswith "${value}"`;
      case 'regex':
        return `${field} matches regex "${value}"`;
      case 'in':
        if (Array.isArray(value)) {
          const valueList = value.map(v => `"${v}"`).join(', ');
          return `${field} in (${valueList})`;
        }
        return `${field} == "${value}"`;
      case 'not_in':
        if (Array.isArray(value)) {
          const valueList = value.map(v => `"${v}"`).join(', ');
          return `${field} not in (${valueList})`;
        }
        return `${field} != "${value}"`;
      case 'gt':
        return `${field} > ${value}`;
      case 'gte':
        return `${field} >= ${value}`;
      case 'lt':
        return `${field} < ${value}`;
      case 'lte':
        return `${field} <= ${value}`;
      default:
        return `${field} == "${value}"`;
    }
  }

  // Extract timeframe from condition
  private extractTimeframe(condition: string): string | undefined {
    const timeframeMatch = condition.match(/timeframe\s*=\s*(\w+)/i);
    if (timeframeMatch) {
      return timeframeMatch[1];
    }
    return undefined;
  }

  // Extract aggregation from condition
  private extractAggregation(condition: string): Rule['aggregation'] | undefined {
    const countMatch = condition.match(/count\(\s*(\w+)?\s*\)\s*([><=]+)\s*(\d+)/i);
    if (countMatch) {
      return {
        field: countMatch[1] || '*',
        operation: 'count',
        threshold: parseInt(countMatch[3], 10)
      };
    }

    const sumMatch = condition.match(/sum\(\s*(\w+)\s*\)\s*([><=]+)\s*(\d+)/i);
    if (sumMatch) {
      return {
        field: sumMatch[1],
        operation: 'sum',
        threshold: parseInt(sumMatch[3], 10)
      };
    }

    return undefined;
  }

  // Convert condition to simplified format
  private convertCondition(condition: string): string {
    return condition
      .replace(/\bof\b/gi, 'or')
      .replace(/\ball\b/gi, 'and')
      .replace(/\bthem\b/gi, 'all_selections')
      .trim();
  }

  // Validate Sigma rule structure
  private validateSigmaRule(rule: SigmaRule): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!rule.title) {
      errors.push('Rule title is required');
    }

    if (!rule.detection) {
      errors.push('Detection block is required');
    } else {
      if (!rule.detection.condition) {
        errors.push('Detection condition is required');
      }
    }

    if (!rule.logsource) {
      warnings.push('Log source not specified');
    }

    if (!rule.level) {
      warnings.push('Severity level not specified');
    }

    if (!rule.tags || rule.tags.length === 0) {
      warnings.push('No tags specified');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Initialize field mappings from Sigma to our ECS fields
  private initializeFieldMappings(): SigmaFieldMapping {
    return {
      // Process fields
      'ProcessName': 'process.name',
      'Image': 'process.executable',
      'CommandLine': 'process.command_line',
      'ProcessId': 'process.pid',
      'ParentProcessName': 'process.parent.name',
      'ParentImage': 'process.parent.executable',
      'ParentCommandLine': 'process.parent.command_line',
      'ParentProcessId': 'process.parent.pid',

      // User fields
      'User': 'user.name',
      'UserName': 'user.name',
      'TargetUserName': 'user.target.name',
      'SubjectUserName': 'user.name',
      'AccountName': 'user.name',

      // Host fields
      'Computer': 'host.name',
      'ComputerName': 'host.name',
      'Hostname': 'host.name',
      'WorkstationName': 'host.name',

      // Network fields
      'SourceIp': 'source.ip',
      'DestinationIp': 'destination.ip',
      'DestinationPort': 'destination.port',
      'SourcePort': 'source.port',
      'Protocol': 'network.protocol',

      // File fields
      'TargetFilename': 'file.path',
      'FileName': 'file.name',
      'FilePath': 'file.path',
      'FullPath': 'file.path',

      // Windows Event Log fields
      'EventID': 'winlog.event_id',
      'Channel': 'winlog.channel',
      'Provider_Name': 'winlog.provider_name',

      // Registry fields
      'TargetObject': 'registry.path',
      'Details': 'registry.data.strings',

      // HTTP fields
      'cs-method': 'http.request.method',
      'cs-uri-stem': 'url.path',
      'cs-uri-query': 'url.query',
      'sc-status': 'http.response.status_code',
      'cs(User-Agent)': 'user_agent.original',

      // Generic fields
      'Message': 'message',
      'EventType': 'event.type',
      'Category': 'event.category',
      'Level': 'log.level'
    };
  }

  // Initialize category mappings
  private initializeCategoryMappings(): Record<string, string> {
    return {
      'process_creation': 'process',
      'network_connection': 'network',
      'file_event': 'file',
      'registry_event': 'registry',
      'image_load': 'library',
      'pipe_created': 'pipe',
      'dns_query': 'dns',
      'webserver': 'web',
      'firewall': 'network',
      'antivirus': 'malware'
    };
  }

  // Map category
  private mapCategory(category?: string): string {
    if (!category) return 'unknown';
    return this.categoryMappings[category.toLowerCase()] || category;
  }

  // Map severity to number
  private mapSeverityToNumber(level: string): number {
    switch (level.toLowerCase()) {
      case 'informational':
      case 'low':
        return 2;
      case 'medium':
        return 5;
      case 'high':
        return 8;
      case 'critical':
        return 10;
      default:
        return 5;
    }
  }
}