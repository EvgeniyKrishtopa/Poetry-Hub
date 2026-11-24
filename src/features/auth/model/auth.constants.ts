/** The `error` value `/auth/confirm` puts on `/login` when a link fails. */
export const CONFIRM_FAILED_ERROR = "confirm-failed";

export const MIN_PASSWORD_LENGTH = 8;

/**
 * What the Before User Created hook `reject_banned_signup` answers for a banned address. Auth reports its
 * `code` as `unknown`, which any unrelated failure can carry, so only the status and the message together
 * identify the rejection (admin-moderation design D6).
 */
export const BANNED_SIGNUP_REJECTION = { status: 403, message: "signup not allowed" } as const;

/** Where a Google sign-in started, carried as `from` on the callback address (google-sign-in design D2). */
export const GOOGLE_FLOW = { signIn: "sign-in", signUp: "sign-up" } as const;

/** The `error` values `/auth/callback` puts on `/login` and `/signup` (google-sign-in design D5). */
export const GOOGLE_ERROR = {
  cancelled: "google-cancelled",
  failed: "google-failed",
  blocked: "google-blocked",
} as const;

/** The `auth-notice` value `/auth/callback` puts on `/` after a Google sign-up into an existing account (design D5). */
export const AUTH_NOTICE = { accountExists: "account-exists" } as const;

/** The longest gap between an account's creation and this sign-in that still reads as a new account (design D4). */
export const NEW_ACCOUNT_WINDOW_MS = 60_000;

/** What «Выйти» did after asking an editing page first (edit-poem design D10). */
export const SIGN_OUT_STATUS = {
  /** The sign-out request was sent. */
  sent: "sent",
  /** The author chose to stay; nothing sent. */
  stayed: "stayed",
  /** The page took over the question and focus; nothing sent. */
  dismissed: "dismissed",
} as const;
