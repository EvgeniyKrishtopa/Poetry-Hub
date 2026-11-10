import "server-only";

import type {
  AuthorCollectionsResult,
  PublicCollectionResult,
  PublicCollectionsResult,
} from "../model/public-collections.types";

/**
 * The author's visible collections, newest first, through the cookie-less public client in one cached entry per
 * author tagged `authorWorksTag(authorId)`: hours on success, seconds on failure. A non-UUID id reads nothing.
 * Memoized per request (public-collections D5).
 */
export async function listPublicCollections(authorId: string): Promise<PublicCollectionsResult> {
  void authorId;
  throw new Error("not implemented");
}

/** The visible collections and `poems`' list read in parallel and nested; either failing says which (D5). */
export async function listAuthorCollections(authorId: string): Promise<AuthorCollectionsResult> {
  void authorId;
  throw new Error("not implemented");
}

/**
 * One visible collection of the author, by exact lowercase id, found in `listAuthorCollections` so page and trail
 * share one result (ADR 0008). A malformed id is `not-found` with no read (public-collections D5).
 */
export async function getPublicCollection(authorId: string, collectionId: string): Promise<PublicCollectionResult> {
  void authorId;
  void collectionId;
  throw new Error("not implemented");
}
