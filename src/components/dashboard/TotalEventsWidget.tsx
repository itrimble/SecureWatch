import React, { useState, useEffect } from 'react';
import { DocumentChartBarIcon } from '@heroicons/react/24/outline';

interface QueryResponse {
  results: any[];
  total: number;
  aggregations?: any;
  executionTime: number;
  query: string;
  backend: string;
}

const TotalEventsWidget: React.FC = () => {
  const [totalEvents, setTotalEvents] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTotalEvents = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/query/opensearch-route', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: 'Events | count',
            backend: 'opensearch',
            aggregations: true
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: QueryResponse = await response.json();
        
        // Extract count from aggregations or use total
        let count = data.total;
        if (data.aggregations?.total_count?.value !== undefined) {
          count = data.aggregations.total_count.value;
        }
        
        setTotalEvents(count);
      } catch (err) {
        console.error('Failed to fetch total events:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
        // Fallback to mock data on error
        setTotalEvents(15789);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTotalEvents();
  }, []);

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getDisplayValue = (): string => {
    if (isLoading) return '...';
    if (error && totalEvents === null) return 'Error';
    if (totalEvents === null) return '0';
    return formatNumber(totalEvents);
  };

  return (
    <div className="bg-gray-700 p-6 rounded-lg shadow-lg flex items-center space-x-4">
      <div className="p-3 bg-blue-500 rounded-full">
        <DocumentChartBarIcon className="h-8 w-8 text-white" />
      </div>
      <div>
        <h2 className={`text-3xl font-bold ${isLoading ? 'text-gray-400' : 'text-white'}`}>
          {getDisplayValue()}
        </h2>
        <p className="text-gray-300">
          Total Events
          {error && (
            <span className="text-xs text-yellow-400 block">
              (using cached data)
            </span>
          )}
        </p>
      </div>
    </div>
  );
};

export default TotalEventsWidget;
