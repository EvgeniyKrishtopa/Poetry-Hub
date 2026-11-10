import { POEM_MANAGEMENT_PATH } from "@/shared/config/account-paths";

import { COLLECTION_EDIT_SEGMENT, COLLECTION_POEMS_SEGMENT, COLLECTIONS_SEGMENT } from "./collection-management.constants";

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

/** One collection's poems page, `/account/poems/collections/<collectionId>/poems` (add-poems-to-collections D12). */
export function collectionPoemsPath(collectionId: string): string {
  return `${collectionPath(collectionId)}/${COLLECTION_POEMS_SEGMENT}`;
}

/**
 * The owner's poem page, `/account/poems/<poemId>`. A twin of poem-management's `ownPoemPath`, repeated because
 * the two features never import each other (add-poems-to-collections D12, NFR-3).
 */
export function ownPoemPagePath(poemId: string): string {
  return `${POEM_MANAGEMENT_PATH}/${poemId}`;
}
