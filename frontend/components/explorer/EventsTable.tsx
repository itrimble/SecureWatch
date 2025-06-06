"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { LogEntry } from '@/lib/types/log_entry'; 
import EventDetailsModal from './EventDetailsModal';
import useDebounce from '@/hooks/useDebounce'; // Import the hook
import { XCircle, Search as SearchIcon, FileText, FileJson } from 'lucide-react'; // Added icons
import { generateFilename, exportToCsv, exportToJson } from '@/lib/utils/exportUtils'; // Import from new location

const VIRTUAL_ITEMS_BUFFER = 50; // Show 50 items at a time in virtual scroller
const ROW_HEIGHT = 60; // Fixed row height for virtualization

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
  const [selectedEvent, setSelectedEvent] = useState<LogEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Default sort by timestamp descending
  const [sortKey, setSortKey] = useState<LogEntrySortKey>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // Virtualization setup
  const parentRef = useRef<HTMLDivElement>(null);
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // Debounce search term by 300ms

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

  // Setup virtual scroller
  const virtualizer = useVirtualizer({
    count: filteredData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10, // Render 10 extra items outside visible area for smooth scrolling
  });

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleRowClick = (log: LogEntry) => {
    setSelectedEvent(log);
    setIsModalOpen(true);
    // if (onOpenModal) onOpenModal(log); // Use this if modal state is lifted
  };

  // Removed pagination handlers since we're using virtualization

  const handleSort = (key: LogEntrySortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
    // Reset scroll position when sorting
    if (parentRef.current) {
      parentRef.current.scrollTop = 0;
    }
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
                    // Reset scroll position when clearing search
                    if (parentRef.current) {
                      parentRef.current.scrollTop = 0;
                    }
                }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200 transition-colors"
                aria-label="Clear search"
            >
                <XCircle className="h-5 w-5" />
            </button>
            )}
        </div>
      </div>

      {/* Virtual Table Container */}
      <div className="flex-1 overflow-auto">
        {/* Fixed Header */}
        <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-700">
          <div className="min-w-full">
            <div className="grid grid-cols-12 gap-2 px-3 py-3">
              {[
                { label: 'Timestamp', key: 'timestamp' as LogEntrySortKey, sortable: true, cols: 3 },
                { label: 'Source Identifier', key: 'source_identifier' as LogEntrySortKey, sortable: true, cols: 2 },
                { label: 'Log File', key: 'log_file' as LogEntrySortKey, sortable: true, cols: 2 },
                { label: 'Message', key: null, sortable: false, cols: 4 },
                { label: 'Actions', key: null, sortable: false, cols: 1 },
              ].map(col => (
                <div 
                  key={col.label}
                  className={`col-span-${col.cols} text-left text-xs font-medium text-gray-300 uppercase tracking-wider ${col.sortable ? 'cursor-pointer hover:bg-gray-700 px-2 py-1 rounded' : ''}`}
                  onClick={() => col.sortable && col.key && handleSort(col.key as LogEntrySortKey)}
                >
                  {col.label}
                  {col.sortable && col.key && getSortIndicator(col.key as LogEntrySortKey)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Virtual Scrollable Content */}
        <div
          ref={parentRef}
          className="h-96 overflow-auto bg-gray-800"
          style={{ contain: 'strict' }}
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const log = filteredData[virtualItem.index];
              return (
                <div
                  key={virtualItem.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                  className="border-b border-gray-700 hover:bg-gray-700 transition-colors duration-150"
                >
                  <div className="grid grid-cols-12 gap-2 px-3 py-3 h-full items-center">
                    <div className="col-span-3 text-sm text-gray-300 truncate">
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                    <div className="col-span-2 text-sm font-medium text-gray-100 truncate">
                      {log.source_identifier}
                    </div>
                    <div className="col-span-2 text-sm text-gray-300 truncate">
                      {log.log_file}
                    </div>
                    <div className="col-span-4 text-sm text-gray-300 truncate" title={log.message}>
                      {log.message}
                    </div>
                    <div className="col-span-1 text-sm">
                      <button 
                        onClick={() => handleRowClick(log)}
                        className="text-blue-400 hover:text-blue-300 text-xs whitespace-nowrap"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {filteredData.length === 0 && !isLoading && (
              <div className="flex items-center justify-center h-32 text-center text-sm text-gray-400">
                No log entries found matching your criteria.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Footer - shows total entries instead of pagination */}
      <div className="px-4 py-3 border-t border-gray-600 flex justify-center items-center text-sm text-gray-400">
        <span className="font-medium">
          {filteredData.length.toLocaleString()} entries total
          {filteredData.length !== logEntries.length && ` (filtered from ${logEntries.length.toLocaleString()})`}
        </span>
      </div>

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