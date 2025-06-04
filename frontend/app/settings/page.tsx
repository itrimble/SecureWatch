import React from 'react';

const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-8 p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-semibold text-gray-100 mb-6">Settings & Configuration</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
          <h2 className="text-xl font-semibold text-gray-100 mb-4">User Management</h2>
          <p className="text-gray-300 mb-4">Manage user accounts, roles, and permissions</p>
          <a href="/settings/admin-users" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            Manage Users
          </a>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
          <h2 className="text-xl font-semibold text-gray-100 mb-4">Integrations</h2>
          <p className="text-gray-300 mb-4">Configure data sources and external integrations</p>
          <a href="/settings/integrations" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            Configure Integrations
          </a>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
          <h2 className="text-xl font-semibold text-gray-100 mb-4">System Health</h2>
          <p className="text-gray-300 mb-4">Monitor system performance and health metrics</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Database</span>
              <span className="text-green-400">Online</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Elasticsearch</span>
              <span className="text-green-400">Online</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Redis</span>
              <span className="text-green-400">Online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;