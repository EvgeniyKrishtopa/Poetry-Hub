import { useId } from "react";

interface AuthFieldProps {
  readonly label: string;
  readonly name: "email" | "password";
  readonly type: "email" | "password";
  readonly autoComplete: "email" | "current-password" | "new-password";
  readonly defaultValue?: string;
  readonly error?: string;
}

/** A labelled, uncontrolled input with its error wired up for assistive tech (NFR-3). */
// implements NFR-3 of add-supabase-auth
// implements FR-2 of add-feedback-color-tokens: danger error text and border, kept while focused
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
