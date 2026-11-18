import { z } from "zod";

import { MODERATION_DB_STATUS } from "./admin.constants";
import { groundSchema } from "./violation.schema";

// What each moderation function may answer, as the DAL parses it: a function answers only its own statuses, and any
// other value fails the parse and is `unknown`, never a guessed success.

const { blocked, unblocked, banned, revoked, noSessions, alreadyRestricted, notBlocked, targetIsAdmin, notFound } =
  MODERATION_DB_STATUS;

/**
 * A restriction's answer: what the email needs rides along with the restriction, read in the same transaction.
 * `notice_email` and `ground` are required keys (null when absent), so an answer without them fails the parse.
 */
function restrictionAnswerSchema(done: typeof blocked | typeof banned) {
  return z.union([
    z.object({ status: z.literal(done), notice_email: z.string().min(1).nullable(), ground: groundSchema.nullable() }),
    z.object({ status: z.enum([alreadyRestricted, targetIsAdmin, notFound]) }),
  ]);
}

export const blockAnswerSchema = restrictionAnswerSchema(blocked);
export const banAnswerSchema = restrictionAnswerSchema(banned);
export const unblockAnswerSchema = z.object({ status: z.enum([unblocked, notBlocked]) });
export const revokeAnswerSchema = z.object({ status: z.enum([revoked, noSessions, targetIsAdmin, notFound]) });

export type RestrictionAnswer = z.infer<ReturnType<typeof restrictionAnswerSchema>>;
