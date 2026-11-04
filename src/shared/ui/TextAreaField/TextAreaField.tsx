import type { TextAreaFieldProps } from "./TextAreaField.types";

/** A labelled multi-line field: `TextField`'s label, error, and `aria-*` wiring over a `<textarea>`, no counter. */
export function TextAreaField({ label, error, ...textareaProps }: TextAreaFieldProps) {
  void label;
  void error;
  void textareaProps;
  return null;
}
