import { create } from "zustand";

import type { FailedNoticeValue } from "./violation.types";

/**
 * Client UI state that survives one client-side navigation to the author page: the outcome of a failed standard
 * email after an admin delete, held only until the notice first renders (design D7).
 */
export interface ViolationNoticeState {
  readonly notice: FailedNoticeValue | null;
  readonly setFailedNotice: (notice: FailedNoticeValue) => void;
  readonly clearFailedNotice: () => void;
}

export const useViolationNotice = create<ViolationNoticeState>()((set) => ({
  notice: null,
  setFailedNotice: (notice) => set({ notice }),
  clearFailedNotice: () => set({ notice: null }),
}));
