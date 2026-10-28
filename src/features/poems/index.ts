// Public API of the poems feature, imported by route files and, server-side only, by the breadcrumbs
// feature (the poem read and the poems segment) and the poem-management feature (the reads, the genre
// list, the cache tag, and the illustrations bucket). Server-only: the components and the poem read reach
// the DAL, which imports "server-only", so a client import fails the build.
export { AuthorPoemsEntry } from "./components/AuthorPoemsEntry/AuthorPoemsEntry";
export { PoemPage } from "./components/PoemPage/PoemPage";
export { getAuthorPoem } from "./dal/author-poems";
export { listPoemGenres } from "./dal/poem-genres";
export { poemsTag } from "./model/poem-cache-tags";
export { POEM_ILLUSTRATIONS_BUCKET, POEMS_SEGMENT } from "./model/poem.constants";
export type { AuthorPoemResult } from "./model/poem.types";
/** @public Scaffold: no importer outside poems until task 6.3 (poem-management). */
export type { Poem, PoemGenre } from "./model/poem.types";
