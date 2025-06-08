"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HIPAAComplianceReportTemplate = void 0;
const uuid_1 = require("uuid");
exports.HIPAAComplianceReportTemplate = {
    id: (0, uuid_1.v4)(),
    name: 'HIPAA Compliance Report',
    description: 'Health Insurance Portability and Accountability Act compliance assessment report',
    frameworkId: 'HIPAA',
    type: 'compliance',
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
    isPublic: true,
    sections: [
        {
            id: 'executive-overview',
            title: 'Executive Overview',
            type: 'summary',
            order: 1,
            config: {
                includeFields: [
                    'organizationName',
                    'assessmentScope',
                    'overallComplianceScore',
                    'riskLevel',
                    'keyFindings'
                ],
                template: `
# HIPAA Compliance Assessment Report

## Organization Information
**Organization:** {{organizationName}}
**Assessment Date:** {{assessmentDate}}
**Report Period:** {{period.start}} to {{period.end}}

## Executive Summary
This report presents the findings of the HIPAA compliance assessment conducted to evaluate the organization's adherence to the HIPAA Security Rule, Privacy Rule, and Breach Notification Rule requirements.

### Overall Compliance Status
- **Compliance Score:** {{overallComplianceScore}}%
- **Risk Level:** {{riskLevel}}
- **Total Safeguards Assessed:** {{summary.totalControls}}
- **Compliant Safeguards:** {{summary.compliantCount}}
- **Non-Compliant Safeguards:** {{summary.nonCompliantCount}}

### Key Findings Summary
{{#each keyFindings}}
{{@index}}. {{this}}
{{/each}}
        `
            }
        },
        {
            id: 'compliance-dashboard',
            title: 'Compliance Dashboard',
            type: 'chart',
            order: 2,
            config: {
                chartType: 'multiChart',
                charts: [
                    {
                        type: 'pie',
                        title: 'Safeguard Compliance Status',
                        data: 'complianceByStatus'
                    },
                    {
                        type: 'bar',
                        title: 'Compliance by Safeguard Category',
                        data: 'complianceByCategory',
                        xAxis: 'category',
                        yAxis: 'compliancePercentage'
                    }
                ]
            }
        },
        {
            id: 'administrative-safeguards',
            title: 'Administrative Safeguards (§164.308)',
            type: 'details',
            order: 3,
            config: {
                controlCategory: 'administrative-safeguards',
                includeFields: [
                    'controlId',
                    'controlTitle',
                    'status',
                    'implementationStatus',
                    'evidence',
                    'gaps',
                    'recommendations'
                ],
                template: `
## Administrative Safeguards

Administrative safeguards are administrative actions, policies, and procedures to manage the selection, development, implementation, and maintenance of security measures to protect ePHI.

{{#each controls}}
### {{controlId}} - {{controlTitle}}

**Requirement:** {{description}}

**Implementation Status:** {{status}}

#### Current State
{{currentImplementation}}

#### Evidence Reviewed
{{#each evidence}}
- {{this.type}}: {{this.source}}
{{/each}}

#### Gaps Identified
{{#if gaps}}
{{#each gaps}}
- {{this}}
{{/each}}
{{else}}
No gaps identified - control is fully implemented.
{{/if}}

#### Recommendations
{{#each recommendations}}
- {{this.priority}}: {{this.description}}
  - Estimated Effort: {{this.effort}}
{{/each}}

---
{{/each}}
        `
            }
        },
        {
            id: 'physical-safeguards',
            title: 'Physical Safeguards (§164.310)',
            type: 'details',
            order: 4,
            config: {
                controlCategory: 'physical-safeguards',
                includeFields: [
                    'controlId',
                    'controlTitle',
                    'status',
                    'physicalControls',
                    'accessControls'
                ]
            }
        },
        {
            id: 'technical-safeguards',
            title: 'Technical Safeguards (§164.312)',
            type: 'details',
            order: 5,
            config: {
                controlCategory: 'technical-safeguards',
                includeFields: [
                    'controlId',
                    'controlTitle',
                    'status',
                    'technicalImplementation',
                    'encryptionStatus'
                ]
            }
        },
        {
            id: 'organizational-requirements',
            title: 'Organizational Requirements (§164.314)',
            type: 'details',
            order: 6,
            config: {
                controlCategory: 'organizational-requirements',
                includeFields: [
                    'controlId',
                    'controlTitle',
                    'status',
                    'businessAssociates',
                    'contracts'
                ]
            }
        },
        {
            id: 'risk-analysis',
            title: 'Risk Analysis',
            type: 'matrix',
            order: 7,
            config: {
                matrixType: 'riskHeatMap',
                title: 'ePHI Risk Heat Map',
                dimensions: {
                    rows: 'threatProbability',
                    columns: 'impactMagnitude'
                },
                data: 'identifiedRisks',
                colorScale: {
                    low: '#4caf50',
                    medium: '#ff9800',
                    high: '#f44336',
                    critical: '#b71c1c'
                }
            }
        },
        {
            id: 'breach-assessment',
            title: 'Breach Notification Readiness',
            type: 'narrative',
            order: 8,
            config: {
                template: `
## Breach Notification Rule Compliance

### Breach Response Procedures
{{#if breachResponsePlan}}
✓ Documented breach response plan exists
- Last Updated: {{breachResponsePlan.lastUpdated}}
- Tested: {{breachResponsePlan.lastTested}}
{{else}}
✗ No documented breach response plan found
{{/if}}

### Breach Risk Assessment Process
{{breachRiskAssessment}}

### Historical Breaches (Past 24 Months)
{{#if breachHistory}}
Total Breaches: {{breachHistory.count}}
{{#each breachHistory.incidents}}
- **Date:** {{this.date}}
- **Type:** {{this.type}}
- **Records Affected:** {{this.affectedRecords}}
- **Notification Status:** {{this.notificationStatus}}
{{/each}}
{{else}}
No breaches reported in the past 24 months.
{{/if}}

### Recommendations for Breach Preparedness
{{#each breachRecommendations}}
{{@index}}. {{this}}
{{/each}}
        `
            }
        },
        {
            id: 'workforce-training',
            title: 'Workforce Training Status',
            type: 'table',
            order: 9,
            config: {
                title: 'HIPAA Security Awareness Training Compliance',
                columns: [
                    { field: 'department', header: 'Department', width: '20%' },
                    { field: 'totalEmployees', header: 'Total Staff', width: '15%' },
                    { field: 'trainedEmployees', header: 'Trained', width: '15%' },
                    { field: 'complianceRate', header: 'Compliance %', width: '15%' },
                    { field: 'averageScore', header: 'Avg Score', width: '15%' },
                    { field: 'nextTrainingDue', header: 'Next Due', width: '20%' }
                ],
                aggregateRow: true,
                conditionalFormatting: {
                    complianceRate: [
                        { condition: '< 80', style: 'danger' },
                        { condition: '< 95', style: 'warning' },
                        { condition: '>= 95', style: 'success' }
                    ]
                }
            }
        },
        {
            id: 'business-associate-status',
            title: 'Business Associate Management',
            type: 'table',
            order: 10,
            config: {
                title: 'Business Associate Agreement (BAA) Status',
                columns: [
                    { field: 'vendorName', header: 'Business Associate', width: '25%' },
                    { field: 'serviceType', header: 'Service Type', width: '20%' },
                    { field: 'baaStatus', header: 'BAA Status', width: '15%' },
                    { field: 'lastReview', header: 'Last Review', width: '15%' },
                    { field: 'riskLevel', header: 'Risk Level', width: '15%' },
                    { field: 'incidents', header: 'Incidents', width: '10%' }
                ],
                filters: ['baaStatus', 'riskLevel'],
                sortBy: 'riskLevel',
                sortOrder: 'desc'
            }
        },
        {
            id: 'remediation-plan',
            title: 'Remediation Plan',
            type: 'table',
            order: 11,
            config: {
                title: 'Prioritized Remediation Actions',
                columns: [
                    { field: 'priority', header: 'Priority', width: '10%' },
                    { field: 'safeguard', header: 'Safeguard', width: '15%' },
                    { field: 'finding', header: 'Finding', width: '30%' },
                    { field: 'remediation', header: 'Remediation Action', width: '25%' },
                    { field: 'owner', header: 'Owner', width: '10%' },
                    { field: 'dueDate', header: 'Due Date', width: '10%' }
                ],
                groupBy: 'priority',
                includeTimeline: true
            }
        },
        {
            id: 'encryption-inventory',
            title: 'Encryption Status Report',
            type: 'details',
            order: 12,
            config: {
                title: 'ePHI Encryption Inventory',
                includeFields: [
                    'systemName',
                    'dataType',
                    'encryptionAtRest',
                    'encryptionInTransit',
                    'encryptionMethod',
                    'keyManagement'
                ],
                template: `
## Encryption Status of ePHI

{{#each systems}}
### {{systemName}}
- **Data Types:** {{#each dataTypes}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
- **Encryption at Rest:** {{#if encryptionAtRest}}✓ {{encryptionAtRest.method}}{{else}}✗ Not Encrypted{{/if}}
- **Encryption in Transit:** {{#if encryptionInTransit}}✓ {{encryptionInTransit.protocol}}{{else}}✗ Not Encrypted{{/if}}
- **Key Management:** {{keyManagement}}

{{#unless encryptionAtRest}}
**CRITICAL:** This system contains unencrypted ePHI at rest. Immediate remediation required.
{{/unless}}

{{/each}}
        `
            }
        },
        {
            id: 'appendices',
            title: 'Appendices',
            type: 'narrative',
            order: 13,
            config: {
                template: `
## Appendices

### Appendix A: Assessment Methodology
{{assessmentMethodology}}

### Appendix B: Document Review List
{{#each documentsReviewed}}
- {{this.name}} (Version: {{this.version}}, Date: {{this.date}})
{{/each}}

### Appendix C: Personnel Interviewed
{{#each personnelInterviewed}}
- {{this.name}}, {{this.title}} - {{this.date}}
{{/each}}

### Appendix D: Technical Testing Performed
{{#each technicalTests}}
- **Test:** {{this.name}}
- **Scope:** {{this.scope}}
- **Result:** {{this.result}}
{{/each}}

### Appendix E: Acronyms and Definitions
- **ePHI**: Electronic Protected Health Information
- **BAA**: Business Associate Agreement
- **CE**: Covered Entity
- **BA**: Business Associate
- **OCR**: Office for Civil Rights
        `
            }
        }
    ],
    filters: [
        {
            field: 'complianceStatus',
            operator: 'in',
            value: ['compliant', 'non_compliant', 'partially_compliant']
        }
    ],
    schedule: {
        enabled: true,
        frequency: 'annually',
        recipients: ['compliance-officer@healthcare.org', 'ciso@healthcare.org'],
        format: 'pdf'
    }
};
//# sourceMappingURL=hipaa-report-template.js.map