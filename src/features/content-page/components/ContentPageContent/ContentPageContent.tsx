import { getContentPage } from "../../dal/content-page";
import { ContentPageArticle } from "../ContentPageArticle/ContentPageArticle";

// Internal only: readers see the error screen's fixed copy. Carries no reason or entry text; the DAL logs the cause.
const CONTENT_PAGE_UNAVAILABLE = "About page content unavailable";

/** Awaits the about entry; a failure throws to the route's error boundary (design D4). */
export async function ContentPageContent() {
  const result = await getContentPage();

  if (!result.ok) throw new Error(CONTENT_PAGE_UNAVAILABLE);

  return <ContentPageArticle entry={result.entry} />;
}
