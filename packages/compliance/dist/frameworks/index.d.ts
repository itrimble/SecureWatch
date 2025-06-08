import { ComplianceFramework, ComplianceFrameworkType } from '../types/compliance.types';
import { SOXFramework } from './sox.framework';
import { HIPAAFramework } from './hipaa.framework';
import { PCIDSSFramework } from './pci-dss.framework';
import { GDPRFramework } from './gdpr.framework';
import { ISO27001Framework } from './iso27001.framework';
import { NISTCSFFramework } from './nist-csf.framework';
/**
 * Get a compliance framework by type
 */
export declare function getFrameworkDefinition(type: ComplianceFrameworkType): import("../types/compliance.types").ComplianceFrameworkDefinition | undefined;
/**
 * Get all available framework types
 */
export declare function getAvailableFrameworks(): ComplianceFrameworkType[];
/**
 * Convert a framework definition to a full framework with IDs
 */
export declare function createFrameworkFromDefinition(type: ComplianceFrameworkType): ComplianceFramework | null;
/**
 * Get control mappings between frameworks
 */
export declare function getControlMappings(sourceFramework: ComplianceFrameworkType, targetFramework: ComplianceFrameworkType): string[];
/**
 * Get frameworks by regulation type
 */
export declare function getFrameworksByRegulation(regulationType: 'financial' | 'healthcare' | 'privacy' | 'general'): ComplianceFrameworkType[];
/**
 * Get framework requirements summary
 */
export declare function getFrameworkSummary(type: ComplianceFrameworkType): {
    type: "SOX" | "HIPAA" | "PCI-DSS" | "GDPR" | "ISO-27001" | "NIST-CSF" | "NIST-800-53" | "NIST-800-171" | "CIS" | "COBIT" | "FISMA" | "CCPA" | "FedRAMP" | "CMMC";
    name: string;
    version: string;
    description: string;
    totalControls: number;
    categories: {
        name: string;
        controlCount: number;
    }[];
    automationStats: {
        full: number;
        partial: number;
        manual: number;
    };
} | null;
export { SOXFramework, HIPAAFramework, PCIDSSFramework, GDPRFramework, ISO27001Framework, NISTCSFFramework };
//# sourceMappingURL=index.d.ts.map