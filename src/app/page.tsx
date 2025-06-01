'use client';
import { useState, useEffect } from 'react';
import { useSearchStore } from '@/store/searchStore'; // Import Zustand store
import GenericResultsTable from '@/components/explorer/GenericResultsTable'; // Import the new table

// MockEvent interface and fetchMockEvents are removed

export default function Home() {
  const [resultsData, setResultsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const submittedQuery = useSearchStore((state) => state.submittedQuery);
  // const clearSubmittedQuery = useSearchStore((state) => state.clearSubmittedQuery); // Available if needed

  useEffect(() => {
    const fetchData = async () => {
      // This function is called only when submittedQuery is a non-empty string
      setIsLoading(true);
      setApiError(null);
      setResultsData([]); // Clear previous results

      try {
        const response = await fetch('/api/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: submittedQuery }), // submittedQuery is guaranteed non-null, non-empty here
        });

        const responseBody = await response.json();

        if (response.ok) {
          setResultsData(responseBody.data || []); // Ensure data is always an array
        } else {
          setApiError(responseBody.error || `API Error: ${response.status} ${response.statusText}`);
          setResultsData([]);
        }
      } catch (err: any) {
        console.error('Fetch API Error:', err);
        setApiError(`Network or Fetch Error: ${err.message || 'Unknown fetch error'}`);
        setResultsData([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (submittedQuery === null) { // Initial state or cleared
      setResultsData([]);
      setIsLoading(false);
      setApiError(null);
    } else if (submittedQuery.trim() === '') { // Empty query submitted
      setResultsData([]);
      setIsLoading(false);
      setApiError('Search query cannot be empty. Please enter a KQL query.');
    } else { // Valid query string to attempt fetch
      fetchData();
    }
  }, [submittedQuery]); // Dependency array for useEffect

  return (
    <div className="flex flex-col h-full bg-gray-800 text-gray-100">
      <div className="p-4 bg-gray-700 text-center text-white border-b border-gray-600">
        <p className="text-lg font-semibold">Search & Explore</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-gray-700 p-4 overflow-y-auto border-r border-gray-600">
          <h3 className="text-md font-semibold mb-3">Filters</h3>
          <p className="text-sm text-gray-400">(Faceted filtering options will appear here)</p>
          {/* Example filter sections */}
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-1">Source IP</h4>
            <p className="text-xs text-gray-500">(List of IPs)</p>
          </div>
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-1">Event ID</h4>
            <p className="text-xs text-gray-500">(List of Event IDs)</p>
          </div>
        </aside>

        <main className="flex-1 flex flex-col p-4 overflow-y-auto">
          <div className="h-32 bg-gray-700 rounded-md mb-4 flex items-center justify-center">
            <p className="text-sm text-gray-400">(Interactive Timeline Visualization)</p>
          </div>

          <div className="mb-4 flex space-x-2 border-b border-gray-600">
            <button className="px-4 py-2 text-sm font-medium text-blue-400 border-b-2 border-blue-400 focus:outline-none">Events</button>
            <button className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-200 focus:outline-none">Statistics</button>
            <button className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-200 focus:outline-none">Patterns</button>
            <button className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-200 focus:outline-none">Alerts</button>
          </div>

          <div className="flex-grow bg-gray-700 rounded-md p-4">
            {isLoading && <p className="text-sm text-gray-300">Loading results...</p>}
            {apiError && !isLoading && <p className="text-sm text-red-400">Error: {apiError}</p>}

            {!isLoading && !apiError && resultsData.length > 0 && (
              <GenericResultsTable
                data={resultsData}
                isLoading={isLoading} // Pass isLoading
                error={apiError}     // Pass apiError to error prop
                title="Query Results"  // Example title
              />
            )}

            {!isLoading && !apiError && resultsData.length === 0 && submittedQuery !== null && submittedQuery.trim() !== '' && (
              <p className="text-sm text-gray-300">No results found for your query.</p>
            )}

            {/* Initial prompt message when submittedQuery is null and not loading and no error */}
            {!isLoading && !apiError && submittedQuery === null && (
              <p className="text-sm text-gray-300">Enter a query in the search bar above and click Search.</p>
            )}

            {/* Message for empty query submission is handled by apiError display: "Error: Search query cannot be empty..." */}
          </div>
        </main>
      </div>
    </div>
  );
}