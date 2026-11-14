import { USER_STATE } from "./admin.constants";
import type { AdminUser, ModerationActionKind, UserState } from "./admin.types";

/** The state a row shows: an admin outranks any restriction, no restriction is active (design D3, FR-3). */
export function userStateOf(user: Pick<AdminUser, "isAdmin" | "restriction">): UserState {
  if (user.isAdmin) return USER_STATE.admin;
  return user.restriction ?? USER_STATE.active;
}

/** The buttons a state offers, in display order; an admin has none and a banned user only «revoke» (FR-3, FR-4). */
export function availableActions(state: UserState): readonly ModerationActionKind[] {
  switch (state) {
    case USER_STATE.active:
      return ["block", "revoke", "ban"];
    case USER_STATE.blocked:
      return ["unblock", "revoke", "ban"];
    case USER_STATE.banned:
      return ["revoke"];
    case USER_STATE.admin:
      return [];
  }
}
