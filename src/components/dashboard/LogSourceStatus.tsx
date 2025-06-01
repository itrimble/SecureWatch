'use client';

import React from 'react';
import type { LogSource, LogSourceStatusDetails } from '@/lib/types/log_sources';

interface LogSourceStatusProps {
  sourceId: string | null;
  sources: LogSource[];
  statuses: Record<string, LogSourceStatusDetails>;
}

const LogSourceStatus: React.FC<LogSourceStatusProps> = ({ sourceId, sources, statuses }) => {
  if (!sourceId) {
    return (
      <div className="p-4 bg-gray-700 rounded-lg shadow-lg">
        <h4 className="text-md font-semibold text-gray-200 mb-3">No Log Source Selected</h4>
        <p className="text-sm text-gray-400">Please select a log source to view its status.</p>
      </div>
    );
  }

  const currentSource = sources.find(s => s.id === sourceId);
  const statusDetails = statuses[sourceId];

  if (!currentSource || !statusDetails) {
    return (
      <div className="p-4 bg-gray-700 rounded-lg shadow-lg">
        <h4 className="text-md font-semibold text-red-400 mb-3">Error</h4>
        <p className="text-sm text-gray-400">
          Selected log source details could not be found. (ID: {sourceId})
        </p>
      </div>
    );
  }

  let statusColorClass = 'text-gray-400'; // Default for Pending
  if (statusDetails.status === 'Connected') {
    statusColorClass = 'text-green-400';
  } else if (statusDetails.status === 'Error') {
    statusColorClass = 'text-red-400';
  } else if (statusDetails.status === 'Disconnected') {
    statusColorClass = 'text-yellow-400';
  }


  return (
    <div className="p-4 bg-gray-700 rounded-lg shadow-lg">
      <h4 className="text-md font-semibold text-gray-200 mb-3">
        Status for: <span className="font-bold">{currentSource.name}</span>
      </h4>
      <p className="text-xs text-gray-400 mb-1">Type: {currentSource.type}</p>
      <p className="text-xs text-gray-500 mb-3">ID: {currentSource.id}</p>
      
      <ul className="space-y-2 text-sm">
        <li>
          Status:{' '}
          <span className={`font-semibold ${statusColorClass}`}>
            {statusDetails.status}
          </span>
        </li>
        <li>
          Last Seen:{' '}
          <span className="text-gray-300">
            {statusDetails.lastSeen ? new Date(statusDetails.lastSeen).toLocaleString() : 'N/A'}
          </span>
        </li>
        <li>
          Events Ingested:{' '}
          <span className="text-gray-300">
            {statusDetails.eventsIngested.toLocaleString()}
          </span>
        </li>
        <li>
          Collector Errors:{' '}
          <span className={statusDetails.errorCount > 0 ? 'text-red-400' : 'text-green-400'}>
            {statusDetails.errorCount}
          </span>
        </li>
        {statusDetails.details && (
          <li>
            Details: <span className="text-gray-300">{statusDetails.details}</span>
          </li>
        )}
      </ul>
    </div>
  );
};

export default LogSourceStatus;
