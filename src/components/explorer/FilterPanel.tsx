"use client"; // Required for form interactions, though not strictly needed for this static version yet

import React from 'react';

const FilterPanel: React.FC = () => {
  return (
    <div className="bg-gray-700 p-6 rounded-lg shadow-lg space-y-6">
      <h2 className="text-xl font-semibold text-gray-100 border-b border-gray-600 pb-3">Filters & Search</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Text Inputs */}
        <div>
          <label htmlFor="eventId" className="block text-sm font-medium text-gray-300 mb-1">Event ID</label>
          <input type="text" name="eventId" id="eventId" className="w-full bg-gray-800 border-gray-600 text-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2" placeholder="e.g., 4624" />
        </div>
        <div>
          <label htmlFor="keyword" className="block text-sm font-medium text-gray-300 mb-1">Keyword</label>
          <input type="text" name="keyword" id="keyword" className="w-full bg-gray-800 border-gray-600 text-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2" placeholder="e.g., Logon, Error" />
        </div>
        <div>
          <label htmlFor="user" className="block text-sm font-medium text-gray-300 mb-1">User</label>
          <input type="text" name="user" id="user" className="w-full bg-gray-800 border-gray-600 text-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2" placeholder="e.g., SYSTEM, jdoe" />
        </div>
        <div>
          <label htmlFor="host" className="block text-sm font-medium text-gray-300 mb-1">Host</label>
          <input type="text" name="host" id="host" className="w-full bg-gray-800 border-gray-600 text-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2" placeholder="e.g., DC01, workstation7" />
        </div>

        {/* Date Range Picker (Simple Text Inputs) */}
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
          <input type="text" name="startDate" id="startDate" className="w-full bg-gray-800 border-gray-600 text-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2" placeholder="YYYY-MM-DD" />
        </div>
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-300 mb-1">End Date</label>
          <input type="text" name="endDate" id="endDate" className="w-full bg-gray-800 border-gray-600 text-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2" placeholder="YYYY-MM-DD" />
        </div>

        {/* Dropdowns */}
        <div>
          <label htmlFor="severity" className="block text-sm font-medium text-gray-300 mb-1">Severity</label>
          <select id="severity" name="severity" className="w-full bg-gray-800 border-gray-600 text-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5">
            <option>All</option>
            <option>Critical</option>
            <option>Error</option>
            <option>Warning</option>
            <option>Information</option>
          </select>
        </div>
        <div>
          <label htmlFor="logSource" className="block text-sm font-medium text-gray-300 mb-1">Log Source</label>
          <select id="logSource" name="logSource" className="w-full bg-gray-800 border-gray-600 text-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5">
            <option>All</option>
            <option>Windows</option>
            <option>Linux</option>
            <option>macOS</option>
          </select>
        </div>
      </div>

      {/* Action Button */}
      <div className="pt-4 flex justify-end">
        <button
          type="button"
          className="px-6 py-2.5 bg-blue-600 text-white font-medium text-sm leading-tight uppercase rounded shadow-md hover:bg-blue-700 hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-blue-800 active:shadow-lg transition duration-150 ease-in-out"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
};

export default FilterPanel;
