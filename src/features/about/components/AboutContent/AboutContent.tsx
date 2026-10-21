import { getAboutPage } from "../../dal/about-page";
import { AboutArticle } from "../AboutArticle/AboutArticle";

// Internal only: readers see the error screen's fixed copy. Carries no reason or entry text; the DAL logs the cause.
const ABOUT_CONTENT_UNAVAILABLE = "About page content unavailable";

/** Awaits the about entry; a failure throws to the route's error boundary (design D4). */
export async function AboutContent() {
  const result = await getAboutPage();

  if (!result.ok) throw new Error(ABOUT_CONTENT_UNAVAILABLE);

  return <AboutArticle entry={result.entry} />;
}
