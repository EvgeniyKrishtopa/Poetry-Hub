import "server-only";

import { updateTag } from "next/cache";

import { poemsTag } from "@/features/poems";

/**
 * Expires the author's poems tag after a write that already happened (a create or a delete). `updateTag`,
 * not `revalidateTag`: the next request for the author's pages must wait for the fresh list. A failure must
 * not turn the stored write into an error the author would retry, so it is only logged; the list catches up
 * when its cache lifetime ends. Callable only while a Server Action runs (`updateTag`'s own rule).
 */
export function expirePoemsTag(authorId: string): void {
  try {
    updateTag(poemsTag(authorId));
  } catch (error) {
    console.error(`[poem-management] expire poems tag failed: ${error instanceof Error ? error.name : typeof error}`);
  }
}
