import type { RefObject } from "react";

import type { PoemGenre } from "@/features/poems";

import type { PoemFormValues } from "../model/poem-form-values";
import type { PoemFieldErrors } from "../model/poem-management.types";

/** The ids the fields render with, so focus can find them. */
export interface PoemFormFieldIds {
  readonly text: string;
  readonly genreId: string;
  readonly illustration: string;
}

/** What focus needs from the form that owns the action and renders the alert. */
export interface PoemFormHost {
  /** The form's sending state: focus waits for the fieldset to be enabled again, since a disabled control can't take it. */
  readonly isPending: boolean;
  /** The form element, where the title input is found by name. */
  readonly formRef: RefObject<HTMLFormElement | null>;
  /** The failure alert's focusable wrapper, rendered by the form. */
  readonly alertRef: RefObject<HTMLDivElement | null>;
}

/** What only the fields' markup needs: ids to point labels and focus at, and keys that remount controls. */
interface PoemFormRendering {
  readonly fieldIds: PoemFormFieldIds;
  /** A new key remounts the editor on its editor tab, so an invalid text can take focus. */
  readonly editorKey: number;
  /** A new key remounts the file input, so a removed file is forgotten by the browser too. */
  readonly pickerKey: number;
}

/** What the add and edit forms share: drafts, errors, the browser check, change detection (edit-poem D4). */
export interface PoemFormState<TFailure extends string> {
  readonly values: PoemFormValues;
  readonly genres: readonly PoemGenre[];
  readonly fieldErrors: PoemFieldErrors;
  /** The illustration's message: the browser check's while it fails, otherwise the server's. */
  readonly illustrationError: string | undefined;
  readonly failure: TFailure | null;
  /** Derived on every render, never stored (edit-poem design D5). */
  readonly isChanged: boolean;
  readonly rendering: PoemFormRendering;
  readonly setTitle: (title: string) => void;
  readonly setText: (text: string) => void;
  readonly setGenreId: (genreId: string) => void;
  readonly chooseIllustration: (input: HTMLInputElement) => void;
  readonly removeIllustration: () => void;
  /** Hides the previous failure and runs the field rules; `false` shows the errors and focuses the first invalid field. */
  readonly validate: () => boolean;
  /** Reads a newly picked file again right before sending; `false` shows its error and focuses the field. */
  readonly recheckIllustration: () => Promise<boolean>;
  /** The server's field errors; a genre it reports as removed leaves the list for the rest of the visit. */
  readonly showFieldErrors: (errors: PoemFieldErrors) => void;
  readonly showFailure: (failure: TFailure) => void;
  /** Back to `initial`: drafts, errors, the failure, and the illustration (edit-poem design D5, discard). */
  readonly reset: () => void;
}
