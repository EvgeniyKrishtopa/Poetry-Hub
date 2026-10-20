// Public API of the authors feature, imported by route files and, server-side only, by the breadcrumbs
// feature (its titles, paths, and the author-name read). The panels and the DAL reach server-only code,
// so a client import fails the build.
export { AccountPage } from "./components/AccountPage/AccountPage";
export { AuthorDirectory } from "./components/AuthorDirectory/AuthorDirectory";
export { AuthorEditorPanel } from "./components/AuthorEditorPanel/AuthorEditorPanel";
export { AuthorPage } from "./components/AuthorPage/AuthorPage";
export { AuthorsNavLink } from "./components/AuthorsNavLink/AuthorsNavLink";
export { getPublicAuthorName } from "./dal/public-author-name";
export { AUTHOR_EDITOR_PATH, AUTHORS_PATH } from "./model/author.constants";
export { PAGE_TITLES as AUTHORS_PAGE_TITLES } from "./model/author-messages";
export type { PublicAuthorNameResult } from "./model/author.types";
