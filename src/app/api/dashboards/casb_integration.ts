import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const mockData = {
    cloudAppRisks: [ // Renamed from cloudAppRiskMatrix and restructured
      {
        id: "Dropbox",
        data: [{ x: 75, y: 90, sensitivity: 80, users: 150, appName: "Dropbox" }]
      },
      {
        id: "Salesforce",
        data: [{ x: 40, y: 70, sensitivity: 95, users: 200, appName: "Salesforce" }]
      },
      {
        id: "Office 365",
        data: [{ x: 30, y: 95, sensitivity: 85, users: 5000, appName: "Office 365" }]
      },
      {
        id: "Slack",
        data: [{ x: 20, y: 80, sensitivity: 60, users: 4500, appName: "Slack" }]
      },
      {
        id: "AWS S3 (Public)", // More specific ID
        data: [{ x: 95, y: 50, sensitivity: 100, users: 50, appName: "AWS S3 (Public)" }]
      },
      {
         id: "UnknownApp1",
         data: [{ x: 90, y: 30, sensitivity: 50, users: 10, appName: "UnknownApp1" }]
      },
      {
         id: "LowRiskApp",
         data: [{ x: 10, y: 20, sensitivity: 30, users: 100, appName: "LowRiskApp" }]
      },
      // New risky app
      {
        id: "ShadyFileShare.com",
        data: [{ x: 95, y: 50, sensitivity: 70, users: 25, appName: "ShadyFileShare.com" }]
      }
    ],
    casbPolicyEnforcement: [
      { policyName: 'Block Public Sharing of Sensitive Data', app: 'Office 365', actionsTaken: 150, lastTriggered: '2023-10-26T10:00:00Z' },
      { policyName: 'Enforce MFA for High-Risk Apps', app: 'Salesforce', actionsTaken: 80, lastTriggered: '2023-10-26T11:30:00Z' },
      { policyName: 'Alert on Large Data Downloads', app: 'Dropbox', actionsTaken: 25, lastTriggered: '2023-10-25T15:00:00Z' },
      { policyName: 'Restrict Access from Unmanaged Devices', app: 'All', actionsTaken: 200, lastTriggered: '2023-10-26T09:00:00Z' },
      {
        // Simulating trends for fileSharingExposure.
        // The actual component would likely fetch time-series data for trends.
        // Here, we'll just modify the snapshot data to imply a recent worsening.
        fileSharingExposure: [
          { fileId: 'doc_xyz789', fileName: 'Financials_Q4_Internal.xlsx', app: 'Office 365', currentExposure: 'Shared Externally (Link)', recommendedAction: 'Remove public link', remediated: false, discoveryDate: '2023-10-01T10:00:00Z' },
          { fileId: 'report_abc123', fileName: 'Customer_List_Full.csv', app: 'Dropbox', currentExposure: 'Public (No Auth)', recommendedAction: 'Restrict to internal users', remediated: true, remediationDate: '2023-10-25T12:00:00Z', discoveryDate: '2023-09-15T10:00:00Z'},
          { fileId: 'presentation_def456', fileName: 'New_Product_Roadmap.pptx', app: 'Office 365', currentExposure: 'Shared with specific external users', recommendedAction: 'Review external users', remediated: false, discoveryDate: '2023-10-10T10:00:00Z' },
          // Add more recent, unremediated sensitive files publicly shared
          { fileId: 'research_alpha_v3', fileName: 'Project_Alpha_Phase3_Results.docx', app: 'UnknownCloudStorage', currentExposure: 'Public (No Auth)', recommendedAction: 'Block & Investigate App', remediated: false, discoveryDate: '2023-11-04T18:00:00Z' },
          { fileId: 'employee_ssn_list', fileName: 'Employee_SSN_Backup_2023.xlsx', app: 'ShadyFileShare.com', currentExposure: 'Public (Password Protected Zip - password "password123")', recommendedAction: 'Immediate Takedown & DLP Scan', remediated: false, discoveryDate: '2023-11-05T10:00:00Z' },

        ],
        // Add a conceptual trend field if the component were to use it for a specific chart:
        // This is a simplified representation. A real trend would be time-series data.
        fileSharingTrends: {
            publiclySharedSensitiveFiles: [
                { date: "2023-08-01", count: 5 },
                { date: "2023-09-01", count: 7 },
                { date: "2023-10-01", count: 6 },
                { date: "2023-11-01", count: 12 } // Upward trend
            ]
        }
      }
    ],
  };
  res.status(200).json(mockData);
}
