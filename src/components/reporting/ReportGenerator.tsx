'use client';

import React, { useState } from 'react';

interface ReportConfig {
  reportTitle: string;
  timeRangePreset: string;
  timeRangeStart: string;
  timeRangeEnd: string;
  logSources: {
    windows: boolean;
    linux: boolean;
    macOS: boolean;
  };
  severities: {
    critical: boolean;
    high: boolean;
    medium: boolean;
    low: boolean;
    informational: boolean;
  };
  specificEventIds: string; // Comma-separated
  exportFormat: 'PDF' | 'CSV' | 'JSON';
}

const initialReportConfig: ReportConfig = {
  reportTitle: '',
  timeRangePreset: '',
  timeRangeStart: '',
  timeRangeEnd: '',
  logSources: {
    windows: true,
    linux: false,
    macOS: false,
  },
  severities: {
    critical: true,
    high: true,
    medium: true,
    low: false,
    informational: false,
  },
  specificEventIds: '',
  exportFormat: 'PDF',
};

const ReportGenerator: React.FC = () => {
  const [config, setConfig] = useState<ReportConfig>(initialReportConfig);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const { checked, dataset } = e.target as HTMLInputElement;
      const category = dataset.category as keyof (ReportConfig['logSources'] | ReportConfig['severities']);
      
      if (category === 'logSources' || category === 'severities') {
        setConfig(prev => ({
          ...prev,
          [category]: {
            ...(prev[category as keyof Pick<ReportConfig, 'logSources' | 'severities'>] as any),
            [name]: checked,
          }
        }));
      }
    } else {
      setConfig(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleTimePresetChange = (preset: string) => {
    setConfig(prev => ({ ...prev, timeRangePreset: preset, timeRangeStart: '', timeRangeEnd: '' }));
    // In a real app, you might auto-fill start/end dates here
  };

  const handleGenerateReport = () => {
    console.log("Generating Report with config:", config);
  };

  const handlePreviewReport = () => {
    console.log("Previewing Report with config:", config);
  };

  return (
    <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl">
      <h2 className="text-xl font-semibold text-gray-100 mb-4 border-b border-gray-700 pb-3">Generate Report</h2>
      <div className="space-y-6">
        {/* Report Title */}
        <div>
          <label htmlFor="reportTitle" className="block text-sm font-medium text-gray-300 mb-1">Report Title/Name</label>
          <input type="text" name="reportTitle" id="reportTitle" value={config.reportTitle} onChange={handleChange} className="w-full bg-gray-700 border-gray-600 text-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2" placeholder="e.g., Q3 Security Incidents" />
        </div>

        {/* Time Range */}
        <fieldset>
          <legend className="block text-sm font-medium text-gray-300 mb-2">Time Range</legend>
          <div className="flex flex-wrap gap-2 mb-2">
            {["Last 24 hours", "Last 7 days", "Last 30 days"].map(preset => (
              <button key={preset} type="button" onClick={() => handleTimePresetChange(preset)} className={`px-3 py-1.5 text-xs rounded-md ${config.timeRangePreset === preset ? 'bg-blue-600 text-white' : 'bg-gray-600 hover:bg-gray-500 text-gray-200'}`}>
                {preset}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="timeRangeStart" className="block text-sm font-medium text-gray-300 mb-1">Start Date/Time</label>
              <input type="datetime-local" name="timeRangeStart" id="timeRangeStart" value={config.timeRangeStart} onChange={handleChange} disabled={!!config.timeRangePreset} className="w-full bg-gray-700 border-gray-600 text-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 disabled:opacity-50" />
            </div>
            <div>
              <label htmlFor="timeRangeEnd" className="block text-sm font-medium text-gray-300 mb-1">End Date/Time</label>
              <input type="datetime-local" name="timeRangeEnd" id="timeRangeEnd" value={config.timeRangeEnd} onChange={handleChange} disabled={!!config.timeRangePreset} className="w-full bg-gray-700 border-gray-600 text-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 disabled:opacity-50" />
            </div>
          </div>
        </fieldset>

        {/* Event Types/Sources */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <fieldset>
            <legend className="block text-sm font-medium text-gray-300 mb-2">Log Sources</legend>
            <div className="space-y-2">
              {Object.keys(config.logSources).map(key => (
                <label key={key} className="flex items-center text-sm text-gray-200">
                  <input type="checkbox" name={key} data-category="logSources" checked={config.logSources[key as keyof typeof config.logSources]} onChange={handleChange} className="h-4 w-4 bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500 rounded mr-2" />
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="block text-sm font-medium text-gray-300 mb-2">Event Severity</legend>
            <div className="space-y-2">
               {Object.keys(config.severities).map(key => (
                <label key={key} className="flex items-center text-sm text-gray-200">
                  <input type="checkbox" name={key} data-category="severities" checked={config.severities[key as keyof typeof config.severities]} onChange={handleChange} className="h-4 w-4 bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500 rounded mr-2" />
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <div>
          <label htmlFor="specificEventIds" className="block text-sm font-medium text-gray-300 mb-1">Specific Event IDs (comma-separated)</label>
          <textarea name="specificEventIds" id="specificEventIds" rows={2} value={config.specificEventIds} onChange={handleChange} className="w-full bg-gray-700 border-gray-600 text-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2" placeholder="e.g., 4624, 4625, 1102"></textarea>
        </div>

        {/* Export Format */}
        <fieldset>
          <legend className="block text-sm font-medium text-gray-300 mb-2">Export Format</legend>
          <div className="flex items-center space-x-4">
            {(['PDF', 'CSV', 'JSON'] as ReportConfig['exportFormat'][]).map(format => (
              <label key={format} className="flex items-center text-sm text-gray-200">
                <input type="radio" name="exportFormat" value={format} checked={config.exportFormat === format} onChange={handleChange} className="h-4 w-4 bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500 mr-1.5" />
                {format}
              </label>
            ))}
          </div>
        </fieldset>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700 mt-2">
          <button type="button" onClick={handlePreviewReport} className="px-4 py-2 bg-gray-600 text-white font-medium text-sm rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-500 transition duration-150">
            Preview Report
          </button>
          <button type="button" onClick={handleGenerateReport} className="px-4 py-2 bg-blue-600 text-white font-medium text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 transition duration-150">
            Generate Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportGenerator;
