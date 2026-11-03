import type { PoemFormState } from "./use-poem-form";

export interface PoemFormFieldsProps {
  readonly form: PoemFormState;
  /** The remove button's text: «Убрать иллюстрацию» on create, «Удалить иллюстрацию» on edit (design D6). */
  readonly removeIllustrationLabel: string;
}
