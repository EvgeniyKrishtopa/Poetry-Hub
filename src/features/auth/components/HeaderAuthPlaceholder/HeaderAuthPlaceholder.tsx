/**
 * The header's empty session slot: kept at the session part's width so nothing shifts. Shown while
 * the session loads and when it can't be checked (add-author-profiles FR-20).
 */
export function HeaderAuthPlaceholder() {
  return <div aria-hidden="true" className="min-w-24" />;
}
