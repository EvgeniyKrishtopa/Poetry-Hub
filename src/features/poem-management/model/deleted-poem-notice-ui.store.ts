import { create } from "zustand";

import type { DeletedPoemNotice } from "./poem-management.types";

/**
 * Client UI state that survives one client-side navigation to `/account/poems`: the delete's outcome and
 * the deleted poem's title, held only until the notice first renders (design D5, NFR-2).
 */
export interface DeletedPoemNoticeState {
  readonly notice: DeletedPoemNotice | null;
  readonly setDeletedNotice: (notice: DeletedPoemNotice) => void;
  readonly clearDeletedNotice: () => void;
}

export const useDeletedPoemNotice = create<DeletedPoemNoticeState>()((set) => ({
  notice: null,
  setDeletedNotice: (notice) => set({ notice }),
  clearDeletedNotice: () => set({ notice: null }),
}));
