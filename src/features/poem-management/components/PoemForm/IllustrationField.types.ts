import type { IllustrationState } from "../../model/poem-form-values";
import type { IllustrationLabels } from "../../model/poem-management.types";

export interface IllustrationFieldProps {
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
