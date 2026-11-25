import { z } from "zod";

import { MIN_PASSWORD_LENGTH } from "./auth.constants";
import { FIELD_MESSAGES } from "./auth-messages";

const emailField = z.email({ error: FIELD_MESSAGES.emailInvalid });

export const signInSchema = z.object({
  email: emailField,
  password: z.string({ error: FIELD_MESSAGES.passwordRequired }).min(1, FIELD_MESSAGES.passwordRequired),
});

export const signUpSchema = z.object({
  email: emailField,
  password: z
    .string({ error: FIELD_MESSAGES.passwordTooShort(MIN_PASSWORD_LENGTH) })
    .min(MIN_PASSWORD_LENGTH, FIELD_MESSAGES.passwordTooShort(MIN_PASSWORD_LENGTH)),
});

/** `requestRecoveryAction`'s input: the sign-in email field, nothing else (password-recovery FR-2). */
export const recoveryRequestSchema = signInSchema.pick({ email: true });

/** `updatePasswordAction`'s input: the sign-up password rule (password-recovery FR-5). */
export const newPasswordSchema = signUpSchema.pick({ password: true });
