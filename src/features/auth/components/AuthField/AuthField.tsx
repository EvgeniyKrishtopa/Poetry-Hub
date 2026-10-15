import { useId } from "react";

import type { AuthFieldProps } from "./AuthField.types";

/**
 * A labelled, uncontrolled input with its error wired up for assistive tech.
 * The danger border stays while the field is focused.
 */
// implements NFR-4 of add-supabase-auth: token utilities only, no color literals
export function AuthField({ label, error, ...inputProps }: AuthFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        {...inputProps}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-accent aria-invalid:border-danger aria-invalid:focus:border-danger"
      />
      {error && (
        <p id={errorId} className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
