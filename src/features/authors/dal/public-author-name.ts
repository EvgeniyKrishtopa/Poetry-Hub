import "server-only";

import type { PublicAuthorNameResult } from "../model/author.types";

/** A public author's full name through `getPublicAuthor`'s cache scope; opens no scope of its own. */
export async function getPublicAuthorName(id: string): Promise<PublicAuthorNameResult> {
  void id;
  throw new Error("not implemented");
}
