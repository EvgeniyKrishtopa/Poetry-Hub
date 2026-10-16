import type { AboutContent } from "../AboutFieldEditor/AboutFieldEditor.types";

export interface AboutEditFormProps {
  readonly draft: AboutContent;
  readonly error: string | undefined;
  readonly onDraftChange: (draft: AboutContent) => void;
  readonly onSubmit: () => void;
  readonly onCancel: () => void;
}
