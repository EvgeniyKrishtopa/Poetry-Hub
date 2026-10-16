import { useId } from "react";

import { TEXT_FIELD_CLASSES } from "./text-field-classes";
import type { TextFieldProps } from "./TextField.types";

/**
 * A labelled input with its error wired up for assistive tech. Works uncontrolled (auth forms)
 * and controlled (the author editor's draft). The danger border stays while the field is focused.
 */
// implements NFR-4 of add-supabase-auth: token utilities only, no color literals
export function TextField({ label, error, layout = "stacked", ...inputProps }: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const classes = TEXT_FIELD_CLASSES[layout];

  return (
    <div className={classes.wrapper}>
      <label htmlFor={id} className={classes.label}>
        {label}
      </label>
      <input
        id={id}
        {...inputProps}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={classes.input}
      />
      {error && (
        <p id={errorId} className={classes.error}>
          {error}
        </p>
      )}
    </div>
  );
}
