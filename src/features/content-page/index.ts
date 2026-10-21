// Public API of the content-page feature: one Contentful `greeting` entry rendered as a page, by key. Server-only: the page reaches the DAL, so a client import fails the build.
export { ContentPage } from "./components/ContentPage/ContentPage";
export { CONTENT_PAGE_KEYS } from "./model/content-page.constants";
