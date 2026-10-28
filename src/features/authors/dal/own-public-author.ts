import "server-only";

import { cache } from "react";

import type { OwnPublicAuthorResult } from "../model/author.types";

/**
 * The signed-in owner's own profile, reduced to "public or not" by `isPublicProfile`, so the rule stays in
 * `authors` (design D4). Memoized per request: the management pages, their trails, and the owner link share
 * one session-and-profile read.
 */
export const getOwnPublicAuthor = cache(async (): Promise<OwnPublicAuthorResult> => {
  throw new Error("not implemented");
});
