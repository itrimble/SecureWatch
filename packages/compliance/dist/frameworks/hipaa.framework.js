"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HIPAAFramework = void 0;
exports.HIPAAFramework = {
    type: 'HIPAA',
    name: 'Health Insurance Portability and Accountability Act',
    version: '2013', // HIPAA Omnibus Rule
    description: 'HIPAA establishes national standards to protect individuals\' electronic personal health information that is created, received, used, or maintained by a covered entity.',
    categories: [
        {
            name: 'Administrative Safeguards',
            description: 'Administrative actions, policies, and procedures to manage the selection, development, implementation, and maintenance of security measures',
            order: 1
        },
        {
            name: 'Physical Safeguards',
            description: 'Physical measures, policies, and procedures to protect electronic information systems and related buildings and equipment',
            order: 2
        },
        {
            name: 'Technical Safeguards',
            description: 'Technology and the policy and procedures for its use that protect electronic protected health information',
            order: 3
        },
        {
            name: 'Organizational Requirements',
            description: 'Standards for business associate contracts and other arrangements',
            order: 4
        },
        {
            name: 'Policies and Procedures',
            description: 'Documentation requirements for policies and procedures',
            order: 5
        }
    ],
    controls: [
        // Administrative Safeguards
        {
            controlId: '164.308(a)(1)',
            title: 'Security Officer',
            description: 'Identify the security official responsible for developing and implementing security policies and procedures',
            categoryId: 'administrative-safeguards',
            requirements: [
                'Security officer designated',
                'Responsibilities documented',
                'Authority to implement security measures',
                'Direct reporting to senior management'
            ],
            evidenceTypes: ['document', 'user_attestation', 'configuration'],
            automationLevel: 'manual',
            implementationGuidance: 'Designate a qualified individual as security officer with clear responsibilities and authority',
            testingProcedures: [
                'Review security officer designation',
                'Verify job description includes HIPAA responsibilities',
                'Interview security officer about duties',
                'Review organizational chart'
            ],
            riskWeight: 9
        },
        {
            controlId: '164.308(a)(2)',
            title: 'Workforce Training',
            description: 'Implement a security awareness and training program for all workforce members',
            categoryId: 'administrative-safeguards',
            requirements: [
                'Initial security training for new employees',
                'Periodic security updates',
                'Training documentation maintained',
                'Training effectiveness measured'
            ],
            evidenceTypes: ['system_report', 'document', 'user_attestation'],
            automationLevel: 'partial',
            implementationGuidance: 'Develop comprehensive training program covering all aspects of HIPAA security',
            testingProcedures: [
                'Review training materials',
                'Verify training completion records',
                'Test employee knowledge',
                'Review training effectiveness metrics'
            ],
            riskWeight: 8
        },
        {
            controlId: '164.308(a)(3)',
            title: 'Workforce Access Management',
            description: 'Implement procedures for authorization and/or supervision of workforce members who work with ePHI',
            categoryId: 'administrative-safeguards',
            requirements: [
                'Access authorization procedures',
                'Workforce clearance procedures',
                'Termination procedures',
                'Access review and recertification'
            ],
            evidenceTypes: ['configuration', 'access_review', 'system_report'],
            automationLevel: 'full',
            implementationGuidance: 'Implement role-based access control with regular access reviews',
            testingProcedures: [
                'Review access authorization procedures',
                'Test access provisioning process',
                'Verify termination procedures',
                'Review access certification results'
            ],
            riskWeight: 10
        },
        {
            controlId: '164.308(a)(4)',
            title: 'Information Access Management',
            description: 'Implement policies and procedures for authorizing access to ePHI',
            categoryId: 'administrative-safeguards',
            requirements: [
                'Access authorization based on role',
                'Minimum necessary standard applied',
                'Access modification procedures',
                'Isolation of healthcare clearinghouse functions'
            ],
            evidenceTypes: ['configuration', 'system_report', 'access_review'],
            automationLevel: 'full',
            implementationGuidance: 'Implement granular access controls based on job responsibilities',
            testingProcedures: [
                'Review role definitions',
                'Test access controls',
                'Verify minimum necessary implementation',
                'Review access logs'
            ],
            riskWeight: 10
        },
        {
            controlId: '164.308(a)(5)',
            title: 'Security Awareness and Training',
            description: 'Implement security awareness and training program for all workforce members',
            categoryId: 'administrative-safeguards',
            requirements: [
                'Security reminders distributed',
                'Protection from malicious software training',
                'Log-in monitoring procedures',
                'Password management training'
            ],
            evidenceTypes: ['document', 'system_report', 'configuration'],
            automationLevel: 'partial',
            implementationGuidance: 'Provide ongoing security awareness through multiple channels',
            testingProcedures: [
                'Review security reminder distribution',
                'Test malware protection awareness',
                'Verify log-in monitoring',
                'Review password policy training'
            ],
            riskWeight: 7
        },
        {
            controlId: '164.308(a)(6)',
            title: 'Security Incident Procedures',
            description: 'Implement procedures to address security incidents',
            categoryId: 'administrative-safeguards',
            requirements: [
                'Incident response procedures documented',
                'Incident reporting mechanisms',
                'Incident tracking and documentation',
                'Post-incident review process'
            ],
            evidenceTypes: ['document', 'system_report', 'log_data'],
            automationLevel: 'partial',
            implementationGuidance: 'Establish formal incident response program with clear escalation procedures',
            testingProcedures: [
                'Review incident response procedures',
                'Test incident reporting',
                'Review incident logs',
                'Verify post-incident reviews'
            ],
            riskWeight: 9
        },
        {
            controlId: '164.308(a)(7)',
            title: 'Contingency Plan',
            description: 'Establish policies and procedures for responding to emergency or other occurrence',
            categoryId: 'administrative-safeguards',
            requirements: [
                'Data backup plan',
                'Disaster recovery plan',
                'Emergency mode operation plan',
                'Testing and revision procedures',
                'Applications and data criticality analysis'
            ],
            evidenceTypes: ['document', 'system_report', 'configuration'],
            automationLevel: 'partial',
            implementationGuidance: 'Develop comprehensive contingency plan with regular testing',
            testingProcedures: [
                'Review backup procedures',
                'Test disaster recovery',
                'Verify emergency procedures',
                'Review criticality analysis'
            ],
            riskWeight: 10
        },
        {
            controlId: '164.308(a)(8)',
            title: 'Evaluation',
            description: 'Perform periodic technical and nontechnical evaluation of security measures',
            categoryId: 'administrative-safeguards',
            requirements: [
                'Regular security assessments',
                'Response to environmental changes',
                'Documentation of evaluations',
                'Remediation of findings'
            ],
            evidenceTypes: ['document', 'system_report', 'scan_result'],
            automationLevel: 'partial',
            implementationGuidance: 'Conduct annual security risk assessments and ongoing evaluations',
            testingProcedures: [
                'Review assessment schedule',
                'Verify assessment scope',
                'Review findings and remediation',
                'Test corrective actions'
            ],
            riskWeight: 8
        },
        // Physical Safeguards
        {
            controlId: '164.310(a)(1)',
            title: 'Facility Access Controls',
            description: 'Limit physical access to electronic information systems and facilities',
            categoryId: 'physical-safeguards',
            requirements: [
                'Contingency operations procedures',
                'Facility security plan',
                'Access control and validation procedures',
                'Maintenance records'
            ],
            evidenceTypes: ['configuration', 'system_report', 'document'],
            automationLevel: 'partial',
            implementationGuidance: 'Implement physical access controls with monitoring and logging',
            testingProcedures: [
                'Test physical access controls',
                'Review access logs',
                'Verify visitor procedures',
                'Review maintenance records'
            ],
            riskWeight: 8
        },
        {
            controlId: '164.310(b)(1)',
            title: 'Workstation Use',
            description: 'Implement policies and procedures for proper workstation use',
            categoryId: 'physical-safeguards',
            requirements: [
                'Workstation use policies',
                'Physical safeguards for workstations',
                'Automatic logoff implemented',
                'Screen privacy filters where appropriate'
            ],
            evidenceTypes: ['configuration', 'document', 'system_report'],
            automationLevel: 'partial',
            implementationGuidance: 'Define and enforce workstation security standards',
            testingProcedures: [
                'Review workstation policies',
                'Test automatic logoff',
                'Verify physical safeguards',
                'Inspect workstation setups'
            ],
            riskWeight: 6
        },
        {
            controlId: '164.310(c)(1)',
            title: 'Workstation Security',
            description: 'Implement physical safeguards for all workstations that access ePHI',
            categoryId: 'physical-safeguards',
            requirements: [
                'Physical security measures',
                'Cable locks or secured locations',
                'Restricted access to workstation areas',
                'Inventory management'
            ],
            evidenceTypes: ['configuration', 'document', 'system_report'],
            automationLevel: 'manual',
            implementationGuidance: 'Secure all workstations physically and maintain inventory',
            testingProcedures: [
                'Inspect workstation security',
                'Verify inventory accuracy',
                'Test physical controls',
                'Review access restrictions'
            ],
            riskWeight: 7
        },
        {
            controlId: '164.310(d)(1)',
            title: 'Device and Media Controls',
            description: 'Implement policies for receipt and removal of hardware and electronic media',
            categoryId: 'physical-safeguards',
            requirements: [
                'Disposal procedures',
                'Media re-use procedures',
                'Accountability tracking',
                'Data backup and storage'
            ],
            evidenceTypes: ['document', 'system_report', 'log_data'],
            automationLevel: 'partial',
            implementationGuidance: 'Establish media handling procedures with tracking and verification',
            testingProcedures: [
                'Review disposal procedures',
                'Test media sanitization',
                'Verify tracking logs',
                'Review backup procedures'
            ],
            riskWeight: 9
        },
        // Technical Safeguards
        {
            controlId: '164.312(a)(1)',
            title: 'Access Control',
            description: 'Implement technical policies and procedures for electronic information systems',
            categoryId: 'technical-safeguards',
            requirements: [
                'Unique user identification',
                'Automatic logoff',
                'Encryption and decryption',
                'Access control mechanisms'
            ],
            evidenceTypes: ['configuration', 'system_report', 'log_data'],
            automationLevel: 'full',
            implementationGuidance: 'Implement comprehensive access control system with encryption',
            testingProcedures: [
                'Test user authentication',
                'Verify automatic logoff',
                'Test encryption implementation',
                'Review access controls'
            ],
            riskWeight: 10
        },
        {
            controlId: '164.312(b)',
            title: 'Audit Controls',
            description: 'Implement hardware, software, and procedural mechanisms to record and examine activity',
            categoryId: 'technical-safeguards',
            requirements: [
                'Audit log capabilities',
                'Log review procedures',
                'Log retention policies',
                'Log integrity protection'
            ],
            evidenceTypes: ['log_data', 'system_report', 'configuration'],
            automationLevel: 'full',
            implementationGuidance: 'Implement comprehensive logging with automated analysis',
            testingProcedures: [
                'Review audit log configuration',
                'Test log completeness',
                'Verify log protection',
                'Review log analysis reports'
            ],
            riskWeight: 9
        },
        {
            controlId: '164.312(c)(1)',
            title: 'Integrity',
            description: 'Implement policies and procedures to protect ePHI from improper alteration or destruction',
            categoryId: 'technical-safeguards',
            requirements: [
                'Data integrity controls',
                'Electronic signature mechanisms',
                'Version control',
                'Change detection'
            ],
            evidenceTypes: ['configuration', 'system_report', 'log_data'],
            automationLevel: 'full',
            implementationGuidance: 'Implement integrity controls including checksums and digital signatures',
            testingProcedures: [
                'Test integrity controls',
                'Verify change detection',
                'Review version control',
                'Test data validation'
            ],
            riskWeight: 9
        },
        {
            controlId: '164.312(d)',
            title: 'Person or Entity Authentication',
            description: 'Implement procedures to verify person or entity seeking access to ePHI',
            categoryId: 'technical-safeguards',
            requirements: [
                'Strong authentication mechanisms',
                'Multi-factor authentication where appropriate',
                'Authentication management procedures',
                'Password complexity requirements'
            ],
            evidenceTypes: ['configuration', 'system_report', 'log_data'],
            automationLevel: 'full',
            implementationGuidance: 'Implement strong authentication with MFA for remote access',
            testingProcedures: [
                'Test authentication mechanisms',
                'Verify MFA implementation',
                'Review password policies',
                'Test account management'
            ],
            riskWeight: 10
        },
        {
            controlId: '164.312(e)(1)',
            title: 'Transmission Security',
            description: 'Implement technical security measures to guard against unauthorized access during transmission',
            categoryId: 'technical-safeguards',
            requirements: [
                'Integrity controls for transmission',
                'Encryption for data in transit',
                'Secure communication protocols',
                'VPN for remote access'
            ],
            evidenceTypes: ['configuration', 'network_capture', 'system_report'],
            automationLevel: 'full',
            implementationGuidance: 'Encrypt all ePHI transmissions using approved protocols',
            testingProcedures: [
                'Test encryption in transit',
                'Verify secure protocols',
                'Review VPN configuration',
                'Test transmission integrity'
            ],
            riskWeight: 10
        },
        // Organizational Requirements
        {
            controlId: '164.314(a)(1)',
            title: 'Business Associate Contracts',
            description: 'Implement requirements for contracts with business associates',
            categoryId: 'organizational-requirements',
            requirements: [
                'Written contracts or agreements',
                'Security requirements specified',
                'Breach notification procedures',
                'Subcontractor requirements'
            ],
            evidenceTypes: ['document', 'user_attestation'],
            automationLevel: 'manual',
            implementationGuidance: 'Establish standard BAA template and tracking system',
            testingProcedures: [
                'Review BAA template',
                'Verify all BAs have agreements',
                'Review subcontractor provisions',
                'Test breach notification process'
            ],
            riskWeight: 9
        },
        {
            controlId: '164.314(b)(1)',
            title: 'Requirements for Group Health Plans',
            description: 'Implement requirements for group health plan documents',
            categoryId: 'organizational-requirements',
            requirements: [
                'Plan documents updated',
                'Separation requirements',
                'Certification requirements',
                'Adequate safeguards'
            ],
            evidenceTypes: ['document', 'configuration'],
            automationLevel: 'manual',
            implementationGuidance: 'Ensure health plan documents include required security provisions',
            testingProcedures: [
                'Review plan documents',
                'Verify separation controls',
                'Review certifications',
                'Test safeguards'
            ],
            riskWeight: 7
        },
        // Policies and Procedures
        {
            controlId: '164.316(a)',
            title: 'Policies and Procedures',
            description: 'Implement reasonable and appropriate policies and procedures',
            categoryId: 'policies-procedures',
            requirements: [
                'Written policies and procedures',
                'Regular review and updates',
                'Change management process',
                'Version control'
            ],
            evidenceTypes: ['document', 'system_report'],
            automationLevel: 'partial',
            implementationGuidance: 'Maintain comprehensive policy framework with regular reviews',
            testingProcedures: [
                'Review policy completeness',
                'Verify update schedule',
                'Test change process',
                'Review version control'
            ],
            riskWeight: 8
        },
        {
            controlId: '164.316(b)(1)',
            title: 'Documentation',
            description: 'Maintain written documentation of policies and procedures',
            categoryId: 'policies-procedures',
            requirements: [
                'Documentation retention for 6 years',
                'Availability to authorized persons',
                'Review and update procedures',
                'Time and date recording'
            ],
            evidenceTypes: ['document', 'system_report'],
            automationLevel: 'partial',
            implementationGuidance: 'Implement document management system with retention controls',
            testingProcedures: [
                'Review retention compliance',
                'Test document accessibility',
                'Verify timestamps',
                'Review update history'
            ],
            riskWeight: 7
        }
    ]
};
//# sourceMappingURL=hipaa.framework.js.map