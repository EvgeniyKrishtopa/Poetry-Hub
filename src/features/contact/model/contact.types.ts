import type { CONTACT_STATUS, HONEYPOT_FIELD } from "./contact.constants";

/** The action's answer: success is explicit, never "no error". */
export type ContactSendResult = { readonly status: typeof CONTACT_STATUS.sent } | { readonly status: typeof CONTACT_STATUS.failed };

/** The raw values read from the form, kept so the inputs can be refilled after an answer. */
export interface ContactFormValues {
  readonly name: string;
  readonly email: string;
  readonly message: string;
  readonly [HONEYPOT_FIELD]: string;
}

export type ContactField = "name" | "email" | "message";

/** One message per field. */
export type ContactFieldErrors = Readonly<Partial<Record<ContactField, string>>>;

export type ContactFormState =
  | { readonly status: typeof CONTACT_STATUS.idle; readonly values: ContactFormValues }
  | { readonly status: typeof CONTACT_STATUS.invalid; readonly values: ContactFormValues; readonly fieldErrors: ContactFieldErrors }
  | { readonly status: typeof CONTACT_STATUS.failed; readonly values: ContactFormValues }
  | { readonly status: typeof CONTACT_STATUS.sent };

/**
 * The part of a next-safe-action result the form reads, with the client's `"flattened"`
 * validation-error shape. Declared here so `model/` stays free of the library.
 */
export interface ContactActionResult {
  readonly data?: ContactSendResult;
  readonly serverError?: string;
  readonly validationErrors?: {
    readonly formErrors: readonly string[];
    readonly fieldErrors: Readonly<Partial<Record<ContactField, readonly string[]>>>;
  };
}
