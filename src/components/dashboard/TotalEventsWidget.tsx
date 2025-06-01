import React from 'react';
import { DocumentChartBarIcon } from '@heroicons/react/24/outline';

const TotalEventsWidget: React.FC = () => {
  return (
    <div className="bg-gray-700 p-6 rounded-lg shadow-lg flex items-center space-x-4">
      <div className="p-3 bg-blue-500 rounded-full">
        <DocumentChartBarIcon className="h-8 w-8 text-white" />
      </div>
      <div>
        <h2 className="text-3xl font-bold text-white">15,789</h2>
        <p className="text-gray-300">Total Events</p>
      </div>
    </div>
  );
};

export default TotalEventsWidget;
