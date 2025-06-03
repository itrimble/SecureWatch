'use client';

import React from 'react';
import { FireIcon } from '@heroicons/react/24/outline'; // Example icon, could also use ChartBarIcon for more generic charts

const HeatmapsPlaceholder: React.FC = () => {
  return (
    <div className="bg-gray-800 p-6 md:p-8 rounded-lg shadow-xl text-center h-96 flex flex-col justify-center items-center">
      <FireIcon className="h-16 w-16 text-orange-500 mb-4" />
      <h3 className="text-xl font-semibold text-gray-100 mb-2">Advanced Heatmaps & Charts</h3>
      <p className="text-gray-400">This feature is coming soon!</p>
      <p className="text-sm text-gray-500 mt-2">Explore log data with intensity maps and other advanced charting options.</p>
    </div>
  );
};

export default HeatmapsPlaceholder;
