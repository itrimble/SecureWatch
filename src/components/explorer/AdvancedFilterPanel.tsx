'use client';

import React, { useState } from 'react';

interface FilterState {
  eventId: string;
  keywords: string;
  user: string;
  sourceIp: string;
  timeRangeStart: string;
  timeRangeEnd: string;
  logLevel: string;
  regexSearch: string;
  sigmaRuleSearch: string;
}

const initialFilterState: FilterState = {
  eventId: '',
  keywords: '',
  user: '',
  sourceIp: '',
  timeRangeStart: '',
  timeRangeEnd: '',
  logLevel: '',
  regexSearch: '',
  sigmaRuleSearch: '',
};

const LogLevelOptions = ["All", "Information", "Warning", "Error", "Critical"];

const AdvancedFilterPanel: React.FC = () => {
  const [filters, setFilters] = useState<FilterState>(initialFilterState);
  const [isOpen, setIsOpen] = useState(true); // Panel is open by default

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleApplyFilters = () => {
    console.log("Applying Filters:", filters);
    // Actual filtering logic would go here in a real application
  };

  const handleClearFilters = () => {
    setFilters(initialFilterState);
    console.log("Filters Cleared");
  };

  return (
    <div className="bg-gray-700 p-4 rounded-lg shadow-lg mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-left text-xl font-semibold text-gray-100 mb-3 p-2 rounded-md hover:bg-gray-600 focus:outline-none"
      >
        Advanced Filters
        <span>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="space-y-4 pt-3 border-t border-gray-600">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Event ID */}
            <div>
              <label htmlFor="eventId" className="block text-sm font-medium text-gray-300 mb-1">Event ID</label>
              <input type="text" name="eventId" id="eventId" value={filters.eventId} onChange={handleChange} className="w-full bg-gray-800 border-gray-600 text-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2" placeholder="e.g., 4624" />
            </div>

            {/* Keywords */}
            <div>
              <label htmlFor="keywords" className="block text-sm font-medium text-gray-300 mb-1">Keywords</label>
              <input type="text" name="keywords" id="keywords" value={filters.keywords} onChange={handleChange} className="w-full bg-gray-800 border-gray-600 text-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2" placeholder="e.g., Logon failure, access denied" />
            </div>

            {/* User */}
            <div>
              <label htmlFor="user" className="block text-sm font-medium text-gray-300 mb-1">User</label>
              <input type="text" name="user" id="user" value={filters.user} onChange={handleChange} className="w-full bg-gray-800 border-gray-600 text-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2" placeholder="e.g., SYSTEM, jdoe" />
            </div>

            {/* Source IP */}
            <div>
              <label htmlFor="sourceIp" className="block text-sm font-medium text-gray-300 mb-1">Source IP</label>
              <input type="text" name="sourceIp" id="sourceIp" value={filters.sourceIp} onChange={handleChange} className="w-full bg-gray-800 border-gray-600 text-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2" placeholder="e.g., 192.168.1.100" />
            </div>

            {/* Log Level */}
            <div>
              <label htmlFor="logLevel" className="block text-sm font-medium text-gray-300 mb-1">Log Level</label>
              <select name="logLevel" id="logLevel" value={filters.logLevel} onChange={handleChange} className="w-full bg-gray-800 border-gray-600 text-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5">
                {LogLevelOptions.map(level => <option key={level} value={level === "All" ? "" : level}>{level}</option>)}
              </select>
            </div>
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="timeRangeStart" className="block text-sm font-medium text-gray-300 mb-1">Start Time</label>
              <input type="datetime-local" name="timeRangeStart" id="timeRangeStart" value={filters.timeRangeStart} onChange={handleChange} className="w-full bg-gray-800 border-gray-600 text-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2" />
            </div>
            <div>
              <label htmlFor="timeRangeEnd" className="block text-sm font-medium text-gray-300 mb-1">End Time</label>
              <input type="datetime-local" name="timeRangeEnd" id="timeRangeEnd" value={filters.timeRangeEnd} onChange={handleChange} className="w-full bg-gray-800 border-gray-600 text-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2" />
            </div>
          </div>
          
          {/* Regex Search */}
          <div>
            <label htmlFor="regexSearch" className="block text-sm font-medium text-gray-300 mb-1">Regex Search</label>
            <textarea name="regexSearch" id="regexSearch" rows={2} value={filters.regexSearch} onChange={handleChange} className="w-full bg-gray-800 border-gray-600 text-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2" placeholder="Enter regex pattern..."></textarea>
          </div>

          {/* Sigma Rule Search */}
          <div>
            <label htmlFor="sigmaRuleSearch" className="block text-sm font-medium text-gray-300 mb-1">Sigma Rule Search</label>
            <textarea name="sigmaRuleSearch" id="sigmaRuleSearch" rows={3} value={filters.sigmaRuleSearch} onChange={handleChange} className="w-full bg-gray-800 border-gray-600 text-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2" placeholder="Paste Sigma rule content or link..."></textarea>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-4 py-2 bg-gray-600 text-white font-medium text-sm rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-700 focus:ring-gray-500 transition duration-150 ease-in-out"
            >
              Clear Filters
            </button>
            <button
              type="button"
              onClick={handleApplyFilters}
              className="px-4 py-2 bg-blue-600 text-white font-medium text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-700 focus:ring-blue-500 transition duration-150 ease-in-out"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedFilterPanel;
