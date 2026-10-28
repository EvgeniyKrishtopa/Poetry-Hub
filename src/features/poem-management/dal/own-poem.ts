import "server-only";

import { cache } from "react";

import type { OwnPoemResult, OwnPoemTitleResult } from "../model/poem-management.types";

/** `getOwnPublicAuthor` then `getAuthorPoem`, memoized per request so the page and its trail share every read (design D4). */
export const getOwnPoem = cache(async (poemId: string): Promise<OwnPoemResult> => {
  void poemId;
  throw new Error("not implemented");
});

/** The trail's last item, derived from `getOwnPoem` (design D10). */
export async function getOwnPoemTitle(poemId: string): Promise<OwnPoemTitleResult> {
  void poemId;
  throw new Error("not implemented");
}
