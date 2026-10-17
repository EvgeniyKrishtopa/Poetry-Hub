import type { NameField } from "../../model/author.types";

export interface NameFieldEditFormProps {
  readonly field: NameField;
  readonly draft: string;
  readonly error: string | undefined;
  readonly onDraftChange: (draft: string) => void;
  readonly onSubmit: () => void;
  readonly onCancel: () => void;
}
