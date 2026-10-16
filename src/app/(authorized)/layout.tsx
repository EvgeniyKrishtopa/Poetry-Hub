import type { PropsWithChildren } from "react";

// Placement marker for pages that need a signed-in reader. Pages here enforce the session themselves:
// each one's feature component calls `requireSession()` inside its own Suspense boundary. This layout must
// not be the check — a shared layout does not re-render on client navigation between sibling pages.
export default function AuthorizedLayout({ children }: PropsWithChildren) {
  return children;
}
