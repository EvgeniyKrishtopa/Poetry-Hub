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

/**
 * For a control that leaves the page without a link: `true` when a page with unsaved changes is guarding and
 * has shown its own "save first" prompt, so the control must stop there.
 */
export function askToStayOnPage(): boolean {
  const { block } = useLeaveBlock.getState();
  if (block === null) return false;
  block();
  return true;
}
