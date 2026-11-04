import { create } from "zustand";

import type { SavedCollectionNotice } from "./collection-management.types";

/**
 * Client UI state that survives one client-side navigation to the collection page: the id of the collection
 * just saved, never its content (design D8, NFR-2).
 */
export interface SavedCollectionNoticeState {
  readonly notice: SavedCollectionNotice | null;
  readonly setSavedNotice: (notice: SavedCollectionNotice) => void;
  readonly clearSavedNotice: () => void;
}

export const useSavedCollectionNotice = create<SavedCollectionNoticeState>()((set) => ({
  notice: null,
  setSavedNotice: (notice) => set({ notice }),
  clearSavedNotice: () => set({ notice: null }),
}));
