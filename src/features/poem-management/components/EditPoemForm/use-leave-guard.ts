import { useEffect } from "react";

import { useLeaveBlock } from "@/shared/lib/leave-guard/leave-block.store";

export interface LeaveGuardOptions {
  /** On while the form is changed or a save is sending, off after a `saved` result (design D10). */
  readonly active: boolean;
  /** Paths a link may still go to: the poem's owner page and its edit page. */
  readonly isAllowed: (pathname: string) => boolean;
  readonly onBlocked: () => void;
}

const PRIMARY_BUTTON = 0;

/** The same-origin link a plain left click on `event` would follow in this tab, or `null`. */
function linkFollowedInThisTab(event: MouseEvent): HTMLAnchorElement | null {
  if (event.button !== PRIMARY_BUTTON) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  if (!(event.target instanceof Element)) return null;

  const link = event.target.closest("a[href]");
  if (!(link instanceof HTMLAnchorElement)) return null;
  if (link.hasAttribute("download")) return null;
  if (link.target !== "" && link.target !== "_self") return null;
  if (link.origin !== window.location.origin) return null;
  return link;
}

/**
 * Blocks link clicks to other pages, asks the browser to confirm a close or reload, and registers `onBlocked`
 * for «Выйти», all only while active and visible (edit-poem design D10). A hidden `Activity` cleans the effect
 * up, so a hidden edit page never guards another page.
 */
export function useLeaveGuard({ active, isAllowed, onBlocked }: LeaveGuardOptions): void {
  useEffect(() => {
    if (!active) return;

    function blockLinkClick(event: MouseEvent) {
      const link = linkFollowedInThisTab(event);
      if (link === null || isAllowed(link.pathname)) return;
      // Capture phase plus stopPropagation: next/link's own click handler never runs.
      event.preventDefault();
      event.stopPropagation();
      onBlocked();
    }

    function confirmUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    const { setBlock } = useLeaveBlock.getState();
    document.addEventListener("click", blockLinkClick, { capture: true });
    window.addEventListener("beforeunload", confirmUnload);
    setBlock(onBlocked);

    return () => {
      document.removeEventListener("click", blockLinkClick, { capture: true });
      window.removeEventListener("beforeunload", confirmUnload);
      // Clear only our own block, never one a newer guard registered meanwhile.
      if (useLeaveBlock.getState().block === onBlocked) setBlock(null);
    };
  }, [active, isAllowed, onBlocked]);
}
