"use client";

import React, { useState, useMemo, useEffect } from 'react';
import type { LogEntry } from '@/lib/types/log_entry'; 
import EventDetailsModal from './EventDetailsModal';
import useDebounce from '@/hooks/useDebounce'; // Import the hook
import { XCircle, Search as SearchIcon, FileText, FileJson } from 'lucide-react'; // Added icons
import { generateFilename, exportToCsv, exportToJson } from '@/lib/utils/exportUtils'; // Import from new location

const ITEMS_PER_PAGE = 15;

// Define a specific sort key type for LogEntry fields that are sortable
type LogEntrySortKey = 'timestamp' | 'source_identifier' | 'log_file';
type SortOrder = 'asc' | 'desc';

interface EventsTableProps {
  logEntries: LogEntry[];
  isLoading: boolean;
  error: string | null;
  // onOpenModal: (logEntry: LogEntry) => void; // Optional: if modal control is lifted
}

const EventsTable: React.FC<EventsTableProps> = ({ 
  logEntries, 
  isLoading, 
  error 
  // onOpenModal 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState<LogEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Default sort by timestamp descending
  const [sortKey, setSortKey] = useState<LogEntrySortKey>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // Debounce search term by 300ms

  // Reset current page when logEntries or debouncedSearchTerm change
  useEffect(() => {
    setCurrentPage(1);
  }, [logEntries, debouncedSearchTerm]);

  const sortedData = useMemo(() => {
    // Sort the initial logEntries
    return [...logEntries].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];

      if (valA < valB) {
        return sortOrder === 'asc' ? -1 : 1;
      }
      if (valA > valB) {
        return sortOrder === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [logEntries, sortKey, sortOrder]);

  const filteredData = useMemo(() => {
    if (!debouncedSearchTerm.trim()) {
      return sortedData; // Use sortedData as the base for filtering
    }

    const keywords = debouncedSearchTerm.toLowerCase().split(' ').filter(kw => kw);

    return sortedData.filter(log => {
      const searchableText = [
        log.message,
        log.source_identifier,
        log.log_file,
        // Basic search in enriched_data: stringify and search
        // This is a simple approach; more complex objects might need specific field targeting
        log.enriched_data ? JSON.stringify(log.enriched_data) : ''
      ].join(' ').toLowerCase();

      // All keywords must be present in the searchableText
      return keywords.every(keyword => searchableText.includes(keyword));
    });
  }, [debouncedSearchTerm, sortedData]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1); 
  };

  const handleRowClick = (log: LogEntry) => {
    setSelectedEvent(log);
    setIsModalOpen(true);
    // if (onOpenModal) onOpenModal(log); // Use this if modal state is lifted
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleSort = (key: LogEntrySortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const getSortIndicator = (key: LogEntrySortKey) => {
    if (sortKey === key) {
      return sortOrder === 'asc' ? ' ▲' : ' ▼';
    }
    return '';
  };
  
  if (isLoading) {
    return (
      <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow-lg mt-6 text-center text-gray-300">
        Loading logs...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow-lg mt-6 text-center text-red-400">
        Error: {error}
      </div>
    );
  }

  if (logEntries.length === 0) {
    return (
      <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow-lg mt-6 text-center text-gray-400">
        No log entries found.
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow-lg mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-100">Event Log Entries</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => exportToCsv(filteredData, generateFilename('csv'))}
            disabled={filteredData.length === 0 || isLoading}
            className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-md 
                       focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-gray-800 focus:ring-green-500
                       disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
          >
            <FileText size={14} className="mr-1.5" />
            Export CSV
          </button>
          <button
            onClick={() => exportToJson(filteredData, generateFilename('json'))}
            disabled={filteredData.length === 0 || isLoading}
            className="px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-md 
                       focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-gray-800 focus:ring-purple-500
                       disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
          >
            <FileJson size={14} className="mr-1.5" />
            Export JSON
          </button>
        </div>
      </div>
      
      {/* Search Input and Clear Button */}
      <div className="mb-4 flex items-center">
        <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
            type="text"
            placeholder="Search logs (keywords for message, source, file, enriched data...)"
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full p-2 pl-10 rounded-md bg-gray-700 text-gray-200 border border-gray-600 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchTerm && (
            <button
                onClick={() => {
                    setSearchTerm('');
                    setCurrentPage(1); // Optionally reset page
                }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200"
                aria-label="Clear search"
            >
                <XCircle className="h-5 w-5" />
            </button>
            )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-900">
            <tr>
              {[
                { label: 'Timestamp', key: 'timestamp' as LogEntrySortKey, sortable: true },
                { label: 'Source Identifier', key: 'source_identifier' as LogEntrySortKey, sortable: true },
                { label: 'Log File', key: 'log_file' as LogEntrySortKey, sortable: true },
                { label: 'Message', key: null, sortable: false }, // Message not typically sorted
              ].map(col => (
                <th 
                  key={col.label} 
                  scope="col" 
                  className={`px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider ${col.sortable ? 'cursor-pointer hover:bg-gray-700' : ''}`}
                  onClick={() => col.sortable && col.key && handleSort(col.key as LogEntrySortKey)}
                >
                  {col.label}
                  {col.sortable && col.key && getSortIndicator(col.key as LogEntrySortKey)}
                </th>
              ))}
               <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {paginatedData.map((log) => (
              <tr 
                key={log.id}
                className="hover:bg-gray-700 transition-colors duration-150"
              >
                <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-300">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-100">{log.source_identifier}</td>
                <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-300">{log.log_file}</td>
                <td className="px-3 py-3 text-sm text-gray-300 max-w-md truncate" title={log.message}>{log.message}</td>
                <td className="px-3 py-3 whitespace-nowrap text-sm">
                   <button 
                      onClick={() => handleRowClick(log)}
                      className="text-blue-400 hover:text-blue-300 text-xs"
                    >
                      View Details
                    </button>
                </td>
              </tr>
            ))}
            {paginatedData.length === 0 && !isLoading && (
              <tr>
                <td colSpan={5} className="px-3 py-3 text-center text-sm text-gray-400">No log entries found matching your criteria.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex justify-between items-center text-sm text-gray-400">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span>Page {currentPage} of {totalPages} ({filteredData.length} entries)</span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {isModalOpen && selectedEvent && (
        <EventDetailsModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedEvent(null);
          }}
          dataItem={selectedEvent} 
        />
      )}
    </div>
  );
};

export default EventsTable;