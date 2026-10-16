import { FIELD_INPUT_CLASS } from "@/shared/ui";

import type { AboutTextareaProps } from "./AboutTextarea.types";

const TEXTAREA_CLASS = `${FIELD_INPUT_CLASS} min-h-64 w-full resize-y`;

/** About's Markdown source, styled as the name inputs; it never caps what is typed or pasted (FR-11). */
export function AboutTextarea({ ref, id, value, onChange, hidden, invalid, describedBy }: AboutTextareaProps) {
  return (
    <textarea
      ref={ref}
      id={id}
      hidden={hidden}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-invalid={invalid ? true : undefined}
      aria-describedby={describedBy}
      className={TEXTAREA_CLASS}
    />
  );
}
