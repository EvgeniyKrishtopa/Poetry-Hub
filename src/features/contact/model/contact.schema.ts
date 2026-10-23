import { z } from "zod";

import { EMAIL_MAX_LENGTH, HONEYPOT_FIELD, MESSAGE_MAX_LENGTH, NAME_MAX_LENGTH } from "./contact.constants";
import { CONTACT_FIELD_ERRORS } from "./contact-messages";

/**
 * The only validation of the contact fields, run in the browser and again in the action
 * (NFR-3). Lengths count UTF-16 code units after trimming.
 */
export const contactMessageSchema = z.object({
  name: z.string().trim().min(1, CONTACT_FIELD_ERRORS.nameRequired).max(NAME_MAX_LENGTH, CONTACT_FIELD_ERRORS.nameTooLong),
  // `max` runs before the format check, so a long address gets the length message, not "invalid".
  email: z
    .string()
    .trim()
    .max(EMAIL_MAX_LENGTH, CONTACT_FIELD_ERRORS.emailTooLong)
    .pipe(z.email({ error: CONTACT_FIELD_ERRORS.emailInvalid })),
  message: z.string().trim().max(MESSAGE_MAX_LENGTH, CONTACT_FIELD_ERRORS.messageTooLong),
  // Never rejected on: a filled honeypot is answered as a success by the action.
  [HONEYPOT_FIELD]: z.string().optional(),
});

export type ContactMessageInput = z.infer<typeof contactMessageSchema>;
