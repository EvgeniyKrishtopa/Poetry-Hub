import { z } from "zod";

/**
 * A UUID in the canonical lowercase spelling the database returns. The feature's own copy of `poems`' rule: `admin`
 * may take only the illustrations bucket constant from that feature (NFR-4). Junk never reaches an RPC (FR-12).
 */
export const targetIdSchema = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

/** The moderation actions' input: the user to act on. A non-uuid is a validation error, and no RPC runs (FR-12). */
export const targetUserSchema = z.object({ userId: targetIdSchema });

/** The delete actions' input: the poem's or collection's id. */
export const deleteTargetSchema = z.object({ id: targetIdSchema });

/**
 * The list's URL parameters as the page reads them. The cursor is parsed by `parseListCursor` and the address by the
 * database, so neither is judged here.
 */
export const listQuerySchema = z.object({
  after: z.string().optional(),
  email: z.string().optional(),
});

export type TargetUserInput = z.infer<typeof targetUserSchema>;
export type DeleteTargetInput = z.infer<typeof deleteTargetSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
