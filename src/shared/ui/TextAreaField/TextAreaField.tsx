import { useId } from "react";

import { TEXT_FIELD_CLASSES } from "../TextField/text-field-classes";

import type { TextAreaFieldProps } from "./TextAreaField.types";

const CLASSES = TEXT_FIELD_CLASSES.stacked;

/** A labelled multi-line field: `TextField`'s label, error, and `aria-*` wiring over a `<textarea>`, no counter. */
export function TextAreaField({ label, error, ...textareaProps }: TextAreaFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className={CLASSES.wrapper}>
      <label htmlFor={id} className={CLASSES.label}>
        {label}
      </label>
      <textarea
        id={id}
        {...textareaProps}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`${CLASSES.input} min-h-40 resize-y`}
      />
      {error && (
        <p id={errorId} className={CLASSES.error}>
          {error}
        </p>
      )}
    </div>
  );
}
