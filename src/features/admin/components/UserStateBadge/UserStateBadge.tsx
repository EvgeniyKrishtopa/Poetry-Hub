import { USER_STATE_LABELS } from "../../model/admin-messages";
import type { UserState } from "../../model/admin.types";

import type { UserStateBadgeProps } from "./UserStateBadge.types";

const BASE_CLASSES = "inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium";

const STATE_CLASSES = {
  active: "border-success text-success",
  blocked: "border-danger text-danger",
  banned: "border-danger bg-danger text-on-danger",
  admin: "border-accent text-accent",
} as const satisfies Record<UserState, string>;

/** The 12px outlined pill that names a user's state (artboard 41). */
export function UserStateBadge({ state }: UserStateBadgeProps) {
  return <span className={`${BASE_CLASSES} ${STATE_CLASSES[state]}`}>{USER_STATE_LABELS[state]}</span>;
}
