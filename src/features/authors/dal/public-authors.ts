import "server-only";

import type { PublicAuthorResult, PublicAuthorsResult } from "../model/author.types";

/** Every public profile, sorted; cached under the directory tag with a result-dependent lifetime (design D5). */
export async function listPublicAuthors(): Promise<PublicAuthorsResult> {
  throw new Error("not implemented");
}

/** One public profile; a non-UUID id is `not-found` before any cache scope opens (design D5). */
export async function getPublicAuthor(id: string): Promise<PublicAuthorResult> {
  void id;
  throw new Error("not implemented");
}
