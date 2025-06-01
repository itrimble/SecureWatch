'use client';

import React from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

interface ActiveLogSourcesWidgetProps {
  count: string;
}

const ActiveLogSourcesWidget: React.FC<ActiveLogSourcesWidgetProps> = ({ count }) => {
  return (
    <div className="bg-gray-700 p-6 rounded-lg shadow-lg flex items-center space-x-4 hover:shadow-xl transition-shadow duration-300 ease-in-out">
      <div className="p-3 rounded-full mr-4 text-sky-400 bg-gray-800">
        <InformationCircleIcon className="h-8 w-8" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Active Log Sources</p>
        <p className="text-2xl md:text-3xl font-bold text-gray-100">{count}</p>
      </div>
    </div>
  );
};

export default ActiveLogSourcesWidget;
