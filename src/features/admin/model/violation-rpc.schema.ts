import { z } from "zod";

import { targetIdSchema } from "./admin.schema";
import { VIOLATION_CONTENT_KIND, VIOLATION_DB_STATUS } from "./violation.constants";
import { groundSchema } from "./violation.schema";

// What each violation function may answer, as the DAL parses it: a function answers only its own statuses, and any
// other value fails the parse and is `unknown`, never a guessed success.

const {
  added,
  alreadyInList,
  targetIsAdmin,
  alreadyRestricted,
  notFound,
  contentNotFound,
  groundChanged,
  removed,
  ready,
  wrongGround,
  alreadyWarned,
  noAddress,
  warned,
} = VIOLATION_DB_STATUS;

export const addAnswerSchema = z.object({
  status: z.enum([added, alreadyInList, targetIsAdmin, alreadyRestricted, notFound, contentNotFound]),
});
export const setGroundAnswerSchema = z.object({ status: z.enum([groundChanged, notFound]) });
export const removeAnswerSchema = z.object({ status: z.enum([removed, notFound]) });
export const markWarnedAnswerSchema = z.object({ status: z.enum([warned, notFound, alreadyWarned]) });
export const startWarningAnswerSchema = z.union([
  z.object({ status: z.literal(ready), email: z.string().min(1) }),
  z.object({ status: z.enum([notFound, wrongGround, alreadyWarned, alreadyRestricted, noAddress]) }),
]);

/** One row of `admin_list_violation_cases()`; the content columns are both set or both null. */
export const caseRowSchema = z
  .object({
    id: targetIdSchema,
    user_id: targetIdSchema,
    user_email: z.string(),
    author_name: z.string().nullable(),
    author_profile_id: targetIdSchema.nullable(),
    ground: groundSchema,
    content_kind: z.enum([VIOLATION_CONTENT_KIND.poem, VIOLATION_CONTENT_KIND.collection]).nullable(),
    content_id: targetIdSchema.nullable(),
    content_title: z.string().nullable(),
    // Real timestamps only: a garbage `warned_at` would otherwise read as "deadline passed" (a NaN comparison).
    created_at: z.iso.datetime({ offset: true }),
    warned_at: z.iso.datetime({ offset: true }).nullable(),
  })
  .refine((row) => (row.content_kind === null) === (row.content_id === null));

export type CaseRow = z.infer<typeof caseRowSchema>;
