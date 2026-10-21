import { getContentPage } from "../../dal/content-page";
import { ContentPageArticle } from "../ContentPageArticle/ContentPageArticle";

import type { ContentPageContentProps } from "./ContentPageContent.types";

// Internal only: readers see the error screen's fixed copy. Carries no key, reason, or entry text; the DAL logs the cause.
const CONTENT_PAGE_UNAVAILABLE = "Content page unavailable";

/** Awaits the page's entry; a failure throws to the route's error boundary (design D4). */
export async function ContentPageContent({ entryKey }: ContentPageContentProps) {
  const result = await getContentPage(entryKey);

  if (!result.ok) throw new Error(CONTENT_PAGE_UNAVAILABLE);

  return <ContentPageArticle entry={result.entry} />;
}
