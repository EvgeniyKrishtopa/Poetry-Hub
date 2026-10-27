// Public API of the poems feature, imported by route files and, server-side only, by the breadcrumbs
// feature (the poem read, the list path, its segment and title). Server-only: the components and the
// poem read reach the mock DAL, which imports "server-only", so a client import fails the build.
export { AuthorPoemsEntry } from "./components/AuthorPoemsEntry/AuthorPoemsEntry";
export { AuthorPoemsPage } from "./components/AuthorPoemsPage/AuthorPoemsPage";
export { PoemPage } from "./components/PoemPage/PoemPage";
export { getAuthorPoem } from "./dal/author-poems";
export { POEMS_SEGMENT } from "./model/poem.constants";
export { authorPoemsPath } from "./model/poem-paths";
export type { AuthorPoemResult } from "./model/poem.types";
export { POEMS_PAGE_TITLE } from "./model/poems-messages";
