import { ComplianceFrameworkDefinition } from '../types/compliance.types';

export const NISTCSFFramework: ComplianceFrameworkDefinition = {
  type: 'NIST-CSF',
  name: 'NIST Cybersecurity Framework',
  version: '2.0',
  description: 'The NIST Cybersecurity Framework provides a policy framework of computer security guidance for how private sector organizations can assess and improve their ability to prevent, detect, and respond to cyber attacks.',
  categories: [
    {
      name: 'Identify',
      description: 'Develop organizational understanding to manage cybersecurity risk to systems, assets, data, and capabilities',
      order: 1
    },
    {
      name: 'Protect',
      description: 'Develop and implement appropriate safeguards to ensure delivery of critical services',
      order: 2
    },
    {
      name: 'Detect',
      description: 'Develop and implement appropriate activities to identify the occurrence of a cybersecurity event',
      order: 3
    },
    {
      name: 'Respond',
      description: 'Develop and implement appropriate activities to take action regarding a detected cybersecurity incident',
      order: 4
    },
    {
      name: 'Recover',
      description: 'Develop and implement appropriate activities to maintain plans for resilience and restore capabilities',
      order: 5
    },
    {
      name: 'Govern',
      description: 'Establish and monitor the organization\'s cybersecurity risk management strategy, expectations, and policy',
      order: 6
    }
  ],
  controls: [
    // IDENTIFY Function
    {
      controlId: 'ID.AM-1',
      title: 'Physical devices and systems inventory',
      description: 'Physical devices and systems within the organization are inventoried',
      categoryId: 'identify',
      requirements: [
        'Comprehensive asset inventory maintained',
        'Hardware components documented',
        'Network devices cataloged',
        'IoT and OT devices tracked',
        'Regular inventory updates'
      ],
      evidenceTypes: ['system_report', 'configuration', 'database_query'],
      automationLevel: 'full',
      implementationGuidance: 'Deploy automated asset discovery and inventory management',
      testingProcedures: [
        'Review asset inventory completeness',
        'Verify automated discovery',
        'Test inventory accuracy',
        'Check update frequency'
      ],
      riskWeight: 8
    },
    {
      controlId: 'ID.AM-2',
      title: 'Software platforms and applications inventory',
      description: 'Software platforms and applications within the organization are inventoried',
      categoryId: 'identify',
      requirements: [
        'Software inventory maintained',
        'License tracking implemented',
        'Version information recorded',
        'Dependencies documented',
        'End-of-life dates tracked'
      ],
      evidenceTypes: ['system_report', 'configuration', 'scan_result'],
      automationLevel: 'full',
      implementationGuidance: 'Implement software asset management with discovery tools',
      testingProcedures: [
        'Review software inventory',
        'Verify license compliance',
        'Check version accuracy',
        'Test discovery tools'
      ],
      riskWeight: 7
    },
    {
      controlId: 'ID.RA-1',
      title: 'Asset vulnerabilities identification',
      description: 'Asset vulnerabilities are identified and documented',
      categoryId: 'identify',
      requirements: [
        'Vulnerability scanning performed',
        'Vulnerabilities documented',
        'Risk ratings assigned',
        'Asset mapping completed',
        'Remediation tracked'
      ],
      evidenceTypes: ['scan_result', 'system_report', 'document'],
      automationLevel: 'partial',
      implementationGuidance: 'Deploy vulnerability management platform with automated scanning',
      testingProcedures: [
        'Review scan coverage',
        'Verify vulnerability tracking',
        'Test risk ratings',
        'Check remediation status'
      ],
      riskWeight: 9
    },
    {
      controlId: 'ID.RA-5',
      title: 'Risk response prioritization',
      description: 'Threats, vulnerabilities, likelihoods, and impacts are used to determine risk',
      categoryId: 'identify',
      requirements: [
        'Risk assessment methodology',
        'Threat modeling performed',
        'Impact analysis completed',
        'Risk register maintained',
        'Risk treatment decisions'
      ],
      evidenceTypes: ['document', 'system_report', 'database_query'],
      automationLevel: 'partial',
      implementationGuidance: 'Establish risk management framework with quantitative analysis',
      testingProcedures: [
        'Review risk methodology',
        'Verify threat models',
        'Check impact assessments',
        'Review risk decisions'
      ],
      riskWeight: 9
    },
    {
      controlId: 'ID.GV-1',
      title: 'Organizational cybersecurity policy',
      description: 'Organizational cybersecurity policy is established and communicated',
      categoryId: 'identify',
      requirements: [
        'Cybersecurity policy documented',
        'Policy approved by leadership',
        'Policy communicated organization-wide',
        'Regular policy reviews',
        'Compliance monitoring'
      ],
      evidenceTypes: ['document', 'user_attestation', 'system_report'],
      automationLevel: 'manual',
      implementationGuidance: 'Develop comprehensive cybersecurity policy framework',
      testingProcedures: [
        'Review policy documentation',
        'Verify approval records',
        'Check communication evidence',
        'Test policy awareness'
      ],
      riskWeight: 8
    },

    // PROTECT Function
    {
      controlId: 'PR.AC-1',
      title: 'Identities and credentials management',
      description: 'Identities and credentials are issued, managed, verified, revoked, and audited',
      categoryId: 'protect',
      requirements: [
        'Identity lifecycle management',
        'Strong authentication enforced',
        'Credential management procedures',
        'Regular access reviews',
        'Privileged account management'
      ],
      evidenceTypes: ['configuration', 'access_review', 'system_report'],
      automationLevel: 'full',
      implementationGuidance: 'Deploy identity and access management (IAM) platform',
      testingProcedures: [
        'Review identity processes',
        'Test authentication methods',
        'Verify access reviews',
        'Check privileged accounts'
      ],
      riskWeight: 10
    },
    {
      controlId: 'PR.AC-4',
      title: 'Access permissions and authorization',
      description: 'Access permissions and authorizations are managed incorporating least privilege',
      categoryId: 'protect',
      requirements: [
        'Least privilege implemented',
        'Role-based access control',
        'Permission approval process',
        'Regular permission reviews',
        'Segregation of duties'
      ],
      evidenceTypes: ['configuration', 'access_review', 'system_report'],
      automationLevel: 'full',
      implementationGuidance: 'Implement RBAC with automated access certification',
      testingProcedures: [
        'Review permission model',
        'Test least privilege',
        'Verify approval process',
        'Check segregation controls'
      ],
      riskWeight: 9
    },
    {
      controlId: 'PR.DS-1',
      title: 'Data-at-rest protection',
      description: 'Data-at-rest is protected',
      categoryId: 'protect',
      requirements: [
        'Encryption at rest implemented',
        'Key management procedures',
        'Data classification applied',
        'Access controls enforced',
        'Encryption monitoring'
      ],
      evidenceTypes: ['configuration', 'scan_result', 'system_report'],
      automationLevel: 'full',
      implementationGuidance: 'Deploy full-disk and database encryption with key management',
      testingProcedures: [
        'Verify encryption status',
        'Review key management',
        'Test data classification',
        'Check access controls'
      ],
      riskWeight: 10
    },
    {
      controlId: 'PR.DS-2',
      title: 'Data-in-transit protection',
      description: 'Data-in-transit is protected',
      categoryId: 'protect',
      requirements: [
        'Encryption in transit enforced',
        'Secure protocols used',
        'Certificate management',
        'Network segmentation',
        'VPN for remote access'
      ],
      evidenceTypes: ['configuration', 'network_capture', 'scan_result'],
      automationLevel: 'full',
      implementationGuidance: 'Enforce TLS/SSL and implement network encryption',
      testingProcedures: [
        'Test encryption protocols',
        'Verify certificate validity',
        'Check network segmentation',
        'Review VPN configuration'
      ],
      riskWeight: 10
    },
    {
      controlId: 'PR.IP-1',
      title: 'Baseline configuration',
      description: 'A baseline configuration of IT/OT systems is created and maintained',
      categoryId: 'protect',
      requirements: [
        'Configuration standards defined',
        'Baseline images maintained',
        'Configuration monitoring',
        'Deviation alerts configured',
        'Regular baseline updates'
      ],
      evidenceTypes: ['configuration', 'system_report', 'document'],
      automationLevel: 'full',
      implementationGuidance: 'Implement configuration management database (CMDB)',
      testingProcedures: [
        'Review baseline standards',
        'Test configuration compliance',
        'Verify monitoring alerts',
        'Check update procedures'
      ],
      riskWeight: 8
    },
    {
      controlId: 'PR.IP-12',
      title: 'Vulnerability management plan',
      description: 'A vulnerability management plan is developed and implemented',
      categoryId: 'protect',
      requirements: [
        'Vulnerability management process',
        'Regular vulnerability assessments',
        'Patch management procedures',
        'Risk-based remediation',
        'Metrics and reporting'
      ],
      evidenceTypes: ['document', 'scan_result', 'system_report'],
      automationLevel: 'partial',
      implementationGuidance: 'Establish vulnerability management program with automated tools',
      testingProcedures: [
        'Review VM procedures',
        'Check scan frequency',
        'Verify patch deployment',
        'Review metrics'
      ],
      riskWeight: 9
    },

    // DETECT Function
    {
      controlId: 'DE.AE-1',
      title: 'Network operations baseline',
      description: 'A baseline of network operations and expected data flows is established',
      categoryId: 'detect',
      requirements: [
        'Network baseline established',
        'Normal traffic patterns documented',
        'Data flow mapping completed',
        'Baseline regularly updated',
        'Anomaly thresholds defined'
      ],
      evidenceTypes: ['configuration', 'network_capture', 'system_report'],
      automationLevel: 'partial',
      implementationGuidance: 'Deploy network behavior analysis tools',
      testingProcedures: [
        'Review network baseline',
        'Verify traffic patterns',
        'Check flow documentation',
        'Test anomaly detection'
      ],
      riskWeight: 8
    },
    {
      controlId: 'DE.CM-1',
      title: 'Network monitoring',
      description: 'The network is monitored to detect potential cybersecurity events',
      categoryId: 'detect',
      requirements: [
        'Network monitoring deployed',
        'Traffic analysis performed',
        'Intrusion detection active',
        'Log correlation enabled',
        '24/7 monitoring coverage'
      ],
      evidenceTypes: ['configuration', 'log_data', 'system_report'],
      automationLevel: 'full',
      implementationGuidance: 'Implement network detection and response (NDR) platform',
      testingProcedures: [
        'Verify monitoring coverage',
        'Test detection capabilities',
        'Review alert accuracy',
        'Check response times'
      ],
      riskWeight: 9
    },
    {
      controlId: 'DE.CM-3',
      title: 'Personnel activity monitoring',
      description: 'Personnel activity is monitored to detect potential cybersecurity events',
      categoryId: 'detect',
      requirements: [
        'User activity monitoring',
        'Privileged user monitoring',
        'Behavioral analytics',
        'Policy violation detection',
        'Privacy requirements met'
      ],
      evidenceTypes: ['configuration', 'log_data', 'system_report'],
      automationLevel: 'full',
      implementationGuidance: 'Deploy user and entity behavior analytics (UEBA)',
      testingProcedures: [
        'Review monitoring scope',
        'Test behavioral detection',
        'Verify privacy compliance',
        'Check alert quality'
      ],
      riskWeight: 8
    },
    {
      controlId: 'DE.CM-7',
      title: 'Unauthorized personnel and software monitoring',
      description: 'Monitoring for unauthorized personnel, connections, devices, and software is performed',
      categoryId: 'detect',
      requirements: [
        'Unauthorized access detection',
        'Rogue device detection',
        'Unauthorized software detection',
        'Real-time alerting',
        'Automated response capabilities'
      ],
      evidenceTypes: ['configuration', 'log_data', 'system_report'],
      automationLevel: 'full',
      implementationGuidance: 'Implement NAC and endpoint detection solutions',
      testingProcedures: [
        'Test unauthorized access',
        'Verify device detection',
        'Check software monitoring',
        'Review alert responses'
      ],
      riskWeight: 9
    },

    // RESPOND Function
    {
      controlId: 'RS.RP-1',
      title: 'Response plan execution',
      description: 'Response plan is executed during or after an incident',
      categoryId: 'respond',
      requirements: [
        'Incident response plan documented',
        'Response procedures defined',
        'Team roles assigned',
        'Communication plan established',
        'Regular plan testing'
      ],
      evidenceTypes: ['document', 'system_report', 'user_attestation'],
      automationLevel: 'partial',
      implementationGuidance: 'Develop and test incident response playbooks',
      testingProcedures: [
        'Review response plan',
        'Verify team readiness',
        'Test communication procedures',
        'Conduct tabletop exercises'
      ],
      riskWeight: 10
    },
    {
      controlId: 'RS.CO-1',
      title: 'Personnel incident response knowledge',
      description: 'Personnel know their roles and order of operations when a response is needed',
      categoryId: 'respond',
      requirements: [
        'Roles clearly defined',
        'Response training provided',
        'Contact information current',
        'Escalation procedures known',
        'Regular drills conducted'
      ],
      evidenceTypes: ['document', 'user_attestation', 'system_report'],
      automationLevel: 'manual',
      implementationGuidance: 'Establish incident response training program',
      testingProcedures: [
        'Interview response team',
        'Review training records',
        'Test escalation procedures',
        'Verify contact lists'
      ],
      riskWeight: 8
    },
    {
      controlId: 'RS.AN-1',
      title: 'Incident notification',
      description: 'Notifications from detection systems are investigated',
      categoryId: 'respond',
      requirements: [
        'Alert triage procedures',
        'Investigation workflows',
        'Evidence collection methods',
        'Timeline documentation',
        'False positive handling'
      ],
      evidenceTypes: ['system_report', 'log_data', 'document'],
      automationLevel: 'partial',
      implementationGuidance: 'Implement security orchestration and automated response',
      testingProcedures: [
        'Review triage procedures',
        'Test investigation process',
        'Verify evidence handling',
        'Check response times'
      ],
      riskWeight: 9
    },
    {
      controlId: 'RS.MI-1',
      title: 'Incident containment',
      description: 'Incidents are contained',
      categoryId: 'respond',
      requirements: [
        'Containment strategies defined',
        'Isolation capabilities ready',
        'Automated containment available',
        'Impact assessment performed',
        'Business continuity considered'
      ],
      evidenceTypes: ['system_report', 'configuration', 'log_data'],
      automationLevel: 'partial',
      implementationGuidance: 'Deploy automated containment with manual override',
      testingProcedures: [
        'Test containment procedures',
        'Verify isolation capabilities',
        'Review automation rules',
        'Check business impact'
      ],
      riskWeight: 9
    },

    // RECOVER Function
    {
      controlId: 'RC.RP-1',
      title: 'Recovery plan execution',
      description: 'Recovery plan is executed during or after a cybersecurity incident',
      categoryId: 'recover',
      requirements: [
        'Recovery procedures documented',
        'Restoration priorities defined',
        'Recovery time objectives set',
        'Testing schedule maintained',
        'Stakeholder communication plan'
      ],
      evidenceTypes: ['document', 'system_report', 'user_attestation'],
      automationLevel: 'partial',
      implementationGuidance: 'Develop comprehensive disaster recovery procedures',
      testingProcedures: [
        'Review recovery plans',
        'Test restoration procedures',
        'Verify RTO compliance',
        'Check communication plans'
      ],
      riskWeight: 9
    },
    {
      controlId: 'RC.IM-1',
      title: 'Recovery plan improvements',
      description: 'Recovery plans incorporate lessons learned',
      categoryId: 'recover',
      requirements: [
        'Post-incident reviews conducted',
        'Lessons learned documented',
        'Plan updates implemented',
        'Improvement tracking',
        'Stakeholder feedback gathered'
      ],
      evidenceTypes: ['document', 'system_report', 'user_attestation'],
      automationLevel: 'manual',
      implementationGuidance: 'Establish continuous improvement process for recovery',
      testingProcedures: [
        'Review post-incident reports',
        'Verify plan updates',
        'Check improvement tracking',
        'Interview stakeholders'
      ],
      riskWeight: 7
    },

    // GOVERN Function (New in v2.0)
    {
      controlId: 'GV.OC-1',
      title: 'Organizational context understanding',
      description: 'The organizational mission is understood and informs cybersecurity risk management',
      categoryId: 'govern',
      requirements: [
        'Mission alignment documented',
        'Risk appetite defined',
        'Strategic objectives considered',
        'Stakeholder requirements gathered',
        'Context regularly reviewed'
      ],
      evidenceTypes: ['document', 'user_attestation', 'system_report'],
      automationLevel: 'manual',
      implementationGuidance: 'Align cybersecurity strategy with business objectives',
      testingProcedures: [
        'Review strategic alignment',
        'Verify risk appetite',
        'Check stakeholder input',
        'Assess mission support'
      ],
      riskWeight: 8
    },
    {
      controlId: 'GV.RM-1',
      title: 'Risk management strategy',
      description: 'Risk management strategy is established, communicated, and monitored',
      categoryId: 'govern',
      requirements: [
        'Risk strategy documented',
        'Risk tolerance defined',
        'Risk processes established',
        'Performance metrics defined',
        'Regular strategy reviews'
      ],
      evidenceTypes: ['document', 'system_report', 'user_attestation'],
      automationLevel: 'partial',
      implementationGuidance: 'Develop enterprise risk management framework',
      testingProcedures: [
        'Review risk strategy',
        'Verify risk processes',
        'Check metrics tracking',
        'Test risk reporting'
      ],
      riskWeight: 9
    },
    {
      controlId: 'GV.SC-1',
      title: 'Supply chain risk management',
      description: 'Cyber supply chain risk management processes are established and monitored',
      categoryId: 'govern',
      requirements: [
        'Supplier risk assessments',
        'Contract security requirements',
        'Continuous monitoring',
        'Incident notification requirements',
        'Performance metrics tracked'
      ],
      evidenceTypes: ['document', 'system_report', 'user_attestation'],
      automationLevel: 'partial',
      implementationGuidance: 'Implement third-party risk management program',
      testingProcedures: [
        'Review supplier assessments',
        'Verify contract terms',
        'Check monitoring processes',
        'Test notification procedures'
      ],
      riskWeight: 8
    }
  ]
};