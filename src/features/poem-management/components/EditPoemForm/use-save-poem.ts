import type { UpdatePoemFailure } from "../../model/poem-management.types";
import type { PoemFormState } from "../PoemForm/use-poem-form";

/** The save call's state for the form (edit-poem design D7). */
export interface SavePoem {
  readonly isPending: boolean;
  /** Set by a `saved` result, before the navigation, so the leave guard lets it through. */
  readonly saved: boolean;
  readonly submit: () => void;
}

/** Calls `updatePoemAction` and routes every outcome: stores, navigation, alert, offline (edit-poem design D7). */
export function useSavePoem(poemId: string, form: PoemFormState<UpdatePoemFailure>): SavePoem {
  void poemId;
  void form;
  throw new Error("not implemented");
}
