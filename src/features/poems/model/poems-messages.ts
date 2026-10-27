// Every string of the proposal's UI copy table, verbatim and in Russian (NFR-7).

/** The heading of the author page's poems section. */
export const POEMS_PAGE_TITLE = "Произведения";

/** Shown in the author page's poems section when the author has no poems. */
export const NO_POEMS_TEXT = "У автора пока ещё нет публикаций.";

/**
 * Announced to screen readers while a poem page's skeleton shows; the same text as the root
 * `loading.tsx`. Not in the copy table: added with the poem pages (user decision, 2026-10-24).
 */
export const POEMS_LOADING_LABEL = "Загрузка…";

/** The poem page illustration's alt text. */
export function getIllustrationAlt(title: string): string {
  return `Иллюстрация: ${title}`;
}

/** The poem page footer's genre line. */
export function formatGenreLine(genre: string): string {
  return `Жанр: ${genre}`;
}
