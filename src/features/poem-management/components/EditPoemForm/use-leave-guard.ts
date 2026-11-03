import { useEffect, useRef } from "react";

import { useLeaveBlock } from "@/shared/lib/leave-guard/leave-block.store";
import { LEAVE_ANSWER, type LeaveAnswer } from "@/shared/lib/leave-guard/leave-guard.constants";

export interface LeaveGuardOptions {
  /** On while the form is changed or a save is sending, off after a `saved` result (design D10). */
  readonly active: boolean;
  /** Paths a link may still go to: the poem's owner page and its edit page. */
  readonly isAllowed: (pathname: string) => boolean;
  /** Opens the leave dialog's link form. */
  readonly onBlocked: () => void;
  /** Opens the leave dialog's sign-out form and answers with the author's choice. */
  readonly askToLeave: () => Promise<LeaveAnswer>;
  /** Closes the leave dialog, either form; called on the guard's cleanup. */
  readonly closePrompt: () => void;
}

const PRIMARY_BUTTON = 0;

/** A plain left click that would navigate: not cancelled already, no modifier asking for a new tab or window. */
function isPlainClick(event: MouseEvent): boolean {
  const withModifier = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
  return !event.defaultPrevented && event.button === PRIMARY_BUTTON && !withModifier;
}

/** The link around `target` when following it would leave this page for another one of ours, in this tab. */
function sameTabLink(target: EventTarget | null): HTMLAnchorElement | null {
  const link = target instanceof Element ? target.closest("a[href]") : null;
  if (!(link instanceof HTMLAnchorElement)) return null;

  const opensInThisTab = link.target === "" || link.target === "_self";
  const isOurs = link.origin === window.location.origin;
  return opensInThisTab && isOurs && !link.hasAttribute("download") ? link : null;
}

/** Cancels plain clicks on links to disallowed pages; every link on the page at once, from one listener. */
function useBlockedLinks(active: boolean, isAllowed: LeaveGuardOptions["isAllowed"], onBlocked: () => void) {
  useEffect(() => {
    if (!active) return;

    function blockLinkClick(event: MouseEvent) {
      if (!isPlainClick(event)) return;
      const link = sameTabLink(event.target);
      if (link === null || isAllowed(link.pathname)) return;
      // Capture phase plus stopPropagation: next/link's own click handler never runs.
      event.preventDefault();
      event.stopPropagation();
      onBlocked();
    }

    document.addEventListener("click", blockLinkClick, { capture: true });
    return () => document.removeEventListener("click", blockLinkClick, { capture: true });
  }, [active, isAllowed, onBlocked]);
}

/** Asks the browser to confirm a close, reload, or typed address; the browser shows its own text. */
function useUnloadConfirmation(active: boolean) {
  useEffect(() => {
    if (!active) return;

    function confirmUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    window.addEventListener("beforeunload", confirmUnload);
    return () => window.removeEventListener("beforeunload", confirmUnload);
  }, [active]);
}

/**
 * «Выйти» is a button in `auth`, out of the link listener's reach: it asks this guard's question through the
 * shared store first. At most one question is pending; cleanup (inactive, hidden, unmounted) and a newer
 * question answer it `dismissed`, and cleanup closes the dialog, so nothing waits on a page that's gone.
 */
function useSignOutQuestion(active: boolean, askToLeave: () => Promise<LeaveAnswer>, closePrompt: () => void) {
  // The latest callbacks, so a re-render with new function identities neither re-registers nor closes the dialog.
  const latest = useRef({ askToLeave, closePrompt });
  useEffect(() => {
    latest.current = { askToLeave, closePrompt };
  });

  useEffect(() => {
    if (!active) return;

    let settlePending: ((answer: LeaveAnswer) => void) | null = null;

    function dismissPending() {
      settlePending?.(LEAVE_ANSWER.dismissed);
      settlePending = null;
    }

    function ask(): Promise<LeaveAnswer> {
      dismissPending();
      return new Promise((resolve) => {
        settlePending = resolve;
        function settle(answer: LeaveAnswer) {
          // A late answer to a question already dismissed changes nothing.
          if (settlePending !== resolve) return;
          settlePending = null;
          resolve(answer);
        }
        // A dialog that fails to answer counts as dismissed: nothing is sent and nothing waits forever.
        latest.current.askToLeave().then(settle, () => settle(LEAVE_ANSWER.dismissed));
      });
    }

    const { setAskToLeave } = useLeaveBlock.getState();
    setAskToLeave(ask);
    return () => {
      dismissPending();
      latest.current.closePrompt();
      // Clear only our own registration, never one a newer guard made meanwhile.
      if (useLeaveBlock.getState().askToLeave === ask) setAskToLeave(null);
    };
  }, [active]);
}

/**
 * Keeps the author on the edit page while active and visible (edit-poem design D10). A hidden `Activity` cleans
 * the effects up, so a hidden edit page never guards another page.
 */
export function useLeaveGuard({ active, isAllowed, onBlocked, askToLeave, closePrompt }: LeaveGuardOptions): void {
  useBlockedLinks(active, isAllowed, onBlocked);
  useUnloadConfirmation(active);
  useSignOutQuestion(active, askToLeave, closePrompt);
}
