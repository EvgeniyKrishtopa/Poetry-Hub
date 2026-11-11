import "server-only";

import { updateTag } from "next/cache";

import { authorWorksTag } from "@/shared/config/cache-tags";

/**
 * Expires the author's public works tag after a write that already happened (a create, an update or a delete).
 * `updateTag`, not `revalidateTag`: the next request for the author's pages must wait for the fresh list. A failure
 * must not turn the stored write into an error the author would retry, so it is only logged; the list catches up
 * when its cache lifetime ends. Callable only while a Server Action runs (`updateTag`'s own rule).
 */
export function expireAuthorWorksTag(authorId: string): void {
  try {
    updateTag(authorWorksTag(authorId));
  } catch (error) {
    console.error(
      `[poem-management] expire author works tag failed: ${error instanceof Error ? error.name : typeof error}`,
    );
  }
}
