"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A value shown once: read on the first render and again each time a hidden route is revealed, cleared
 * once read, and dropped when the page is left (delete-poem design D5).
 *
 * `read` and `clear` must be stable (module-level functions): a new function on every render re-runs the
 * effect, which clears the store and reschedules the dismissal each time.
 */
export function useOneTimeValue<T>(read: () => T | null, clear: () => void): T | null {
  // A snapshot, not a live selector, so clearing the store doesn't hide the value.
  const [value, setValue] = useState(read);
  const [dismissed, setDismissed] = useState(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    // Strict Mode's dev re-run follows its cleanup at once, so it cancels the dismissal and the value stays
    // on first show. A page Next hides for Back/Forward (React `Activity`) runs only the cleanup, so the
    // dismissal lands while hidden, and the value is gone when the page shows again.
    clearTimeout(dismissTimer.current);
    // A revealed route re-runs this effect but not the initializer, so a value written while it was
    // hidden (a `router.replace` back to an already-visited page) is picked up here (Gate 1 P1). The
    // update waits a microtask, like a store subscription's callback would: the effect already runs after
    // the paint, so nothing visible changes, and the render isn't cascaded from inside the effect.
    const fresh = read();
    clear();
    if (fresh !== null) {
      queueMicrotask(() => {
        setValue(fresh);
        setDismissed(false);
      });
    }
    return () => {
      // Left running on a real unmount on purpose: React ignores a state update there, and this cleanup
      // can't tell an unmount from an `Activity` hide.
      dismissTimer.current = setTimeout(() => setDismissed(true));
    };
  }, [read, clear]);

  return dismissed ? null : value;
}
