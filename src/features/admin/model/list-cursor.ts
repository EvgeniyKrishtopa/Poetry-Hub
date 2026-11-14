import { z } from "zod";

import { targetIdSchema } from "./admin.schema";
import type { AdminUser } from "./admin.types";

/** What is between the timestamp and the id in the URL's `after` value (design D9: `<created_at>_<id>`). */
const CURSOR_SEPARATOR = "_";

/** PostgREST sends `timestamptz` with an offset, e.g. `2026-10-01T23:30:00.123456+00:00`; microseconds must survive. */
const cursorTimestampSchema = z.iso.datetime({ offset: true });

/** The pair the keyset compares against: both halves or nothing (the database refuses one alone). */
export interface ListCursor {
  readonly createdAt: string;
  readonly id: string;
}

/** The cursor that continues after `user`; the timestamp is kept as the database wrote it, never through `Date`. */
export function formatListCursor(user: Pick<AdminUser, "createdAt" | "id">): string {
  return `${user.createdAt}${CURSOR_SEPARATOR}${user.id}`;
}

/**
 * The cursor in an `after` value, or `null` when there is none to use. A missing or hand-edited value means "the
 * first page": the list is one the owner reads, and a broken link is not worth an error screen.
 */
export function parseListCursor(after: string | undefined): ListCursor | null {
  if (after === undefined) return null;

  const separatorAt = after.lastIndexOf(CURSOR_SEPARATOR);
  if (separatorAt === -1) return null;

  const createdAt = cursorTimestampSchema.safeParse(after.slice(0, separatorAt));
  const id = targetIdSchema.safeParse(after.slice(separatorAt + CURSOR_SEPARATOR.length));
  if (!createdAt.success || !id.success) return null;

  return { createdAt: createdAt.data, id: id.data };
}
