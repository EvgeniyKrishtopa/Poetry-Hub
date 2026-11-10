import type { Poem } from "@/features/poems";

/** One poem as a public collection lists it: its title links to the poem's public page. */
export type PublicCollectionPoem = Pick<Poem, "id" | "title">;

/** One visible collection as stored, before its poems are nested in (public-collections D5). */
export interface PublicCollectionEntry {
  /** Lowercase UUID; matched case-sensitively in URLs. */
  readonly id: string;
  readonly title: string;
  /** `null` when the collection has no description. */
  readonly description: string | null;
}

/** One visible collection with its poems, newest first; never empty (public-collections FR-1). */
export interface PublicCollection extends PublicCollectionEntry {
  readonly poems: readonly PublicCollectionPoem[];
}

/** The author's visible collections, newest first, or why they can't be read (public-collections D5). */
export type PublicCollectionsResult =
  | { readonly ok: true; readonly collections: readonly PublicCollectionEntry[] }
  | { readonly ok: false; readonly reason: "unavailable" };

/**
 * The author's visible collections with their poems nested in, or which read failed. On a failed collections read,
 * `hasCollectedPoems` says whether any poem is in a collection, so the section knows to show its unavailable text
 * (public-collections D6).
 */
export type AuthorCollectionsResult =
  | { readonly ok: true; readonly collections: readonly PublicCollection[] }
  | { readonly ok: false; readonly reason: "poems-unavailable" }
  | { readonly ok: false; readonly reason: "collections-unavailable"; readonly hasCollectedPoems: boolean };

/** One visible collection of an author, or why it can't be shown (public-collections D5). */
export type PublicCollectionResult =
  | { readonly ok: true; readonly collection: PublicCollection }
  | { readonly ok: false; readonly reason: "not-found" | "unavailable" };
