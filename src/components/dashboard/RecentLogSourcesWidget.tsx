import React from 'react';
import { ServerStackIcon } from '@heroicons/react/24/outline';

const RecentLogSourcesWidget: React.FC = () => {
  return (
    <div className="bg-gray-700 p-6 rounded-lg shadow-lg">
      <div className="flex items-center space-x-3 mb-3">
        <ServerStackIcon className="h-7 w-7 text-green-400" />
        <h3 className="text-xl font-semibold text-gray-100">Recent Log Sources</h3>
      </div>
      <ul className="space-y-2">
        <li className="text-gray-300">Windows Security Logs</li>
        <li className="text-gray-300">Linux Syslog</li>
        <li className="text-gray-300">macOS Unified Log</li>
        <li className="text-gray-300">Firewall Logs</li>
      </ul>
    </div>
  );
};

export default RecentLogSourcesWidget;
