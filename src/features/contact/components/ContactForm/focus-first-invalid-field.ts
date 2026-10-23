import { CONTACT_FIELDS } from "../../model/contact.constants";
import type { ContactFieldErrors } from "../../model/contact.types";

/** Focuses the first field with an error, in form order (FR-5). */
export function focusFirstInvalidField(form: HTMLFormElement | null, fieldErrors: ContactFieldErrors): void {
  const field = CONTACT_FIELDS.find((name) => fieldErrors[name] !== undefined);
  if (form === null || field === undefined) return;

  const element = form.elements.namedItem(field);
  if (element instanceof HTMLElement) element.focus();
}
