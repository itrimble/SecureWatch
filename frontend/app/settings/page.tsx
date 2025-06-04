import React from 'react';
import { Activity, Shield, Users, Settings2, BarChart3 } from 'lucide-react';

const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-8 p-4 md:p-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-100 mb-2">Settings & Configuration</h1>
        <p className="text-gray-400">Manage your SecureWatch SIEM platform configuration and administration</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Platform Status Dashboard */}
        <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 p-6 rounded-lg shadow-xl border border-blue-700/30">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="h-6 w-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-100">Platform Status</h2>
          </div>
          <p className="text-gray-300 mb-4">
            Real-time monitoring dashboard with service status, metrics, and system resources
          </p>
          <a 
            href="/settings/platform-status" 
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Activity className="h-4 w-4" />
            Open Dashboard
          </a>
        </div>

        {/* User Management */}
        <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 p-6 rounded-lg shadow-xl border border-green-700/30">
          <div className="flex items-center gap-3 mb-4">
            <Users className="h-6 w-6 text-green-400" />
            <h2 className="text-xl font-semibold text-gray-100">User Management</h2>
          </div>
          <p className="text-gray-300 mb-4">Manage user accounts, roles, and permissions</p>
          <a 
            href="/settings/admin-users" 
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <Shield className="h-4 w-4" />
            Manage Users
          </a>
        </div>

        {/* Integrations */}
        <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 p-6 rounded-lg shadow-xl border border-purple-700/30">
          <div className="flex items-center gap-3 mb-4">
            <Settings2 className="h-6 w-6 text-purple-400" />
            <h2 className="text-xl font-semibold text-gray-100">Integrations</h2>
          </div>
          <p className="text-gray-300 mb-4">Configure data sources and external integrations</p>
          <a 
            href="/settings/integrations" 
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            <Settings2 className="h-4 w-4" />
            Configure
          </a>
        </div>

        {/* System Health Overview */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-700">
          <h2 className="text-xl font-semibold text-gray-100 mb-4">Quick Health Check</h2>
          <p className="text-gray-300 mb-4">Overview of core system components</p>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Database</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-green-400 text-sm">Online</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Elasticsearch</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-green-400 text-sm">Online</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Redis Cache</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-green-400 text-sm">Online</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Log Ingestion</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="text-yellow-400 text-sm">Degraded</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-700">
            <a 
              href="/settings/platform-status" 
              className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
            >
              View detailed status →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;