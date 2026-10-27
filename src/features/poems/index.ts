// Public API of the poems feature, imported by route files and, server-side only, by the breadcrumbs
// feature (the poem read and the poems segment). Server-only: the components and the poem read reach
// the mock DAL, which imports "server-only", so a client import fails the build.
export { AuthorPoemsEntry } from "./components/AuthorPoemsEntry/AuthorPoemsEntry";
export { PoemPage } from "./components/PoemPage/PoemPage";
export { getAuthorPoem } from "./dal/author-poems";
export { POEMS_SEGMENT } from "./model/poem.constants";
export type { AuthorPoemResult } from "./model/poem.types";
