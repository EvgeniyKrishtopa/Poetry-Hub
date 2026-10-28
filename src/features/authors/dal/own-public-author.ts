import "server-only";

import { cache } from "react";

import type { OwnPublicAuthorResult } from "../model/author.types";
import { isPublicProfile } from "../model/is-public-profile";

import { getMyAuthorProfile } from "./my-author-profile";

/**
 * The signed-in owner's own profile, reduced to "public or not" by `isPublicProfile`, so the rule stays in
 * `authors` (add-poem-creation design D4). No profile counts as not public. Memoized per request on top of
 * `getMyAuthorProfile`'s memo: the management pages, their trails, and the owner link share one
 * session-and-profile read.
 */
export const getOwnPublicAuthor = cache(async (): Promise<OwnPublicAuthorResult> => {
  const own = await getMyAuthorProfile();
  if (!own.ok) return { ok: false, failure: own.failure };
  if (own.profile === null || !isPublicProfile(own.profile)) return { ok: true, status: "not-public" };
  return { ok: true, status: "public", authorId: own.profile.id };
});
