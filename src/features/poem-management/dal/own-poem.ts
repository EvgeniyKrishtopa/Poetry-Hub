import "server-only";

import { cache } from "react";

import { getOwnPublicAuthor } from "@/features/authors";
import { getAuthorPoem } from "@/features/poems";

import type { OwnPoemResult, OwnPoemTitleResult } from "../model/poem-management.types";

const NOT_FOUND = { ok: false, reason: "not-found" } as const;
const UNAVAILABLE = { ok: false, reason: "unavailable" } as const;

/**
 * `getOwnPublicAuthor` then `getAuthorPoem`, memoized per request so the page and its trail share every read
 * (design D4). A poem of another author, or a malformed id, is `not-found`, and so is any poem while the own
 * profile isn't public. Every profile failure, a session that ended meanwhile included, is `unavailable`.
 */
export const getOwnPoem = cache(async (poemId: string): Promise<OwnPoemResult> => {
  const own = await getOwnPublicAuthor();
  if (!own.ok) return UNAVAILABLE;
  if (own.status === "not-public") return NOT_FOUND;
  return getAuthorPoem(own.authorId, poemId);
});

/** The trail's last item, derived from `getOwnPoem` (design D10). */
export async function getOwnPoemTitle(poemId: string): Promise<OwnPoemTitleResult> {
  const result = await getOwnPoem(poemId);
  return result.ok ? { ok: true, title: result.poem.title } : result;
}
