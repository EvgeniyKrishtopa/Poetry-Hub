import type { ComponentPropsWithoutRef } from "react";

/**
 * `stacked`: the label above the input, in one column (forms).
 * `columns`: the label and the input become items of the caller's two-column grid, the label in
 * the first column and the input and error in the second (the author editor's field rows).
 */
export type TextFieldLayout = "stacked" | "columns";

/** The input's own props, minus what `TextField` wires itself (id, styling, error state). */
type NativeInputProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "id" | "className" | "aria-invalid" | "aria-describedby"
>;

export interface TextFieldProps extends NativeInputProps {
  readonly label: string;
  readonly error?: string;
  readonly layout?: TextFieldLayout;
}
