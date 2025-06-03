'use client';

import React, { useState } from 'react';
import { PencilSquareIcon, TrashIcon, PlusCircleIcon } from '@heroicons/react/24/outline';

interface ScheduledReport {
  id: string;
  reportName: string;
  frequency: string;
  nextRunTime: string;
  recipients: string[];
}

const mockScheduledReports: ScheduledReport[] = [
  {
    id: 'sched001',
    reportName: 'Daily Security Overview',
    frequency: 'Daily',
    nextRunTime: 'Tomorrow at 08:00 AM',
    recipients: ['soc@example.com', 'it-admins@example.com'],
  },
  {
    id: 'sched002',
    reportName: 'Weekly Failed Logons',
    frequency: 'Weekly (Monday)',
    nextRunTime: 'Next Monday at 09:00 AM',
    recipients: ['security-team@example.com'],
  },
  {
    id: 'sched003',
    reportName: 'Monthly Compliance Report',
    frequency: 'Monthly (1st)',
    nextRunTime: 'Nov 1, 2023 06:00 AM',
    recipients: ['compliance@example.com', 'manager@example.com'],
  },
];

const ScheduledReportsConfig: React.FC = () => {
  // In a real app, this would likely come from state/props
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>(mockScheduledReports); 

  const handleEditReport = (reportId: string) => {
    console.log(`Editing scheduled report ID: ${reportId}`);
    // This would typically open a modal or navigate to an edit form
  };

  const handleDeleteReport = (reportId: string) => {
    console.log(`Deleting scheduled report ID: ${reportId}`);
    setScheduledReports(prev => prev.filter(report => report.id !== reportId));
  };

  const handleScheduleNewReport = () => {
    console.log("Opening UI to schedule a new report...");
    // This would typically open a modal or navigate to a form
  };

  return (
    <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl mt-8">
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-700">
        <h2 className="text-xl font-semibold text-gray-100">Scheduled Reports</h2>
        <button
          onClick={handleScheduleNewReport}
          className="flex items-center px-3 py-2 bg-green-600 text-white font-medium text-sm rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-green-500 transition duration-150"
        >
          <PlusCircleIcon className="h-5 w-5 mr-2" />
          Schedule New Report
        </button>
      </div>

      {scheduledReports.length === 0 ? (
        <p className="text-gray-400 text-center py-4">No reports are currently scheduled.</p>
      ) : (
        <div className="space-y-3">
          {scheduledReports.map((report) => (
            <div key={report.id} className="bg-gray-700 p-4 rounded-md shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                <div>
                  <h3 className="text-md font-semibold text-gray-100">{report.reportName}</h3>
                  <p className="text-xs text-gray-400">
                    Frequency: {report.frequency} | Next Run: {report.nextRunTime}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Recipients: {report.recipients.join(', ')}
                  </p>
                </div>
                <div className="flex space-x-2 mt-3 sm:mt-0">
                  <button 
                    onClick={() => handleEditReport(report.id)}
                    className="p-1.5 text-blue-400 hover:text-blue-300 transition-colors"
                    title="Edit Report"
                  >
                    <PencilSquareIcon className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={() => handleDeleteReport(report.id)}
                    className="p-1.5 text-red-400 hover:text-red-300 transition-colors"
                    title="Delete Report"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Conceptual section for scheduling options if not a modal */}
      <div className="mt-6 border-t border-gray-700 pt-4 hidden"> {/* Hidden for now, as scheduling new would likely be a modal/new view */}
        <h3 className="text-lg font-semibold text-gray-100 mb-3">Schedule Configuration (Conceptual)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-gray-300 mb-1">Frequency:</label>
            <select className="w-full bg-gray-700 p-2 rounded-md">
              <option>Daily</option>
              <option>Weekly</option>
              <option>Monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-gray-300 mb-1">Time of Day:</label>
            <input type="time" className="w-full bg-gray-700 p-2 rounded-md" />
          </div>
          <div>
            <label className="block text-gray-300 mb-1">Recipients (comma-separated):</label>
            <input type="email" multiple className="w-full bg-gray-700 p-2 rounded-md" placeholder="user1@example.com, user2@example.com" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduledReportsConfig;