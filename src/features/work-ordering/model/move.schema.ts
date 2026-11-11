import { z } from "zod";

// The action inputs check shapes only; the database clamps any integer place and answers `not-found` for any
// id that is not the caller's (design D2, D6).

const poemListSchema = z.union([
  z.object({ kind: z.literal("collection"), collectionId: z.string() }),
  z.object({ kind: z.literal("free") }),
]);

export const movePoemInputSchema = z.object({
  poemId: z.string(),
  from: poemListSchema,
  to: poemListSchema,
  toIndex: z.number().int(),
});

export const moveCollectionInputSchema = z.object({
  collectionId: z.string(),
  toIndex: z.number().int(),
});

export type MovePoemInput = z.infer<typeof movePoemInputSchema>;
export type MoveCollectionInput = z.infer<typeof moveCollectionInputSchema>;
