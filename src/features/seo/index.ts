// Public API of the seo feature: the sitemap's entries and the robots rules. Imported only by `src/app/`
// (`app/sitemap.ts`, `app/robots.ts`). Server-only: the sitemap read reaches the DAL, which imports "server-only".
export { getSitemapEntries } from "./dal/sitemap-entries";
export { buildRobots } from "./model/robots-rules";
