import { POEM_MANAGEMENT_PATH } from "@/shared/config/account-paths";

import { COLLECTION_EDIT_SEGMENT, COLLECTIONS_SEGMENT } from "./collection-management.constants";

const COLLECTIONS_PATH = `${POEM_MANAGEMENT_PATH}/${COLLECTIONS_SEGMENT}`;

/** The create page, `/account/poems/collections/new`. */
export const NEW_COLLECTION_PATH = `${COLLECTIONS_PATH}/new`;

/** One collection's page, `/account/poems/collections/<collectionId>`. */
export function collectionPath(collectionId: string): string {
  return `${COLLECTIONS_PATH}/${collectionId}`;
}

/** One collection's edit page, `/account/poems/collections/<collectionId>/edit`. */
export function editCollectionPath(collectionId: string): string {
  return `${collectionPath(collectionId)}/${COLLECTION_EDIT_SEGMENT}`;
}
