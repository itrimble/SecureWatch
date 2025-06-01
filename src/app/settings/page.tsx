import React from 'react';
import LogSourceManagement from '@/components/settings/LogSourceManagement';
import IntegrationsSettings from '@/components/settings/IntegrationsSettings';

const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-8 p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-semibold text-gray-100 mb-6">Settings & Integrations</h1>
      
      <section aria-labelledby="log-source-management-heading">
        <h2 id="log-source-management-heading" className="sr-only">Log Source Management</h2> 
        {/* Heading is inside the component, sr-only for accessibility if needed here */}
        <LogSourceManagement />
      </section>
      
      <section aria-labelledby="integrations-settings-heading" className="mt-8">
        {/* Heading is inside the component */}
        <IntegrationsSettings />
      </section>
    </div>
  );
};

export default SettingsPage;
