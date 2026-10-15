import "server-only";

import type { MyProfileResult } from "../model/author.types";

/**
 * The signed-in owner's own row, per request with the cookie client: the database resolves the caller
 * (`my_author_profile_id()`), so no user id is passed (design D3). Never throws for an expected failure.
 */
export async function getMyAuthorProfile(): Promise<MyProfileResult> {
  throw new Error("not implemented");
}
