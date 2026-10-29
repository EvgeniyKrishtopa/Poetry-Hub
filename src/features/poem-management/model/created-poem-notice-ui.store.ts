import { create } from "zustand";

/**
 * Client UI state that survives one client-side navigation: the id of the poem just created, never its
 * content (design D8, NFR-2). A reload starts empty, so the notice can't repeat.
 */
export interface CreatedPoemNoticeState {
  readonly createdPoemId: string | null;
  readonly setCreatedPoemId: (poemId: string) => void;
  readonly clearCreatedPoemId: () => void;
}

export const useCreatedPoemNotice = create<CreatedPoemNoticeState>()((set) => ({
  createdPoemId: null,
  setCreatedPoemId: (poemId) => set({ createdPoemId: poemId }),
  clearCreatedPoemId: () => set({ createdPoemId: null }),
}));
