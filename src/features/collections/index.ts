// Public API of the collections feature: the public side of an author's collections (public-collections D1),
// imported by route files and, server-side only, by the breadcrumbs feature (the collection read and its path).
// Server-only: the components and the read reach the DAL, which imports "server-only".
export { PublicCollectionPage } from "./components/PublicCollectionPage/PublicCollectionPage";
export { PublicCollectionsSection } from "./components/PublicCollectionsSection/PublicCollectionsSection";
export { getPublicCollection } from "./dal/public-collections";
export { PUBLIC_COLLECTIONS_SEGMENT, publicCollectionPath } from "./model/public-collection-paths";
export type { PublicCollectionResult } from "./model/public-collections.types";
