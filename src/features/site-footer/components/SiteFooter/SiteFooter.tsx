import { cacheLife } from "next/cache";
import Link from "next/link";
import type { ReactElement } from "react";

import { ContactDialog } from "@/features/contact";
import { siteConfig } from "@/shared/config/site";

import { formatCopyrightYears } from "../../model/copyright-years";
import { COPYRIGHT_SIGN, FOOTER_LINK_LABELS, FOOTER_NAV_LABEL } from "../../model/site-footer-messages";
import {
  FOOTER_LINK_CLASS,
  FOOTER_LINK_ORDER,
  FOOTER_LINK_PATHS,
  SITE_FOUNDING_YEAR,
} from "../../model/site-footer.constants";

// implements NFR-2, NFR-3, NFR-4 of add-site-footer: a Server Component with no client JS, token utilities only,
// and the year read inside its own cache scope so every page stays prerendered.
/** The site footer the root layout renders on every page: copyright notice, the about and privacy links, and the contact button. */
export async function SiteFooter(): Promise<ReactElement> {
  "use cache";
  // Cache Components allows `new Date()` during prerender only inside a cache scope. "days" re-renders the
  // footer within a day of 1 January, the lag the spec accepts, and is longer than any page's own lifetime.
  cacheLife("days");

  const years = formatCopyrightYears(SITE_FOUNDING_YEAR, new Date().getUTCFullYear());

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-start gap-x-6 gap-y-2 p-6 text-sm text-muted min-[600px]:flex-row min-[600px]:items-center min-[600px]:justify-between">
        <p>
          {COPYRIGHT_SIGN} {years} {siteConfig.name}
        </p>
        <nav aria-label={FOOTER_NAV_LABEL}>
          <ul className="flex flex-wrap gap-x-4 gap-y-2 min-[600px]:justify-end">
            {FOOTER_LINK_ORDER.map((key) => (
              <li key={key}>
                <Link href={FOOTER_LINK_PATHS[key]} className={FOOTER_LINK_CLASS}>
                  {FOOTER_LINK_LABELS[key]}
                </Link>
              </li>
            ))}
            {/* A Client Component with a constant prop: the cache key stays the same. */}
            <li>
              <ContactDialog triggerClassName={FOOTER_LINK_CLASS} />
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
