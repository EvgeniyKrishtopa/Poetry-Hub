import type { AuthNoticeProps } from "./AuthNotice.types";

/**
 * The home page's account-exists notice after a Google sign-up into an existing account, awaited inside its
 * own Suspense boundary with an empty fallback (google-sign-in FR-G6, design D6).
 */
export function AuthNotice(props: AuthNoticeProps): null {
  void props;
  return null;
}
