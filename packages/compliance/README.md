# SecureWatch Compliance System

A comprehensive compliance and reporting system supporting major regulatory frameworks including SOX, HIPAA, PCI-DSS, GDPR, ISO 27001, and NIST CSF.

## Features

- **Multi-Framework Support**: Pre-built support for 6 major compliance frameworks
- **Automated Evidence Collection**: Schedule and automate evidence gathering
- **Complete Audit Trail**: Track all user activities and system changes
- **Risk Assessment**: Automated risk scoring and assessment
- **Pre-built Report Templates**: Professional reports for each framework
- **Gap Analysis**: Identify compliance gaps and remediation paths
- **Executive Dashboards**: High-level compliance overview for leadership
- **Multiple Export Formats**: PDF, CSV, JSON, XML support

## Installation

```bash
npm install @securewatch/compliance
```

## Quick Start

```typescript
import { createComplianceSystem } from '@securewatch/compliance';

// Initialize the compliance system
const compliance = await createComplianceSystem({
  database: {
    type: 'postgresql',
    connection: {
      host: 'localhost',
      port: 5432,
      database: 'compliance_db',
      user: 'compliance_user',
      password: 'secure_password'
    }
  },
  compliance: {
    automation: {
      enabledFrameworks: ['SOX', 'HIPAA', 'PCI-DSS'],
      evidenceCollection: true,
      reportGeneration: true,
      notifications: {
        enabled: true,
        channels: ['email'],
        recipients: {
          'compliance-alerts': ['compliance@company.com']
        }
      }
    }
  }
});

// Run a compliance assessment
const assessment = await compliance.runComplianceAssessment('SOX');
console.log(`SOX Compliance Score: ${assessment.overallScore}%`);
```

## Supported Frameworks

### 1. SOX (Sarbanes-Oxley Act)
- Complete COSO framework implementation
- IT General Controls (ITGC) coverage
- Financial reporting controls
- Management assertion templates

### 2. HIPAA
- Administrative, Physical, and Technical Safeguards
- Privacy Rule compliance
- Breach notification readiness
- Business Associate management

### 3. PCI-DSS v4.0
- Self-Assessment Questionnaires (SAQ)
- Network security requirements
- Cardholder data protection
- Vulnerability management

### 4. GDPR
- Data subject rights management
- Privacy by design controls
- International transfer assessments
- Breach notification compliance

### 5. ISO 27001:2022
- Full Annex A controls
- ISMS requirements
- Risk treatment plans
- Certification preparation

### 6. NIST Cybersecurity Framework v2.0
- Identify, Protect, Detect, Respond, Recover functions
- New Govern function support
- Implementation tiers
- Profile management

## Core Services

### Evidence Collection Service
```typescript
// Schedule automated evidence collection
await compliance.scheduleEvidenceCollection('PCI-DSS', '0 0 * * *'); // Daily at midnight

// Manual evidence collection
const evidence = await compliance.collectEvidence({
  frameworkId: 'HIPAA',
  controlIds: ['164.308(a)(1)', '164.312(a)(1)'],
  evidenceType: 'configuration',
  source: 'firewall-config',
  data: { /* configuration data */ }
});
```

### Audit Trail Service
```typescript
// All actions are automatically logged
// Query audit logs
const auditEvents = await compliance.auditService.searchEvents({
  userIds: ['user123'],
  actions: ['evidence_collected', 'report_generated'],
  dateRange: {
    start: new Date('2024-01-01'),
    end: new Date()
  }
}, { page: 1, limit: 100 });
```

### Risk Assessment Service
```typescript
// Run risk assessment
const riskAssessment = await compliance.riskService.assessFrameworkRisk(
  'ISO-27001',
  framework.controls,
  controlStatuses
);

// Accept a risk
await compliance.riskService.acceptRisk(
  riskId,
  'risk-manager@company.com',
  'Risk accepted due to compensating controls'
);
```

## Report Generation

### Pre-built Templates
- SOX Compliance Report
- HIPAA Security Assessment
- PCI-DSS Self-Assessment Questionnaire
- Executive Compliance Dashboard
- Gap Analysis Report

### Custom Reports
```typescript
// Generate a compliance report
const report = await compliance.generateReport({
  templateId: 'sox-compliance',
  frameworkId: 'SOX',
  period: {
    start: new Date('2024-01-01'),
    end: new Date('2024-03-31')
  },
  format: 'pdf',
  includeEvidence: true,
  includeRecommendations: true
});
```

## Gap Analysis

```typescript
// Run gap analysis
const gaps = await compliance.runGapAnalysis({
  frameworkId: 'GDPR',
  targetMaturityLevel: 4,
  includeRemediationPlan: true,
  priorityThreshold: 'medium'
});

// Get remediation roadmap
gaps.forEach(gap => {
  console.log(`Control ${gap.controlId}: ${gap.gap.severity}`);
  console.log(`Estimated effort: ${gap.gap.estimatedEffort}`);
  console.log(`Remediation steps:`);
  gap.gap.remediationSteps.forEach(step => {
    console.log(`  ${step.step}. ${step.description}`);
  });
});
```

## Executive Dashboard

```typescript
// Get compliance dashboard
const dashboard = await compliance.getComplianceDashboard();

console.log(`Overall Compliance: ${dashboard.overallCompliance.score}%`);
console.log(`Trend: ${dashboard.overallCompliance.trend}`);
console.log(`High Risk Controls: ${dashboard.riskOverview.highRisks}`);
```

## Configuration

### Database Support
- SQLite (development)
- MySQL
- PostgreSQL

### Retention Policies
```typescript
{
  retentionPolicy: {
    auditLogs: 2555,    // 7 years
    evidence: 2555,     // 7 years
    reports: 2555,      // 7 years
    assessments: 1825   // 5 years
  }
}
```

### Automation Settings
```typescript
{
  automation: {
    enabledFrameworks: ['SOX', 'HIPAA', 'PCI-DSS'],
    evidenceCollection: true,
    reportGeneration: true,
    riskScoring: true,
    notifications: {
      enabled: true,
      channels: ['email', 'webhook'],
      recipients: {
        'high-risk': ['ciso@company.com'],
        'audit-alerts': ['audit@company.com']
      }
    }
  }
}
```

## API Reference

### ComplianceManager

#### Methods
- `initialize()`: Initialize the compliance system
- `runComplianceAssessment(frameworkId, scope?)`: Run a compliance assessment
- `collectEvidence(request)`: Collect compliance evidence
- `scheduleEvidenceCollection(frameworkId, schedule)`: Schedule automated collection
- `runGapAnalysis(request)`: Perform gap analysis
- `getComplianceDashboard()`: Get executive dashboard data
- `generateReport(request)`: Generate compliance report
- `shutdown()`: Gracefully shutdown the system

#### Events
- `compliance-manager-initialized`: System initialized
- `evidence-collected`: Evidence collected successfully
- `risk-assessed`: Risk assessment completed
- `audit-alert`: Audit alert triggered
- `notification-required`: Notification needs to be sent

## Best Practices

1. **Regular Assessments**: Schedule assessments based on framework requirements
2. **Evidence Aging**: Monitor evidence age and refresh as needed
3. **Risk Reviews**: Regular review of accepted risks
4. **Audit Trail**: Maintain complete audit trail for all activities
5. **Automation**: Maximize automation for consistent compliance

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.