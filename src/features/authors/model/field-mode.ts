import { FIELD_MODE } from "./author.constants";
import type { FieldMode } from "./author.types";

/** A pending action always shows the view: the submitted value, or the empty state (FR-7, FR-10). */
export function getFieldMode(isPending: boolean, isEditing: boolean): FieldMode {
  return !isPending && isEditing ? FIELD_MODE.edit : FIELD_MODE.view;
}
