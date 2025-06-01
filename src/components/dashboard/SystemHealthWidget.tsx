import React from 'react';
import { HeartIcon } from '@heroicons/react/24/outline'; // Using a relevant icon

const SystemHealthWidget: React.FC = () => {
  return (
    <div className="bg-gray-700 p-6 rounded-lg shadow-lg flex items-center space-x-4">
      <div className="p-3 bg-green-500 rounded-full">
        <HeartIcon className="h-8 w-8 text-white" />
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-white">Normal</h2>
        <p className="text-gray-300">System Health</p>
      </div>
    </div>
  );
};

export default SystemHealthWidget;
