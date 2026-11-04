import type { LeaveAnswer } from "@/shared/lib/leave-guard/leave-guard.constants";

/** The feature's copy of poem-management's guard options (design D12). */
export interface LeaveGuardOptions {
  /** On while the form is changed or a save is sending, off after a `saved` result. */
  readonly active: boolean;
  /** Paths a link may still go to: the collection's page and its edit page. */
  readonly isAllowed: (pathname: string) => boolean;
  /** Opens the leave dialog's link form. */
  readonly onBlocked: () => void;
  /** Opens the leave dialog's sign-out form and answers with the author's choice. */
  readonly askToLeave: () => Promise<LeaveAnswer>;
  /** Closes the leave dialog, either form; called on the guard's cleanup. */
  readonly closePrompt: () => void;
}

/** Blocks links, warns on unload, and registers the «Выйти» question while active (design D12). */
export function useLeaveGuard(options: LeaveGuardOptions): void {
  void options;
  throw new Error("not implemented");
}
