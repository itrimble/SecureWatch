'use client';

import React, { useState } from 'react';

interface SiemConfig {
  apiEndpoint: string;
  apiKey: string;
}

interface ThreatIntelConfig {
  feedUrl: string;
  feedFormat: 'STIX' | 'TAXII' | 'CSV' | '';
  enableFeed: boolean;
}

const initialSiemConfig: SiemConfig = {
  apiEndpoint: '',
  apiKey: '',
};

const initialThreatIntelConfig: ThreatIntelConfig = {
  feedUrl: '',
  feedFormat: '',
  enableFeed: false,
};

const IntegrationsSettings: React.FC = () => {
  const [siemConfig, setSiemConfig] = useState<SiemConfig>(initialSiemConfig);
  const [threatIntelConfig, setThreatIntelConfig] = useState<ThreatIntelConfig>(initialThreatIntelConfig);

  const handleSiemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSiemConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleThreatIntelChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setThreatIntelConfig(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setThreatIntelConfig(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSaveSiem = () => {
    console.log("Saving SIEM Configuration:", siemConfig);
  };

  const handleTestSiemConnection = () => {
    console.log("Testing SIEM Connection with endpoint:", siemConfig.apiEndpoint);
  };

  const handleSaveThreatIntel = () => {
    console.log("Saving Threat Intel Configuration:", threatIntelConfig);
  };

  return (
    <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl mt-8">
      <h2 className="text-xl font-semibold text-gray-100 mb-6 border-b border-gray-700 pb-3">External Integrations</h2>
      
      {/* SIEM Integration Section */}
      <section className="mb-8">
        <h3 className="text-lg font-medium text-gray-200 mb-3">SIEM Integration</h3>
        <div className="space-y-4 bg-gray-750 p-4 rounded-md">
          <div>
            <label htmlFor="siemApiEndpoint" className="block text-sm font-medium text-gray-300 mb-1">SIEM API Endpoint</label>
            <input type="text" name="apiEndpoint" id="siemApiEndpoint" value={siemConfig.apiEndpoint} onChange={handleSiemChange} className="w-full bg-gray-800 border-gray-600 text-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2" placeholder="e.g., https://siem.example.com/api/v1/ingest" />
          </div>
          <div>
            <label htmlFor="siemApiKey" className="block text-sm font-medium text-gray-300 mb-1">API Key</label>
            <input type="password" name="apiKey" id="siemApiKey" value={siemConfig.apiKey} onChange={handleSiemChange} className="w-full bg-gray-800 border-gray-600 text-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2" placeholder="Enter API Key" />
          </div>
          <div className="flex justify-end space-x-3 pt-2">
            <button onClick={handleTestSiemConnection} className="px-3 py-1.5 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded-md transition-colors">Test Connection</button>
            <button onClick={handleSaveSiem} className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors">Save SIEM Configuration</button>
          </div>
        </div>
      </section>

      {/* Threat Intel Integration Section */}
      <section>
        <h3 className="text-lg font-medium text-gray-200 mb-3">Threat Intelligence Integration</h3>
        <div className="space-y-4 bg-gray-750 p-4 rounded-md">
          <div>
            <label htmlFor="threatIntelFeedUrl" className="block text-sm font-medium text-gray-300 mb-1">Threat Intel Feed URL</label>
            <input type="url" name="feedUrl" id="threatIntelFeedUrl" value={threatIntelConfig.feedUrl} onChange={handleThreatIntelChange} className="w-full bg-gray-800 border-gray-600 text-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2" placeholder="e.g., https://threatfeed.example.com/feed.stix" />
          </div>
          <div>
            <label htmlFor="threatIntelFeedFormat" className="block text-sm font-medium text-gray-300 mb-1">Feed Format</label>
            <select name="feedFormat" id="threatIntelFeedFormat" value={threatIntelConfig.feedFormat} onChange={handleThreatIntelChange} className="w-full bg-gray-800 border-gray-600 text-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5">
              <option value="">Select Format...</option>
              <option value="STIX">STIX</option>
              <option value="TAXII">TAXII</option>
              <option value="CSV">CSV (Basic IOCs)</option>
            </select>
          </div>
          <div className="flex items-center">
            <input type="checkbox" name="enableFeed" id="threatIntelEnableFeed" checked={threatIntelConfig.enableFeed} onChange={handleThreatIntelChange} className="h-4 w-4 bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500 rounded mr-2" />
            <label htmlFor="threatIntelEnableFeed" className="text-sm text-gray-200">Enable Threat Intel Feed</label>
          </div>
          <div className="flex justify-end pt-2">
            <button onClick={handleSaveThreatIntel} className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors">Save Threat Intel Configuration</button>
          </div>
        </div>
      </section>
      <style jsx global>{`
        .bg-gray-750 { background-color: #3f4b5a; } /* Custom shade between gray-700 and gray-800 if needed */
      `}</style>
    </div>
  );
};

export default IntegrationsSettings;
