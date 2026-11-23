import { z } from "zod";

import { targetIdSchema } from "./admin.schema";
import { HOME_DB_STATUS } from "./home-entry.constants";

// What each home-choice function may answer, as the DAL parses it: a function answers only its own statuses, and any
// other value fails the parse and is `unknown`, never a guessed success.

const { added, limitReached, alreadyInList, notFound, moved, stale, removed } = HOME_DB_STATUS;

export const homeAddAnswerSchema = z.object({ status: z.enum([added, limitReached, alreadyInList, notFound]) });
export const homeMoveAnswerSchema = z.object({ status: z.enum([moved, stale, notFound]) });
export const homeRemoveAnswerSchema = z.object({ status: z.enum([removed, notFound]) });

/** One row of `admin_list_home_entries()`; `entry_position` is the rank 1 to n that `from_position` compares to. */
export const homeEntryRowSchema = z.object({
  kind: z.enum(["poem", "author"]),
  id: targetIdSchema,
  entry_position: z.number().int().min(1),
  shown: z.boolean(),
  label: z.string(),
  author_name: z.string().nullable(),
});

export type HomeEntryRow = z.infer<typeof homeEntryRowSchema>;
