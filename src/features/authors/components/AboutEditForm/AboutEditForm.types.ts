export interface AboutEditFormProps {
  /** The Markdown source being edited. */
  readonly draft: string;
  readonly error: string | undefined;
  readonly onDraftChange: (draft: string) => void;
  readonly onSubmit: () => void;
  readonly onCancel: () => void;
}
