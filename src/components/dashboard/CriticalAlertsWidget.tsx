import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const CriticalAlertsWidget: React.FC = () => {
  return (
    <div className="bg-gray-700 p-6 rounded-lg shadow-lg flex items-center space-x-4">
      <div className="p-3 bg-red-500 rounded-full">
        <ExclamationTriangleIcon className="h-8 w-8 text-white" />
      </div>
      <div>
        <h2 className="text-3xl font-bold text-white">23</h2>
        <p className="text-gray-300">Critical Alerts</p>
      </div>
    </div>
  );
};

export default CriticalAlertsWidget;
