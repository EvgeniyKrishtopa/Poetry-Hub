import type { SaveNoticeProps } from "./SaveNotice.types";

/**
 * The always-mounted `role="status"` region announcing a successful save (NFR-5): a live region that
 * exists before its text changes is announced reliably, so it is never unmounted or hidden on a timer.
 */
export function SaveNotice({ message }: SaveNoticeProps) {
  return (
    <p role="status" className="text-sm text-muted">
      {message}
    </p>
  );
}
