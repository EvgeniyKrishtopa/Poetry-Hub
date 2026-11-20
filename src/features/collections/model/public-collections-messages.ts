/** The public collections' user-facing copy, verbatim from the proposal's UI copy table (public-collections NFR-8). */
export const PUBLIC_COLLECTIONS_COPY = {
  sectionHeading: "Сборники произведений",
  sectionUnavailable: "Сборники сейчас недоступны.",
  poemsHeading: "Произведения",
} as const;

/** The collection page's title: the collection, then its author (seo-metadata FR-1). */
export function getCollectionPageTitle(collectionTitle: string, authorName: string): string {
  return `${collectionTitle} — ${authorName}`;
}

/**
 * The collection page's meta description when the collection has none (seo-metadata FR-2): one sentence that names
 * the collection and its author. The author's name stays in its dictionary form, since Russian declension can't be
 * derived from it.
 */
export function getCollectionFallbackDescription(collectionTitle: string, authorName: string): string {
  return `Сборник «${collectionTitle}», автор — ${authorName}. Читайте на Поэтическом Хабе.`;
}

/** The collection page skeleton's screen-reader status, the same wording as `poems`' skeleton (public-collections D7). */
export const PUBLIC_COLLECTIONS_LOADING_LABEL = "Загрузка…";
