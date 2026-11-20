import "server-only";

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FALLBACK_METADATA, buildPageMetadata } from "@/shared/lib/seo";

import { getContentPage } from "../dal/content-page";
import { CONTENT_PAGE_PATHS } from "../model/content-page.constants";
import { CONTENT_PAGE_DESCRIPTIONS } from "../model/content-page-messages";
import type { ContentPageKey } from "../model/content-page.types";

/**
 * A content page's metadata: the entry's title and the page's own fixed description. A missing entry is
 * `notFound()`, which marks the page `noindex`; any other failed read gives the site's fallback, because a
 * throw here would show a browser the not-found screen instead of the error screen (FR-1, FR-2, FR-10).
 */
export async function getContentPageMetadata(entryKey: ContentPageKey): Promise<Metadata> {
  const result = await getContentPage(entryKey);
  // Outside any `try`: `notFound()` works by throwing.
  if (!result.ok && result.reason === "not-found") notFound();
  if (!result.ok) return FALLBACK_METADATA;

  return buildPageMetadata({
    title: result.entry.title,
    description: CONTENT_PAGE_DESCRIPTIONS[entryKey],
    path: CONTENT_PAGE_PATHS[entryKey],
    type: "website",
  });
}
