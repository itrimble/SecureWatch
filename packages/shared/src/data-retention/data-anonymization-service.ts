/**
 * SecureWatch Data Anonymization and PII Masking Service
 * Provides data anonymization, pseudonymization, and PII masking capabilities
 */

import { EventEmitter } from 'events';
import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';

// PII Detection Patterns
export interface PIIPattern {
  type: PIIType;
  name: string;
  pattern: RegExp;
  confidence: number;
  jurisdiction?: string[];
  sensitivity: 'low' | 'medium' | 'high' | 'critical';
}

// PII Types
export enum PIIType {
  SSN = 'ssn',
  CREDIT_CARD = 'credit_card',
  EMAIL = 'email',
  PHONE = 'phone',
  IP_ADDRESS = 'ip_address',
  PASSPORT = 'passport',
  DRIVER_LICENSE = 'driver_license',
  MEDICAL_RECORD = 'medical_record',
  BANK_ACCOUNT = 'bank_account',
  NAME = 'name',
  ADDRESS = 'address',
  DATE_OF_BIRTH = 'date_of_birth',
  BIOMETRIC = 'biometric',
  FINANCIAL = 'financial',
  HEALTH = 'health',
  CUSTOM = 'custom'
}

// Anonymization Methods
export enum AnonymizationMethod {
  MASKING = 'masking',
  REDACTION = 'redaction',
  PSEUDONYMIZATION = 'pseudonymization',
  TOKENIZATION = 'tokenization',
  GENERALIZATION = 'generalization',
  SUPPRESSION = 'suppression',
  PERTURBATION = 'perturbation',
  SYNTHETIC = 'synthetic'
}

// Anonymization Policy
export interface AnonymizationPolicy {
  id: string;
  name: string;
  description: string;
  dataTypes: string[];
  rules: AnonymizationRule[];
  preserveFormat: boolean;
  preserveNulls: boolean;
  consistentMapping: boolean;
  reversible: boolean;
  encryptionKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Anonymization Rule
export interface AnonymizationRule {
  id: string;
  piiType: PIIType;
  method: AnonymizationMethod;
  parameters: Record<string, any>;
  conditions?: {
    field?: string;
    operator: 'equals' | 'contains' | 'regex' | 'greater_than' | 'less_than';
    value: any;
  }[];
  priority: number;
  enabled: boolean;
}

// PII Detection Result
export interface PIIDetectionResult {
  text: string;
  detections: Array<{
    type: PIIType;
    value: string;
    startIndex: number;
    endIndex: number;
    confidence: number;
    sensitivity: string;
    suggestions: string[];
  }>;
  totalCount: number;
  riskScore: number;
}

// Anonymization Result
export interface AnonymizationResult {
  original: any;
  anonymized: any;
  method: AnonymizationMethod;
  reversible: boolean;
  mappings?: Map<string, string>;
  metadata: {
    policyId: string;
    rulesApplied: string[];
    fieldsProcessed: string[];
    piiDetected: PIIType[];
    processingTime: number;
  };
}

// K-Anonymity Configuration
export interface KAnonymityConfig {
  k: number; // minimum group size
  quasiIdentifiers: string[];
  sensitiveAttributes?: string[];
  suppressionThreshold: number;
}

export class DataAnonymizationService extends EventEmitter {
  private piiPatterns: Map<PIIType, PIIPattern[]> = new Map();
  private policies: Map<string, AnonymizationPolicy> = new Map();
  private tokenMappings: Map<string, string> = new Map();
  private reverseMappings: Map<string, string> = new Map();
  private encryptionKey: Buffer;

  constructor(encryptionKey: string) {
    super();
    this.encryptionKey = Buffer.from(encryptionKey, 'hex');
    this.initializePIIPatterns();
  }

  /**
   * Detect PII in text
   */
  detectPII(text: string, jurisdiction?: string[]): PIIDetectionResult {
    const detections: PIIDetectionResult['detections'] = [];
    let totalCount = 0;
    let maxRisk = 0;

    for (const [piiType, patterns] of this.piiPatterns) {
      for (const pattern of patterns) {
        // Skip if jurisdiction doesn't match
        if (jurisdiction && pattern.jurisdiction && 
            !pattern.jurisdiction.some(j => jurisdiction.includes(j))) {
          continue;
        }

        const matches = text.matchAll(new RegExp(pattern.pattern, 'gi'));
        for (const match of matches) {
          if (match.index !== undefined) {
            const value = match[0];
            const startIndex = match.index;
            const endIndex = startIndex + value.length;

            detections.push({
              type: piiType,
              value,
              startIndex,
              endIndex,
              confidence: pattern.confidence,
              sensitivity: pattern.sensitivity,
              suggestions: this.generateAnonymizationSuggestions(piiType, value),
            });

            totalCount++;
            
            // Calculate risk score
            const riskContribution = this.calculateRiskScore(pattern.sensitivity, pattern.confidence);
            maxRisk = Math.max(maxRisk, riskContribution);
          }
        }
      }
    }

    return {
      text,
      detections,
      totalCount,
      riskScore: maxRisk,
    };
  }

  /**
   * Anonymize data using policy
   */
  async anonymizeData(data: any, policyId: string): Promise<AnonymizationResult> {
    const startTime = Date.now();
    const policy = this.policies.get(policyId);
    
    if (!policy) {
      throw new Error(`Anonymization policy not found: ${policyId}`);
    }

    const result: AnonymizationResult = {
      original: JSON.parse(JSON.stringify(data)),
      anonymized: JSON.parse(JSON.stringify(data)),
      method: AnonymizationMethod.MASKING,
      reversible: policy.reversible,
      mappings: new Map(),
      metadata: {
        policyId,
        rulesApplied: [],
        fieldsProcessed: [],
        piiDetected: [],
        processingTime: 0,
      },
    };

    // Sort rules by priority
    const sortedRules = policy.rules.sort((a, b) => b.priority - a.priority);

    // Apply anonymization rules
    for (const rule of sortedRules) {
      if (!rule.enabled) continue;

      try {
        await this.applyAnonymizationRule(result.anonymized, rule, result, policy);
        result.metadata.rulesApplied.push(rule.id);
      } catch (error) {
        console.error(`Failed to apply anonymization rule ${rule.id}:`, error);
        this.emit('anonymizationError', { rule, error, data });
      }
    }

    result.metadata.processingTime = Date.now() - startTime;
    
    this.emit('dataAnonymized', {
      policyId,
      fieldsProcessed: result.metadata.fieldsProcessed.length,
      piiDetected: result.metadata.piiDetected.length,
      method: result.method,
    });

    return result;
  }

  /**
   * Apply specific anonymization rule
   */
  private async applyAnonymizationRule(
    data: any,
    rule: AnonymizationRule,
    result: AnonymizationResult,
    policy: AnonymizationPolicy
  ): Promise<void> {
    // Recursively process nested objects
    if (typeof data === 'object' && data !== null) {
      if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
          await this.applyAnonymizationRule(data[i], rule, result, policy);
        }
      } else {
        for (const [key, value] of Object.entries(data)) {
          // Check if rule conditions are met
          if (this.shouldApplyRule(rule, key, value)) {
            data[key] = await this.anonymizeValue(value, rule, result, policy);
            result.metadata.fieldsProcessed.push(key);
          } else if (typeof value === 'object') {
            await this.applyAnonymizationRule(value, rule, result, policy);
          }
        }
      }
    }
  }

  /**
   * Check if rule should be applied
   */
  private shouldApplyRule(rule: AnonymizationRule, fieldName: string, value: any): boolean {
    if (!rule.conditions || rule.conditions.length === 0) {
      // Detect PII in the value
      if (typeof value === 'string') {
        const detection = this.detectPII(value);
        return detection.detections.some(d => d.type === rule.piiType);
      }
      return false;
    }

    // Evaluate conditions
    return rule.conditions.every(condition => {
      switch (condition.operator) {
        case 'equals':
          return condition.field ? fieldName === condition.field : value === condition.value;
        case 'contains':
          return typeof value === 'string' && value.includes(condition.value);
        case 'regex':
          return typeof value === 'string' && new RegExp(condition.value).test(value);
        case 'greater_than':
          return typeof value === 'number' && value > condition.value;
        case 'less_than':
          return typeof value === 'number' && value < condition.value;
        default:
          return false;
      }
    });
  }

  /**
   * Anonymize individual value
   */
  private async anonymizeValue(
    value: any,
    rule: AnonymizationRule,
    result: AnonymizationResult,
    policy: AnonymizationPolicy
  ): Promise<any> {
    if (typeof value !== 'string' && typeof value !== 'number') {
      return value;
    }

    const stringValue = String(value);
    result.metadata.piiDetected.push(rule.piiType);

    switch (rule.method) {
      case AnonymizationMethod.MASKING:
        return this.maskValue(stringValue, rule.parameters);
        
      case AnonymizationMethod.REDACTION:
        return this.redactValue(stringValue, rule.parameters);
        
      case AnonymizationMethod.PSEUDONYMIZATION:
        return this.pseudonymizeValue(stringValue, rule.parameters, policy.consistentMapping);
        
      case AnonymizationMethod.TOKENIZATION:
        return this.tokenizeValue(stringValue, result.mappings!, policy.reversible);
        
      case AnonymizationMethod.GENERALIZATION:
        return this.generalizeValue(stringValue, rule.piiType, rule.parameters);
        
      case AnonymizationMethod.SUPPRESSION:
        return rule.parameters.preserveNulls ? null : rule.parameters.replacementValue || '';
        
      case AnonymizationMethod.PERTURBATION:
        return this.perturbValue(stringValue, rule.parameters);
        
      case AnonymizationMethod.SYNTHETIC:
        return this.generateSyntheticValue(rule.piiType, rule.parameters);
        
      default:
        return value;
    }
  }

  /**
   * Mask value with specified pattern
   */
  private maskValue(value: string, parameters: Record<string, any>): string {
    const maskChar = parameters.maskChar || '*';
    const preserveLength = parameters.preserveLength !== false;
    const preserveFormat = parameters.preserveFormat || false;
    const visibleChars = parameters.visibleChars || 0;
    const visibleFromEnd = parameters.visibleFromEnd || 0;

    if (!preserveLength && !preserveFormat) {
      return maskChar.repeat(Math.min(value.length, 8));
    }

    let masked = '';
    for (let i = 0; i < value.length; i++) {
      const char = value[i];
      const shouldMask = i >= visibleChars && i < (value.length - visibleFromEnd);
      
      if (preserveFormat && /\W/.test(char)) {
        masked += char; // Preserve non-alphanumeric characters
      } else if (shouldMask) {
        masked += maskChar;
      } else {
        masked += char;
      }
    }

    return masked;
  }

  /**
   * Redact value
   */
  private redactValue(value: string, parameters: Record<string, any>): string {
    return parameters.replacementText || '[REDACTED]';
  }

  /**
   * Pseudonymize value
   */
  private pseudonymizeValue(value: string, parameters: Record<string, any>, consistent: boolean): string {
    if (consistent && this.tokenMappings.has(value)) {
      return this.tokenMappings.get(value)!;
    }

    const seed = parameters.seed || value;
    const hash = createHash('sha256').update(seed + this.encryptionKey.toString()).digest('hex');
    const pseudonym = parameters.prefix ? `${parameters.prefix}${hash.substring(0, 8)}` : hash.substring(0, 16);

    if (consistent) {
      this.tokenMappings.set(value, pseudonym);
      this.reverseMappings.set(pseudonym, value);
    }

    return pseudonym;
  }

  /**
   * Tokenize value
   */
  private tokenizeValue(value: string, mappings: Map<string, string>, reversible: boolean): string {
    if (mappings.has(value)) {
      return mappings.get(value)!;
    }

    const token = 'TOK_' + randomBytes(8).toString('hex').toUpperCase();
    
    mappings.set(value, token);
    if (reversible) {
      mappings.set(token, value);
    }

    return token;
  }

  /**
   * Generalize value
   */
  private generalizeValue(value: string, piiType: PIIType, parameters: Record<string, any>): string {
    switch (piiType) {
      case PIIType.DATE_OF_BIRTH:
        // Generalize to year or age range
        const date = new Date(value);
        if (parameters.toAgeRange) {
          const age = new Date().getFullYear() - date.getFullYear();
          const range = parameters.ageRangeSize || 10;
          const lowerBound = Math.floor(age / range) * range;
          return `${lowerBound}-${lowerBound + range - 1} years`;
        }
        return date.getFullYear().toString();
        
      case PIIType.ADDRESS:
        // Generalize to city or postal code prefix
        if (parameters.toCity) {
          const parts = value.split(',');
          return parts.length > 1 ? parts[parts.length - 2].trim() : 'Unknown City';
        }
        // Extract postal code and generalize
        const postalMatch = value.match(/\b\d{5}(-\d{4})?\b/);
        if (postalMatch) {
          const postal = postalMatch[0];
          return postal.substring(0, 3) + 'XX';
        }
        return 'Address';
        
      case PIIType.IP_ADDRESS:
        // Generalize to subnet
        const parts = value.split('.');
        if (parts.length === 4) {
          const prefixLength = parameters.subnetMask || 24;
          const preserveOctets = Math.floor(prefixLength / 8);
          return parts.slice(0, preserveOctets).concat(Array(4 - preserveOctets).fill('0')).join('.');
        }
        return value;
        
      default:
        return parameters.genericValue || '[GENERALIZED]';
    }
  }

  /**
   * Add noise to numerical value
   */
  private perturbValue(value: string, parameters: Record<string, any>): string {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return value;

    const noiseLevel = parameters.noiseLevel || 0.1;
    const noise = (Math.random() - 0.5) * 2 * noiseLevel * numValue;
    const perturbedValue = numValue + noise;

    return parameters.preserveInteger && Number.isInteger(numValue) 
      ? Math.round(perturbedValue).toString()
      : perturbedValue.toFixed(parameters.decimalPlaces || 2);
  }

  /**
   * Generate synthetic value
   */
  private generateSyntheticValue(piiType: PIIType, parameters: Record<string, any>): string {
    switch (piiType) {
      case PIIType.NAME:
        const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Emily'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia'];
        return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        
      case PIIType.EMAIL:
        const domains = ['example.com', 'test.org', 'sample.net'];
        const username = 'user' + Math.floor(Math.random() * 10000);
        return `${username}@${domains[Math.floor(Math.random() * domains.length)]}`;
        
      case PIIType.PHONE:
        return `555-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
        
      case PIIType.SSN:
        return `${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 90) + 10}-${Math.floor(Math.random() * 9000) + 1000}`;
        
      default:
        return parameters.defaultValue || '[SYNTHETIC]';
    }
  }

  /**
   * Implement k-anonymity
   */
  async applyKAnonymity(dataset: any[], config: KAnonymityConfig): Promise<any[]> {
    // Group records by quasi-identifier combinations
    const groups = new Map<string, any[]>();
    
    for (const record of dataset) {
      const key = config.quasiIdentifiers
        .map(field => record[field])
        .join('|');
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(record);
    }
    
    const result: any[] = [];
    
    for (const [key, group] of groups) {
      if (group.length >= config.k) {
        // Group satisfies k-anonymity
        result.push(...group);
      } else if (group.length / dataset.length > config.suppressionThreshold) {
        // Suppress small groups if they exceed threshold
        continue;
      } else {
        // Generalize quasi-identifiers for small groups
        const generalizedGroup = group.map(record => {
          const generalized = { ...record };
          config.quasiIdentifiers.forEach(field => {
            generalized[field] = this.generalizeForKAnonymity(record[field], field);
          });
          return generalized;
        });
        result.push(...generalizedGroup);
      }
    }
    
    return result;
  }

  /**
   * Register anonymization policy
   */
  registerPolicy(policy: AnonymizationPolicy): void {
    this.policies.set(policy.id, policy);
    this.emit('policyRegistered', policy);
  }

  /**
   * Initialize PII detection patterns
   */
  private initializePIIPatterns(): void {
    // SSN patterns
    this.addPIIPattern(PIIType.SSN, {
      type: PIIType.SSN,
      name: 'US Social Security Number',
      pattern: /\b\d{3}-?\d{2}-?\d{4}\b/,
      confidence: 0.9,
      jurisdiction: ['US'],
      sensitivity: 'critical',
    });

    // Credit card patterns
    this.addPIIPattern(PIIType.CREDIT_CARD, {
      type: PIIType.CREDIT_CARD,
      name: 'Credit Card Number',
      pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/,
      confidence: 0.85,
      sensitivity: 'critical',
    });

    // Email patterns
    this.addPIIPattern(PIIType.EMAIL, {
      type: PIIType.EMAIL,
      name: 'Email Address',
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
      confidence: 0.95,
      sensitivity: 'medium',
    });

    // Phone patterns
    this.addPIIPattern(PIIType.PHONE, {
      type: PIIType.PHONE,
      name: 'US Phone Number',
      pattern: /\b(?:\+1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/,
      confidence: 0.8,
      jurisdiction: ['US', 'CA'],
      sensitivity: 'medium',
    });

    // IP Address patterns
    this.addPIIPattern(PIIType.IP_ADDRESS, {
      type: PIIType.IP_ADDRESS,
      name: 'IPv4 Address',
      pattern: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/,
      confidence: 0.9,
      sensitivity: 'low',
    });

    // Additional patterns would be added here...
  }

  /**
   * Add PII pattern
   */
  private addPIIPattern(type: PIIType, pattern: PIIPattern): void {
    if (!this.piiPatterns.has(type)) {
      this.piiPatterns.set(type, []);
    }
    this.piiPatterns.get(type)!.push(pattern);
  }

  /**
   * Generate anonymization suggestions
   */
  private generateAnonymizationSuggestions(piiType: PIIType, value: string): string[] {
    const suggestions: string[] = [];
    
    switch (piiType) {
      case PIIType.EMAIL:
        suggestions.push('Mask domain: user@*****.com');
        suggestions.push('Hash: ' + createHash('md5').update(value).digest('hex').substring(0, 8));
        suggestions.push('Replace: [email_removed]');
        break;
        
      case PIIType.PHONE:
        suggestions.push('Mask: ***-***-' + value.slice(-4));
        suggestions.push('Generalize: [phone_number]');
        break;
        
      case PIIType.SSN:
        suggestions.push('Mask: ***-**-' + value.slice(-4));
        suggestions.push('Replace: [ssn_removed]');
        break;
        
      default:
        suggestions.push('Mask with asterisks');
        suggestions.push('Replace with placeholder');
        suggestions.push('Remove entirely');
    }
    
    return suggestions;
  }

  /**
   * Calculate risk score
   */
  private calculateRiskScore(sensitivity: string, confidence: number): number {
    const sensitivityWeights = {
      'low': 1,
      'medium': 2,
      'high': 3,
      'critical': 4,
    };
    
    const weight = sensitivityWeights[sensitivity as keyof typeof sensitivityWeights] || 1;
    return (weight * confidence) * 25; // Scale to 0-100
  }

  /**
   * Generalize value for k-anonymity
   */
  private generalizeForKAnonymity(value: any, field: string): any {
    // Simple generalization strategies
    if (typeof value === 'number') {
      return Math.floor(value / 10) * 10; // Round to nearest 10
    }
    
    if (typeof value === 'string') {
      if (field.toLowerCase().includes('age')) {
        const age = parseInt(value);
        if (!isNaN(age)) {
          return `${Math.floor(age / 10) * 10}-${Math.floor(age / 10) * 10 + 9}`;
        }
      }
      
      return value.substring(0, Math.max(1, Math.floor(value.length / 2))); // Truncate
    }
    
    return value;
  }
}

// Export singleton factory
export const createAnonymizationService = (encryptionKey: string) => 
  new DataAnonymizationService(encryptionKey);