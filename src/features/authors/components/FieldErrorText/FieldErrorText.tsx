import type { FieldErrorTextProps } from "./FieldErrorText.types";

/** A field error referenced by id from `aria-describedby` (NFR-5). */
export function FieldErrorText({ id, message }: FieldErrorTextProps) {
  return (
    <p id={id} className="text-sm font-medium text-danger">
      {message}
    </p>
  );
}
