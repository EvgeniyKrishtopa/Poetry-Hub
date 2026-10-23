import { CONTACT_FIELDS, CONTACT_STATUS, HONEYPOT_FIELD } from "./contact.constants";
import type {
  ContactActionResult,
  ContactField,
  ContactFieldErrors,
  ContactFormState,
  ContactFormValues,
} from "./contact.types";

type ActionFieldErrors = NonNullable<ContactActionResult["validationErrors"]>["fieldErrors"];

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/** The submitted values as raw strings, a missing field read as empty. */
export function readContactValues(formData: FormData): ContactFormValues {
  return {
    name: readField(formData, "name"),
    email: readField(formData, "email"),
    message: readField(formData, "message"),
    [HONEYPOT_FIELD]: readField(formData, HONEYPOT_FIELD),
  };
}

/** The first message of each field, the only one the form shows. */
function firstFieldErrors(fieldErrors: ActionFieldErrors): ContactFieldErrors {
  const errors: Partial<Record<ContactField, string>> = {};
  for (const field of CONTACT_FIELDS) {
    const first = fieldErrors[field]?.[0];
    if (first !== undefined) errors[field] = first;
  }
  return errors;
}

/** Maps the action's result to the form's next state (design D5). */
export function toContactFormState(result: ContactActionResult, values: ContactFormValues): ContactFormState {
  if (result.validationErrors) {
    return { status: CONTACT_STATUS.invalid, values, fieldErrors: firstFieldErrors(result.validationErrors.fieldErrors) };
  }
  if (result.serverError !== undefined || result.data === undefined) {
    return { status: CONTACT_STATUS.failed, values };
  }
  if (result.data.status === CONTACT_STATUS.sent) return { status: CONTACT_STATUS.sent };
  return { status: CONTACT_STATUS.failed, values };
}
