// Public API of the collection-management feature, imported by route files and by breadcrumbs (design D1).
export { CollectionListNotice } from "./components/CollectionListNotice/CollectionListNotice";
export { CollectionPage } from "./components/CollectionPage/CollectionPage";
export { CreateCollectionLink } from "./components/CreateCollectionLink/CreateCollectionLink";
export { EditCollectionPage } from "./components/EditCollectionPage/EditCollectionPage";
export { NewCollectionPage } from "./components/NewCollectionPage/NewCollectionPage";
export { OwnCollectionsSection } from "./components/OwnCollectionsSection/OwnCollectionsSection";
export { getOwnCollectionTitle } from "./dal/own-collections";
export { COLLECTION_TRAIL_LABELS } from "./model/collection-management-messages";
export { COLLECTION_EDIT_SEGMENT, COLLECTIONS_SEGMENT } from "./model/collection-management.constants";
export type { OwnCollectionTitleResult } from "./model/collection-management.types";
export { collectionPath, NEW_COLLECTION_PATH } from "./model/collection-paths";
