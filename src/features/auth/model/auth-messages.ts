import type { AuthFailure, AuthFlow } from "./auth.types";

// implements FR-2 of add-supabase-auth
// implements FR-4 of add-supabase-auth
// implements FR-5 of add-supabase-auth
// implements FR-7 of add-supabase-auth
export const GENERIC_SERVER_ERROR = "Something went wrong. Try again.";

export const CONFIRM_FAILED_MESSAGE =
  "That confirmation link is invalid or has expired. Sign in, or sign up again to get a new link.";

export const SIGN_OUT_FAILED_MESSAGE = "Couldn't sign out. Try again.";

const RATE_LIMITED_MESSAGE = "Too many attempts. Try again in a few minutes.";

export const FIELD_MESSAGES = {
  emailInvalid: "Enter a valid email address.",
  passwordRequired: "Enter your password.",
  passwordTooShort: (minLength: number) => `Use at least ${minLength} characters.`,
} as const;

/**
 * Each flow lists only the texts its FR defines; an unlisted pair falls back to the generic
 * text and never borrows the other flow's wording (design D7).
 */
const FAILURE_MESSAGES: Readonly<Record<AuthFlow, Readonly<Partial<Record<AuthFailure, string>>>>> = {
  "sign-in": {
    "invalid-credentials": "Incorrect email or password.",
    "email-not-confirmed": "Confirm your email first. Check your inbox for the link.",
    "rate-limited": RATE_LIMITED_MESSAGE,
    unavailable: "Sign-in is unavailable right now.",
  },
  "sign-up": {
    "rate-limited": RATE_LIMITED_MESSAGE,
    "weak-password": "Choose a stronger password.",
    unavailable: "Sign-up is unavailable right now.",
  },
};

export function getFailureMessage(flow: AuthFlow, failure: AuthFailure): string {
  return FAILURE_MESSAGES[flow][failure] ?? GENERIC_SERVER_ERROR;
}
