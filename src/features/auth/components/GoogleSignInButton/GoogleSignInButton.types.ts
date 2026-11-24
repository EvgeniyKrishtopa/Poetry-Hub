import type { GoogleFlow } from "../../model/auth.types";

export interface GoogleSignInButtonProps {
  /** The page the button is on, sent as the sign-in's origin. */
  readonly from: GoogleFlow;
  /** The URL's Google notice, shown in the alert slot until the button is pressed (design D6). */
  readonly initialError?: string;
}
