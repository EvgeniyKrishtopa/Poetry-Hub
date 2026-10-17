import type { Ref } from "react";

export interface AboutTextareaProps {
  readonly ref: Ref<HTMLTextAreaElement>;
  readonly id: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  /** Hidden, not unmounted, in the preview tab. */
  readonly hidden: boolean;
  readonly invalid: boolean;
  readonly describedBy: string;
}
