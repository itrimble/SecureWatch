'use client';

import React, { useState } from 'react';
import { PlusCircleIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';

type LogSourceType = 'Windows' | 'Linux' | 'macOS' | 'Firewall' | 'Cloud Service';
type LogSourceStatus = 'Connected' | 'Disabled' | 'Error' | 'Pending';

interface LogSourceItem {
  id: string;
  name: string;
  type: LogSourceType;
  status: LogSourceStatus;
  lastEventTime?: string; // Optional
}

const mockLogSources: LogSourceItem[] = [
  { id: 'ls001', name: 'Windows Server DC01', type: 'Windows', status: 'Connected', lastEventTime: '2023-10-28 14:30:00 UTC' },
  { id: 'ls002', name: 'Ubuntu Web Server (AWS)', type: 'Linux', status: 'Connected', lastEventTime: '2023-10-28 14:32:10 UTC' },
  { id: 'ls003', name: 'macOS Endpoint - Design Team', type: 'macOS', status: 'Error', lastEventTime: '2023-10-27 10:00:00 UTC' },
  { id: 'ls004', name: 'Palo Alto Firewall - Edge', type: 'Firewall', status: 'Disabled', lastEventTime: '2023-10-25 00:00:00 UTC' },
  { id: 'ls005', name: 'Azure Event Hub', type: 'Cloud Service', status: 'Pending' },
];

const getStatusClass = (status: LogSourceStatus) => {
  switch (status) {
    case 'Connected': return 'bg-green-500 text-green-100';
    case 'Disabled': return 'bg-gray-500 text-gray-100';
    case 'Error': return 'bg-red-500 text-red-100';
    case 'Pending': return 'bg-yellow-500 text-yellow-100';
    default: return 'bg-gray-400 text-gray-800';
  }
};

const LogSourceManagement: React.FC = () => {
  const [logSources, setLogSources] = useState<LogSourceItem[]>(mockLogSources);

  const handleAddNewSource = () => {
    console.log("Action: Add New Log Source");
    // This would typically open a modal or form
  };

  const handleEditSource = (sourceId: string, sourceName: string) => {
    console.log(`Action: Edit Log Source ID: ${sourceId}, Name: ${sourceName}`);
  };

  const handleRemoveSource = (sourceId: string, sourceName: string) => {
    console.log(`Action: Remove Log Source ID: ${sourceId}, Name: ${sourceName}`);
    setLogSources(prev => prev.filter(source => source.id !== sourceId));
  };

  return (
    <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl">
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-700">
        <h2 className="text-xl font-semibold text-gray-100">Log Source Management</h2>
        <button
          onClick={handleAddNewSource}
          className="flex items-center px-3 py-2 bg-blue-600 text-white font-medium text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 transition duration-150"
        >
          <PlusCircleIcon className="h-5 w-5 mr-2" />
          Add New Log Source
        </button>
      </div>

      {logSources.length === 0 ? (
        <p className="text-gray-400 text-center py-4">No log sources configured.</p>
      ) : (
        <div className="space-y-3">
          {logSources.map((source) => (
            <div key={source.id} className="bg-gray-700 p-4 rounded-md shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row justify-between sm:items-center">
              <div className="mb-2 sm:mb-0">
                <h3 className="text-md font-semibold text-gray-100">{source.name}</h3>
                <p className="text-xs text-gray-400">Type: {source.type}</p>
                {source.lastEventTime && <p className="text-xs text-gray-500">Last Event: {source.lastEventTime}</p>}
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${getStatusClass(source.status)}`}>
                  {source.status}
                </span>
                <button 
                  onClick={() => handleEditSource(source.id, source.name)}
                  className="p-1.5 text-gray-400 hover:text-blue-400 transition-colors" 
                  title="Edit/Configure"
                >
                  <PencilSquareIcon className="h-5 w-5" />
                </button>
                <button 
                  onClick={() => handleRemoveSource(source.id, source.name)}
                  className="p-1.5 text-gray-400 hover:text-red-400 transition-colors" 
                  title="Remove"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LogSourceManagement;
