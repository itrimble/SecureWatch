// src/components/explorer/GenericResultsTable.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { SearchIcon, XCircle, Download } from 'lucide-react'; // Added Download icon
import EventDetailsModal from './EventDetailsModal';
import { exportToCsv, exportToJson, generateFilename } from '../../lib/utils/exportUtils'; // Corrected path

type SortOrder = 'asc' | 'desc';

interface GenericResultsTableProps {
  data: any[];
  isLoading?: boolean;
  error?: string | null;
  title?: string;
  itemsPerPage?: number;
  defaultSortKey?: string;
  defaultSortOrder?: SortOrder;
}

const GenericResultsTable: React.FC<GenericResultsTableProps> = ({
  data,
  isLoading = false,
  error = null,
  title = "Search Results",
  itemsPerPage = 10,
  defaultSortKey,
  defaultSortOrder = 'asc',
}) => {
  const [selectedItem, setSelectedItem] = useState<Record<string, any> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false); // State for modal visibility
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');

  const columnHeaders = useMemo(() => {
    if (data && data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
      return Object.keys(data[0]);
    }
    return [];
  }, [data]);

  const [sortKey, setSortKey] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<SortOrder>(defaultSortOrder);

  useEffect(() => {
    let newInitialSortKey = '';
    if (columnHeaders.length > 0) {
        if (defaultSortKey && columnHeaders.includes(defaultSortKey)) {
            newInitialSortKey = defaultSortKey;
        } else if (!defaultSortKey || !columnHeaders.includes(defaultSortKey)) {
            newInitialSortKey = columnHeaders[0];
        }
    }
    if (newInitialSortKey !== sortKey || (sortKey && !columnHeaders.includes(sortKey))) {
        setSortKey(newInitialSortKey);
    }
  }, [columnHeaders, defaultSortKey, sortKey]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchTerm(searchTerm.toLowerCase()), 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [data, debouncedSearchTerm, sortKey, sortOrder]);

  const sortedData = useMemo(() => {
    if (!sortKey || !data || data.length === 0) return [...data];
    const dataCopy = [...data];
    dataCopy.sort((a, b) => {
      const valA = a[sortKey]; const valB = b[sortKey];
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      let comparison = 0;
      const numA = parseFloat(String(valA)); const numB = parseFloat(String(valB));
      if (!isNaN(numA) && !isNaN(numB)) comparison = numA - numB;
      else {
        const dateA = new Date(String(valA)); const dateB = new Date(String(valB));
        if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) comparison = dateA.getTime() - dateB.getTime();
        else comparison = String(valA).toLowerCase().localeCompare(String(valB).toLowerCase());
      }
      return sortOrder === 'asc' ? comparison : comparison * -1;
    });
    return dataCopy;
  }, [data, sortKey, sortOrder]);

  const filteredData = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return sortedData;
    const keywords = debouncedSearchTerm.split(' ').filter(kw => kw);
    if (keywords.length === 0) return sortedData;

    return sortedData.filter(item => {
      const searchableText = Object.values(item)
        .map(value => {
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') {
            try { return JSON.stringify(value).toLowerCase(); } catch { return ''; }
          }
          return String(value).toLowerCase();
        }).join(' ');
      return keywords.every(keyword => searchableText.includes(keyword));
    });
  }, [sortedData, debouncedSearchTerm]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const handleSort = (key: string) => {
    if (key === sortKey) setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortOrder('asc'); }
  };

  const getSortIndicator = (key: string): string => (key === sortKey ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : '');

  const handleRowClick = (item: Record<string, any>) => {
    setSelectedItem(item);
    setIsModalOpen(true); // Open the modal
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  if (isLoading) return <div className="p-4 text-center text-gray-400">{title}: Loading data...</div>;
  if (error) return <div className="p-4 text-center text-red-400">{title}: Error - {error}</div>;
  if (data.length > 0 && columnHeaders.length === 0) return <div className="p-4 text-center text-gray-400">{title}: Data items have no properties to display.</div>;

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              placeholder="Search table data..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full p-2 pl-10 rounded-md bg-gray-700 text-gray-200 border border-gray-600 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200"
                aria-label="Clear search"
              >
                <XCircle className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <button
              onClick={() => exportToCsv(filteredData, generateFilename('csv'))}
              disabled={filteredData.length === 0}
              className="px-3 py-2 text-xs font-medium text-gray-200 bg-gray-600 hover:bg-gray-500 rounded-md flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export as CSV"
            >
              <Download size={14} className="mr-1" /> CSV
            </button>
            <button
              onClick={() => exportToJson(filteredData, generateFilename('json'))}
              disabled={filteredData.length === 0}
              className="px-3 py-2 text-xs font-medium text-gray-200 bg-gray-600 hover:bg-gray-500 rounded-md flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export as JSON"
            >
              <Download size={14} className="mr-1" /> JSON
            </button>
          </div>
        </div>
      </div>

      {data.length === 0 && !isLoading && !error && (<p className="text-gray-400 text-center py-4">No data to display.</p>)}

      {data.length > 0 && (
        <div className="overflow-x-auto shadow-md rounded-lg">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-900 sticky top-0 z-10">
              <tr>
                {columnHeaders.map(headerKey => (
                  <th key={headerKey} scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-700" onClick={() => handleSort(headerKey)}>
                    {headerKey.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}
                    {getSortIndicator(headerKey)}
                  </th>
                ))}
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {paginatedData.length > 0 ? (
                paginatedData.map((item, rowIndex) => (
                  <tr key={item.id || item.Id || item.key || `row-${rowIndex}`} className="hover:bg-gray-600 transition-colors duration-150">
                    {columnHeaders.map(headerKey => {
                      const cellData = item[headerKey];
                      let displayData: React.ReactNode;
                      if (typeof cellData === 'object' && cellData !== null) displayData = JSON.stringify(cellData);
                      else if (cellData === null || cellData === undefined) displayData = <span className="text-gray-500">N/A</span>;
                      else displayData = String(cellData);
                      return (
                        <td key={`${headerKey}-${rowIndex}`} className="px-3 py-3 whitespace-nowrap text-sm text-gray-300 max-w-xs truncate" title={typeof cellData === 'object' || cellData === null || cellData === undefined ? undefined : String(cellData)}>
                          {displayData}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 whitespace-nowrap text-sm">
                      <button onClick={() => handleRowClick(item)} className="text-blue-400 hover:text-blue-300 font-medium">View Details</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columnHeaders.length + 1} className="text-center py-4 text-gray-400">
                    {debouncedSearchTerm.trim() ? "No entries match your current filter." : "No data available for the current page or filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {data.length > 0 && totalPages > 1 && (
         <div className="mt-4 flex flex-col sm:flex-row justify-between items-center text-sm text-gray-400 gap-2">
           <span>Page {currentPage} of {totalPages} (Total items: {filteredData.length})</span>
           <div className="flex gap-2">
             <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border border-gray-600 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
             <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border border-gray-600 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
           </div>
         </div>
      )}
      {isModalOpen && selectedItem && (
        <EventDetailsModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedItem(null); // Clear selected item when closing
          }}
          dataItem={selectedItem}
        />
      )}
    </div>
  );
};

export default GenericResultsTable;
