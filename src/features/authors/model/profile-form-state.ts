import { ACTION_STATUS, FORM_STATUS } from "./author.constants";
import { getProfileFailureMessage } from "./author-messages";
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
    return error === undefined
      ? { status: FORM_STATUS.failed, draft, failure: "unknown" }
      : { status: FORM_STATUS.invalid, draft, error };
  }
  // `serverError` is the action client's generic message for an unexpected throw (design D10).
  if (response.serverError !== undefined || response.data === undefined) {
    return { status: FORM_STATUS.failed, draft, failure: "unknown" };
  }
  if (response.data.status === ACTION_STATUS.failed) {
    return { status: FORM_STATUS.failed, draft, failure: response.data.failure };
  }
  return { status: FORM_STATUS.saved };
}

/** The error a field shows for its form state, if any (FR-8, FR-9). */
export function getFieldErrorMessage<Draft>(state: FieldFormState<Draft>): string | undefined {
  if (state.status === FORM_STATUS.invalid) return state.error;
  if (state.status === FORM_STATUS.failed) return getProfileFailureMessage(state.failure);
  return undefined;
}
