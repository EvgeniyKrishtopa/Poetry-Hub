import { create } from "zustand";

/**
 * The active leave guard's "blocked" callback, so a control in another feature (the header's «Выйти») can ask
 * it first; a callback, never any data (edit-poem design D10).
 */
export interface LeaveBlockState {
  readonly block: (() => void) | null;
  readonly setBlock: (block: (() => void) | null) => void;
}

export const useLeaveBlock = create<LeaveBlockState>()((set) => ({
  block: null,
  setBlock: (block) => set({ block }),
}));
