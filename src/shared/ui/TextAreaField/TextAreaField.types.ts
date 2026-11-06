import type { ComponentPropsWithoutRef } from "react";

/** The textarea's own props, minus what `TextAreaField` wires itself (id, styling, error state). */
type NativeTextAreaProps = Omit<
  ComponentPropsWithoutRef<"textarea">,
  "id" | "className" | "aria-invalid" | "aria-describedby"
>;

export interface TextAreaFieldProps extends NativeTextAreaProps {
  readonly label: string;
  /** The field's error, shown under it and tied to it through `aria-describedby`. */
  readonly error?: string;
}
