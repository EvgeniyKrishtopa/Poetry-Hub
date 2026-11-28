/** The `error` value `/auth/confirm` puts on `/login` when a link fails. */
export const CONFIRM_FAILED_ERROR = "confirm-failed";

/** The `error` value `/auth/confirm` puts on `/login` when a recovery link fails (password-recovery design D1). */
export const RECOVERY_FAILED_ERROR = "recovery-failed";

/** The search parameter on `/reset-password` that carries a `RESET_STATUS` value (password-recovery design D4). */
export const RESET_STATUS_PARAM = "status";

/** What `updatePasswordAction` tells `/reset-password` after a change: the old sessions ended, or not (design D5). */
export const RESET_STATUS = { updated: "updated", updatedSignOutFailed: "updated-sign-out-failed" } as const;

export const MIN_PASSWORD_LENGTH = 12;

/**
 * What a new password must hold one of each (docs/decisions/0028). The same sets as Supabase's
 * `lower_upper_letters_digits_symbols`, so the form and Auth cannot disagree: Latin letters only.
 */
export const PASSWORD_REQUIRED_CHARACTER_SETS: readonly RegExp[] = [
  /[a-z]/,
  /[A-Z]/,
  /[0-9]/,
  /[!@#$%^&*()_+\-=[\]{};'\\:"|<>?,./`~]/,
];

/** How long after the recovery link a session may still set a new password. */
export const RECOVERY_SESSION_WINDOW_SECONDS = 900;

/**
 * The `amr` methods that open a recovery session. The local stack answers `otp` for a recovery link, and for an email
 * confirmation too (accepted residual); `recovery` is the other method Auth may name it by.
 */
export const RECOVERY_AMR_METHODS: ReadonlySet<string> = new Set(["otp", "recovery"]);

/**
 * The `code` values of Supabase Auth errors the forms and the recovery flow tell apart, recorded on the local stack
 * (password-recovery task 1.1). `overEmailSendRateLimit` is the per-address refusal of a repeat letter and arrives with
 * HTTP 429, like `overRequestRateLimit`, the IP-wide one: only the code tells them apart.
 */
export const AUTH_ERROR_CODE = {
  invalidCredentials: "invalid_credentials",
  userBanned: "user_banned",
  emailNotConfirmed: "email_not_confirmed",
  overRequestRateLimit: "over_request_rate_limit",
  overEmailSendRateLimit: "over_email_send_rate_limit",
  weakPassword: "weak_password",
  samePassword: "same_password",
  captchaFailed: "captcha_failed",
} as const;

/** The longest token Turnstile issues; anything longer is not one of its tokens. */
export const CAPTCHA_TOKEN_MAX_LENGTH = 2048;

export const HTTP_TOO_MANY_REQUESTS = 429;

/**
 * What the Before User Created hook `reject_banned_signup` answers for a banned address. Auth reports its
 * `code` as `unknown`, which any unrelated failure can carry, so only the status and the message together
 * identify the rejection (admin-moderation design D6).
 */
export const BANNED_SIGNUP_REJECTION = { status: 403, message: "signup not allowed" } as const;

/**
 * What Supabase Auth puts on `/auth/callback` when it refuses a Google sign-in, recorded on the local stack
 * (google-sign-in task 1.2). Every refusal carries `error=access_denied`, so the other two fields tell them apart:
 * - a cancel: no `error_code` at all and an empty `error_description`;
 * - a blocked account: `error_code=user_banned` (`userBanned`);
 * - the Before User Created hook's refusal: `error_code` present but empty, `error_description=signup not allowed`
 *   (`bannedSignUpDescription`).
 */
export const GOOGLE_CALLBACK_ERROR = {
  accessDenied: "access_denied",
  userBanned: "user_banned",
  bannedSignUpDescription: BANNED_SIGNUP_REJECTION.message,
} as const;

/** Where a Google sign-in started, carried as `from` on the callback address (google-sign-in design D2). */
export const GOOGLE_FLOW = { signIn: "sign-in", signUp: "sign-up" } as const;

/** The search parameter on the callback address that carries a `GOOGLE_FLOW` value. */
export const GOOGLE_FLOW_PARAM = "from";

/** The `error` values `/auth/callback` puts on `/login` and `/signup` (google-sign-in design D5). */
export const GOOGLE_ERROR = {
  cancelled: "google-cancelled",
  failed: "google-failed",
  blocked: "google-blocked",
} as const;

/** The `auth-notice` value `/auth/callback` puts on `/` after a Google sign-up into an existing account (design D5). */
export const AUTH_NOTICE = { accountExists: "account-exists" } as const;

/** The search parameter on `/` that carries an `AUTH_NOTICE` value. */
export const AUTH_NOTICE_PARAM = "auth-notice";

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
