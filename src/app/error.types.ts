export interface RootErrorProps {
  error: Error & { digest?: string };
  /** Clears the boundary without re-fetching; the screen pairs it with `router.refresh()` (design D11). */
  reset: () => void;
  /** Passed by Next; not called, because it leaves the breadcrumb slot stale (design D11). */
  retry: () => void;
}
