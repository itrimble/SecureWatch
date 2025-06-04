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

interface AdvancedFilterPanelProps {
  onFiltersApplied?: (filters: FilterState) => void;
}

const AdvancedFilterPanel: React.FC<AdvancedFilterPanelProps> = ({ onFiltersApplied }) => {
  const [filters, setFilters] = useState<FilterState>(initialFilterState);
  const [isOpen, setIsOpen] = useState(true); // Panel is open by default

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleApplyFilters = () => {
    console.log("Applying Filters:", filters);
    if (onFiltersApplied) {
      onFiltersApplied(filters);
    }
  };

  const handleClearFilters = () => {
    setFilters(initialFilterState);
    console.log("Filters Cleared");
    if (onFiltersApplied) {
      onFiltersApplied(initialFilterState);
    }
  };

  return (
    <div className="w-full bg-gray-800 rounded-lg shadow-lg mb-6 border border-gray-600">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-left text-lg font-semibold text-gray-100 p-4 rounded-t-lg hover:bg-gray-700 focus:outline-none transition-colors"
      >
        Advanced Filters
        <span className="text-gray-400">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="p-4 border-t border-gray-600 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Event ID */}
            <div className="space-y-2">
              <label htmlFor="eventId" className="block text-sm font-medium text-gray-300">Event ID</label>
              <input 
                type="text" 
                name="eventId" 
                id="eventId" 
                value={filters.eventId} 
                onChange={handleChange} 
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
                placeholder="e.g., 4624" 
              />
            </div>

            {/* Keywords */}
            <div className="space-y-2">
              <label htmlFor="keywords" className="block text-sm font-medium text-gray-300">Keywords</label>
              <input 
                type="text" 
                name="keywords" 
                id="keywords" 
                value={filters.keywords} 
                onChange={handleChange} 
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
                placeholder="e.g., mac, login, error" 
              />
            </div>

            {/* User */}
            <div className="space-y-2">
              <label htmlFor="user" className="block text-sm font-medium text-gray-300">User</label>
              <input 
                type="text" 
                name="user" 
                id="user" 
                value={filters.user} 
                onChange={handleChange} 
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
                placeholder="e.g., SYSTEM, jdoe" 
              />
            </div>

            {/* Source IP */}
            <div className="space-y-2">
              <label htmlFor="sourceIp" className="block text-sm font-medium text-gray-300">Source IP</label>
              <input 
                type="text" 
                name="sourceIp" 
                id="sourceIp" 
                value={filters.sourceIp} 
                onChange={handleChange} 
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
                placeholder="e.g., 192.168.1.100" 
              />
            </div>

            {/* Log Level */}
            <div className="space-y-2">
              <label htmlFor="logLevel" className="block text-sm font-medium text-gray-300">Log Level</label>
              <select 
                name="logLevel" 
                id="logLevel" 
                value={filters.logLevel} 
                onChange={handleChange} 
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                {LogLevelOptions.map(level => <option key={level} value={level === "All" ? "" : level}>{level}</option>)}
              </select>
            </div>
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="timeRangeStart" className="block text-sm font-medium text-gray-300">Start Time</label>
              <input 
                type="datetime-local" 
                name="timeRangeStart" 
                id="timeRangeStart" 
                value={filters.timeRangeStart} 
                onChange={handleChange} 
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="timeRangeEnd" className="block text-sm font-medium text-gray-300">End Time</label>
              <input 
                type="datetime-local" 
                name="timeRangeEnd" 
                id="timeRangeEnd" 
                value={filters.timeRangeEnd} 
                onChange={handleChange} 
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
              />
            </div>
          </div>
          
          {/* Regex Search */}
          <div className="space-y-2">
            <label htmlFor="regexSearch" className="block text-sm font-medium text-gray-300">Regex Search</label>
            <textarea 
              name="regexSearch" 
              id="regexSearch" 
              rows={2} 
              value={filters.regexSearch} 
              onChange={handleChange} 
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm resize-none" 
              placeholder="Enter regex pattern..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-medium text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors"
            >
              Clear Filters
            </button>
            <button
              type="button"
              onClick={handleApplyFilters}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors"
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
