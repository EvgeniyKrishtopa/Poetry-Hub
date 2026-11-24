import { NEW_ACCOUNT_WINDOW_MS } from "./auth.constants";
import type { GoogleCallbackUser } from "./auth.types";

/**
 * Whether the account existed before this sign-in, from two timestamps of the same user record (design D4):
 * both come from the database clock, so the app server's clock plays no part. A missing or unreadable
 * timestamp reads as a new account, which only hides the account-exists notice.
 */
export function didAccountExist(user: GoogleCallbackUser): boolean {
  if (user.last_sign_in_at === undefined) return false;

  const createdAt = Date.parse(user.created_at);
  const lastSignInAt = Date.parse(user.last_sign_in_at);
  // NaN from an unreadable timestamp makes the comparison false.
  return lastSignInAt - createdAt > NEW_ACCOUNT_WINDOW_MS;
}
