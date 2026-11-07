import { z } from "zod";

// Types only until task 2.1 adds the rules: lowercase UUIDs, no duplicates, no overlap, not both empty, and
// MAX_POEMS_PER_SAVE per list (add-poems-to-collections D6).

export const checkCollectionPoemsInputSchema = z.object({ collectionId: z.string() });

export const saveCollectionPoemsInputSchema = z.object({
  collectionId: z.string(),
  added: z.array(z.string()),
  removed: z.array(z.string()),
});

export type CheckCollectionPoemsInput = z.infer<typeof checkCollectionPoemsInputSchema>;
export type SaveCollectionPoemsInput = z.infer<typeof saveCollectionPoemsInputSchema>;
