import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const mockData = {
    userBehaviorHeatmap: [
      {
        id: "Alice",
        data: [
          { x: "2023-11-01", y: 25 }, { x: "2023-11-02", y: 30 }, { x: "2023-11-03", y: 10 },
          { x: "2023-11-04", y: 45 }, { x: "2023-11-05", y: 20 }
        ]
      },
      {
        id: "Bob",
        data: [
          { x: "2023-11-01", y: 60 }, { x: "2023-11-02", y: 55 }, { x: "2023-11-03", y: 70 },
          { x: "2023-11-04", y: 40 }, { x: "2023-11-05", y: 65 }
        ]
      },
      {
        id: "Charlie",
        data: [
          { x: "2023-11-01", y: 10 }, { x: "2023-11-02", y: 5 }, { x: "2023-11-03", y: 15 },
          { x: "2023-11-04", y: 20 }, { x: "2023-11-05", y: 12 }
        ]
      },
      {
        id: "IT Department",
        data: [
          { x: "2023-W44", y: 250 }, { x: "2023-W45", y: 280 }, { x: "2023-W46", y: 260 },
          { x: "2023-W47", y: 300 }, { x: "2023-W48", y: 270 }
        ]
      },
       {
        id: "Sales Team",
        data: [
          { x: "2023-W44", y: 150 }, { x: "2023-W45", y: 180 }, { x: "2023-W46", y: 160 },
          { x: "2023-W47", y: 190 }, { x: "2023-W48", y: 270 } // Sudden increase for Sales Team in W48
        ]
      }
    ],
    // dataAccessChordKeys remains the same or add new resource if needed.
    dataAccessChordKeys: ["Alice", "Bob", "Charlie", "AdminTool", "FinancialDB", "HRSystem", "CustomerDB", "ProjectX_Docs"],
    dataAccessChordMatrix: [
      // Alice, Bob, Charlie, AdminTool, FinancialDB, HRSystem, CustomerDB, ProjectX_Docs
      [0, 2, 1, 15, 35, 2, 8, 25],  // Alice: Increased FinancialDB access, new high access to ProjectX_Docs
      [2, 0, 0, 2, 20, 1, 5, 0],   // Bob
      [1, 0, 0, 1, 3, 0, 2, 0],    // Charlie
      [0, 0, 0, 0, 0, 0, 0, 0],    // AdminTool
      [0, 0, 0, 0, 0, 0, 0, 0],    // FinancialDB
      [0, 0, 0, 0, 0, 0, 0, 0],    // HRSystem
      [0, 0, 0, 0, 0, 0, 0, 0],    // CustomerDB
      [0, 0, 0, 0, 0, 0, 0, 0]     // ProjectX_Docs
    ],
    sessionEvents: [
      { "id": "evt0", "user": "Bob", "system": "Workstation_Bob", "action": "Logged In", "timestamp": "2023-11-05T08:00:00Z", "details": "IP: 10.1.1.5" },
      { "id": "evt1", "user": "Alice", "system": "Workstation_Alice", "action": "Logged In", "timestamp": "2023-11-05T09:00:00Z", "details": "IP: 88.99.100.101 (Unusual)" },
      { "id": "evt2", "user": "Alice", "system": "FinancialDB", "action": "Accessed Table 'Salaries'", "timestamp": "2023-11-05T09:15:00Z", "details": "Query: SELECT * FROM Salaries WHERE Department != 'Sales'" },
      { "id": "evt3", "user": "Alice", "system": "ProjectX_Docs", "action": "Accessed multiple files", "timestamp": "2023-11-05T09:25:00Z", "details": "Accessed: roadmap.docx, budget.xlsx, competitive_analysis.pptx" },
      { "id": "evt3a", "user": "Alice", "system": "Workstation_Alice", "action": "Copied files to USB", "timestamp": "2023-11-05T09:30:00Z", "details": "Files: budget.xlsx, competitive_analysis.pptx. USB Name: 'ALICE_TRANSFER'" },
      { "id": "evt4", "user": "Bob", "system": "AdminTool", "action": "Executed 'User_Create'", "timestamp": "2023-11-05T10:00:00Z", "details": "New user: 'dave'" },
      { "id": "evt5", "user": "Charlie", "system": "CustomerDB", "action": "Viewed Record", "timestamp": "2023-11-05T10:05:00Z", "details": "CustomerID: 789" },
      { "id": "evt5a", "user": "Alice", "system": "ExternalCloud.com", "action": "Uploaded data", "timestamp": "2023-11-05T10:15:00Z", "details": "Target: shadyfiles.cloud/alice_backup.zip, Size: 25MB" },
      { "id": "evt6", "user": "Alice", "system": "Workstation_Alice", "action": "Logged Out", "timestamp": "2023-11-05T11:00:00Z" },
      { "id": "evt7", "user": "Bob", "system": "HRSystem", "action": "Accessed 'Employee_Records'", "timestamp": "2023-11-05T10:30:00Z", "details": "Record ID: E123" },
    ],
  };
  res.status(200).json(mockData);
}
