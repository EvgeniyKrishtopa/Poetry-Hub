import type { FieldFormState, ProfileActionResponse } from "./author.types";

type ValidationErrors = NonNullable<ProfileActionResponse["validationErrors"]>;

/** The first message the schema reported; a field editor shows one error at a time. */
function firstValidationMessage({ fieldErrors, formErrors }: ValidationErrors): string | undefined {
  return Object.values(fieldErrors).find((messages) => messages?.length)?.[0] ?? formErrors[0];
}

/** An action result plus the submitted draft → that field's form state (FR-7, FR-9). */
export function toFieldFormState<Draft>(response: ProfileActionResponse, draft: Draft): FieldFormState<Draft> {
  if (response.validationErrors) {
    const error = firstValidationMessage(response.validationErrors);
    // A validation result with no message at all can't be shown as a field error.
    return error === undefined ? { status: "failed", draft, failure: "unknown" } : { status: "invalid", draft, error };
  }
  // `serverError` is the action client's generic message for an unexpected throw (design D10).
  if (response.serverError !== undefined || response.data === undefined) {
    return { status: "failed", draft, failure: "unknown" };
  }
  if (response.data.status === "failed") return { status: "failed", draft, failure: response.data.failure };
  return { status: "saved" };
}
