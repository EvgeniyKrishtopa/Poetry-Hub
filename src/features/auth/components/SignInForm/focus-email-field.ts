/** The sign-in form's email input name; the `TextField` in `SignInForm` uses the same one. */
const EMAIL_FIELD_NAME = "email";

/** Returns the keyboard focus to the email field after the recovery request found the address invalid (FR-2). */
export function focusEmailField(form: HTMLFormElement | null): void {
  const field = form?.elements.namedItem(EMAIL_FIELD_NAME);
  if (field instanceof HTMLInputElement) field.focus();
}
