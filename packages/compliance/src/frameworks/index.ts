import { ComplianceFramework, ComplianceFrameworkType } from '../types/compliance.types';
import { v4 as uuidv4 } from 'uuid';

// Import all framework definitions
import { SOXFramework } from './sox.framework';
import { HIPAAFramework } from './hipaa.framework';
import { PCIDSSFramework } from './pci-dss.framework';
import { GDPRFramework } from './gdpr.framework';
import { ISO27001Framework } from './iso27001.framework';
import { NISTCSFFramework } from './nist-csf.framework';

// Map to store all frameworks
const frameworkDefinitions = new Map([
  ['SOX', SOXFramework],
  ['HIPAA', HIPAAFramework],
  ['PCI-DSS', PCIDSSFramework],
  ['GDPR', GDPRFramework],
  ['ISO-27001', ISO27001Framework],
  ['NIST-CSF', NISTCSFFramework]
]);

/**
 * Get a compliance framework by type
 */
export function getFrameworkDefinition(type: ComplianceFrameworkType) {
  return frameworkDefinitions.get(type);
}

/**
 * Get all available framework types
 */
export function getAvailableFrameworks(): ComplianceFrameworkType[] {
  return Array.from(frameworkDefinitions.keys()) as ComplianceFrameworkType[];
}

/**
 * Convert a framework definition to a full framework with IDs
 */
export function createFrameworkFromDefinition(type: ComplianceFrameworkType): ComplianceFramework | null {
  const definition = frameworkDefinitions.get(type);
  if (!definition) return null;

  // Generate IDs for categories
  const categoryMap = new Map<string, string>();
  const categories = definition.categories.map(cat => {
    const id = uuidv4();
    // Store mapping from placeholder ID to real ID
    const placeholderId = cat.name.toLowerCase().replace(/\s+/g, '-');
    categoryMap.set(placeholderId, id);
    
    return {
      ...cat,
      id
    };
  });

  // Generate IDs for controls and map category IDs
  const controls = definition.controls.map(control => {
    // Convert category placeholder to real ID
    const categoryPlaceholder = control.categoryId;
    const categoryId = categoryMap.get(categoryPlaceholder) || categories[0].id;

    return {
      ...control,
      id: uuidv4(),
      categoryId
    };
  });

  return {
    id: uuidv4(),
    type: definition.type,
    name: definition.name,
    version: definition.version,
    description: definition.description,
    effectiveDate: new Date(),
    categories,
    controls,
    metadata: {}
  };
}

/**
 * Get control mappings between frameworks
 */
export function getControlMappings(sourceFramework: ComplianceFrameworkType, targetFramework: ComplianceFrameworkType) {
  // This would contain pre-defined mappings between common controls across frameworks
  // For example, SOX IT General Controls often map to ISO 27001 controls
  const mappings: Record<string, Record<string, string[]>> = {
    'SOX': {
      'ISO-27001': {
        'CC1.1': ['5.1', '6.3'], // Integrity and ethical values -> Policies, Training
        'CC1.2': ['5.2'],        // Board oversight -> Roles and responsibilities
        'CC3.2': ['5.3', '8.2'], // Segregation of duties
        'CC4.1': ['8.16'],       // Financial reporting -> Monitoring
        'CC5.1': ['8.16']        // Ongoing monitoring
      },
      'NIST-CSF': {
        'CC2.1': ['ID.RA-1', 'ID.RA-5'], // Risk assessment
        'CC3.1': ['PR.AC-1', 'PR.AC-4'], // Authorization and access
        'CC3.4': ['PR.DS-1', 'PR.DS-2']  // Information processing controls
      }
    },
    'HIPAA': {
      'ISO-27001': {
        '164.308(a)(1)': ['5.2'],    // Security officer
        '164.308(a)(3)': ['8.2'],    // Workforce access management
        '164.312(a)(1)': ['8.5'],    // Access control
        '164.312(e)(1)': ['8.24']    // Transmission security
      },
      'NIST-CSF': {
        '164.308(a)(1)': ['ID.GV-1'],        // Security management
        '164.308(a)(5)': ['PR.AT-1'],        // Security awareness
        '164.310(a)(1)': ['PR.AC-2'],        // Physical access
        '164.312(b)': ['DE.AE-3', 'DE.CM-1'] // Audit controls
      }
    },
    'PCI-DSS': {
      'ISO-27001': {
        '1.1': ['8.20', '8.21'],     // Network security controls
        '3.2': ['8.24'],             // Cryptographic protection
        '8.1': ['8.2', '8.5'],       // User identification
        '10.1': ['8.15', '8.16']     // Logging and monitoring
      },
      'NIST-CSF': {
        '1.1': ['PR.AC-5'],          // Network security
        '3.1': ['PR.DS-1'],          // Data retention
        '8.1': ['PR.AC-1'],          // Identity management
        '11.1': ['DE.CM-8']          // Vulnerability scanning
      }
    }
  };

  return mappings[sourceFramework]?.[targetFramework] || {};
}

/**
 * Get frameworks by regulation type
 */
export function getFrameworksByRegulation(regulationType: 'financial' | 'healthcare' | 'privacy' | 'general'): ComplianceFrameworkType[] {
  const regulations: Record<string, ComplianceFrameworkType[]> = {
    financial: ['SOX', 'PCI-DSS'],
    healthcare: ['HIPAA'],
    privacy: ['GDPR', 'CCPA'],
    general: ['ISO-27001', 'NIST-CSF', 'NIST-800-53', 'NIST-800-171']
  };

  return regulations[regulationType] || [];
}

/**
 * Get framework requirements summary
 */
export function getFrameworkSummary(type: ComplianceFrameworkType) {
  const definition = frameworkDefinitions.get(type);
  if (!definition) return null;

  return {
    type: definition.type,
    name: definition.name,
    version: definition.version,
    description: definition.description,
    totalControls: definition.controls.length,
    categories: definition.categories.map(cat => ({
      name: cat.name,
      controlCount: definition.controls.filter(ctrl => 
        ctrl.categoryId === cat.name.toLowerCase().replace(/\s+/g, '-')
      ).length
    })),
    automationStats: {
      full: definition.controls.filter(c => c.automationLevel === 'full').length,
      partial: definition.controls.filter(c => c.automationLevel === 'partial').length,
      manual: definition.controls.filter(c => c.automationLevel === 'manual').length
    }
  };
}

// Export all framework definitions for direct access if needed
export {
  SOXFramework,
  HIPAAFramework,
  PCIDSSFramework,
  GDPRFramework,
  ISO27001Framework,
  NISTCSFFramework
};