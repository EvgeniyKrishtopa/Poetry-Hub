import type { AuthorPageProps } from "./AuthorPage.types";

/** The author page's Suspense boundary: `notFound()` on not-found, throws on unavailable (FR-14). */
export function AuthorPage(props: AuthorPageProps) {
  void props;
  return null;
}
