import { z } from "zod";

import { DELETE_DB_STATUS } from "./admin.constants";
import { targetIdSchema } from "./admin.schema";
import { groundSchema } from "./violation.schema";

// What each delete function may answer, as the DAL parses it. The ids come back from the database, never from the
// browser, because they pick the cache tag to expire and the file to remove.

/**
 * What every successful delete also returns for the email: the author's auth user id (`author_id` is a profile id),
 * the address (null when the account has none) and the ground of the open case. Required keys, so an answer without
 * them fails the parse as `unknown`.
 */
const noticeFields = {
  user_id: targetIdSchema,
  notice_email: z.string().min(1).nullable(),
  ground: groundSchema.nullable(),
};

/** `admin_delete_poem()`'s answer; a `deleted` answer without an author fails the parse as `unknown`. */
export const poemAnswerSchema = z.union([
  z.object({
    status: z.literal(DELETE_DB_STATUS.deleted),
    author_id: targetIdSchema,
    illustration_path: z.string().min(1).nullable(),
    // The poem's own title, never the browser's: the email names it (a title is never empty in the table).
    title: z.string().min(1),
    ...noticeFields,
  }),
  z.object({ status: z.literal(DELETE_DB_STATUS.notFound) }),
]);

/** `admin_delete_collection()`'s answer. */
export const collectionAnswerSchema = z.union([
  z.object({
    status: z.literal(DELETE_DB_STATUS.deleted),
    author_id: targetIdSchema,
    title: z.string().min(1),
    ...noticeFields,
  }),
  z.object({ status: z.literal(DELETE_DB_STATUS.notFound) }),
]);
