import type { AuthorProfile } from "../../model/author.types";

export interface AuthorProfileEditorProps {
  readonly profile: AuthorProfile | null;
}

/** What the editor hands each field editor, so at most one field is active at a time (design D6). */
export interface FieldEditorControls {
  /** Another field is being edited or has an action pending. */
  readonly disabled: boolean;
  readonly onEditStart: () => void;
  readonly onEditEnd: () => void;
  /** Called first inside the action wrapper: marks the field active and empties the notice. */
  readonly onActionStart: () => void;
  readonly onSaved: () => void;
  readonly onFailed: () => void;
}
