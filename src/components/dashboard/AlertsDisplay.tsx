'use client';

import React, { useState, useMemo } from 'react';

interface AlertItem {
  id: string;
  title: string;
  severity: 'High' | 'Medium' | 'Low';
  timestamp: string;
  description: string;
  status: 'New' | 'Acknowledged' | 'Resolved';
}

const mockAlertsData: AlertItem[] = [
  {
    id: '1',
    title: 'Potential Ransomware Activity',
    severity: 'High',
    timestamp: '2023-10-28 10:15:00 UTC',
    description: 'Multiple files encrypted rapidly on endpoint SRV01. Event IDs 4688 (process creation for unusual .exe) and multiple 4663 (file access) observed.',
    status: 'New',
  },
  {
    id: '2',
    title: 'Audit Log Cleared',
    severity: 'High',
    timestamp: '2023-10-28 09:30:00 UTC',
    description: 'The Windows Security Event Log was cleared on DC02 by user "administrator". Event ID 1102.',
    status: 'New',
  },
  {
    id: '3',
    title: 'Privilege Escalation Attempt',
    severity: 'Medium',
    timestamp: '2023-10-28 08:45:10 UTC',
    description: 'User "j.doe" added to "Domain Admins" group. Event ID 4728.',
    status: 'Acknowledged',
  },
  {
    id: '4',
    title: 'Multiple Failed Logons - User "admin"',
    severity: 'Medium',
    timestamp: '2023-10-28 07:12:00 UTC',
    description: 'Account "admin" has 25 failed logon attempts in the last 5 minutes from IP 192.168.1.101. Event ID 4625.',
    status: 'Resolved',
  },
  {
    id: '5',
    title: 'Unusual Logon Type Detected',
    severity: 'Low',
    timestamp: '2023-10-27 15:00:00 UTC',
    description: 'Interactive logon (Type 2) for service account "svc_backup" on WKSTN05. Event ID 4624.',
    status: 'New',
  },
  {
    id: '6',
    title: 'Anomalous Network Outbound Traffic',
    severity: 'Medium',
    timestamp: '2023-10-28 11:05:00 UTC',
    description: 'Endpoint CLIENT-PC-08 initiated connections to multiple known malicious IPs.',
    status: 'Acknowledged',
  }
];

const getSeverityClass = (severity: AlertItem['severity']) => {
  switch (severity) {
    case 'High': return 'bg-red-600 text-red-100';
    case 'Medium': return 'bg-yellow-500 text-yellow-100';
    case 'Low': return 'bg-sky-500 text-sky-100';
    default: return 'bg-gray-500 text-gray-100';
  }
};

const getStatusClass = (status: AlertItem['status']) => {
  switch (status) {
    case 'New': return 'text-red-400';
    case 'Acknowledged': return 'text-yellow-400';
    case 'Resolved': return 'text-green-400';
    default: return 'text-gray-400';
  }
};

type AlertStatusFilter = 'All' | 'New' | 'Acknowledged' | 'Resolved';

const AlertsDisplay: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<AlertStatusFilter>('All');

  const filteredAlerts = useMemo(() => {
    if (activeFilter === 'All') {
      return mockAlertsData;
    }
    return mockAlertsData.filter(alert => alert.status === activeFilter);
  }, [activeFilter]);

  const handleAcknowledge = (alertId: string, alertTitle: string) => {
    console.log(`Acknowledging alert ID: ${alertId}, Title: ${alertTitle}`);
    // Here you would typically update the alert's status in a real backend/state management
  };

  const handleResolve = (alertId: string, alertTitle: string) => {
    console.log(`Resolving alert ID: ${alertId}, Title: ${alertTitle}`);
    // Here you would typically update the alert's status
  };
  
  const filterButtons: { label: AlertStatusFilter, count: number }[] = [
    { label: 'All', count: mockAlertsData.length },
    { label: 'New', count: mockAlertsData.filter(a => a.status === 'New').length },
    { label: 'Acknowledged', count: mockAlertsData.filter(a => a.status === 'Acknowledged').length },
    { label: 'Resolved', count: mockAlertsData.filter(a => a.status === 'Resolved').length },
  ];

  return (
    <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl h-full flex flex-col">
      <h2 className="text-xl font-semibold text-gray-100 mb-4">Alerts Feed</h2>
      
      <div className="mb-4 flex space-x-2 border-b border-gray-700 pb-2">
        {filterButtons.map(filter => (
          <button
            key={filter.label}
            onClick={() => setActiveFilter(filter.label)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md focus:outline-none transition-colors
              ${activeFilter === filter.label 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
          >
            {filter.label} ({filter.count})
          </button>
        ))}
      </div>

      <div className="space-y-4 overflow-y-auto flex-grow custom-scrollbar pr-1">
        {filteredAlerts.length > 0 ? filteredAlerts.map((alert) => (
          <div key={alert.id} className="bg-gray-700 p-4 rounded-md shadow-md hover:shadow-lg transition-shadow duration-200">
            <div className="flex justify-between items-start mb-1">
              <h3 className="text-lg font-medium text-gray-100">{alert.title}</h3>
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getSeverityClass(alert.severity)}`}>
                {alert.severity}
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-2">{alert.timestamp}</p>
            <p className="text-sm text-gray-300 mb-3">{alert.description}</p>
            <div className="flex justify-between items-center">
                <span className={`text-sm font-medium ${getStatusClass(alert.status)}`}>
                  Status: {alert.status}
                </span>
                <div className="space-x-2">
                  {alert.status !== 'Resolved' && (
                    <button 
                      onClick={() => handleAcknowledge(alert.id, alert.title)}
                      disabled={alert.status === 'Acknowledged'}
                      className="px-2.5 py-1 text-xs bg-yellow-500 hover:bg-yellow-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}
                   {alert.status !== 'Resolved' && (
                    <button 
                      onClick={() => handleResolve(alert.id, alert.title)}
                      className="px-2.5 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors"
                    >
                      Resolve
                    </button>
                   )}
                </div>
            </div>
          </div>
        )) : (
            <p className="text-gray-400 text-center py-4">No alerts match the selected filter.</p>
        )}
      </div>
       {/* Simple CSS for custom scrollbar - to be placed in globals.css or a relevant CSS file if not already present */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1f2937; /* bg-gray-800 */
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #4b5563; /* bg-gray-600 */
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #556372; /* darker shade */
        }
      `}</style>
    </div>
  );
};

export default AlertsDisplay;
