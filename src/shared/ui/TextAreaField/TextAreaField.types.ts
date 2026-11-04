import type { TextareaHTMLAttributes } from "react";

export interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  readonly label: string;
  /** The field's error, shown under it and tied to it through `aria-describedby`. */
  readonly error?: string;
}
