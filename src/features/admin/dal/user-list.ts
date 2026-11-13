import "server-only";

import type { ListQuery } from "../model/admin.schema";
import type { UserListResult } from "../model/admin.types";

/** Calls `admin_list_users`: a forward keyset page, optionally one exact address (design D9, FR-3). */
export async function listUsers(query: ListQuery): Promise<UserListResult> {
  void query;
  throw new Error("not implemented");
}
