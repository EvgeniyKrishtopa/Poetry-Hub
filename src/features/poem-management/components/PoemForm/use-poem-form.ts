import type { PoemGenre } from "@/features/poems";

import type { PoemFormValues } from "../../model/poem-form-values";
import type { CreatePoemFailure, PoemFieldErrors, UpdatePoemFailure } from "../../model/poem-management.types";

/** What the add and edit forms share: drafts, errors, the browser check, focus, change detection (edit-poem D4). */
export interface PoemFormState {
  readonly values: PoemFormValues;
  readonly genres: readonly PoemGenre[];
  readonly fieldErrors: PoemFieldErrors;
  readonly failure: CreatePoemFailure | UpdatePoemFailure | null;
  /** Derived on every render, never stored (edit-poem design D5). */
  readonly isChanged: boolean;
  readonly setTitle: (title: string) => void;
  readonly setText: (text: string) => void;
  readonly setGenreId: (genreId: string) => void;
  readonly chooseIllustration: (input: HTMLInputElement) => void;
  readonly removeIllustration: () => void;
  /** Runs the field rules; `false` shows the errors and focuses the first invalid field. */
  readonly validate: () => boolean;
  readonly showFieldErrors: (errors: PoemFieldErrors) => void;
  readonly showFailure: (failure: CreatePoemFailure | UpdatePoemFailure) => void;
  /** Back to `initial`: drafts, errors, and the illustration (edit-poem design D5, discard). */
  readonly reset: () => void;
}

/** The shared form logic, with no action and no navigation (edit-poem design D4). */
export function usePoemForm(initial: PoemFormValues, genres: readonly PoemGenre[]): PoemFormState {
  void initial;
  void genres;
  throw new Error("not implemented");
}
