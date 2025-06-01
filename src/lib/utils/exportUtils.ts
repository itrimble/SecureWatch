// src/lib/utils/exportUtils.ts

// Removed: import type { LogEntry } from '@/lib/types/log_entry';

// Helper function to generate filename
export const generateFilename = (extension: string): string => {
  const date = new Date();
  const pad = (num: number) => num.toString().padStart(2, '0');
  // Format: YYYY-MM-DD_HH-MM-SS
  const timestamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
  return `export_data_${timestamp}.${extension}`; // Made filename more generic
};

// Helper function to escape CSV values
export const escapeCsvValue = (value: any): string => {
  if (value == null) return ''; // Handle null or undefined by returning an empty string
  const stringValue = String(value);
  // If value contains comma, newline, or double quote, enclose in double quotes
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    // Double up existing double quotes
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

// Common Download Trigger Function
export const triggerDownload = (content: string, filename: string, contentType: string) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    console.warn('triggerDownload cannot be executed in a non-browser environment.');
    return;
  }
  const blob = new Blob([content], { type: contentType });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href); // Clean up
};


// CSV Export Function - Now generic
export const exportToCsv = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    console.warn('No data provided for CSV export.');
    return;
  }

  // Dynamically generate headers from the keys of the first object
  const headers = Object.keys(data[0] || {}); // Use data[0] or an empty object if data[0] is null/undefined
  const formattedHeaders = headers.map(header =>
    // Simple formatting: replace underscores, capitalize first letter of each word segment
    header.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
  );

  const csvRows = [
    formattedHeaders.join(','), // Header row
    ...data.map(item => {
      return headers.map(header => {
        const cellData = item[header];
        // Handle objects by stringifying them; primitives are handled by escapeCsvValue
        if (typeof cellData === 'object' && cellData !== null) {
          return escapeCsvValue(JSON.stringify(cellData));
        }
        return escapeCsvValue(cellData); // escapeCsvValue handles null/undefined
      }).join(',');
    })
  ];
  
  const csvString = csvRows.join('\n');
  triggerDownload(csvString, filename, 'text/csv;charset=utf-8;');
};

// JSON Export Function - Now generic
export const exportToJson = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    console.warn('No data provided for JSON export.');
    return;
  }

  const jsonString = JSON.stringify(data, null, 2); // Pretty print with 2 spaces
  triggerDownload(jsonString, filename, 'application/json;charset=utf-8;');
};
