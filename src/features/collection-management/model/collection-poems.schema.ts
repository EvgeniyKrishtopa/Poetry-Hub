import { z } from "zod";

import { LOWERCASE_UUID } from "./collection-form.schema";
import { MAX_POEMS_PER_SAVE } from "./collection-management.constants";

// The action inputs check types only: the collection id guard and the change rules run inside each action, so a
// malformed id answers `not-found` and a bad change `failed: unknown` (add-poems-to-collections D4, D6).

export const checkCollectionPoemsInputSchema = z.object({ collectionId: z.string() });

export const saveCollectionPoemsInputSchema = z.object({
  collectionId: z.string(),
  added: z.array(z.string()),
  removed: z.array(z.string()),
});

export type CheckCollectionPoemsInput = z.infer<typeof checkCollectionPoemsInputSchema>;
export type SaveCollectionPoemsInput = z.infer<typeof saveCollectionPoemsInputSchema>;

const poemIdsSchema = z.array(z.string().regex(LOWERCASE_UUID)).max(MAX_POEMS_PER_SAVE);

/** True when an id repeats, within one list or across both. */
function hasRepeatedId(ids: readonly string[]): boolean {
  return new Set(ids).size !== ids.length;
}

/**
 * What a save may send, the same rules `save_my_collection_poems()` guards with 22023: lowercase UUIDs, at most
 * `MAX_POEMS_PER_SAVE` per list, no id twice (so no poem both added and removed), and not both lists empty
 * (add-poems-to-collections D2, D6).
 */
export const collectionPoemsChangeSchema = z
  .object({ added: poemIdsSchema, removed: poemIdsSchema })
  .refine(({ added, removed }) => added.length > 0 || removed.length > 0)
  .refine(({ added, removed }) => !hasRepeatedId([...added, ...removed]));
