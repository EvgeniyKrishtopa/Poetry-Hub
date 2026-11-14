import type { AdminDeleteKind } from "../../model/admin.types";

export interface AdminDeleteButtonProps {
  readonly kind: AdminDeleteKind;
  readonly id: string;
  readonly title: string;
  /** Where the admin lands after a successful delete. */
  readonly redirectHref: string;
}
