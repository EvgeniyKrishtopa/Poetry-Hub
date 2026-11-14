import "server-only";

import { z } from "zod";

import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { ADMIN_USERS_PAGE_SIZE, RESTRICTION_KIND } from "../model/admin.constants";
import { targetIdSchema, type ListQuery } from "../model/admin.schema";
import type { AdminUser, UserListResult } from "../model/admin.types";
import { formatListCursor, parseListCursor } from "../model/list-cursor";

import { toAdminFailure, withStatus } from "./rpc-failure";

const LIST_OPERATION = "list users";

/**
 * One row of `admin_list_users`. The address column is `user_email` there, because the function's own `email`
 * argument is the filter. `restriction` is the stored kind or null for an active user.
 */
const userRowSchema = z.object({
  id: targetIdSchema,
  user_email: z.string(),
  author_name: z.string().nullable(),
  created_at: z.iso.datetime({ offset: true }),
  last_sign_in_at: z.iso.datetime({ offset: true }).nullable(),
  restriction: z.enum([RESTRICTION_KIND.blocked, RESTRICTION_KIND.banned]).nullable(),
  is_admin: z.boolean(),
});

const userRowsSchema = z.array(userRowSchema);

type UserRow = z.infer<typeof userRowSchema>;

function toAdminUser(row: UserRow): AdminUser {
  return {
    id: row.id,
    email: row.user_email,
    authorName: row.author_name,
    createdAt: row.created_at,
    lastSignInAt: row.last_sign_in_at,
    restriction: row.restriction,
    isAdmin: row.is_admin,
  };
}

/**
 * Calls `admin_list_users`: a forward keyset page, optionally one exact address (design D9, FR-3). It asks for one row
 * more than the page shows: that extra row is only the proof that a next page exists, and the cursor continues after
 * the last row shown. The address is passed as typed; the database trims and lower-cases both sides. Never logged.
 */
export async function listUsers(query: ListQuery): Promise<UserListResult> {
  try {
    const cursor = parseListCursor(query.after);
    const supabase = await createSupabaseServerClient();
    const response = await supabase.rpc("admin_list_users", {
      page_size: ADMIN_USERS_PAGE_SIZE + 1,
      after_created_at: cursor === null ? null : cursor.createdAt,
      after_id: cursor === null ? null : cursor.id,
      email: query.email ?? null,
    });
    if (response.error) {
      return { ok: false, failure: toAdminFailure(LIST_OPERATION, withStatus(response.error, response.status)) };
    }

    const parsed = userRowsSchema.safeParse(response.data);
    if (!parsed.success) return { ok: false, failure: toAdminFailure(LIST_OPERATION, parsed.error) };

    const users = parsed.data.slice(0, ADMIN_USERS_PAGE_SIZE).map(toAdminUser);
    const lastShown = users.at(-1);
    const hasNextPage = parsed.data.length > ADMIN_USERS_PAGE_SIZE;
    return {
      ok: true,
      users,
      nextCursor: hasNextPage && lastShown !== undefined ? formatListCursor(lastShown) : null,
    };
  } catch (error) {
    return { ok: false, failure: toAdminFailure(LIST_OPERATION, error) };
  }
}
