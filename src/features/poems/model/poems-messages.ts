// Every string of the proposal's UI copy table, verbatim and in Russian (NFR-7).

/** The poem list's heading; also the breadcrumb item for the list. */
export const POEMS_PAGE_TITLE = "Произведения";

/** The author page's link to the poem list. */
export const AUTHOR_POEMS_LINK_LABEL = "Произведения автора";

/** Shown on the author page and the poem list when the author has no poems. */
export const NO_POEMS_TEXT = "У автора пока ещё нет публикаций.";

/** The poem page illustration's alt text. */
export function getIllustrationAlt(title: string): string {
  return `Иллюстрация: ${title}`;
}

/** The poem page footer's genre line. */
export function formatGenreLine(genre: string): string {
  return `Жанр: ${genre}`;
}
