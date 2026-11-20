import type { PropsWithChildren } from "react";

import { buildNoIndexMetadata } from "@/shared/lib/seo";

const ACCOUNT_AREA_TITLE = "Личный кабинет";

// One group title for every signed-in page, the admin ones included: no admin-specific title, which would name
// the page to a non-admin who opens it by chance (seo-metadata D2). It does not make /admin look like a missing
// page: that one keeps the root title. No description and no card.
export const metadata = buildNoIndexMetadata({ title: ACCOUNT_AREA_TITLE, follow: false });

// Placement marker for pages that need a signed-in reader. Pages here enforce the session themselves:
// each one's feature component calls `requireSession()` inside its own Suspense boundary. This layout must
// not be the check — a shared layout does not re-render on client navigation between sibling pages.
export default function AuthorizedLayout({ children }: PropsWithChildren) {
  return children;
}
