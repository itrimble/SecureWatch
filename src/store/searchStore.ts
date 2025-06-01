// src/store/searchStore.ts
import { create } from 'zustand';

interface SearchState {
  searchQuery: string; // Current text in the search input
  submittedQuery: string | null; // Query submitted for execution
  setSearchQuery: (query: string) => void;
  submitQuery: () => void; // Submits the current searchQuery
  clearSubmittedQuery: () => void; // To reset after execution or error
}

export const useSearchStore = create<SearchState>((set, get) => ({
  searchQuery: '',
  submittedQuery: null,
  setSearchQuery: (query) => set({ searchQuery: query }),
  submitQuery: () => {
    const currentQuery = get().searchQuery;
    if (currentQuery.trim() === '') {
     set({ submittedQuery: '' }); // Explicitly set to empty string if search is empty
    } else {
     set({ submittedQuery: currentQuery });
    }
  },
  clearSubmittedQuery: () => set({ submittedQuery: null }),
}));
