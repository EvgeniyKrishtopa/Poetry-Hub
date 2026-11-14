import type { ReactNode } from "react";

export interface HeaderAuthLinksProps {
  /** Rendered for a signed-in reader only, between the account link and «Выйти»; `auth` never imports who fills it. */
  readonly adminLink?: ReactNode;
}
