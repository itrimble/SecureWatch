import { ComplianceFrameworkDefinition } from '../types/compliance.types';

export const PCIDSSFramework: ComplianceFrameworkDefinition = {
  type: 'PCI-DSS',
  name: 'Payment Card Industry Data Security Standard',
  version: '4.0',
  description: 'PCI DSS is a set of security standards designed to ensure that all companies that accept, process, store or transmit credit card information maintain a secure environment.',
  categories: [
    {
      name: 'Build and Maintain a Secure Network and Systems',
      description: 'Install and maintain network security controls and apply secure configurations to all system components',
      order: 1
    },
    {
      name: 'Protect Account Data',
      description: 'Protect stored account data and protect cardholder data with strong cryptography during transmission',
      order: 2
    },
    {
      name: 'Maintain a Vulnerability Management Program',
      description: 'Protect all systems and networks from malicious software and regularly update anti-virus software',
      order: 3
    },
    {
      name: 'Implement Strong Access Control Measures',
      description: 'Restrict access to system components and cardholder data by business need to know',
      order: 4
    },
    {
      name: 'Regularly Monitor and Test Networks',
      description: 'Log and monitor all access to system components and cardholder data',
      order: 5
    },
    {
      name: 'Maintain an Information Security Policy',
      description: 'Maintain a policy that addresses information security for all personnel',
      order: 6
    }
  ],
  controls: [
    // Build and Maintain a Secure Network and Systems
    {
      controlId: '1.1',
      title: 'Install and maintain network security controls',
      description: 'Network security controls (NSCs) are network security technologies designed to prevent unauthorized network access',
      categoryId: 'network-security',
      requirements: [
        'NSCs are installed between all trusted and untrusted networks',
        'NSC configurations are defined and implemented',
        'Network diagrams are maintained and accurate',
        'Data flow diagrams for cardholder data are documented',
        'All services, protocols, and ports allowed are identified and approved'
      ],
      evidenceTypes: ['configuration', 'document', 'network_capture'],
      automationLevel: 'partial',
      implementationGuidance: 'Deploy firewalls and network segmentation with documented configurations',
      testingProcedures: [
        'Review firewall configurations',
        'Verify network diagrams accuracy',
        'Test segmentation effectiveness',
        'Review approved services list'
      ],
      riskWeight: 10
    },
    {
      controlId: '1.2',
      title: 'Apply secure configurations to all system components',
      description: 'System components should be configured securely to reduce vulnerabilities',
      categoryId: 'network-security',
      requirements: [
        'Configuration standards for all system components',
        'Default passwords changed before deployment',
        'Unnecessary services and functions removed',
        'Security parameters configured appropriately',
        'System components inventoried and managed'
      ],
      evidenceTypes: ['configuration', 'system_report', 'scan_result'],
      automationLevel: 'full',
      implementationGuidance: 'Implement configuration management with automated compliance checking',
      testingProcedures: [
        'Review configuration standards',
        'Test for default credentials',
        'Verify unnecessary services disabled',
        'Review security parameters'
      ],
      riskWeight: 9
    },

    // Protect Account Data
    {
      controlId: '3.1',
      title: 'Processes to protect stored account data',
      description: 'Implement data retention and disposal policies to limit storage and define deletion',
      categoryId: 'data-protection',
      requirements: [
        'Data retention policies defined',
        'Cardholder data storage minimized',
        'Data disposal procedures implemented',
        'Quarterly review of stored data',
        'Sensitive authentication data not stored after authorization'
      ],
      evidenceTypes: ['document', 'system_report', 'database_query'],
      automationLevel: 'partial',
      implementationGuidance: 'Implement automated data discovery and retention management',
      testingProcedures: [
        'Review retention policies',
        'Scan for unauthorized data storage',
        'Test disposal procedures',
        'Verify sensitive data purging'
      ],
      riskWeight: 10
    },
    {
      controlId: '3.2',
      title: 'Cryptographic protection of stored account data',
      description: 'Protect stored cardholder data using strong cryptography',
      categoryId: 'data-protection',
      requirements: [
        'Account data encrypted using strong cryptography',
        'Encryption keys managed securely',
        'Key management procedures documented',
        'Decryption restricted to authorized personnel',
        'PAN masked when displayed'
      ],
      evidenceTypes: ['configuration', 'system_report', 'scan_result'],
      automationLevel: 'full',
      implementationGuidance: 'Implement encryption at rest with secure key management',
      testingProcedures: [
        'Verify encryption implementation',
        'Review key management procedures',
        'Test access to encryption keys',
        'Verify PAN masking'
      ],
      riskWeight: 10
    },
    {
      controlId: '4.1',
      title: 'Strong cryptography during transmission',
      description: 'Use strong cryptography and security protocols to safeguard cardholder data during transmission',
      categoryId: 'data-protection',
      requirements: [
        'Strong cryptography for all transmissions',
        'Trusted keys and certificates',
        'Secure protocol versions only',
        'Encryption strength appropriate',
        'Wireless networks secured'
      ],
      evidenceTypes: ['configuration', 'network_capture', 'scan_result'],
      automationLevel: 'full',
      implementationGuidance: 'Enforce TLS 1.2+ for all cardholder data transmissions',
      testingProcedures: [
        'Test encryption protocols',
        'Verify certificate validity',
        'Scan for weak protocols',
        'Test wireless security'
      ],
      riskWeight: 10
    },

    // Maintain a Vulnerability Management Program
    {
      controlId: '5.1',
      title: 'Protect against malicious software',
      description: 'Deploy anti-malware solutions to detect and prevent malicious software',
      categoryId: 'vulnerability-management',
      requirements: [
        'Anti-malware deployed on all systems',
        'Anti-malware kept current',
        'Periodic scans performed',
        'Audit logs generated',
        'Anti-malware actively running'
      ],
      evidenceTypes: ['configuration', 'system_report', 'scan_result'],
      automationLevel: 'full',
      implementationGuidance: 'Deploy enterprise anti-malware with central management',
      testingProcedures: [
        'Verify anti-malware deployment',
        'Check signature updates',
        'Review scan schedules',
        'Test malware detection'
      ],
      riskWeight: 8
    },
    {
      controlId: '6.1',
      title: 'Security vulnerabilities identified and addressed',
      description: 'Establish a process to identify and assess security vulnerabilities',
      categoryId: 'vulnerability-management',
      requirements: [
        'Security vulnerability sources monitored',
        'Vulnerabilities ranked by risk',
        'Critical patches installed timely',
        'System components inventoried',
        'Custom code reviewed for vulnerabilities'
      ],
      evidenceTypes: ['scan_result', 'system_report', 'document'],
      automationLevel: 'partial',
      implementationGuidance: 'Implement vulnerability scanning and patch management program',
      testingProcedures: [
        'Review vulnerability sources',
        'Verify risk ranking process',
        'Test patch deployment',
        'Review code review results'
      ],
      riskWeight: 9
    },
    {
      controlId: '6.2',
      title: 'System components protected from known vulnerabilities',
      description: 'Install applicable security patches to protect against exploitation',
      categoryId: 'vulnerability-management',
      requirements: [
        'Critical patches installed within one month',
        'Other patches evaluated and installed',
        'Patch management process documented',
        'System inventory maintained',
        'Change control followed'
      ],
      evidenceTypes: ['system_report', 'configuration', 'log_data'],
      automationLevel: 'partial',
      implementationGuidance: 'Automate patch deployment with proper testing and rollback',
      testingProcedures: [
        'Review patch history',
        'Verify critical patch timing',
        'Test patch procedures',
        'Review change records'
      ],
      riskWeight: 9
    },

    // Implement Strong Access Control Measures
    {
      controlId: '7.1',
      title: 'Restrict access by business need to know',
      description: 'Limit access to system components and cardholder data to only those individuals whose job requires it',
      categoryId: 'access-control',
      requirements: [
        'Access control policy defined',
        'Role-based access control implemented',
        'Access rights approved by management',
        'Privileged access restricted',
        'Access reviews performed'
      ],
      evidenceTypes: ['configuration', 'access_review', 'document'],
      automationLevel: 'full',
      implementationGuidance: 'Implement least privilege with automated access certification',
      testingProcedures: [
        'Review access control policy',
        'Test role definitions',
        'Verify approval process',
        'Review privileged accounts'
      ],
      riskWeight: 10
    },
    {
      controlId: '8.1',
      title: 'User identification and authentication',
      description: 'Assign all users a unique ID before allowing them to access system components',
      categoryId: 'access-control',
      requirements: [
        'Unique user IDs for all users',
        'Strong authentication methods',
        'Multi-factor authentication for remote access',
        'Password requirements enforced',
        'Account lockout mechanisms'
      ],
      evidenceTypes: ['configuration', 'system_report', 'log_data'],
      automationLevel: 'full',
      implementationGuidance: 'Implement identity management with strong authentication',
      testingProcedures: [
        'Verify unique user IDs',
        'Test authentication strength',
        'Verify MFA implementation',
        'Test password policies'
      ],
      riskWeight: 10
    },
    {
      controlId: '9.1',
      title: 'Restrict physical access to cardholder data',
      description: 'Use appropriate facility entry controls to limit physical access',
      categoryId: 'access-control',
      requirements: [
        'Physical access controls implemented',
        'Access authorized by management',
        'Access logs maintained',
        'Visitor management procedures',
        'Media storage secured'
      ],
      evidenceTypes: ['configuration', 'system_report', 'document'],
      automationLevel: 'partial',
      implementationGuidance: 'Deploy physical access control systems with logging',
      testingProcedures: [
        'Test physical controls',
        'Review access logs',
        'Verify visitor procedures',
        'Inspect media storage'
      ],
      riskWeight: 8
    },

    // Regularly Monitor and Test Networks
    {
      controlId: '10.1',
      title: 'Log and monitor all access',
      description: 'Implement audit trails to link all access to system components to individual users',
      categoryId: 'monitoring-testing',
      requirements: [
        'User access logged',
        'Administrative actions logged',
        'Access to audit trails logged',
        'Invalid access attempts logged',
        'Use of identification mechanisms logged'
      ],
      evidenceTypes: ['log_data', 'configuration', 'system_report'],
      automationLevel: 'full',
      implementationGuidance: 'Implement comprehensive logging with SIEM integration',
      testingProcedures: [
        'Review log configuration',
        'Verify log completeness',
        'Test log protection',
        'Review SIEM alerts'
      ],
      riskWeight: 9
    },
    {
      controlId: '10.2',
      title: 'Review logs and security events',
      description: 'Review logs and security events for all system components to identify anomalies',
      categoryId: 'monitoring-testing',
      requirements: [
        'Daily log review process',
        'Exception and anomaly identification',
        'Log retention for one year',
        'Automated log monitoring tools',
        'Response procedures for alerts'
      ],
      evidenceTypes: ['system_report', 'log_data', 'document'],
      automationLevel: 'partial',
      implementationGuidance: 'Implement automated log analysis with alert correlation',
      testingProcedures: [
        'Review log analysis procedures',
        'Verify daily reviews',
        'Test retention compliance',
        'Review alert responses'
      ],
      riskWeight: 8
    },
    {
      controlId: '11.1',
      title: 'Test security of systems and networks',
      description: 'Regularly test security systems and processes including vulnerability scanning',
      categoryId: 'monitoring-testing',
      requirements: [
        'Quarterly vulnerability scans',
        'Annual penetration testing',
        'Segmentation testing',
        'Scan after significant changes',
        'Authenticated scanning performed'
      ],
      evidenceTypes: ['scan_result', 'document', 'system_report'],
      automationLevel: 'partial',
      implementationGuidance: 'Establish vulnerability scanning and penetration testing program',
      testingProcedures: [
        'Review scan reports',
        'Verify scan frequency',
        'Review penetration test results',
        'Test segmentation controls'
      ],
      riskWeight: 9
    },
    {
      controlId: '11.2',
      title: 'Deploy intrusion detection/prevention',
      description: 'Deploy change-detection mechanisms to alert personnel to unauthorized modifications',
      categoryId: 'monitoring-testing',
      requirements: [
        'IDS/IPS deployed',
        'File integrity monitoring',
        'Critical file monitoring',
        'Alert generation and response',
        'Regular updates applied'
      ],
      evidenceTypes: ['configuration', 'system_report', 'log_data'],
      automationLevel: 'full',
      implementationGuidance: 'Deploy IDS/IPS with file integrity monitoring',
      testingProcedures: [
        'Review IDS/IPS configuration',
        'Test detection capabilities',
        'Verify FIM deployment',
        'Review alert responses'
      ],
      riskWeight: 8
    },

    // Maintain an Information Security Policy
    {
      controlId: '12.1',
      title: 'Information security policy',
      description: 'Establish, publish, maintain, and disseminate a security policy',
      categoryId: 'security-policy',
      requirements: [
        'Security policy established',
        'Annual policy review',
        'Risk assessment process',
        'Policy addresses all requirements',
        'Policy disseminated to personnel'
      ],
      evidenceTypes: ['document', 'user_attestation', 'system_report'],
      automationLevel: 'manual',
      implementationGuidance: 'Develop comprehensive security policy framework',
      testingProcedures: [
        'Review policy content',
        'Verify annual reviews',
        'Check dissemination records',
        'Interview personnel'
      ],
      riskWeight: 8
    },
    {
      controlId: '12.2',
      title: 'Risk assessment process',
      description: 'Implement a risk assessment process that is performed at least annually',
      categoryId: 'security-policy',
      requirements: [
        'Annual risk assessment',
        'Critical assets identified',
        'Threats and vulnerabilities identified',
        'Risk evaluation and prioritization',
        'Risk mitigation strategies'
      ],
      evidenceTypes: ['document', 'system_report'],
      automationLevel: 'partial',
      implementationGuidance: 'Establish formal risk assessment methodology',
      testingProcedures: [
        'Review risk assessment process',
        'Verify annual completion',
        'Review risk register',
        'Test mitigation effectiveness'
      ],
      riskWeight: 9
    },
    {
      controlId: '12.3',
      title: 'Security awareness program',
      description: 'Develop and maintain a security awareness program for all personnel',
      categoryId: 'security-policy',
      requirements: [
        'Security awareness training',
        'Annual training requirement',
        'Role-based training content',
        'Training acknowledgment',
        'Awareness materials distributed'
      ],
      evidenceTypes: ['document', 'system_report', 'user_attestation'],
      automationLevel: 'partial',
      implementationGuidance: 'Implement comprehensive security awareness program',
      testingProcedures: [
        'Review training content',
        'Verify completion records',
        'Test employee knowledge',
        'Review awareness materials'
      ],
      riskWeight: 7
    },
    {
      controlId: '12.4',
      title: 'Incident response plan',
      description: 'Implement an incident response plan to be immediately activated in case of breach',
      categoryId: 'security-policy',
      requirements: [
        'Incident response plan documented',
        'Roles and responsibilities defined',
        'Notification procedures established',
        'Response procedures tested',
        'Plan updated based on lessons learned'
      ],
      evidenceTypes: ['document', 'system_report', 'log_data'],
      automationLevel: 'partial',
      implementationGuidance: 'Develop and test comprehensive incident response capabilities',
      testingProcedures: [
        'Review response plan',
        'Test notification procedures',
        'Conduct tabletop exercises',
        'Review incident reports'
      ],
      riskWeight: 10
    }
  ]
};