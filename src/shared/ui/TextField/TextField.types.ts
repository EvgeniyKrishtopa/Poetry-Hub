import type { ComponentPropsWithoutRef } from "react";

/** The input's own props, minus what `TextField` wires itself (id, styling, error state). */
type NativeInputProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "id" | "className" | "aria-invalid" | "aria-describedby"
>;

export interface TextFieldProps extends NativeInputProps {
  readonly label: string;
  readonly error?: string;
}
