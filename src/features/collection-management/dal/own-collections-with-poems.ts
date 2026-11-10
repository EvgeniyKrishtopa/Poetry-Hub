import "server-only";

import type { OwnCollectionsWithPoemsResult } from "../model/collection-management.types";
import { nestCollectedPoems } from "../model/collection-poems-nesting";

import { listCollectedPoems } from "./collection-poems";
import { listOwnCollections } from "./own-collections";

/**
 * The author's collections with each one's poems nested under it, for the `/account/poems` section: both reads run
 * in parallel, and either failing fails the whole list (add-poems-to-collections D10). Each read logs its own failure.
 */
export async function listOwnCollectionsWithPoems(authorId: string): Promise<OwnCollectionsWithPoemsResult> {
  const [list, collected] = await Promise.all([listOwnCollections(authorId), listCollectedPoems()]);
  if (!list.ok || !collected.ok) return { ok: false };
  return { ok: true, collections: nestCollectedPoems(list.collections, collected.poems) };
}
