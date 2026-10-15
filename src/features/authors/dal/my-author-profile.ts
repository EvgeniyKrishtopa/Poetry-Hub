import "server-only";

import type { MyProfileResult } from "../model/author.types";

/** The owner's own row, per request with the cookie client. Never throws for an expected failure. */
export async function getMyAuthorProfile(userId: string): Promise<MyProfileResult> {
  void userId;
  throw new Error("not implemented");
}
