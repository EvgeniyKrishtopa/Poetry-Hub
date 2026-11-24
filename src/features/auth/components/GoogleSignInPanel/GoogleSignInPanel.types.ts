import type { GoogleFlow } from "../../model/auth.types";

export interface GoogleSignInPanelProps {
  /** The page the panel is on. */
  readonly from: GoogleFlow;
  /** The page's request-time `error` search param. */
  readonly error: Promise<string | string[] | undefined>;
}
