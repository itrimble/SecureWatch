import { ReportTemplate } from '../types/compliance.types';
import { v4 as uuidv4 } from 'uuid';

export const PCIDSSComplianceReportTemplate: ReportTemplate = {
  id: uuidv4(),
  name: 'PCI DSS Compliance Report (SAQ)',
  description: 'Payment Card Industry Data Security Standard Self-Assessment Questionnaire and Compliance Report',
  frameworkId: 'PCI-DSS',
  type: 'compliance',
  createdBy: 'system',
  createdAt: new Date(),
  updatedAt: new Date(),
  isPublic: true,
  sections: [
    {
      id: 'merchant-info',
      title: 'Company Information',
      type: 'summary',
      order: 1,
      config: {
        template: `
# PCI DSS Self-Assessment Questionnaire

## Company Information
**Company Name:** {{companyName}}
**DBA (Doing Business As):** {{dbaName}}
**Business Address:** {{address}}
**Primary Contact:** {{primaryContact.name}} ({{primaryContact.email}})
**PCI DSS Level:** {{merchantLevel}}

## Assessment Information
**SAQ Type:** {{saqType}}
**Assessment Date:** {{assessmentDate}}
**Compliance Status:** {{#if compliant}}COMPLIANT{{else}}NON-COMPLIANT{{/if}}

## Payment Processing Information
**Annual Transaction Volume:** {{transactionVolume}}
**Payment Channels:**
{{#each paymentChannels}}
- {{this.type}}: {{this.description}}
{{/each}}
        `
      }
    },
    {
      id: 'executive-summary',
      title: 'Executive Summary',
      type: 'summary',
      order: 2,
      config: {
        template: `
## Executive Summary

### Compliance Overview
This report documents the self-assessment of {{companyName}} against the Payment Card Industry Data Security Standard (PCI DSS) version {{pciVersion}}.

**Overall Compliance Score:** {{overallComplianceScore}}%

### Assessment Scope
{{assessmentScope}}

### Key Findings
- **Total Requirements Assessed:** {{summary.totalControls}}
- **Compliant Requirements:** {{summary.compliantCount}} ({{summary.compliantPercentage}}%)
- **Non-Compliant Requirements:** {{summary.nonCompliantCount}}
- **Not Applicable:** {{summary.notApplicableCount}}

### Critical Non-Compliance Issues
{{#each criticalIssues}}
- **{{this.requirement}}**: {{this.issue}}
{{/each}}

### Compensating Controls
{{#if compensatingControls}}
The following compensating controls have been implemented:
{{#each compensatingControls}}
- **Requirement {{this.requirement}}**: {{this.description}}
{{/each}}
{{else}}
No compensating controls are currently in place.
{{/if}}
        `
      }
    },
    {
      id: 'compliance-status-chart',
      title: 'Compliance Status by Requirement',
      type: 'chart',
      order: 3,
      config: {
        chartType: 'stackedBar',
        title: 'PCI DSS Requirements Compliance Status',
        data: 'requirementCompliance',
        xAxis: 'requirement',
        yAxis: 'count',
        series: ['Compliant', 'Non-Compliant', 'In Progress', 'Not Applicable'],
        colors: {
          'Compliant': '#4caf50',
          'Non-Compliant': '#f44336',
          'In Progress': '#ff9800',
          'Not Applicable': '#9e9e9e'
        }
      }
    },
    {
      id: 'network-security',
      title: 'Build and Maintain a Secure Network and Systems',
      type: 'details',
      order: 4,
      config: {
        controlCategory: 'network-security',
        requirements: ['1.1', '1.2', '2.1', '2.2'],
        template: `
## Requirements 1-2: Build and Maintain a Secure Network and Systems

{{#each requirements}}
### Requirement {{this.id}}: {{this.title}}

**Compliance Status:** {{this.status}}

#### Testing Procedures Performed
{{#each this.testingProcedures}}
- {{this.procedure}}: {{this.result}}
{{/each}}

#### Current Implementation
{{this.implementation}}

#### Evidence
{{#each this.evidence}}
- {{this.type}}: {{this.description}} ({{this.date}})
{{/each}}

{{#if this.gaps}}
#### Gaps and Remediation
{{#each this.gaps}}
- **Gap:** {{this.description}}
  - **Remediation:** {{this.remediation}}
  - **Target Date:** {{this.targetDate}}
{{/each}}
{{/if}}

---
{{/each}}
        `
      }
    },
    {
      id: 'data-protection',
      title: 'Protect Cardholder Data',
      type: 'details',
      order: 5,
      config: {
        controlCategory: 'data-protection',
        requirements: ['3.1', '3.2', '4.1'],
        includeDataFlowDiagram: true
      }
    },
    {
      id: 'vulnerability-management',
      title: 'Maintain a Vulnerability Management Program',
      type: 'details',
      order: 6,
      config: {
        controlCategory: 'vulnerability-management',
        requirements: ['5.1', '6.1', '6.2'],
        includeScanResults: true
      }
    },
    {
      id: 'access-control',
      title: 'Implement Strong Access Control Measures',
      type: 'details',
      order: 7,
      config: {
        controlCategory: 'access-control',
        requirements: ['7.1', '8.1', '9.1']
      }
    },
    {
      id: 'monitoring-testing',
      title: 'Regularly Monitor and Test Networks',
      type: 'details',
      order: 8,
      config: {
        controlCategory: 'monitoring-testing',
        requirements: ['10.1', '10.2', '11.1', '11.2']
      }
    },
    {
      id: 'security-policy',
      title: 'Maintain an Information Security Policy',
      type: 'details',
      order: 9,
      config: {
        controlCategory: 'security-policy',
        requirements: ['12.1', '12.2', '12.3', '12.4']
      }
    },
    {
      id: 'scan-results',
      title: 'Vulnerability Scan Results',
      type: 'table',
      order: 10,
      config: {
        title: 'Quarterly Network Scan Summary',
        columns: [
          { field: 'scanDate', header: 'Scan Date', width: '15%' },
          { field: 'scanType', header: 'Scan Type', width: '15%' },
          { field: 'asv', header: 'ASV', width: '20%' },
          { field: 'criticalVulns', header: 'Critical', width: '10%' },
          { field: 'highVulns', header: 'High', width: '10%' },
          { field: 'mediumVulns', header: 'Medium', width: '10%' },
          { field: 'passFail', header: 'Result', width: '10%' },
          { field: 'attestation', header: 'Attestation', width: '10%' }
        ],
        includeFailureDetails: true
      }
    },
    {
      id: 'penetration-test',
      title: 'Penetration Testing Summary',
      type: 'narrative',
      order: 11,
      config: {
        template: `
## Penetration Testing Results

### Test Information
- **Testing Company:** {{penTest.company}}
- **Test Date:** {{penTest.date}}
- **Test Type:** {{penTest.type}}
- **Scope:** {{penTest.scope}}

### Findings Summary
{{#each penTest.findings}}
#### {{this.severity}} - {{this.title}}
- **CVSS Score:** {{this.cvss}}
- **Description:** {{this.description}}
- **Remediation Status:** {{this.status}}
{{#if this.remediated}}
- **Remediation Date:** {{this.remediationDate}}
{{/if}}
{{/each}}

### Conclusion
{{penTest.conclusion}}
        `
      }
    },
    {
      id: 'segmentation-test',
      title: 'Network Segmentation Testing',
      type: 'details',
      order: 12,
      config: {
        includeNetworkDiagram: true,
        template: `
## Network Segmentation Validation

### Segmentation Implementation
{{segmentation.description}}

### Testing Results
{{#each segmentation.tests}}
- **Test:** {{this.name}}
- **Result:** {{this.result}}
- **Evidence:** {{this.evidence}}
{{/each}}

### CDE Boundary Validation
All systems within the CDE have been identified and validated:
{{#each cdeSystem}}
- {{this.name}} ({{this.ip}}): {{this.purpose}}
{{/each}}
        `
      }
    },
    {
      id: 'compensating-controls',
      title: 'Compensating Controls Worksheet',
      type: 'table',
      order: 13,
      config: {
        columns: [
          { field: 'requirement', header: 'Requirement', width: '10%' },
          { field: 'constraint', header: 'Constraint', width: '20%' },
          { field: 'objective', header: 'Objective', width: '20%' },
          { field: 'control', header: 'Compensating Control', width: '30%' },
          { field: 'validation', header: 'Validation', width: '20%' }
        ]
      }
    },
    {
      id: 'service-providers',
      title: 'Service Provider Compliance',
      type: 'table',
      order: 14,
      config: {
        title: 'Third-Party Service Provider PCI DSS Status',
        columns: [
          { field: 'provider', header: 'Service Provider', width: '25%' },
          { field: 'services', header: 'Services', width: '25%' },
          { field: 'pciLevel', header: 'PCI Level', width: '15%' },
          { field: 'aocDate', header: 'AOC Date', width: '15%' },
          { field: 'expiryDate', header: 'Expiry', width: '10%' },
          { field: 'status', header: 'Status', width: '10%' }
        ],
        includeResponsibilityMatrix: true
      }
    },
    {
      id: 'attestation',
      title: 'Attestation of Compliance',
      type: 'narrative',
      order: 15,
      config: {
        template: `
## Attestation of Compliance

### Part 1. PCI DSS Assessment Details

**Merchant Organization:** {{companyName}}
**Type of Assessment:** Self-Assessment Questionnaire ({{saqType}})
**PCI DSS Version:** {{pciVersion}}
**Date of Assessment:** {{assessmentDate}}

### Part 2. Executive Summary

{{#if compliant}}
{{companyName}} has completed the PCI DSS Self-Assessment and confirms:
- All sections of the applicable SAQ are complete
- All questions are answered accurately
- All requirements are in place and operational
- The organization is compliant with PCI DSS requirements
{{else}}
{{companyName}} has completed the PCI DSS Self-Assessment and identified the following non-compliance:
{{#each nonCompliantItems}}
- Requirement {{this.requirement}}: {{this.description}}
{{/each}}

Target compliance date: {{targetComplianceDate}}
{{/if}}

### Part 3. Acknowledgment

The undersigned hereby confirms that:
1. The information provided in this assessment is accurate to the best of their knowledge
2. The organization has implemented and maintains all applicable PCI DSS requirements
3. Any compensating controls have been documented and validated

**Name:** _________________________________
**Title:** _________________________________
**Signature:** _________________________________
**Date:** _________________________________

### Part 4. ISA/QSA Acknowledgment (if applicable)

{{#if qsaInvolved}}
**QSA Company:** {{qsa.company}}
**QSA Name:** {{qsa.name}}
**QSA Signature:** _________________________________
**Date:** _________________________________
{{/if}}
        `
      }
    },
    {
      id: 'action-plan',
      title: 'Compliance Action Plan',
      type: 'table',
      order: 16,
      config: {
        title: 'Remediation Action Plan',
        columns: [
          { field: 'priority', header: 'Priority', width: '10%' },
          { field: 'requirement', header: 'PCI DSS Req', width: '10%' },
          { field: 'gap', header: 'Gap Description', width: '25%' },
          { field: 'action', header: 'Required Action', width: '25%' },
          { field: 'owner', header: 'Owner', width: '10%' },
          { field: 'targetDate', header: 'Target Date', width: '10%' },
          { field: 'status', header: 'Status', width: '10%' }
        ],
        groupBy: 'priority',
        includeGanttChart: true
      }
    }
  ],
  schedule: {
    enabled: true,
    frequency: 'quarterly',
    recipients: ['pci-compliance@company.com', 'ciso@company.com'],
    format: 'pdf'
  }
};