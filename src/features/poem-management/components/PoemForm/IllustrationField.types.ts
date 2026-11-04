import type { IllustrationState } from "../../model/poem-form-values";
import type { IllustrationLabels } from "../../model/poem-management.types";

/**
 * The field's order: the add form's picker, then the preview and the remove button below it; or the edit
 * page's preview, then the picker with the remove button beside it (edit-poem ui-plan, artboard 26).
 */
export type IllustrationLayout = "picker-first" | "preview-first";

export interface IllustrationFieldProps {
  readonly layout: IllustrationLayout;
  /** The file input's id; the field's label points at it. */
  readonly id: string;
  /** Changes when the choice is removed, so the native input forgets the file. */
  readonly pickerKey: number;
  /** The stored illustration, none, or a newly picked file that passed the browser check. */
  readonly illustration: IllustrationState;
  readonly error: string | undefined;
  readonly labels: IllustrationLabels;
  readonly onFileChange: (input: HTMLInputElement) => void;
  readonly onRemove: () => void;
}
