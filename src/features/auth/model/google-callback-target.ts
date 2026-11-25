import { SIGN_IN_PATH, SIGN_UP_PATH } from "@/shared/config/account-paths";
import { HOME_PATH } from "@/shared/config/constants";

import { AUTH_NOTICE, AUTH_NOTICE_PARAM, GOOGLE_ERROR, GOOGLE_FLOW } from "./auth.constants";
import type { GoogleFlow, GoogleSignInResult } from "./auth.types";

const PAGE_BY_FLOW: Readonly<Record<GoogleFlow, string>> = {
  [GOOGLE_FLOW.signIn]: SIGN_IN_PATH,
  [GOOGLE_FLOW.signUp]: SIGN_UP_PATH,
};

const ACCOUNT_EXISTS_TARGET = `${HOME_PATH}?${AUTH_NOTICE_PARAM}=${AUTH_NOTICE.accountExists}`;

/** The callback's `from` parameter as a known origin; any other value is `sign-in` (design D2, D5). */
function parseGoogleFlow(from: string | null): GoogleFlow {
  return from === GOOGLE_FLOW.signUp ? GOOGLE_FLOW.signUp : GOOGLE_FLOW.signIn;
}

/**
 * Where `/auth/callback` sends the browser: always one of a few fixed paths, never a request parameter.
 * Takes the callback's raw `from` and parses it itself, so the route needs nothing else (design D3, D5).
 */
export function getGoogleCallbackTarget(result: GoogleSignInResult, from: string | null): string {
  const flow = parseGoogleFlow(from);

  if (!result.ok) return `${PAGE_BY_FLOW[flow]}?error=${GOOGLE_ERROR[result.reason]}`;

  const isSignUpIntoExistingAccount = flow === GOOGLE_FLOW.signUp && result.accountExisted;
  return isSignUpIntoExistingAccount ? ACCOUNT_EXISTS_TARGET : HOME_PATH;
}
