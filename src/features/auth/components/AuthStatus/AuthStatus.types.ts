import type { ReactNode } from "react";

import type { SessionState } from "@/shared/lib/supabase/claims";

export interface AuthStatusProps {
  /** Only the state's name: no user id enters the render tree (ADR 0004). */
  readonly session: SessionState;
  /** Shown to a signed-in reader between the account link and «Выйти». */
  readonly adminLink?: ReactNode;
}
