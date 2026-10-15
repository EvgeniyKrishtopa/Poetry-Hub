import type { FieldFormState, ProfileActionResponse } from "./author.types";

/** An action result plus the submitted draft → that field's form state (FR-7, FR-9). */
export function toFieldFormState<Draft>(response: ProfileActionResponse, draft: Draft): FieldFormState<Draft> {
  void response;
  void draft;
  throw new Error("not implemented");
}
