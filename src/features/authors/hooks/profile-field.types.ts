/** What the editor hands each field editor, so at most one field is active at a time (design D6). */
export interface FieldEditorControls {
  /** Another field is being edited or has an action pending. */
  readonly disabled: boolean;
  /** The field opened or closed its edit mode. */
  readonly onEditingChange: (isEditing: boolean) => void;
  /** Called first inside the action wrapper: locks the other fields and empties the notice. */
  readonly onActionStart: () => void;
  /** The action settled; `saved` decides whether the notice announces the save. */
  readonly onActionEnd: (saved: boolean) => void;
}
