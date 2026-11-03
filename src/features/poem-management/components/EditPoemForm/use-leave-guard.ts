export interface LeaveGuardOptions {
  /** On while the form is changed or a save is sending, off after a `saved` result (design D10). */
  readonly active: boolean;
  /** Paths a link may still go to: the poem's owner page and its edit page. */
  readonly isAllowed: (pathname: string) => boolean;
  readonly onBlocked: () => void;
}

/**
 * Blocks link clicks to other pages, asks the browser to confirm a close or reload, and registers `onBlocked`
 * for «Выйти», all only while active and visible (edit-poem design D10).
 */
export function useLeaveGuard(options: LeaveGuardOptions): void {
  void options;
  throw new Error("not implemented");
}
