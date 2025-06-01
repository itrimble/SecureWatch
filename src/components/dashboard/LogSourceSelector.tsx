'use client';

import React, { useState, useEffect } from 'react';
import LogSourceStatus from './LogSourceStatus';
import type { LogSource, LogSourceStatusDetails } from '@/lib/types/log_sources';

// Define a type for the status values for clarity
type StatusValue = LogSourceStatusDetails['status'];

const MOCK_LOG_SOURCES: LogSource[] = [
  { id: 'raspberrypi-01', name: 'Raspberry Pi 01', type: 'RaspberryPi' },
  { id: 'varlog-syslog-prod', name: 'Prod Server /var/log/syslog', type: 'LinuxVarLog' },
  { id: 'windows-dc-01', name: 'Domain Controller 01', type: 'WindowsEventLog' },
  { id: 'custom-app-alpha', name: 'Custom App Alpha', type: 'CustomApp' },
];

const MOCK_LOG_STATUS: Record<string, LogSourceStatusDetails> = {
  'raspberrypi-01': {
    id: 'raspberrypi-01',
    status: 'Connected',
    lastSeen: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 mins ago
    eventsIngested: 1024,
    errorCount: 0,
    details: 'Monitoring system logs and sensor data.',
  },
  'varlog-syslog-prod': {
    id: 'varlog-syslog-prod',
    status: 'Disconnected',
    lastSeen: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    eventsIngested: 500000,
    errorCount: 2,
    details: 'Connection lost. Last error: Timeout.',
  },
  'windows-dc-01': {
    id: 'windows-dc-01',
    status: 'Error',
    lastSeen: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 mins ago
    eventsIngested: 120,
    errorCount: 15,
    details: 'Failed to parse event batch. Check collector configuration.',
  },
  'custom-app-alpha': {
    id: 'custom-app-alpha',
    status: 'Pending',
    lastSeen: new Date().toISOString(),
    eventsIngested: 0,
    errorCount: 0,
    details: 'Awaiting first log entry.',
  }
};


const StatusIndicator: React.FC<{ status: StatusValue | undefined }> = ({ status }) => {
  let bgColor = 'bg-gray-400'; // Default for Pending or undefined
  if (status === 'Connected') {
    bgColor = 'bg-green-500';
  } else if (status === 'Error') {
    bgColor = 'bg-red-500';
  } else if (status === 'Disconnected') {
    bgColor = 'bg-yellow-500'; // Changed for better visibility than gray
  }
  return (
    <span className={`w-3 h-3 ${bgColor} rounded-full inline-block mr-2`} title={status || 'Status Unknown'}></span>
  );
};

const LogSourceSelector: React.FC = () => {
  const [logSourcesData, setLogSourcesData] = useState<LogSource[]>([]);
  const [logSourcesStatus, setLogSourcesStatus] = useState<Record<string, LogSourceStatusDetails>>({});
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);

  useEffect(() => {
    // Simulate fetching initial log source configurations and their statuses
    setLogSourcesData(MOCK_LOG_SOURCES);
    setLogSourcesStatus(MOCK_LOG_STATUS);
    // Select the first source by default if available
    if (MOCK_LOG_SOURCES.length > 0) {
      setSelectedSourceId(MOCK_LOG_SOURCES[0].id);
    }
  }, []);

  return (
    <div className="bg-gray-800 text-white p-4 rounded-lg shadow-lg mb-6">
      <div className="flex border-b border-gray-700 mb-4 overflow-x-auto">
        {logSourcesData.map((source) => (
          <button
            key={source.id}
            onClick={() => setSelectedSourceId(source.id)}
            className={`py-2 px-4 -mb-px text-sm font-medium focus:outline-none flex items-center whitespace-nowrap
                        ${
                          selectedSourceId === source.id
                            ? 'border-blue-500 border-b-2 text-blue-400'
                            : 'border-transparent hover:border-gray-600 hover:text-gray-300 text-gray-400'
                        }`}
          >
            <StatusIndicator status={logSourcesStatus[source.id]?.status} />
            {source.name}
          </button>
        ))}
      </div>
      <div>
        <LogSourceStatus sourceId={selectedSourceId} sources={logSourcesData} statuses={logSourcesStatus} />
      </div>
    </div>
  );
};

export default LogSourceSelector;
