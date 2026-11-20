import type { PropsWithChildren } from "react";

import { buildNoIndexMetadata } from "@/shared/lib/seo";

const ACCOUNT_AREA_TITLE = "Личный кабинет";

// One group title for every signed-in page, the admin ones included: an own title on /admin would tell a
// non-admin who opens it by chance that the page exists (seo-metadata D2). No description and no card.
export const metadata = buildNoIndexMetadata({ title: ACCOUNT_AREA_TITLE, follow: false });

// Placement marker for pages that need a signed-in reader. Pages here enforce the session themselves:
// each one's feature component calls `requireSession()` inside its own Suspense boundary. This layout must
// not be the check — a shared layout does not re-render on client navigation between sibling pages.
export default function AuthorizedLayout({ children }: PropsWithChildren) {
  return children;
}
