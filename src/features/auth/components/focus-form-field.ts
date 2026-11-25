/** Returns the keyboard focus to a named field of a form, e.g. after a failed submit left it without one (FR-2, FR-8). */
export function focusFormField(form: HTMLFormElement | null, fieldName: string): void {
  const field = form?.elements.namedItem(fieldName);
  if (field instanceof HTMLInputElement) field.focus();
}
