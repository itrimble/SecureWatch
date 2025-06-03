'use client';

import React from 'react';
import { ShareIcon } from '@heroicons/react/24/outline'; // Example icon

const CorrelationGraphPlaceholder: React.FC = () => {
  return (
    <div className="bg-gray-800 p-6 md:p-8 rounded-lg shadow-xl text-center h-96 flex flex-col justify-center items-center">
      <ShareIcon className="h-16 w-16 text-blue-500 mb-4" />
      <h3 className="text-xl font-semibold text-gray-100 mb-2">Correlation Graph</h3>
      <p className="text-gray-400">This feature is coming soon!</p>
      <p className="text-sm text-gray-500 mt-2">Visualize relationships and connections between different log events and entities.</p>
    </div>
  );
};

export default CorrelationGraphPlaceholder;
