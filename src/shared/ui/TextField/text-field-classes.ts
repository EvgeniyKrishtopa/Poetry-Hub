import type { TextFieldLayout } from "./TextField.types";

interface TextFieldClasses {
  readonly wrapper: string;
  readonly label: string;
  readonly input: string;
  readonly error: string;
}

const INPUT_BASE =
  "rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-accent aria-invalid:border-danger aria-invalid:focus:border-danger";

const ERROR_BASE = "text-sm font-medium text-danger";

/**
 * `columns` places its parts in the caller's grid: from 600 px wide the label sits in the first
 * column, level with the input, and below that everything stacks (the editor's row breakpoint).
 */
export const TEXT_FIELD_CLASSES: Readonly<Record<TextFieldLayout, TextFieldClasses>> = {
  stacked: {
    wrapper: "flex flex-col gap-1",
    label: "text-sm font-medium",
    input: INPUT_BASE,
    error: ERROR_BASE,
  },
  columns: {
    wrapper: "contents",
    label: "text-sm font-medium min-[600px]:col-start-1 min-[600px]:pt-2",
    input: `${INPUT_BASE} w-full max-w-sm min-[600px]:col-start-2`,
    error: `${ERROR_BASE} min-[600px]:col-start-2`,
  },
};
