import { ComplianceFrameworkDefinition } from '../types/compliance.types';

export const GDPRFramework: ComplianceFrameworkDefinition = {
  type: 'GDPR',
  name: 'General Data Protection Regulation',
  version: '2016/679',
  description: 'The GDPR is a regulation in EU law on data protection and privacy for all individuals within the European Union and the European Economic Area.',
  categories: [
    {
      name: 'Lawfulness and Transparency',
      description: 'Principles relating to processing of personal data including lawfulness, fairness and transparency',
      order: 1
    },
    {
      name: 'Data Subject Rights',
      description: 'Rights of the data subject including access, rectification, erasure, and data portability',
      order: 2
    },
    {
      name: 'Privacy by Design',
      description: 'Data protection by design and by default principles',
      order: 3
    },
    {
      name: 'Security of Processing',
      description: 'Technical and organizational measures to ensure appropriate security',
      order: 4
    },
    {
      name: 'Accountability and Governance',
      description: 'Demonstrating compliance through documentation and governance structures',
      order: 5
    },
    {
      name: 'Data Transfers',
      description: 'Requirements for transferring personal data outside the EU',
      order: 6
    }
  ],
  controls: [
    // Lawfulness and Transparency
    {
      controlId: 'Art.5',
      title: 'Principles of Processing',
      description: 'Personal data shall be processed lawfully, fairly and in a transparent manner',
      categoryId: 'lawfulness-transparency',
      requirements: [
        'Lawful basis for processing identified',
        'Processing is fair and transparent',
        'Purpose limitation respected',
        'Data minimization applied',
        'Accuracy of data maintained',
        'Storage limitation enforced',
        'Integrity and confidentiality ensured'
      ],
      evidenceTypes: ['document', 'system_report', 'process_output'],
      automationLevel: 'partial',
      implementationGuidance: 'Document lawful basis for all processing activities and implement data governance',
      testingProcedures: [
        'Review processing register',
        'Verify lawful basis documentation',
        'Test data minimization controls',
        'Review retention policies'
      ],
      riskWeight: 10
    },
    {
      controlId: 'Art.6',
      title: 'Lawfulness of Processing',
      description: 'Processing shall be lawful only if and to the extent that at least one lawful basis applies',
      categoryId: 'lawfulness-transparency',
      requirements: [
        'Consent obtained where applicable',
        'Contractual necessity documented',
        'Legal obligations identified',
        'Vital interests assessments',
        'Public task documentation',
        'Legitimate interests assessments'
      ],
      evidenceTypes: ['document', 'user_attestation', 'system_report'],
      automationLevel: 'partial',
      implementationGuidance: 'Implement consent management and document all lawful bases',
      testingProcedures: [
        'Review consent records',
        'Verify legitimate interest assessments',
        'Test consent withdrawal',
        'Review legal basis documentation'
      ],
      riskWeight: 10
    },
    {
      controlId: 'Art.12-14',
      title: 'Transparent Information',
      description: 'Information provided to data subjects must be concise, transparent, intelligible and easily accessible',
      categoryId: 'lawfulness-transparency',
      requirements: [
        'Privacy notices comprehensive',
        'Information easily accessible',
        'Clear and plain language used',
        'Information provided at collection',
        'Updates communicated to data subjects'
      ],
      evidenceTypes: ['document', 'screenshot', 'system_report'],
      automationLevel: 'partial',
      implementationGuidance: 'Create layered privacy notices and implement notification systems',
      testingProcedures: [
        'Review privacy notices',
        'Test accessibility of information',
        'Verify notification procedures',
        'Check language clarity'
      ],
      riskWeight: 8
    },

    // Data Subject Rights
    {
      controlId: 'Art.15',
      title: 'Right of Access',
      description: 'Data subjects have the right to obtain confirmation and access to their personal data',
      categoryId: 'data-subject-rights',
      requirements: [
        'Access request procedures',
        'Identity verification process',
        'Data export capabilities',
        'Response within one month',
        'Information about processing provided'
      ],
      evidenceTypes: ['system_report', 'process_output', 'document'],
      automationLevel: 'partial',
      implementationGuidance: 'Implement automated data subject access request handling',
      testingProcedures: [
        'Test access request process',
        'Verify response times',
        'Review data completeness',
        'Test identity verification'
      ],
      riskWeight: 9
    },
    {
      controlId: 'Art.16',
      title: 'Right to Rectification',
      description: 'Data subjects have the right to rectification of inaccurate personal data',
      categoryId: 'data-subject-rights',
      requirements: [
        'Rectification procedures',
        'Data accuracy verification',
        'Update propagation to recipients',
        'Timely response to requests',
        'Audit trail of changes'
      ],
      evidenceTypes: ['system_report', 'log_data', 'process_output'],
      automationLevel: 'partial',
      implementationGuidance: 'Build data correction workflows with propagation tracking',
      testingProcedures: [
        'Test rectification process',
        'Verify update propagation',
        'Review audit trails',
        'Check response times'
      ],
      riskWeight: 8
    },
    {
      controlId: 'Art.17',
      title: 'Right to Erasure',
      description: 'Data subjects have the right to erasure (right to be forgotten) in certain circumstances',
      categoryId: 'data-subject-rights',
      requirements: [
        'Erasure request procedures',
        'Eligibility assessment process',
        'Data deletion capabilities',
        'Third-party notification',
        'Exceptions documented'
      ],
      evidenceTypes: ['system_report', 'log_data', 'process_output'],
      automationLevel: 'partial',
      implementationGuidance: 'Implement secure deletion with verification and propagation',
      testingProcedures: [
        'Test erasure procedures',
        'Verify complete deletion',
        'Check third-party notifications',
        'Review exception handling'
      ],
      riskWeight: 9
    },
    {
      controlId: 'Art.18',
      title: 'Right to Restriction',
      description: 'Data subjects have the right to restrict processing in certain circumstances',
      categoryId: 'data-subject-rights',
      requirements: [
        'Restriction request procedures',
        'Processing suspension capabilities',
        'Restriction markers implemented',
        'Notification before lifting',
        'Third-party notifications'
      ],
      evidenceTypes: ['system_report', 'configuration', 'log_data'],
      automationLevel: 'partial',
      implementationGuidance: 'Implement data processing restrictions with clear markers',
      testingProcedures: [
        'Test restriction functionality',
        'Verify processing suspension',
        'Check notification procedures',
        'Review restriction markers'
      ],
      riskWeight: 7
    },
    {
      controlId: 'Art.20',
      title: 'Right to Data Portability',
      description: 'Data subjects have the right to receive their data in a structured, commonly used format',
      categoryId: 'data-subject-rights',
      requirements: [
        'Portability request procedures',
        'Structured data export',
        'Machine-readable formats',
        'Direct transfer capabilities',
        'Scope properly defined'
      ],
      evidenceTypes: ['system_report', 'process_output', 'api_response'],
      automationLevel: 'full',
      implementationGuidance: 'Build automated data export in standard formats (JSON, CSV)',
      testingProcedures: [
        'Test export functionality',
        'Verify format compliance',
        'Check data completeness',
        'Test transfer capabilities'
      ],
      riskWeight: 7
    },

    // Privacy by Design
    {
      controlId: 'Art.25',
      title: 'Data Protection by Design and Default',
      description: 'Implement appropriate technical and organizational measures designed to implement data protection principles',
      categoryId: 'privacy-by-design',
      requirements: [
        'Privacy considered in system design',
        'Data minimization by default',
        'Privacy-enhancing technologies',
        'Default privacy settings',
        'Privacy impact assessments'
      ],
      evidenceTypes: ['document', 'configuration', 'system_report'],
      automationLevel: 'partial',
      implementationGuidance: 'Integrate privacy requirements into development lifecycle',
      testingProcedures: [
        'Review design documentation',
        'Test default settings',
        'Verify minimization controls',
        'Review PIA results'
      ],
      riskWeight: 9
    },
    {
      controlId: 'Art.35',
      title: 'Data Protection Impact Assessment',
      description: 'Carry out DPIA for processing likely to result in high risk to rights and freedoms',
      categoryId: 'privacy-by-design',
      requirements: [
        'DPIA methodology defined',
        'High-risk processing identified',
        'Systematic assessments conducted',
        'Mitigation measures implemented',
        'DPO consultation documented'
      ],
      evidenceTypes: ['document', 'user_attestation', 'system_report'],
      automationLevel: 'manual',
      implementationGuidance: 'Establish DPIA process with risk assessment framework',
      testingProcedures: [
        'Review DPIA methodology',
        'Verify high-risk identification',
        'Check mitigation implementation',
        'Review consultation records'
      ],
      riskWeight: 8
    },

    // Security of Processing
    {
      controlId: 'Art.32',
      title: 'Security of Processing',
      description: 'Implement appropriate technical and organizational measures to ensure appropriate security',
      categoryId: 'security-processing',
      requirements: [
        'Risk-appropriate security measures',
        'Pseudonymization and encryption',
        'Confidentiality and integrity',
        'Availability and resilience',
        'Regular security testing'
      ],
      evidenceTypes: ['configuration', 'scan_result', 'system_report'],
      automationLevel: 'partial',
      implementationGuidance: 'Implement comprehensive security program with encryption',
      testingProcedures: [
        'Review security measures',
        'Test encryption implementation',
        'Verify backup procedures',
        'Review security testing results'
      ],
      riskWeight: 10
    },
    {
      controlId: 'Art.33',
      title: 'Personal Data Breach Notification',
      description: 'Notify supervisory authority of personal data breach within 72 hours',
      categoryId: 'security-processing',
      requirements: [
        'Breach detection capabilities',
        'Breach assessment procedures',
        '72-hour notification timeline',
        'Documentation requirements',
        'Controller notification process'
      ],
      evidenceTypes: ['document', 'system_report', 'log_data'],
      automationLevel: 'partial',
      implementationGuidance: 'Implement breach detection and response procedures',
      testingProcedures: [
        'Test breach detection',
        'Review response procedures',
        'Verify notification timelines',
        'Check documentation completeness'
      ],
      riskWeight: 10
    },
    {
      controlId: 'Art.34',
      title: 'Communication to Data Subject',
      description: 'Communicate personal data breach to data subject when likely to result in high risk',
      categoryId: 'security-processing',
      requirements: [
        'Risk assessment for breaches',
        'Communication procedures',
        'Clear breach notifications',
        'Mitigation advice provided',
        'Mass communication capabilities'
      ],
      evidenceTypes: ['document', 'system_report', 'process_output'],
      automationLevel: 'partial',
      implementationGuidance: 'Build breach notification system with risk assessment',
      testingProcedures: [
        'Review risk assessment process',
        'Test notification systems',
        'Verify message clarity',
        'Check mass communication'
      ],
      riskWeight: 9
    },

    // Accountability and Governance
    {
      controlId: 'Art.30',
      title: 'Records of Processing Activities',
      description: 'Maintain a record of processing activities under controller responsibility',
      categoryId: 'accountability-governance',
      requirements: [
        'Processing activities documented',
        'Purpose and legal basis recorded',
        'Data categories identified',
        'Recipients documented',
        'Retention periods defined',
        'Security measures described'
      ],
      evidenceTypes: ['document', 'system_report', 'database_query'],
      automationLevel: 'partial',
      implementationGuidance: 'Maintain comprehensive processing register with regular updates',
      testingProcedures: [
        'Review processing records',
        'Verify completeness',
        'Check update frequency',
        'Test data accuracy'
      ],
      riskWeight: 8
    },
    {
      controlId: 'Art.37',
      title: 'Data Protection Officer',
      description: 'Designate a DPO where required based on processing activities',
      categoryId: 'accountability-governance',
      requirements: [
        'DPO designation assessment',
        'DPO independence ensured',
        'DPO resources provided',
        'DPO contact published',
        'DPO tasks defined'
      ],
      evidenceTypes: ['document', 'user_attestation', 'configuration'],
      automationLevel: 'manual',
      implementationGuidance: 'Appoint qualified DPO with appropriate independence',
      testingProcedures: [
        'Review DPO appointment',
        'Verify independence',
        'Check resource adequacy',
        'Review task completion'
      ],
      riskWeight: 7
    },
    {
      controlId: 'Art.40-42',
      title: 'Codes of Conduct and Certification',
      description: 'Adherence to approved codes of conduct or certification mechanisms',
      categoryId: 'accountability-governance',
      requirements: [
        'Relevant codes identified',
        'Compliance monitoring',
        'Certification pursued where applicable',
        'Regular reviews conducted',
        'Evidence of adherence'
      ],
      evidenceTypes: ['document', 'user_attestation', 'system_report'],
      automationLevel: 'manual',
      implementationGuidance: 'Adopt industry codes and pursue relevant certifications',
      testingProcedures: [
        'Review code adherence',
        'Verify monitoring processes',
        'Check certification status',
        'Review compliance evidence'
      ],
      riskWeight: 6
    },

    // Data Transfers
    {
      controlId: 'Art.44-49',
      title: 'International Data Transfers',
      description: 'Ensure appropriate safeguards for transfers of personal data to third countries',
      categoryId: 'data-transfers',
      requirements: [
        'Transfer mechanisms identified',
        'Adequacy decisions checked',
        'Appropriate safeguards implemented',
        'SCCs or BCRs in place',
        'Transfer impact assessments'
      ],
      evidenceTypes: ['document', 'configuration', 'user_attestation'],
      automationLevel: 'partial',
      implementationGuidance: 'Implement transfer mechanisms with impact assessments',
      testingProcedures: [
        'Review transfer inventory',
        'Verify safeguards',
        'Check SCC implementation',
        'Review TIA documentation'
      ],
      riskWeight: 9
    },
    {
      controlId: 'Art.46',
      title: 'Appropriate Safeguards',
      description: 'Controller or processor may transfer data subject to appropriate safeguards',
      categoryId: 'data-transfers',
      requirements: [
        'Standard contractual clauses',
        'Binding corporate rules',
        'Approved certification',
        'Enforceable rights ensured',
        'Effective remedies available'
      ],
      evidenceTypes: ['document', 'configuration', 'api_response'],
      automationLevel: 'manual',
      implementationGuidance: 'Execute SCCs with all third-country recipients',
      testingProcedures: [
        'Review SCC execution',
        'Verify BCR approval',
        'Check remedies availability',
        'Test enforcement mechanisms'
      ],
      riskWeight: 8
    }
  ]
};