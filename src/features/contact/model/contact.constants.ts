import type { ContactField } from "./contact.types";

/** Longest name accepted, counted after trimming. */
export const NAME_MAX_LENGTH = 80;

/** Longest email address accepted, counted after trimming. */
export const EMAIL_MAX_LENGTH = 254;

/** Longest message accepted, counted after trimming; the message itself is optional. */
export const MESSAGE_MAX_LENGTH = 300;

/** Name of the hidden field that only bots fill in. */
export const HONEYPOT_FIELD = "website";

/** The visible fields in form order: the order errors are read and focus moves in. */
export const CONTACT_FIELDS = ["name", "email", "message"] as const satisfies readonly ContactField[];
