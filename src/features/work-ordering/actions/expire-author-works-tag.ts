import "server-only";

import { updateTag } from "next/cache";

import { authorWorksTag } from "@/shared/config/cache-tags";

/**
 * Expires the author's public works tag after a write that already happened; a failure is only logged, never turned
 * into a failed write (public-collections D4). The feature's own copy of its siblings' helper: the features don't
 * import each other. Callable only while a Server Action runs (`updateTag`'s own rule).
 */
export function expireAuthorWorksTag(authorId: string): void {
  try {
    updateTag(authorWorksTag(authorId));
  } catch (error) {
    console.error(
      `[work-ordering] expire author works tag failed: ${error instanceof Error ? error.name : typeof error}`,
    );
  }
}
