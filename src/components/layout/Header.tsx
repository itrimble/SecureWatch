'use client';
import React from 'react'; // Removed useState as it's now in Zustand
import Link from 'next/link';
import { useSearchStore } from '@/store/searchStore'; // Import Zustand store

const Header: React.FC = () => {
  const { searchQuery, setSearchQuery, submitQuery } = useSearchStore();

  const handleSearchButtonClick = () => {
    submitQuery();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault(); // Prevent newline in textarea
      submitQuery();        // Submit the query
    }
    // If Shift+Enter, default behavior (newline) is allowed.
  };

  return (
    <header className="bg-gray-800 text-white p-4 shadow-md border-b border-gray-700 flex items-center space-x-4">
      <div>
        <Link href="/" legacyBehavior>
          <a className="text-lg font-semibold hover:text-blue-300">Logo</a>
        </Link>
      </div>
      <div className="flex-grow flex justify-center items-center space-x-2">
        <textarea
          placeholder="Enter your KQL query (Shift+Enter for newlines)..." // Updated placeholder
          rows={2}
          className="w-full max-w-2xl p-2 rounded-md bg-gray-700 text-gray-100 border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown} // Attach the keydown handler
        />
        <button
          onClick={handleSearchButtonClick} // Renamed handler for clarity
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-md text-sm font-medium"
        >
          Search
        </button>
      </div>
      <div className="w-16">
        {/* Empty div for balance or future icons */}
      </div>
    </header>
  );
};
export default Header;
