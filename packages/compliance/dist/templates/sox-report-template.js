"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOXComplianceReportTemplate = void 0;
const uuid_1 = require("uuid");
exports.SOXComplianceReportTemplate = {
    id: (0, uuid_1.v4)(),
    name: 'SOX Compliance Report',
    description: 'Comprehensive Sarbanes-Oxley compliance report for financial reporting controls',
    frameworkId: 'SOX',
    type: 'compliance',
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
    isPublic: true,
    sections: [
        {
            id: 'executive-summary',
            title: 'Executive Summary',
            type: 'summary',
            order: 1,
            config: {
                includeFields: [
                    'overallComplianceScore',
                    'assessmentPeriod',
                    'criticalFindings',
                    'keyRecommendations',
                    'executiveStatement'
                ],
                template: `
# Executive Summary

## Overall Compliance Status
**Compliance Score:** {{overallComplianceScore}}%
**Assessment Period:** {{assessmentPeriod.start}} to {{assessmentPeriod.end}}

## Key Findings
- **Total Controls Assessed:** {{summary.totalControls}}
- **Compliant Controls:** {{summary.compliantCount}} ({{summary.compliantPercentage}}%)
- **Non-Compliant Controls:** {{summary.nonCompliantCount}} ({{summary.nonCompliantPercentage}}%)
- **Controls Requiring Attention:** {{summary.partiallyCompliantCount}}

## Critical Issues
{{#each criticalFindings}}
- {{this.title}}: {{this.description}}
{{/each}}

## Executive Statement
{{executiveStatement}}
        `
            }
        },
        {
            id: 'risk-assessment',
            title: 'Risk Assessment Overview',
            type: 'chart',
            order: 2,
            config: {
                chartType: 'riskMatrix',
                data: 'riskAssessment',
                options: {
                    title: 'SOX Control Risk Matrix',
                    xAxis: 'Likelihood',
                    yAxis: 'Impact',
                    colorScale: ['green', 'yellow', 'orange', 'red'],
                    showLabels: true
                }
            }
        },
        {
            id: 'control-environment',
            title: 'Control Environment (COSO Component 1)',
            type: 'details',
            order: 3,
            config: {
                controlCategory: 'control-environment',
                includeFields: [
                    'controlId',
                    'controlTitle',
                    'status',
                    'evidence',
                    'findings',
                    'recommendations'
                ],
                groupBy: 'status',
                template: `
## Control Environment

The control environment sets the tone of the organization and is the foundation for all other components of internal control.

{{#each controls}}
### {{controlId}} - {{controlTitle}}
**Status:** {{status}}
**Compliance Score:** {{score}}%

#### Evidence Reviewed
{{#each evidence}}
- {{this.type}}: {{this.source}} (Collected: {{this.collectedAt}})
{{/each}}

#### Findings
{{#if findings}}
{{#each findings}}
- **{{this.severity}}**: {{this.description}}
{{/each}}
{{else}}
No findings identified.
{{/if}}

#### Recommendations
{{#if recommendations}}
{{#each recommendations}}
- {{this}}
{{/each}}
{{else}}
Continue current practices.
{{/if}}

---
{{/each}}
        `
            }
        },
        {
            id: 'risk-assessment-details',
            title: 'Risk Assessment (COSO Component 2)',
            type: 'details',
            order: 4,
            config: {
                controlCategory: 'risk-assessment',
                includeFields: [
                    'controlId',
                    'controlTitle',
                    'status',
                    'riskLevel',
                    'mitigations'
                ]
            }
        },
        {
            id: 'control-activities',
            title: 'Control Activities (COSO Component 3)',
            type: 'details',
            order: 5,
            config: {
                controlCategory: 'control-activities',
                includeFields: [
                    'controlId',
                    'controlTitle',
                    'status',
                    'automationLevel',
                    'testingResults'
                ]
            }
        },
        {
            id: 'information-communication',
            title: 'Information & Communication (COSO Component 4)',
            type: 'details',
            order: 6,
            config: {
                controlCategory: 'information-communication',
                includeFields: [
                    'controlId',
                    'controlTitle',
                    'status',
                    'dataFlows',
                    'reportingProcesses'
                ]
            }
        },
        {
            id: 'monitoring-activities',
            title: 'Monitoring Activities (COSO Component 5)',
            type: 'details',
            order: 7,
            config: {
                controlCategory: 'monitoring-activities',
                includeFields: [
                    'controlId',
                    'controlTitle',
                    'status',
                    'monitoringFrequency',
                    'deficiencies'
                ]
            }
        },
        {
            id: 'management-assertion',
            title: "Management's Assertion",
            type: 'narrative',
            order: 8,
            config: {
                template: `
## Management's Assertion on Internal Control over Financial Reporting

Management is responsible for establishing and maintaining adequate internal control over financial reporting, as defined in Rules 13a-15(f) and 15d-15(f) under the Securities Exchange Act of 1934.

### Assessment Methodology
Management conducted an evaluation of the effectiveness of internal control over financial reporting based on the framework in Internal Control - Integrated Framework (2013) issued by the Committee of Sponsoring Organizations of the Treadway Commission (COSO).

### Assessment Results
Based on this evaluation, management has concluded that, as of {{assessmentDate}}, the Company's internal control over financial reporting was {{#if effectiveControls}}effective{{else}}not effective{{/if}}.

{{#unless effectiveControls}}
### Material Weaknesses
The following material weaknesses were identified:
{{#each materialWeaknesses}}
- {{this.description}}
{{/each}}
{{/unless}}

### Remediation Efforts
{{remediationStatement}}

_____________________________
Chief Executive Officer
Date: {{signatureDate}}

_____________________________
Chief Financial Officer
Date: {{signatureDate}}
        `
            }
        },
        {
            id: 'testing-summary',
            title: 'Testing Summary',
            type: 'table',
            order: 9,
            config: {
                columns: [
                    { field: 'controlId', header: 'Control ID', width: '10%' },
                    { field: 'controlTitle', header: 'Control Description', width: '30%' },
                    { field: 'testingMethod', header: 'Testing Method', width: '20%' },
                    { field: 'sampleSize', header: 'Sample Size', width: '10%' },
                    { field: 'exceptionsFound', header: 'Exceptions', width: '10%' },
                    { field: 'conclusion', header: 'Conclusion', width: '20%' }
                ],
                filters: ['controlCategory', 'status'],
                sortBy: 'controlId'
            }
        },
        {
            id: 'deficiency-evaluation',
            title: 'Deficiency Evaluation',
            type: 'matrix',
            order: 10,
            config: {
                matrixType: 'deficiencySeverity',
                dimensions: {
                    rows: 'likelihood',
                    columns: 'magnitude'
                },
                categories: {
                    likelihood: ['Remote', 'Reasonably Possible', 'Probable'],
                    magnitude: ['Immaterial', 'Significant', 'Material']
                },
                colorCoding: {
                    'Remote-Immaterial': 'green',
                    'Remote-Significant': 'yellow',
                    'Remote-Material': 'orange',
                    'Reasonably Possible-Immaterial': 'yellow',
                    'Reasonably Possible-Significant': 'orange',
                    'Reasonably Possible-Material': 'red',
                    'Probable-Immaterial': 'orange',
                    'Probable-Significant': 'red',
                    'Probable-Material': 'red'
                }
            }
        },
        {
            id: 'appendix-evidence',
            title: 'Appendix A: Evidence Documentation',
            type: 'details',
            order: 11,
            config: {
                includeAllEvidence: true,
                groupBy: 'evidenceType',
                includeFields: ['id', 'type', 'source', 'collectedAt', 'hash']
            }
        }
    ],
    schedule: {
        enabled: true,
        frequency: 'quarterly',
        recipients: ['cfo@company.com', 'audit-committee@company.com'],
        format: 'pdf',
        nextRun: new Date(new Date().setMonth(new Date().getMonth() + 3))
    }
};
//# sourceMappingURL=sox-report-template.js.map