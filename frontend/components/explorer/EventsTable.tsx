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

interface EventsTableProps {
  logEntries: LogEntry[];
  isLoading: boolean;
  error: string | null;
  appliedFilters?: FilterState | null;
  // onOpenModal: (logEntry: LogEntry) => void; // Optional: if modal control is lifted
}

const EventsTable: React.FC<EventsTableProps> = ({ 
  logEntries, 
  isLoading, 
  error,
  appliedFilters
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

  // Reset current page when logEntries, debouncedSearchTerm, or appliedFilters change
  useEffect(() => {
    setCurrentPage(1);
  }, [logEntries, debouncedSearchTerm, appliedFilters]);

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
    let data = [...sortedData];

    // Apply advanced filters first
    if (appliedFilters) {
      data = data.filter(log => {
        // Event ID filter
        if (appliedFilters.eventId && log.enriched_data?.event_id) {
          const eventId = log.enriched_data.event_id.toString().toLowerCase();
          if (!eventId.includes(appliedFilters.eventId.toLowerCase())) {
            return false;
          }
        }

        // Keywords filter (in message)
        if (appliedFilters.keywords) {
          const keywords = appliedFilters.keywords.toLowerCase().split(' ').filter(kw => kw);
          const messageText = log.message.toLowerCase();
          if (!keywords.every(keyword => messageText.includes(keyword))) {
            return false;
          }
        }

        // User filter
        if (appliedFilters.user && log.enriched_data?.user_id) {
          const userId = log.enriched_data.user_id.toString().toLowerCase();
          if (!userId.includes(appliedFilters.user.toLowerCase())) {
            return false;
          }
        }

        // Source IP filter
        if (appliedFilters.sourceIp && log.enriched_data?.ip_address) {
          const ipAddress = log.enriched_data.ip_address.toString().toLowerCase();
          if (!ipAddress.includes(appliedFilters.sourceIp.toLowerCase())) {
            return false;
          }
        }

        // Log Level filter
        if (appliedFilters.logLevel && log.enriched_data?.severity) {
          const severity = log.enriched_data.severity.toString().toLowerCase();
          if (severity !== appliedFilters.logLevel.toLowerCase()) {
            return false;
          }
        }

        // Time range filter
        if (appliedFilters.timeRangeStart || appliedFilters.timeRangeEnd) {
          const logTime = new Date(log.timestamp);
          if (appliedFilters.timeRangeStart) {
            const startTime = new Date(appliedFilters.timeRangeStart);
            if (logTime < startTime) return false;
          }
          if (appliedFilters.timeRangeEnd) {
            const endTime = new Date(appliedFilters.timeRangeEnd);
            if (logTime > endTime) return false;
          }
        }

        // Regex search filter
        if (appliedFilters.regexSearch) {
          try {
            const regex = new RegExp(appliedFilters.regexSearch, 'i');
            const searchableText = [
              log.message,
              log.source_identifier,
              log.log_file,
              log.enriched_data ? JSON.stringify(log.enriched_data) : ''
            ].join(' ');
            if (!regex.test(searchableText)) {
              return false;
            }
          } catch (e) {
            // Invalid regex, fall back to string search
            const searchableText = [
              log.message,
              log.source_identifier,
              log.log_file,
              log.enriched_data ? JSON.stringify(log.enriched_data) : ''
            ].join(' ').toLowerCase();
            if (!searchableText.includes(appliedFilters.regexSearch.toLowerCase())) {
              return false;
            }
          }
        }

        return true;
      });
    }

    // Apply search term filter
    if (debouncedSearchTerm.trim()) {
      const keywords = debouncedSearchTerm.toLowerCase().split(' ').filter(kw => kw);

      data = data.filter(log => {
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
    }

    return data;
  }, [debouncedSearchTerm, sortedData, appliedFilters]);

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
    <div className="w-full bg-gray-800 rounded-lg shadow-lg border border-gray-600">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 border-b border-gray-600 space-y-2 sm:space-y-0">
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
      <div className="p-4 border-b border-gray-600">
        <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
            type="text"
            placeholder="Quick search logs (keywords for message, source, file, enriched data...)"
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full px-10 py-3 rounded-md bg-gray-700 text-gray-200 border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
            />
            {searchTerm && (
            <button
                onClick={() => {
                    setSearchTerm('');
                    setCurrentPage(1); // Optionally reset page
                }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200 transition-colors"
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
        <div className="px-4 py-3 border-t border-gray-600 flex justify-between items-center text-sm text-gray-400">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="font-medium">Page {currentPage} of {totalPages} ({filteredData.length} entries)</span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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