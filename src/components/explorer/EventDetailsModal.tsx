// src/components/explorer/EventDetailsModal.tsx
'use client';

import React from 'react'; // Removed useState, useEffect as Brave Search is removed

// Removed LogEntry import, searchBrave, BraveSearchResultItem, and lucide-react icons not used by generic display

interface EventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataItem: Record<string, any> | null; // Changed from logEntry: LogEntry
}

const EventDetailsModal: React.FC<EventDetailsModalProps> = ({ isOpen, onClose, dataItem }) => {
  // Removed Brave Search state (braveSearchResults, isBraveSearchLoading, braveSearchError, currentSearchTerm)
  // Removed useEffect related to Brave Search reset

  if (!isOpen || !dataItem) {
    return null;
  }

  // Removed handlePivot function
  // Removed handleBraveSearch function
  // Removed renderEnrichedData function (dynamic loop will handle it)
  // Removed SearchButton component

  const generateTitle = () => {
    if (dataItem?.id) return `Item Details (ID: ${dataItem.id})`;
    if (dataItem?.Id) return `Item Details (ID: ${dataItem.Id})`;
    if (dataItem?.name) return `Item Details: ${dataItem.name}`;
    if (dataItem?.Name) return `Item Details: ${dataItem.Name}`;
    return "Item Details";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out">
      <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl max-w-2xl w-full text-gray-100 transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modalFadeInScale">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-700">
          <h2 className="text-lg md:text-xl font-semibold">{generateTitle()}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors text-2xl p-1"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>
        
        <div className="space-y-1 text-sm max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar"> {/* Reduced max-h slightly */}
          {/* Dynamic display of dataItem properties */}
          {Object.entries(dataItem).map(([key, value]) => {
            const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
            let displayValue: React.ReactNode;

            if (value === null || value === undefined) {
              displayValue = <span className="text-gray-500">N/A</span>;
            } else if (typeof value === 'object') {
              displayValue = <pre className="whitespace-pre-wrap text-xs bg-gray-900 p-2 rounded-md custom-scrollbar overflow-x-auto">{JSON.stringify(value, null, 2)}</pre>;
            } else {
              displayValue = String(value);
            }

            return (
              <div key={key} className="py-2 grid grid-cols-3 gap-2 border-b border-gray-700 last:border-b-0">
                <span className="font-semibold text-gray-400 col-span-1 truncate pr-1" title={formattedKey}>{formattedKey}:</span>
                <div className="text-gray-200 col-span-2 break-words">{displayValue}</div>
              </div>
            );
          })}
          {/* Removed hardcoded fields, Pivot Actions, and Brave Search sections */}
        </div>

        <div className="mt-5 pt-4 flex justify-end border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
      {/* Global styles for modal animation and scrollbar (can be moved to globals.css if preferred) */}
      <style jsx global>{`
        @keyframes modalFadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-modalFadeInScale { animation: modalFadeInScale 0.3s ease-out forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #374151; } /* bg-gray-700 */
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 4px; } /* bg-gray-600 */
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #556372; }
        /* .bg-gray-750 { background-color: #3f4b5a; } // No longer used here explicitly */
      `}</style>
    </div>
  );
};

export default EventDetailsModal;
