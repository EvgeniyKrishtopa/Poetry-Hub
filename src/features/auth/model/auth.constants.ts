/** The `error` value `/auth/confirm` puts on `/login` when a link fails. */
export const CONFIRM_FAILED_ERROR = "confirm-failed";

export const MIN_PASSWORD_LENGTH = 8;

/**
 * What the Before User Created hook `reject_banned_signup` answers for a banned address. Auth reports its
 * `code` as `unknown`, which any unrelated failure can carry, so only the status and the message together
 * identify the rejection (admin-moderation design D6).
 */
export const BANNED_SIGNUP_REJECTION = { status: 403, message: "signup not allowed" } as const;

/** What «Выйти» did after asking an editing page first (edit-poem design D10). */
export const SIGN_OUT_STATUS = {
  /** The sign-out request was sent. */
  sent: "sent",
  /** The author chose to stay; nothing sent. */
  stayed: "stayed",
  /** The page took over the question and focus; nothing sent. */
  dismissed: "dismissed",
} as const;
