import { create } from "zustand";

/** Client UI state that survives one client-side navigation: the poem just created (design D8). */
export interface CreatedPoemNoticeState {
  readonly createdPoemId: string | null;
  readonly setCreatedPoemId: (poemId: string) => void;
  readonly clearCreatedPoemId: () => void;
}

export const useCreatedPoemNotice = create<CreatedPoemNoticeState>()(() => ({
  createdPoemId: null,
  setCreatedPoemId: (poemId) => {
    void poemId;
    throw new Error("not implemented");
  },
  clearCreatedPoemId: () => {
    throw new Error("not implemented");
  },
}));
