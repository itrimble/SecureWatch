"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NISTCSFFramework = exports.ISO27001Framework = exports.GDPRFramework = exports.PCIDSSFramework = exports.HIPAAFramework = exports.SOXFramework = void 0;
exports.getFrameworkDefinition = getFrameworkDefinition;
exports.getAvailableFrameworks = getAvailableFrameworks;
exports.createFrameworkFromDefinition = createFrameworkFromDefinition;
exports.getControlMappings = getControlMappings;
exports.getFrameworksByRegulation = getFrameworksByRegulation;
exports.getFrameworkSummary = getFrameworkSummary;
const uuid_1 = require("uuid");
// Import all framework definitions
const sox_framework_1 = require("./sox.framework");
Object.defineProperty(exports, "SOXFramework", { enumerable: true, get: function () { return sox_framework_1.SOXFramework; } });
const hipaa_framework_1 = require("./hipaa.framework");
Object.defineProperty(exports, "HIPAAFramework", { enumerable: true, get: function () { return hipaa_framework_1.HIPAAFramework; } });
const pci_dss_framework_1 = require("./pci-dss.framework");
Object.defineProperty(exports, "PCIDSSFramework", { enumerable: true, get: function () { return pci_dss_framework_1.PCIDSSFramework; } });
const gdpr_framework_1 = require("./gdpr.framework");
Object.defineProperty(exports, "GDPRFramework", { enumerable: true, get: function () { return gdpr_framework_1.GDPRFramework; } });
const iso27001_framework_1 = require("./iso27001.framework");
Object.defineProperty(exports, "ISO27001Framework", { enumerable: true, get: function () { return iso27001_framework_1.ISO27001Framework; } });
const nist_csf_framework_1 = require("./nist-csf.framework");
Object.defineProperty(exports, "NISTCSFFramework", { enumerable: true, get: function () { return nist_csf_framework_1.NISTCSFFramework; } });
// Map to store all frameworks
const frameworkDefinitions = new Map([
    ['SOX', sox_framework_1.SOXFramework],
    ['HIPAA', hipaa_framework_1.HIPAAFramework],
    ['PCI-DSS', pci_dss_framework_1.PCIDSSFramework],
    ['GDPR', gdpr_framework_1.GDPRFramework],
    ['ISO-27001', iso27001_framework_1.ISO27001Framework],
    ['NIST-CSF', nist_csf_framework_1.NISTCSFFramework]
]);
/**
 * Get a compliance framework by type
 */
function getFrameworkDefinition(type) {
    return frameworkDefinitions.get(type);
}
/**
 * Get all available framework types
 */
function getAvailableFrameworks() {
    return Array.from(frameworkDefinitions.keys());
}
/**
 * Convert a framework definition to a full framework with IDs
 */
function createFrameworkFromDefinition(type) {
    const definition = frameworkDefinitions.get(type);
    if (!definition)
        return null;
    // Generate IDs for categories
    const categoryMap = new Map();
    const categories = definition.categories.map(cat => {
        const id = (0, uuid_1.v4)();
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
            id: (0, uuid_1.v4)(),
            categoryId
        };
    });
    return {
        id: (0, uuid_1.v4)(),
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
function getControlMappings(sourceFramework, targetFramework) {
    // This would contain pre-defined mappings between common controls across frameworks
    // For example, SOX IT General Controls often map to ISO 27001 controls
    const mappings = {
        'SOX': {
            'ISO-27001': {
                'CC1.1': ['5.1', '6.3'], // Integrity and ethical values -> Policies, Training
                'CC1.2': ['5.2'], // Board oversight -> Roles and responsibilities
                'CC3.2': ['5.3', '8.2'], // Segregation of duties
                'CC4.1': ['8.16'], // Financial reporting -> Monitoring
                'CC5.1': ['8.16'] // Ongoing monitoring
            },
            'NIST-CSF': {
                'CC2.1': ['ID.RA-1', 'ID.RA-5'], // Risk assessment
                'CC3.1': ['PR.AC-1', 'PR.AC-4'], // Authorization and access
                'CC3.4': ['PR.DS-1', 'PR.DS-2'] // Information processing controls
            }
        },
        'HIPAA': {
            'ISO-27001': {
                '164.308(a)(1)': ['5.2'], // Security officer
                '164.308(a)(3)': ['8.2'], // Workforce access management
                '164.312(a)(1)': ['8.5'], // Access control
                '164.312(e)(1)': ['8.24'] // Transmission security
            },
            'NIST-CSF': {
                '164.308(a)(1)': ['ID.GV-1'], // Security management
                '164.308(a)(5)': ['PR.AT-1'], // Security awareness
                '164.310(a)(1)': ['PR.AC-2'], // Physical access
                '164.312(b)': ['DE.AE-3', 'DE.CM-1'] // Audit controls
            }
        },
        'PCI-DSS': {
            'ISO-27001': {
                '1.1': ['8.20', '8.21'], // Network security controls
                '3.2': ['8.24'], // Cryptographic protection
                '8.1': ['8.2', '8.5'], // User identification
                '10.1': ['8.15', '8.16'] // Logging and monitoring
            },
            'NIST-CSF': {
                '1.1': ['PR.AC-5'], // Network security
                '3.1': ['PR.DS-1'], // Data retention
                '8.1': ['PR.AC-1'], // Identity management
                '11.1': ['DE.CM-8'] // Vulnerability scanning
            }
        }
    };
    return mappings[sourceFramework]?.[targetFramework] || {};
}
/**
 * Get frameworks by regulation type
 */
function getFrameworksByRegulation(regulationType) {
    const regulations = {
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
function getFrameworkSummary(type) {
    const definition = frameworkDefinitions.get(type);
    if (!definition)
        return null;
    return {
        type: definition.type,
        name: definition.name,
        version: definition.version,
        description: definition.description,
        totalControls: definition.controls.length,
        categories: definition.categories.map(cat => ({
            name: cat.name,
            controlCount: definition.controls.filter(ctrl => ctrl.categoryId === cat.name.toLowerCase().replace(/\s+/g, '-')).length
        })),
        automationStats: {
            full: definition.controls.filter(c => c.automationLevel === 'full').length,
            partial: definition.controls.filter(c => c.automationLevel === 'partial').length,
            manual: definition.controls.filter(c => c.automationLevel === 'manual').length
        }
    };
}
//# sourceMappingURL=index.js.map