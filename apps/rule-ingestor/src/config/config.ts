// Configuration for Rule Ingestor Service
// Defines repositories, schedules, and conversion settings

import { SourceConfig } from '../services/RuleIngestorService';

export interface RuleIngestorConfig {
  repositories: {
    basePath: string;
    sources: SourceConfig[];
  };
  scheduler: {
    enabled: boolean;
    cronExpression: string;
    timezone: string;
  };
  processing: {
    batchSize: number;
    maxConcurrentImports: number;
    timeoutMs: number;
  };
  conversion: {
    strictValidation: boolean;
    skipInvalidRules: boolean;
    enableFieldMapping: boolean;
  };
}

export const config: RuleIngestorConfig = {
  repositories: {
    basePath: process.env.RULE_REPOS_PATH || '/var/lib/securewatch/rule-repos',
    sources: [
      {
        name: 'sigma-main',
        type: 'sigma',
        url: 'https://github.com/SigmaHQ/sigma.git',
        branch: 'master',
        rulePaths: [
          'rules',
          'rules-emerging-threats',
          'rules-placeholder',
          'rules-threat-hunting'
        ],
        description: 'Official Sigma rule repository - comprehensive detection rules',
        enabled: true,
        updateInterval: '0 2 * * *' // Daily at 2 AM
      },
      {
        name: 'elastic-detection-rules',
        type: 'elastic',
        url: 'https://github.com/elastic/detection-rules.git',
        branch: 'main',
        rulePaths: [
          'rules',
          'rules_building_block',
          'rules/linux',
          'rules/macos',
          'rules/windows',
          'rules/network',
          'rules/cloud'
        ],
        description: 'Elastic Security detection rules for the Elastic Stack',
        enabled: true,
        updateInterval: '0 3 * * *' // Daily at 3 AM
      },
      {
        name: 'ossec-rules',
        type: 'ossec',
        url: 'https://github.com/ossec/ossec-hids.git',
        branch: 'master',
        rulePaths: [
          'etc/rules'
        ],
        description: 'OSSEC Host-based Intrusion Detection System rules',
        enabled: true,
        updateInterval: '0 4 * * *' // Daily at 4 AM
      },
      {
        name: 'suricata-rules',
        type: 'suricata',
        url: 'https://github.com/OISF/suricata.git',
        branch: 'master',
        rulePaths: [
          'rules',
          'suricata-update/tests/rules'
        ],
        description: 'Suricata IDS/IPS network security monitoring rules',
        enabled: true,
        updateInterval: '0 5 * * *' // Daily at 5 AM
      },
      {
        name: 'splunk-security-content',
        type: 'splunk',
        url: 'https://github.com/splunk/security_content.git',
        branch: 'develop',
        rulePaths: [
          'detections',
          'detections/endpoint',
          'detections/network',
          'detections/cloud',
          'detections/web',
          'detections/application'
        ],
        description: 'Splunk Security Content - analytics, detections, and response playbooks',
        enabled: true,
        updateInterval: '0 6 * * *' // Daily at 6 AM
      },
      {
        name: 'chronicle-detection-rules',
        type: 'chronicle',
        url: 'https://github.com/chronicle/detection-rules.git',
        branch: 'main',
        rulePaths: [
          'community',
          'official'
        ],
        description: 'Google Chronicle YARA-L detection rules',
        enabled: false, // Disabled by default until YARA-L converter is implemented
        updateInterval: '0 7 * * *' // Daily at 7 AM
      },
      // Additional community sources
      {
        name: 'sigma-emerging-threats',
        type: 'sigma',
        url: 'https://github.com/Neo23x0/sigma.git',
        branch: 'master',
        rulePaths: [
          'rules-emerging-threats'
        ],
        description: 'Additional Sigma rules for emerging threats',
        enabled: false,
        updateInterval: '0 8 * * *' // Daily at 8 AM
      },
      {
        name: 'sigma-threat-hunting',
        type: 'sigma',
        url: 'https://github.com/SigmaHQ/sigma.git',
        branch: 'master',
        rulePaths: [
          'rules-threat-hunting'
        ],
        description: 'Sigma rules specifically for threat hunting activities',
        enabled: true,
        updateInterval: '0 9 * * *' // Daily at 9 AM
      }
    ]
  },
  scheduler: {
    enabled: process.env.SCHEDULER_ENABLED !== 'false',
    cronExpression: process.env.CRON_EXPRESSION || '0 1 * * *', // Daily at 1 AM
    timezone: process.env.TIMEZONE || 'UTC'
  },
  processing: {
    batchSize: parseInt(process.env.BATCH_SIZE || '100', 10),
    maxConcurrentImports: parseInt(process.env.MAX_CONCURRENT_IMPORTS || '3', 10),
    timeoutMs: parseInt(process.env.PROCESSING_TIMEOUT_MS || '300000', 10) // 5 minutes
  },
  conversion: {
    strictValidation: process.env.STRICT_VALIDATION === 'true',
    skipInvalidRules: process.env.SKIP_INVALID_RULES !== 'false',
    enableFieldMapping: process.env.ENABLE_FIELD_MAPPING !== 'false'
  }
};

// Validate configuration
export function validateConfig(cfg: RuleIngestorConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate repository sources
  for (const source of cfg.repositories.sources) {
    if (!source.name || !source.type || !source.url) {
      errors.push(`Invalid source configuration: ${JSON.stringify(source)}`);
    }

    if (!['sigma', 'elastic', 'ossec', 'suricata', 'splunk', 'chronicle'].includes(source.type)) {
      errors.push(`Unsupported source type: ${source.type}`);
    }

    if (!source.url.startsWith('https://')) {
      errors.push(`Source URL must use HTTPS: ${source.url}`);
    }

    if (!source.rulePaths || source.rulePaths.length === 0) {
      errors.push(`Source ${source.name} must have at least one rule path`);
    }
  }

  // Validate scheduler
  if (cfg.scheduler.enabled && !cfg.scheduler.cronExpression) {
    errors.push('Scheduler is enabled but no cron expression provided');
  }

  // Validate processing limits
  if (cfg.processing.batchSize <= 0 || cfg.processing.batchSize > 1000) {
    errors.push('Batch size must be between 1 and 1000');
  }

  if (cfg.processing.maxConcurrentImports <= 0 || cfg.processing.maxConcurrentImports > 10) {
    errors.push('Max concurrent imports must be between 1 and 10');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Get configuration with validation
export function getValidatedConfig(): RuleIngestorConfig {
  const validation = validateConfig(config);
  
  if (!validation.valid) {
    throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
  }

  return config;
}