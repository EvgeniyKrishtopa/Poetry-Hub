import type { IllustrationLabels } from "../../model/poem-management.types";

import type { IllustrationLayout } from "./IllustrationField.types";
import type { PoemFormState } from "./use-poem-form";

export interface PoemFormFieldsProps {
  /** Either form's state; the failure is the form's own, so the fields don't read it. */
  readonly form: Omit<PoemFormState<string>, "failure" | "showFailure">;
  /** The illustration buttons' texts: the add form keeps its own, the edit form names replace and delete (design D6). */
  readonly illustrationLabels: IllustrationLabels;
  readonly illustrationLayout: IllustrationLayout;
}
