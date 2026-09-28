import { create } from "zustand";

/**
 * Client-only UI state for the poems feature.
 * Server data (the poems themselves) lives in TanStack Query, never here.
 */
interface PoemsUiState {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  resetSearch: () => void;
}

export const usePoemsUiStore = create<PoemsUiState>()((set) => ({
  searchQuery: "",
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  resetSearch: () => set({ searchQuery: "" }),
}));
