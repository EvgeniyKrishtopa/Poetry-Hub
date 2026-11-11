import { z } from "zod";

// The action inputs check shapes only: the ids' lowercase-UUID rule runs inside each action through
// `areMoveIdsValid`, before the session and the limit, so a malformed id answers `failed` and counts nothing
// (design D6). The database clamps any integer place and answers `not-found` for any id that is not the caller's.

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

/** Whether every id a move names is a lowercase UUID (design D6): false means refuse without counting the limit. */
export function areMoveIdsValid(input: MovePoemInput | MoveCollectionInput): boolean {
  void input;
  throw new Error("not implemented");
}
