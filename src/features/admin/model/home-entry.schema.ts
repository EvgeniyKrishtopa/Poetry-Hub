import { z } from "zod";

import { targetIdSchema } from "./admin.schema";
import { HOME_ENTRY_LIMIT } from "./home-entry.constants";

const entryKindSchema = z.enum(["poem", "author"]);

/** The add action's input from a public poem page. */
export const addHomePoemSchema = z.object({ poemId: targetIdSchema });

/** The add action's input from a public author page, which knows a profile id. */
export const addHomeAuthorSchema = z.object({ authorProfileId: targetIdSchema });

/** The move action's input: where the browser saw the entry and where it was dropped, both inside the list. */
export const moveHomeEntrySchema = z.object({
  kind: entryKindSchema,
  id: targetIdSchema,
  fromPosition: z.number().int().min(1).max(HOME_ENTRY_LIMIT),
  toPosition: z.number().int().min(1).max(HOME_ENTRY_LIMIT),
});

export const removeHomeEntrySchema = z.object({ kind: entryKindSchema, id: targetIdSchema });
