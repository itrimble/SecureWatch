"use client";

import React, { useState, useEffect } from 'react';
import AdvancedFilterPanel from '@/components/explorer/AdvancedFilterPanel';
import EventsTable from '@/components/explorer/EventsTable';
import type { LogEntry } from '@/lib/types/log_entry';
// import EventDetailsModal from '@/components/explorer/EventDetailsModal'; // Will be used later

const ExplorerPage: React.FC = () => {
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<any>(null);

  // Placeholder state for modal - can be lifted here or managed in EventsTable
  // const [isModalOpen, setIsModalOpen] = useState(false);
  // const [selectedEvent, setSelectedEvent] = useState<LogEntry | null>(null);

  // const handleOpenModal = (eventData: LogEntry) => {
  //   setSelectedEvent(eventData);
  //   setIsModalOpen(true);
  // };

  // const handleCloseModal = () => {
  //   setIsModalOpen(false);
  //   setSelectedEvent(null);
  // };

  const handleFiltersApplied = (filters: any) => {
    setAppliedFilters(filters);
    console.log('Filters applied in explorer:', filters);
  };

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Default limit to 500 logs, sorted by most recent by the API
        const response = await fetch('/api/logs?limit=500'); 
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch logs: ${response.status} ${response.statusText} - ${errorText}`);
        }
        const data: LogEntry[] = await response.json();
        setLogEntries(data);
      } catch (err: any) {
        console.error("Error fetching logs:", err);
        setError(err.message || 'Failed to fetch logs. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, []); // Empty dependency array means this runs once on mount

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Event Log Explorer</h1>
        <p className="text-muted-foreground mt-2">Search and analyze security events from your systems</p>
      </div>
      
      <AdvancedFilterPanel onFiltersApplied={handleFiltersApplied} />
      <EventsTable 
        logEntries={logEntries}
        isLoading={isLoading}
        error={error}
        appliedFilters={appliedFilters}
        // onOpenModal={handleOpenModal} // Pass this if modal is enabled
      />
    </div>
  );
};

export default ExplorerPage;
