import { z } from "zod";

import { FIELD_MESSAGES } from "./auth-messages";

export const MIN_PASSWORD_LENGTH = 8;

const emailField = z.email({ error: FIELD_MESSAGES.emailInvalid });

// implements FR-2 of add-supabase-auth: a valid email and a non-empty password
export const signInSchema = z.object({
  email: emailField,
  password: z.string({ error: FIELD_MESSAGES.passwordRequired }).min(1, FIELD_MESSAGES.passwordRequired),
});

// implements FR-4 of add-supabase-auth: a valid email and at least MIN_PASSWORD_LENGTH characters
export const signUpSchema = z.object({
  email: emailField,
  password: z
    .string({ error: FIELD_MESSAGES.passwordTooShort(MIN_PASSWORD_LENGTH) })
    .min(MIN_PASSWORD_LENGTH, FIELD_MESSAGES.passwordTooShort(MIN_PASSWORD_LENGTH)),
});
