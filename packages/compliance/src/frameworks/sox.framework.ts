import { ComplianceFrameworkDefinition } from '../types/compliance.types';

export const SOXFramework: ComplianceFrameworkDefinition = {
  type: 'SOX',
  name: 'Sarbanes-Oxley Act',
  version: '2002',
  description: 'The Sarbanes-Oxley Act of 2002 establishes requirements for all U.S. public company boards, management, and public accounting firms regarding financial reporting and internal controls.',
  categories: [
    {
      name: 'Control Environment',
      description: 'The control environment sets the tone of an organization, influencing the control consciousness of its people',
      order: 1
    },
    {
      name: 'Risk Assessment',
      description: 'Risk assessment is the identification and analysis of relevant risks to achievement of objectives',
      order: 2
    },
    {
      name: 'Control Activities',
      description: 'Control activities are the policies and procedures that help ensure management directives are carried out',
      order: 3
    },
    {
      name: 'Information & Communication',
      description: 'Pertinent information must be identified, captured, and communicated in a form and timeframe that enable people to carry out their responsibilities',
      order: 4
    },
    {
      name: 'Monitoring Activities',
      description: 'Internal control systems need to be monitored and deficiencies reported upstream',
      order: 5
    }
  ],
  controls: [
    // Control Environment
    {
      controlId: 'CC1.1',
      title: 'Integrity and Ethical Values',
      description: 'The organization demonstrates a commitment to integrity and ethical values',
      categoryId: 'control-environment',
      requirements: [
        'Code of conduct established and communicated',
        'Ethics training provided to all employees',
        'Ethics violations tracked and remediated',
        'Tone at the top demonstrates ethical behavior'
      ],
      evidenceTypes: ['document', 'system_report', 'user_attestation'],
      automationLevel: 'partial',
      implementationGuidance: 'Establish and maintain a code of conduct that is reviewed annually and signed by all employees',
      testingProcedures: [
        'Review code of conduct for completeness',
        'Verify employee acknowledgments',
        'Review ethics training completion records',
        'Interview employees about ethical culture'
      ],
      riskWeight: 9
    },
    {
      controlId: 'CC1.2',
      title: 'Board Independence and Oversight',
      description: 'The board of directors demonstrates independence from management and exercises oversight',
      categoryId: 'control-environment',
      requirements: [
        'Board independence requirements met',
        'Regular board meetings conducted',
        'Board committees established (Audit, Compensation, etc.)',
        'Board oversight of internal controls documented'
      ],
      evidenceTypes: ['document', 'configuration', 'user_attestation'],
      automationLevel: 'manual',
      implementationGuidance: 'Ensure board composition meets independence requirements and document all oversight activities',
      testingProcedures: [
        'Review board composition and independence',
        'Review board meeting minutes',
        'Verify committee charters and activities'
      ],
      riskWeight: 10
    },
    {
      controlId: 'CC1.3',
      title: 'Management Philosophy and Operating Style',
      description: 'Management establishes, with board oversight, structures, reporting lines, and appropriate authorities and responsibilities',
      categoryId: 'control-environment',
      requirements: [
        'Organizational structure defined',
        'Reporting lines established',
        'Authorities and responsibilities documented',
        'Delegation of authority matrix maintained'
      ],
      evidenceTypes: ['document', 'configuration', 'system_report'],
      automationLevel: 'partial',
      implementationGuidance: 'Document organizational structure and maintain current delegation of authority matrix',
      testingProcedures: [
        'Review organizational charts',
        'Verify delegation of authority matrix',
        'Review job descriptions for key roles'
      ],
      riskWeight: 8
    },

    // Risk Assessment
    {
      controlId: 'CC2.1',
      title: 'Risk Assessment Process',
      description: 'The organization specifies objectives with sufficient clarity to enable the identification and assessment of risks',
      categoryId: 'risk-assessment',
      requirements: [
        'Financial reporting objectives defined',
        'Risk assessment methodology documented',
        'Risk register maintained and updated',
        'Risk mitigation strategies defined'
      ],
      evidenceTypes: ['document', 'system_report', 'database_query'],
      automationLevel: 'partial',
      implementationGuidance: 'Establish formal risk assessment process with regular updates to risk register',
      testingProcedures: [
        'Review risk assessment methodology',
        'Verify risk register completeness',
        'Test risk scoring consistency',
        'Review mitigation strategies'
      ],
      riskWeight: 9
    },
    {
      controlId: 'CC2.2',
      title: 'Fraud Risk Assessment',
      description: 'The organization considers the potential for fraud in assessing risks to the achievement of objectives',
      categoryId: 'risk-assessment',
      requirements: [
        'Fraud risk assessment performed',
        'Fraud scenarios identified',
        'Anti-fraud controls implemented',
        'Fraud reporting mechanisms established'
      ],
      evidenceTypes: ['document', 'system_report', 'configuration'],
      automationLevel: 'partial',
      implementationGuidance: 'Conduct annual fraud risk assessment and implement appropriate preventive and detective controls',
      testingProcedures: [
        'Review fraud risk assessment',
        'Test anti-fraud controls',
        'Verify whistleblower hotline functionality',
        'Review fraud incident reports'
      ],
      riskWeight: 10
    },
    {
      controlId: 'CC2.3',
      title: 'Change Management',
      description: 'The organization identifies and assesses changes that could significantly impact the system of internal control',
      categoryId: 'risk-assessment',
      requirements: [
        'Change management process defined',
        'Changes to systems documented',
        'Impact assessments performed',
        'Control updates tracked'
      ],
      evidenceTypes: ['system_report', 'log_data', 'configuration'],
      automationLevel: 'full',
      implementationGuidance: 'Implement formal change management process with automated tracking and approval workflows',
      testingProcedures: [
        'Review change management procedures',
        'Test sample of changes for proper approval',
        'Verify impact assessments completed',
        'Review control updates for changes'
      ],
      riskWeight: 8
    },

    // Control Activities
    {
      controlId: 'CC3.1',
      title: 'Authorization and Approval',
      description: 'The organization deploys control activities through policies that establish what is expected',
      categoryId: 'control-activities',
      requirements: [
        'Authorization matrix defined',
        'Approval workflows implemented',
        'Transaction limits established',
        'Override controls in place'
      ],
      evidenceTypes: ['configuration', 'system_report', 'log_data'],
      automationLevel: 'full',
      implementationGuidance: 'Implement system-enforced approval workflows based on defined authorization matrix',
      testingProcedures: [
        'Review authorization matrix',
        'Test approval workflows',
        'Verify transaction limits enforced',
        'Review override reports'
      ],
      riskWeight: 9
    },
    {
      controlId: 'CC3.2',
      title: 'Segregation of Duties',
      description: 'The organization segregates incompatible duties and develops alternative controls where segregation is not practical',
      categoryId: 'control-activities',
      requirements: [
        'Incompatible duties identified',
        'Roles and responsibilities segregated',
        'Compensating controls for conflicts',
        'Regular SOD reviews performed'
      ],
      evidenceTypes: ['configuration', 'access_review', 'system_report'],
      automationLevel: 'full',
      implementationGuidance: 'Implement role-based access control with automated SOD conflict detection',
      testingProcedures: [
        'Review SOD matrix',
        'Test for SOD conflicts',
        'Verify compensating controls',
        'Review access certification results'
      ],
      riskWeight: 10
    },
    {
      controlId: 'CC3.3',
      title: 'Physical Controls',
      description: 'The organization protects physical assets and information from unauthorized access',
      categoryId: 'control-activities',
      requirements: [
        'Physical access controls implemented',
        'Asset inventory maintained',
        'Environmental controls in place',
        'Visitor access procedures defined'
      ],
      evidenceTypes: ['configuration', 'system_report', 'document'],
      automationLevel: 'partial',
      implementationGuidance: 'Implement badge access systems and maintain logs of physical access',
      testingProcedures: [
        'Test physical access controls',
        'Review access logs',
        'Verify asset inventory accuracy',
        'Inspect environmental controls'
      ],
      riskWeight: 7
    },
    {
      controlId: 'CC3.4',
      title: 'Information Processing Controls',
      description: 'The organization implements control activities over technology to support the achievement of objectives',
      categoryId: 'control-activities',
      requirements: [
        'Input controls implemented',
        'Processing controls verified',
        'Output controls established',
        'Interface controls monitored'
      ],
      evidenceTypes: ['configuration', 'system_report', 'log_data'],
      automationLevel: 'full',
      implementationGuidance: 'Implement automated controls for data validation, processing integrity, and output verification',
      testingProcedures: [
        'Test input validation controls',
        'Verify processing accuracy',
        'Review output reconciliations',
        'Test interface controls'
      ],
      riskWeight: 9
    },

    // Information & Communication
    {
      controlId: 'CC4.1',
      title: 'Financial Reporting Information',
      description: 'The organization obtains or generates relevant, quality information to support internal control',
      categoryId: 'information-communication',
      requirements: [
        'Financial data integrity maintained',
        'Reporting processes documented',
        'Data quality controls implemented',
        'Reconciliations performed timely'
      ],
      evidenceTypes: ['system_report', 'database_query', 'log_data'],
      automationLevel: 'full',
      implementationGuidance: 'Implement automated data quality checks and reconciliation processes',
      testingProcedures: [
        'Test data integrity controls',
        'Review reconciliation processes',
        'Verify report accuracy',
        'Test data quality metrics'
      ],
      riskWeight: 10
    },
    {
      controlId: 'CC4.2',
      title: 'Internal Communication',
      description: 'The organization internally communicates information necessary to support the functioning of internal control',
      categoryId: 'information-communication',
      requirements: [
        'Communication channels established',
        'Control deficiencies reported',
        'Policy updates communicated',
        'Training materials distributed'
      ],
      evidenceTypes: ['document', 'system_report', 'user_attestation'],
      automationLevel: 'partial',
      implementationGuidance: 'Establish formal communication protocols for control-related information',
      testingProcedures: [
        'Review communication channels',
        'Verify deficiency reporting',
        'Test policy distribution',
        'Review training records'
      ],
      riskWeight: 7
    },
    {
      controlId: 'CC4.3',
      title: 'External Communication',
      description: 'The organization communicates with external parties regarding matters affecting internal control',
      categoryId: 'information-communication',
      requirements: [
        'External reporting procedures defined',
        'Regulatory communications tracked',
        'Third-party communications monitored',
        'Public disclosures controlled'
      ],
      evidenceTypes: ['document', 'system_report', 'log_data'],
      automationLevel: 'partial',
      implementationGuidance: 'Implement controlled processes for external communications and disclosures',
      testingProcedures: [
        'Review external reporting procedures',
        'Verify regulatory filings',
        'Test disclosure controls',
        'Review communication logs'
      ],
      riskWeight: 9
    },

    // Monitoring Activities
    {
      controlId: 'CC5.1',
      title: 'Ongoing Monitoring',
      description: 'The organization selects and develops ongoing monitoring activities',
      categoryId: 'monitoring-activities',
      requirements: [
        'Continuous monitoring implemented',
        'Key metrics defined and tracked',
        'Automated alerts configured',
        'Trend analysis performed'
      ],
      evidenceTypes: ['system_report', 'log_data', 'configuration'],
      automationLevel: 'full',
      implementationGuidance: 'Implement automated monitoring tools with real-time alerting capabilities',
      testingProcedures: [
        'Review monitoring configuration',
        'Test alert functionality',
        'Verify metric accuracy',
        'Review trend reports'
      ],
      riskWeight: 8
    },
    {
      controlId: 'CC5.2',
      title: 'Separate Evaluations',
      description: 'The organization conducts separate evaluations of internal control components',
      categoryId: 'monitoring-activities',
      requirements: [
        'Internal audit function established',
        'Audit plan risk-based',
        'Management testing performed',
        'External audits coordinated'
      ],
      evidenceTypes: ['document', 'system_report', 'user_attestation'],
      automationLevel: 'manual',
      implementationGuidance: 'Establish independent internal audit function with risk-based audit planning',
      testingProcedures: [
        'Review audit charter',
        'Verify audit plan coverage',
        'Review audit reports',
        'Test issue remediation'
      ],
      riskWeight: 9
    },
    {
      controlId: 'CC5.3',
      title: 'Deficiency Remediation',
      description: 'The organization evaluates and remediates internal control deficiencies in a timely manner',
      categoryId: 'monitoring-activities',
      requirements: [
        'Deficiency tracking system implemented',
        'Root cause analysis performed',
        'Remediation plans developed',
        'Management review and sign-off'
      ],
      evidenceTypes: ['system_report', 'document', 'user_attestation'],
      automationLevel: 'partial',
      implementationGuidance: 'Implement deficiency tracking system with workflow for remediation and approval',
      testingProcedures: [
        'Review deficiency log',
        'Test remediation timeliness',
        'Verify root cause analysis',
        'Review management sign-offs'
      ],
      riskWeight: 10
    }
  ]
};