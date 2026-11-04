import { z } from "zod";

/** The title as stored: line breaks normalized, trimmed (design D5). */
export function normalizeCollectionTitle(title: string): string {
  void title;
  throw new Error("not implemented");
}

/** The description as stored: line breaks normalized, trimmed, blank → `null` (design D5). */
export function normalizeCollectionDescription(description: string): string | null {
  void description;
  throw new Error("not implemented");
}

// Types only until task 3.1 adds the field rules and the lowercase-hex UUID guard (design D5-D7).

export const createCollectionInputSchema = z.object({ title: z.string(), description: z.string() });

export const updateCollectionInputSchema = z.object({
  collectionId: z.string(),
  title: z.string(),
  description: z.string(),
});

export const deleteCollectionInputSchema = z.object({ collectionId: z.string() });

export type CreateCollectionInput = z.infer<typeof createCollectionInputSchema>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionInputSchema>;
export type DeleteCollectionInput = z.infer<typeof deleteCollectionInputSchema>;
