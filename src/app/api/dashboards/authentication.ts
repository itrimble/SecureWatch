import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const mockData = {
    totalLogins: { successful: 10500, failed: 320 },
    orphanedAccountCount: 15,
    authAttemptsOverTime: [
      { time: '2023-10-01T00:00:00Z', windows: 100, linux: 50, macos: 20 },
      { time: '2023-10-01T01:00:00Z', windows: 110, linux: 55, macos: 22 },
      { time: '2023-10-01T02:00:00Z', windows: 105, linux: 52, macos: 21 },
      { time: '2023-10-01T03:00:00Z', windows: 115, linux: 58, macos: 23 },
      { time: '2023-10-01T04:00:00Z', windows: 120, linux: 60, macos: 24 },
    ],
    successVsFailureRates: [
      { application: 'WebApp1', successful: 2500, failed: 50 },
      { application: 'MobileApp', successful: 3000, failed: 120 },
      { application: 'API Gateway', successful: 4000, failed: 100 },
      { application: 'InternalTool', successful: 1000, failed: 50 },
    ],
    loginAttemptsByCountry: [
      { country: 'USA', attempts: 5000 },
      { country: 'India', attempts: 2000 },
      { country: 'UK', attempts: 1500 },
      { country: 'Canada', attempts: 1000 },
      { country: 'Germany', attempts: 800 },
    ],
    topUsersFailedLogins: [
      { userId: 'user123', failedAttempts: 15 },
      { userId: 'user456', failedAttempts: 12 },
      { userId: 'user789', failedAttempts: 10 },
      { userId: 'user101', failedAttempts: 9 },
      { userId: 'user112', failedAttempts: 8 },
      { userId: 'user131', failedAttempts: 7 },
      { userId: 'user415', failedAttempts: 6 },
      { userId: 'user161', failedAttempts: 5 },
      { userId: 'user718', failedAttempts: 4 },
      { userId: 'user191', failedAttempts: 3 },
    ],
    peakAuthTimes: [
      // ... previous peakAuthTimes (array of arrays) can be kept or removed if not used elsewhere
      [10, 20, 30, 40, 50, 60, 70],
      [15, 25, 35, 45, 55, 65, 75],
      [20, 30, 40, 50, 60, 70, 80],
      [25, 35, 45, 55, 65, 75, 85],
      [30, 40, 50, 60, 70, 80, 90],
    ],
    loginAttemptsGeo: [
      { name: "United States", value: [2500, 50] },
      { name: "China", value: [100, 800] },
      { name: "Germany", value: [1500, 50] },
      { name: "Brazil", value: [50, 250] },
      { name: "India", value: [1800, 120] },
      { name: "United Kingdom", value: [1200, 70] },
      { name: "Canada", value: [900, 40] },
      // Simulate brute-force from an unusual location
      { name: "Latvia", value: [2, 1500] }, // User 'admin' and 'root' attempts
      { name: "Vietnam", value: [1, 300] }, // Successful login for 'user_john' from a new country
      { name: "Nigeria", value: [20, 300] },
      { name: "Russia", value: [80, 400] },
      { name: "France", value: [1100, 60] },
    ],
    // peakAuthTimesHeatmap:
    // For the heatmap, ensure one day (e.g., Sunday) has high activity late at night.
    // Let's modify Sunday's data for hours 22:00 and 23:00.
    peakAuthTimesHeatmap: [
      { id: "Mon", data: Array.from({ length: 24 }, (_, i) => ({ x: `${String(i).padStart(2, '0')}:00`, y: Math.floor(Math.random() * 50) })) },
      { id: "Tue", data: Array.from({ length: 24 }, (_, i) => ({ x: `${String(i).padStart(2, '0')}:00`, y: Math.floor(Math.random() * 50) })) },
      { id: "Wed", data: Array.from({ length: 24 }, (_, i) => ({ x: `${String(i).padStart(2, '0')}:00`, y: Math.floor(Math.random() * 70) })) },
      { id: "Thu", data: Array.from({ length: 24 }, (_, i) => ({ x: `${String(i).padStart(2, '0')}:00`, y: Math.floor(Math.random() * 60) })) },
      { id: "Fri", data: Array.from({ length: 24 }, (_, i) => ({ x: `${String(i).padStart(2, '0')}:00`, y: Math.floor(Math.random() * 80) })) },
      { id: "Sat", data: Array.from({ length: 24 }, (_, i) => ({ x: `${String(i).padStart(2, '0')}:00`, y: Math.floor(Math.random() * 100) })) },
      { id: "Sun", data: Array.from({ length: 24 }, (_, i) => {
          let y_val = Math.floor(Math.random() * 90);
          if (i === 22 || i === 23) y_val = Math.floor(Math.random() * 50) + 150; // Spike late night Sunday
          return { x: `${String(i).padStart(2, '0')}:00`, y: y_val };
        })
      },
    ],
  };
  // Simulate spike in failed logins for authAttemptsOverTime
  // This assumes authAttemptsOverTime is still used or its underlying data source for charts.
  // Let's add a spike to the original data for demonstration if it's used directly.
  // For simplicity, this example directly modifies the mockData object.
  // A more robust solution would involve a function to generate this data.
  if (mockData.authAttemptsOverTime && mockData.authAttemptsOverTime.length >= 5) {
    mockData.authAttemptsOverTime[2].windows += 200; // Spike in failed Windows logins at 3rd data point
    mockData.authAttemptsOverTime[2].linux += 100; // Spike in failed Linux logins
  }

  // Reflect brute-force in topFailedLogins
  // Add 'admin' and 'root' from Latvia to top of failed logins
  const bruteForceUsers = [
    { userId: 'admin (Latvia)', failedAttempts: 750 },
    { userId: 'root (Latvia)', failedAttempts: 745 },
  ];
  mockData.topUsersFailedLogins = [...bruteForceUsers, ...mockData.topUsersFailedLogins.slice(0, 8)];
  mockData.totalLogins.failed += 1500; // Approximate reflection in total

  res.status(200).json(mockData);
}
