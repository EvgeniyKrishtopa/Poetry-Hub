import { create } from "zustand";

/**
 * Client UI state that survives one client-side navigation to `/login`: a flag that a write found the
 * session expired, never any data (delete-poem design D6).
 */
export interface SessionExpiredNoticeState {
  readonly expired: boolean;
  readonly markSessionExpired: () => void;
  readonly clearSessionExpired: () => void;
}

export const useSessionExpiredNotice = create<SessionExpiredNoticeState>()((set) => ({
  expired: false,
  markSessionExpired: () => set({ expired: true }),
  clearSessionExpired: () => set({ expired: false }),
}));
