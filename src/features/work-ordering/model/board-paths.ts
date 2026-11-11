import { POEM_MANAGEMENT_PATH } from "@/shared/config/account-paths";

const COLLECTIONS_SEGMENT = "collections";

/**
 * The owner's collection page, `/account/poems/collections/<collectionId>`. A twin of collection-management's
 * `collectionPath`, repeated because the features never import each other (design D3, NFR-3).
 */
export function boardCollectionPath(collectionId: string): string {
  return `${POEM_MANAGEMENT_PATH}/${COLLECTIONS_SEGMENT}/${collectionId}`;
}

/** The owner's poem page, `/account/poems/<poemId>`; a twin of poem-management's `ownPoemPath`. */
export function boardPoemPath(poemId: string): string {
  return `${POEM_MANAGEMENT_PATH}/${poemId}`;
}
