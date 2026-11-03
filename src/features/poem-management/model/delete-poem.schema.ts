import { z } from "zod";

import { lowercaseUuidSchema } from "@/features/poems";

/**
 * The delete action's input: the poem's id only, never the author (design D3). It checks the type only: a
 * malformed id must answer `not-found` from inside the action (D3 step 1), not next-safe-action's
 * `validationErrors`, so the id rule is `isPoemId`, run by the handler.
 */
export const deletePoemInputSchema = z.object({ poemId: z.string() });

/**
 * Whether `poemId` can name a poem: the lowercase UUID spelling the database returns, the same rule as the
 * poem read. Anything else is an unknown poem and never reaches the database (design D3 step 1).
 */
export function isPoemId(poemId: string): boolean {
  return lowercaseUuidSchema.safeParse(poemId).success;
}
