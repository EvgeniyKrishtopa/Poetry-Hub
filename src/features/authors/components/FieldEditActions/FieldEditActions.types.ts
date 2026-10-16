export interface FieldEditActionsProps {
  readonly onCancel: () => void;
  /** `false` while there is nothing to save yet (the photo field before a file is chosen). */
  readonly canSave?: boolean;
}
