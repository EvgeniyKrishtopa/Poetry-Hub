import { create } from "zustand";

import type { CollectionListNotice } from "./collection-management.types";

/**
 * Client UI state that survives one client-side navigation to `/account/poems`: the write's outcome and the
 * collection's title, held only until the notice first renders (design D8, NFR-2).
 */
export interface CollectionListNoticeState {
  readonly notice: CollectionListNotice | null;
  readonly setListNotice: (notice: CollectionListNotice) => void;
  readonly clearListNotice: () => void;
}

export const useCollectionListNotice = create<CollectionListNoticeState>()((set) => ({
  notice: null,
  setListNotice: (notice) => set({ notice }),
  clearListNotice: () => set({ notice: null }),
}));
