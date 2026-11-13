import type { AdminUserRowProps } from "./AdminUserRow.types";

/** One user: the state badge, the dates and the actions their state allows; an admin's row has none (FR-3). */
export function AdminUserRow({ user }: AdminUserRowProps) {
  void user;
  return null;
}
