import type { PropsWithChildren } from "react";

// Placement marker for pages that will need a signed-in reader. It enforces nothing yet — a page placed
// here is NOT protected. The future auth change owns enforcement (proxy or DAL/page checks); a
// layout-only check is insufficient, because a shared layout does not re-render on client navigation
// between sibling pages.
export default function AuthorizedLayout({ children }: PropsWithChildren) {
  return children;
}
