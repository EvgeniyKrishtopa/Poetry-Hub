import { z } from "zod";

/**
 * The delete action's input: the poem's id only, never the author (design D3). It checks the type only: a
 * malformed id must answer `not-found` from inside the action (D3 step 1), not next-safe-action's
 * `validationErrors`, so the lowercase-UUID guard runs in the handler (task 2.2).
 */
export const deletePoemInputSchema = z.object({ poemId: z.string() });

export type DeletePoemInput = z.infer<typeof deletePoemInputSchema>;
