import { ComplianceFrameworkDefinition } from '../types/compliance.types';

export const ISO27001Framework: ComplianceFrameworkDefinition = {
  type: 'ISO-27001',
  name: 'ISO/IEC 27001:2022',
  version: '2022',
  description:
    'ISO 27001 is an international standard for information security management systems (ISMS) that provides a systematic approach to managing sensitive company information.',
  categories: [
    {
      name: 'Organizational Controls',
      description:
        'Controls related to organizational policies, roles, and responsibilities',
      order: 1,
    },
    {
      name: 'People Controls',
      description: 'Controls related to human resources and personnel security',
      order: 2,
    },
    {
      name: 'Physical Controls',
      description: 'Controls for physical and environmental security',
      order: 3,
    },
    {
      name: 'Technological Controls',
      description: 'Technical controls for information systems and networks',
      order: 4,
    },
  ],
  controls: [
    // Organizational Controls (Clause 5)
    {
      controlId: '5.1',
      title: 'Policies for information security',
      description:
        'Information security policy and topic-specific policies shall be defined, approved by management, published, communicated to relevant personnel and relevant interested parties',
      categoryId: 'organizational-controls',
      requirements: [
        'Information security policy defined',
        'Policy approved by management',
        'Policy communicated to personnel',
        'Regular policy reviews',
        'Topic-specific policies established',
      ],
      evidenceTypes: ['document', 'user_attestation', 'system_report'],
      automationLevel: 'manual',
      implementationGuidance:
        'Establish comprehensive information security policy framework with regular review cycles',
      testingProcedures: [
        'Review policy documentation',
        'Verify management approval',
        'Check distribution records',
        'Interview staff on policy awareness',
      ],
      riskWeight: 9,
    },
    {
      controlId: '5.2',
      title: 'Information security roles and responsibilities',
      description:
        'Information security roles and responsibilities shall be defined and allocated according to the organization needs',
      categoryId: 'organizational-controls',
      requirements: [
        'Roles and responsibilities defined',
        'Segregation of duties implemented',
        'Authorities clearly allocated',
        'Coordination mechanisms established',
        'Contact with authorities defined',
      ],
      evidenceTypes: ['document', 'configuration', 'user_attestation'],
      automationLevel: 'partial',
      implementationGuidance:
        'Define RACI matrix for information security responsibilities',
      testingProcedures: [
        'Review role definitions',
        'Verify segregation of duties',
        'Check authorization matrix',
        'Interview role holders',
      ],
      riskWeight: 8,
    },
    {
      controlId: '5.3',
      title: 'Segregation of duties',
      description:
        'Conflicting duties and conflicting areas of responsibility shall be segregated',
      categoryId: 'organizational-controls',
      requirements: [
        'Conflicting duties identified',
        'Segregation implemented',
        'Compensating controls where needed',
        'Regular reviews performed',
        'Access rights aligned',
      ],
      evidenceTypes: ['configuration', 'access_review', 'system_report'],
      automationLevel: 'full',
      implementationGuidance:
        'Implement role-based access control with automated conflict detection',
      testingProcedures: [
        'Review duty segregation matrix',
        'Test for access conflicts',
        'Verify compensating controls',
        'Review exception reports',
      ],
      riskWeight: 9,
    },
    {
      controlId: '5.7',
      title: 'Threat intelligence',
      description:
        'Information relating to information security threats shall be collected and analyzed',
      categoryId: 'organizational-controls',
      requirements: [
        'Threat intelligence sources identified',
        'Collection processes established',
        'Analysis capabilities developed',
        'Threat information disseminated',
        'Response procedures defined',
      ],
      evidenceTypes: ['system_report', 'api_response', 'document'],
      automationLevel: 'partial',
      implementationGuidance:
        'Establish threat intelligence program with automated feeds',
      testingProcedures: [
        'Review threat sources',
        'Verify collection processes',
        'Test analysis capabilities',
        'Review dissemination procedures',
      ],
      riskWeight: 8,
    },
    {
      controlId: '5.10',
      title: 'Acceptable use of information and other associated assets',
      description:
        'Rules for the acceptable use and procedures for handling information and other associated assets shall be identified, documented and implemented',
      categoryId: 'organizational-controls',
      requirements: [
        'Acceptable use policy defined',
        'Asset handling procedures',
        'User acknowledgment required',
        'Monitoring implemented',
        'Violations addressed',
      ],
      evidenceTypes: ['document', 'user_attestation', 'log_data'],
      automationLevel: 'partial',
      implementationGuidance:
        'Create acceptable use policy with monitoring and enforcement',
      testingProcedures: [
        'Review use policies',
        'Check user acknowledgments',
        'Test monitoring capabilities',
        'Review violation records',
      ],
      riskWeight: 7,
    },
    {
      controlId: '5.23',
      title: 'Information security for use of cloud services',
      description:
        'Processes for acquisition, use, management and exit from cloud services shall be established',
      categoryId: 'organizational-controls',
      requirements: [
        'Cloud service policy established',
        'Risk assessment for cloud services',
        'Security requirements defined',
        'Exit strategies documented',
        'Monitoring procedures implemented',
      ],
      evidenceTypes: ['document', 'configuration', 'api_response'],
      automationLevel: 'partial',
      implementationGuidance:
        'Implement cloud governance framework with security controls',
      testingProcedures: [
        'Review cloud policies',
        'Verify risk assessments',
        'Test security controls',
        'Review exit procedures',
      ],
      riskWeight: 9,
    },

    // People Controls (Clause 6)
    {
      controlId: '6.1',
      title: 'Screening',
      description:
        'Background verification checks on all candidates for employment shall be carried out',
      categoryId: 'people-controls',
      requirements: [
        'Background check procedures',
        'Verification requirements defined',
        'Checks proportionate to role',
        'Regular re-screening where appropriate',
        'Records maintained securely',
      ],
      evidenceTypes: ['document', 'user_attestation', 'system_report'],
      automationLevel: 'manual',
      implementationGuidance:
        'Establish background screening program aligned with local laws',
      testingProcedures: [
        'Review screening procedures',
        'Verify check completion',
        'Review record retention',
        'Check re-screening schedule',
      ],
      riskWeight: 7,
    },
    {
      controlId: '6.2',
      title: 'Terms and conditions of employment',
      description:
        'Employment contractual agreements shall state the personnel and organization responsibilities for information security',
      categoryId: 'people-controls',
      requirements: [
        'Security responsibilities in contracts',
        'Confidentiality agreements',
        'Post-employment obligations',
        'Intellectual property clauses',
        'Return of assets requirements',
      ],
      evidenceTypes: ['document', 'user_attestation'],
      automationLevel: 'manual',
      implementationGuidance:
        'Include comprehensive security clauses in employment contracts',
      testingProcedures: [
        'Review contract templates',
        'Verify security clauses',
        'Check signed agreements',
        'Review termination procedures',
      ],
      riskWeight: 8,
    },
    {
      controlId: '6.3',
      title: 'Information security awareness, education and training',
      description:
        'Personnel and relevant interested parties shall receive appropriate information security awareness, education and training',
      categoryId: 'people-controls',
      requirements: [
        'Training program established',
        'Role-based training content',
        'Regular training updates',
        'Training effectiveness measured',
        'Records maintained',
      ],
      evidenceTypes: ['system_report', 'document', 'user_attestation'],
      automationLevel: 'partial',
      implementationGuidance:
        'Develop comprehensive security awareness program',
      testingProcedures: [
        'Review training content',
        'Check completion records',
        'Test knowledge retention',
        'Review effectiveness metrics',
      ],
      riskWeight: 8,
    },
    {
      controlId: '6.4',
      title: 'Disciplinary process',
      description:
        'A disciplinary process shall be formalized and communicated to take actions when personnel violate information security policies',
      categoryId: 'people-controls',
      requirements: [
        'Disciplinary process documented',
        'Process communicated to staff',
        'Consistent application',
        'Investigation procedures',
        'Appeals process defined',
      ],
      evidenceTypes: ['document', 'user_attestation', 'system_report'],
      automationLevel: 'manual',
      implementationGuidance:
        'Establish fair and consistent disciplinary procedures',
      testingProcedures: [
        'Review disciplinary policy',
        'Check communication records',
        'Review case handling',
        'Verify consistency',
      ],
      riskWeight: 6,
    },

    // Physical Controls (Clause 7)
    {
      controlId: '7.1',
      title: 'Physical security perimeters',
      description:
        'Security perimeters shall be defined and used to protect areas containing information and other associated assets',
      categoryId: 'physical-controls',
      requirements: [
        'Security perimeters defined',
        'Physical barriers implemented',
        'Entry controls established',
        'Perimeter monitoring',
        'Regular reviews',
      ],
      evidenceTypes: ['configuration', 'document', 'system_report'],
      automationLevel: 'partial',
      implementationGuidance:
        'Implement layered physical security with monitoring',
      testingProcedures: [
        'Inspect physical barriers',
        'Test entry controls',
        'Review monitoring coverage',
        'Check alarm systems',
      ],
      riskWeight: 8,
    },
    {
      controlId: '7.2',
      title: 'Physical entry',
      description:
        'Secure areas shall be protected by appropriate entry controls to ensure only authorized personnel are allowed access',
      categoryId: 'physical-controls',
      requirements: [
        'Access control systems',
        'Visitor management procedures',
        'Access logs maintained',
        'Escort requirements',
        'Access rights reviews',
      ],
      evidenceTypes: ['configuration', 'log_data', 'system_report'],
      automationLevel: 'partial',
      implementationGuidance: 'Deploy electronic access control with logging',
      testingProcedures: [
        'Test access controls',
        'Review access logs',
        'Verify visitor procedures',
        'Check escort compliance',
      ],
      riskWeight: 8,
    },
    {
      controlId: '7.4',
      title: 'Physical security monitoring',
      description:
        'Premises shall be continuously monitored for unauthorized physical access',
      categoryId: 'physical-controls',
      requirements: [
        'Monitoring systems deployed',
        'Coverage of critical areas',
        'Alarm response procedures',
        'Log retention policies',
        'Regular system testing',
      ],
      evidenceTypes: ['configuration', 'system_report', 'log_data'],
      automationLevel: 'full',
      implementationGuidance: 'Implement CCTV and intrusion detection systems',
      testingProcedures: [
        'Review camera coverage',
        'Test alarm systems',
        'Verify response procedures',
        'Check recording quality',
      ],
      riskWeight: 7,
    },

    // Technological Controls (Clause 8)
    {
      controlId: '8.1',
      title: 'User endpoint devices',
      description:
        'Information stored on, processed by or accessible via user endpoint devices shall be protected',
      categoryId: 'technological-controls',
      requirements: [
        'Endpoint protection deployed',
        'Device encryption enabled',
        'Patch management implemented',
        'Remote wipe capabilities',
        'Usage restrictions enforced',
      ],
      evidenceTypes: ['configuration', 'system_report', 'scan_result'],
      automationLevel: 'full',
      implementationGuidance:
        'Deploy endpoint detection and response (EDR) solution',
      testingProcedures: [
        'Verify endpoint protection',
        'Test encryption status',
        'Review patch compliance',
        'Test remote wipe',
      ],
      riskWeight: 9,
    },
    {
      controlId: '8.2',
      title: 'Privileged access rights',
      description:
        'The allocation and use of privileged access rights shall be restricted and managed',
      categoryId: 'technological-controls',
      requirements: [
        'Privileged accounts identified',
        'Just-in-time access implemented',
        'Strong authentication required',
        'Session monitoring enabled',
        'Regular access reviews',
      ],
      evidenceTypes: ['configuration', 'access_review', 'log_data'],
      automationLevel: 'full',
      implementationGuidance:
        'Implement privileged access management (PAM) solution',
      testingProcedures: [
        'Review privileged accounts',
        'Test JIT access',
        'Verify session recording',
        'Check access reviews',
      ],
      riskWeight: 10,
    },
    {
      controlId: '8.5',
      title: 'Secure authentication',
      description:
        'Secure authentication technologies and procedures shall be implemented',
      categoryId: 'technological-controls',
      requirements: [
        'Strong authentication methods',
        'Multi-factor authentication',
        'Password policy enforcement',
        'Account lockout mechanisms',
        'Authentication logging',
      ],
      evidenceTypes: ['configuration', 'system_report', 'log_data'],
      automationLevel: 'full',
      implementationGuidance: 'Deploy MFA with risk-based authentication',
      testingProcedures: [
        'Test authentication methods',
        'Verify MFA enforcement',
        'Check password policies',
        'Review authentication logs',
      ],
      riskWeight: 10,
    },
    {
      controlId: '8.12',
      title: 'Data leakage prevention',
      description:
        'Data leakage prevention measures shall be applied to systems, networks and other devices',
      categoryId: 'technological-controls',
      requirements: [
        'DLP solution deployed',
        'Sensitive data classified',
        'Monitoring rules configured',
        'Response procedures defined',
        'Regular rule updates',
      ],
      evidenceTypes: ['configuration', 'system_report', 'log_data'],
      automationLevel: 'full',
      implementationGuidance:
        'Implement DLP with content inspection and blocking',
      testingProcedures: [
        'Test DLP rules',
        'Verify data classification',
        'Review blocked attempts',
        'Check alert handling',
      ],
      riskWeight: 9,
    },
    {
      controlId: '8.16',
      title: 'Monitoring activities',
      description:
        'Networks, systems and applications shall be monitored for anomalous behavior',
      categoryId: 'technological-controls',
      requirements: [
        'Monitoring systems deployed',
        'Baseline behavior established',
        'Anomaly detection configured',
        'Alert correlation enabled',
        'Response procedures defined',
      ],
      evidenceTypes: ['configuration', 'system_report', 'log_data'],
      automationLevel: 'full',
      implementationGuidance: 'Deploy SIEM with behavioral analytics',
      testingProcedures: [
        'Review monitoring coverage',
        'Test anomaly detection',
        'Verify alert accuracy',
        'Check response times',
      ],
      riskWeight: 9,
    },
    {
      controlId: '8.23',
      title: 'Web filtering',
      description:
        'Access to external websites shall be managed to reduce exposure to malicious content',
      categoryId: 'technological-controls',
      requirements: [
        'Web filtering implemented',
        'Category-based blocking',
        'Malicious site protection',
        'SSL inspection where appropriate',
        'Bypass procedures defined',
      ],
      evidenceTypes: ['configuration', 'system_report', 'log_data'],
      automationLevel: 'full',
      implementationGuidance:
        'Deploy secure web gateway with threat intelligence',
      testingProcedures: [
        'Test filtering rules',
        'Verify threat blocking',
        'Check SSL inspection',
        'Review bypass logs',
      ],
      riskWeight: 7,
    },
    {
      controlId: '8.28',
      title: 'Secure coding',
      description:
        'Secure coding principles shall be applied to software development',
      categoryId: 'technological-controls',
      requirements: [
        'Secure coding standards defined',
        'Developer training provided',
        'Code review processes',
        'Security testing integrated',
        'Vulnerability remediation tracked',
      ],
      evidenceTypes: ['document', 'scan_result', 'system_report'],
      automationLevel: 'partial',
      implementationGuidance:
        'Integrate security into SDLC with automated scanning',
      testingProcedures: [
        'Review coding standards',
        'Check training records',
        'Test code review process',
        'Verify security testing',
      ],
      riskWeight: 9,
    },
  ],
};
