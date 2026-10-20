import "server-only";

import { fullName } from "../model/full-name";
import type { PublicAuthorNameResult } from "../model/author.types";

import { getPublicAuthor } from "./public-authors";

/** A public author's full name through `getPublicAuthor`'s cache scope; opens no scope of its own. */
export async function getPublicAuthorName(id: string): Promise<PublicAuthorNameResult> {
  const result = await getPublicAuthor(id);
  if (!result.ok) return result;
  return { ok: true, name: fullName(result.author) };
}
