import { create } from "zustand";

import type { PoemNotice } from "./poem-management.types";

/**
 * Client UI state that survives one client-side navigation: the id of the poem just created or saved and
 * which of the two it was, never its content (add-poem-creation design D8, edit-poem D7, NFR-2). A reload
 * starts empty, so the notice can't repeat.
 */
export interface PoemNoticeState {
  readonly notice: PoemNotice | null;
  readonly setPoemNotice: (notice: PoemNotice) => void;
  readonly clearPoemNotice: () => void;
}

export const useCreatedPoemNotice = create<PoemNoticeState>()((set) => ({
  notice: null,
  setPoemNotice: (notice) => set({ notice }),
  clearPoemNotice: () => set({ notice: null }),
}));
