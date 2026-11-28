import { z } from "zod";

import { MIN_PASSWORD_LENGTH, PASSWORD_REQUIRED_CHARACTER_SETS } from "./auth.constants";
import { FIELD_MESSAGES } from "./auth-messages";

const emailField = z.email({ error: FIELD_MESSAGES.emailInvalid });

export const signInSchema = z.object({
  email: emailField,
  password: z.string({ error: FIELD_MESSAGES.passwordRequired }).min(1, FIELD_MESSAGES.passwordRequired),
});

const tooShortMessage = FIELD_MESSAGES.passwordTooShort(MIN_PASSWORD_LENGTH);

function hasRequiredCharacters(password: string): boolean {
  return PASSWORD_REQUIRED_CHARACTER_SETS.every((characterSet) => characterSet.test(password));
}

/** A password being set. `abort`: a short one reports its length only, not the missing characters too. */
const newPasswordField = z
  .string({ error: tooShortMessage })
  .min(MIN_PASSWORD_LENGTH, { error: tooShortMessage, abort: true })
  .refine(hasRequiredCharacters, FIELD_MESSAGES.passwordTooSimple);

export const signUpSchema = z.object({
  email: emailField,
  password: newPasswordField,
});

/** `requestRecoveryAction`'s input: the sign-in email field, nothing else (password-recovery FR-2). */
export const recoveryRequestSchema = signInSchema.pick({ email: true });

/** `updatePasswordAction`'s input: the sign-up password rule (password-recovery FR-5). */
export const newPasswordSchema = signUpSchema.pick({ password: true });
