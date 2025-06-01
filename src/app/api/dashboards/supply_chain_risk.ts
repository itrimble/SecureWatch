import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const mockData = {
    vendorAssessmentStatus: [
      { vendor: 'VendorA', service: 'Payment Gateway', sbomValidated: true, cvssScore: 7.5, sbomValidationScore: "High (90%)", avgCvssScore: "7.5 (High)", lastAssessment: '2023-09-15' },
      { vendor: 'VendorB', service: 'Analytics SDK', sbomValidated: false, cvssScore: 9.2, sbomValidationScore: "Low (30%)", avgCvssScore: "8.5 (High)", lastAssessment: '2023-08-20' }, // Modified
      { vendor: 'VendorC', service: 'Cloud Storage', sbomValidated: true, cvssScore: 5.0, sbomValidationScore: "Medium (60%)", avgCvssScore: "5.0 (Medium)", lastAssessment: '2023-10-01' },
      { vendor: 'VendorD', service: 'Auth Library', sbomValidated: false, cvssScore: 8.1, sbomValidationScore: "Not Assessed", avgCvssScore: "8.1 (High)", lastAssessment: '2023-07-10' },
    ],
    buildPipelineSecurityAlerts: [
      { id: "alert1", timestamp: '2023-10-26T10:00:00Z', pipeline: 'WebApp CI/CD', alertType: 'Unapproved Dependency', description: 'Dependency left-pad@1.3.0 introduced. Policy requires approval for new dependencies.', dependencyName: 'left-pad@1.3.0', severity: 'Medium' },
      { id: "alert2", timestamp: '2023-10-26T11:15:00Z', pipeline: 'MobileApp Build', alertType: 'CI/CD Integrity Failure', description: 'Tampered build script detected (hash mismatch for build.sh).', details: 'Hash mismatch for build.sh', severity: 'Critical' },
      { id: "alert3", timestamp: '2023-11-05T14:00:00Z', pipeline: 'WebApp_Prod_Build_101', alertType: 'Vulnerable Dependency', description: "Dependency 'vulnerable-lib-1.2.3' with known RCE (CVE-2023-12345) detected.", component: 'vulnerable-lib-1.2.3 (CVE-2023-12345)', severity: 'High' }, // New alert
      { id: "alert4", timestamp: '2023-10-26T12:30:00Z', pipeline: 'API Gateway Deploy', alertType: 'Vulnerable Component', description: 'Component log4j@2.14.1 detected, known vulnerabilities exist.', component: 'log4j:2.14.1', severity: 'High' },
    ],
    complianceMappingStatus: [
      { standard: 'SLSA', requirement: 'Source Verification', status: 'Achieved', gaps: 0 },
      { standard: 'SLSA', requirement: 'Build Integrity', status: 'Partial', gaps: 2 },
      { standard: 'NIST SSDF', requirement: 'Protect Software', status: 'Achieved', gaps: 0 },
      { standard: 'NIST SSDF', requirement: 'Produce Well-Secured Software', status: 'In Progress', gaps: 5 },
      { standard: 'ISO 27001', requirement: 'A.14.2.1 Secure development policy', status: 'Achieved', gaps: 0 },
    ],
  };
  res.status(200).json(mockData);
}
