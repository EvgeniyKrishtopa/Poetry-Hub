import { z } from "zod";

import { LOWERCASE_UUID } from "./work-ordering.constants";

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
  return namedIds(input).every((id) => LOWERCASE_UUID.test(id));
}

function namedIds(input: MovePoemInput | MoveCollectionInput): string[] {
  if ("collectionId" in input) return [input.collectionId];
  return [input.poemId, ...[input.from, input.to].flatMap((list) => (list.kind === "collection" ? [list.collectionId] : []))];
}
