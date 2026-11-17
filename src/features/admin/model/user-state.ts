import { USER_STATE } from "./admin.constants";
import type { AdminUser, ModerationActionKind, UserState } from "./admin.types";

/** The state a row shows: its restriction, or active when there is none (design D3, FR-3). */
export function userStateOf(user: Pick<AdminUser, "restriction">): UserState {
  return user.restriction ?? USER_STATE.active;
}

/** The buttons a state offers, in display order; a banned user only «revoke» (FR-3, FR-4). */
export function availableActions(state: UserState): readonly ModerationActionKind[] {
  switch (state) {
    case USER_STATE.active:
      return ["block", "revoke", "ban"];
    case USER_STATE.blocked:
      return ["unblock", "revoke", "ban"];
    case USER_STATE.banned:
      return ["revoke"];
  }
}
