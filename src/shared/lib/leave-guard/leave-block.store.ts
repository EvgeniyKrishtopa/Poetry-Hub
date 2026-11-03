import { create } from "zustand";

import { LEAVE_ANSWER, type LeaveAnswer } from "./leave-guard.constants";

/**
 * The active leave guard's question, so a control in another feature (the header's «Выйти») can ask it
 * first; a callback, never any data (edit-poem design D10). Only `useLeaveGuard` registers here.
 */
export interface LeaveBlockState {
  readonly askToLeave: (() => Promise<LeaveAnswer>) | null;
  readonly setAskToLeave: (askToLeave: (() => Promise<LeaveAnswer>) | null) => void;
}

export const useLeaveBlock = create<LeaveBlockState>()((set) => ({
  askToLeave: null,
  setAskToLeave: (askToLeave) => set({ askToLeave }),
}));

/** For a control that leaves the page without a link: the guarding page's answer, or `leave` when none guards. */
export function askBeforeLeaving(): Promise<LeaveAnswer> {
  const { askToLeave } = useLeaveBlock.getState();
  return askToLeave === null ? Promise.resolve(LEAVE_ANSWER.leave) : askToLeave();
}
