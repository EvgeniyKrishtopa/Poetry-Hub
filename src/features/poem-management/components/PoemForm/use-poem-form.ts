import { useState } from "react";

import type { PoemGenre } from "@/features/poems";
import type { ImageDraft } from "@/shared/lib/image-file/image-file.types";
import { useImageDraft } from "@/shared/lib/image-file/use-image-draft";

import { type IllustrationState, isPoemFormChanged, type PoemFormValues } from "../../model/poem-form-values";
import { poemFormSchema, toPoemFieldErrors } from "../../model/poem-form.schema";
import { ILLUSTRATION_ERROR_MESSAGES, POEM_FIELD_ERRORS } from "../../model/poem-management-messages";
import { GENRE_PLACEHOLDER, POEM_FORM_FIELDS } from "../../model/poem-management.constants";
import type { PoemFieldErrors, PoemFormField } from "../../model/poem-management.types";

import { type PoemFormFieldIds, type PoemFormHost, usePoemFormFocus } from "./use-poem-form-focus";

const NO_FIELD_ERRORS: PoemFieldErrors = {};

const NO_ILLUSTRATION: IllustrationState = { kind: "none" };

/** The illustration the form shows: a newly picked file, else none once removed, else the initial one. */
function currentIllustration(
  initial: IllustrationState,
  newDraft: ImageDraft | null,
  storedRemoved: boolean,
): IllustrationState {
  if (newDraft !== null) return { kind: "new", draft: newDraft };
  return storedRemoved ? NO_ILLUSTRATION : initial;
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

/** The shared form logic, with no action and no navigation; focus is `usePoemFormFocus`'s (edit-poem design D4). */
export function usePoemForm<TFailure extends string>(
  initial: PoemFormValues,
  genres: readonly PoemGenre[],
  host: PoemFormHost,
): PoemFormState<TFailure> {
  const focus = usePoemFormFocus(host);
  const newIllustration = useImageDraft();
  const [title, setTitle] = useState(initial.title);
  const [text, setText] = useState(initial.text);
  const [genreId, setGenreId] = useState(initial.genreId);
  // Set by «remove»: the stored illustration stays hidden even after a newly picked file is removed (design D6).
  const [storedRemoved, setStoredRemoved] = useState(false);
  const [genreOptions, setGenreOptions] = useState(genres);
  const [fieldErrors, setFieldErrors] = useState<PoemFieldErrors>(NO_FIELD_ERRORS);
  const [failure, setFailure] = useState<TFailure | null>(null);
  const [pickerKey, setPickerKey] = useState(0);

  const illustration = currentIllustration(initial.illustration, newIllustration.draft, storedRemoved);
  const values: PoemFormValues = { title, text, genreId, illustration };
  const { fileError } = newIllustration;
  const illustrationError = fileError === null ? fieldErrors.illustration : ILLUSTRATION_ERROR_MESSAGES[fileError];

  function isInvalid(field: PoemFormField, errors: PoemFieldErrors): boolean {
    if (field === "illustration" && fileError !== null) return true;
    return errors[field] !== undefined;
  }

  function focusFirstInvalid(errors: PoemFieldErrors) {
    setFieldErrors(errors);
    const first = POEM_FORM_FIELDS.find((field) => isInvalid(field, errors));
    if (first !== undefined) focus.requestFocus(first);
  }

  function showFieldErrors(errors: PoemFieldErrors) {
    // The fieldset is disabled while sending, so the dropdown still holds the genre that was sent.
    if (errors.genreId === POEM_FIELD_ERRORS.genreUnavailable) {
      setGenreOptions((options) => options.filter((genre) => genre.id !== genreId));
      setGenreId(GENRE_PLACEHOLDER);
    }
    focusFirstInvalid(errors);
  }

  function showFailure(next: TFailure) {
    setFailure(next);
    focus.requestFocus("alert");
  }

  function validate(): boolean {
    // The next submit hides the previous outcome (add-poem-creation FR-5).
    setFailure(null);
    const check = poemFormSchema.safeParse({ title, text, genreId });
    if (!check.success || fileError !== null) {
      focusFirstInvalid(check.success ? NO_FIELD_ERRORS : toPoemFieldErrors(check.error));
      return false;
    }
    setFieldErrors(NO_FIELD_ERRORS);
    return true;
  }

  async function recheckIllustration(): Promise<boolean> {
    const chosen = newIllustration.draft;
    // The file is read again right before sending: it may have changed on disk since the pick.
    if (chosen === null || (await newIllustration.recheck(chosen))) return true;
    focus.requestFocus("illustration");
    return false;
  }

  function chooseIllustration(input: HTMLInputElement) {
    // The illustration's error follows the pick, not the next submit (add-poem-creation FR-4).
    setFieldErrors((errors) => ({ ...errors, illustration: undefined }));
    void newIllustration.choose(input);
  }

  function forgetNewIllustration() {
    newIllustration.reset();
    setPickerKey((key) => key + 1);
  }

  function removeIllustration() {
    setFieldErrors((errors) => ({ ...errors, illustration: undefined }));
    setStoredRemoved(true);
    forgetNewIllustration();
  }

  function reset() {
    setTitle(initial.title);
    setText(initial.text);
    setGenreId(initial.genreId);
    setStoredRemoved(false);
    setFieldErrors(NO_FIELD_ERRORS);
    setFailure(null);
    forgetNewIllustration();
    focus.remountEditor();
  }

  return {
    values,
    genres: genreOptions,
    fieldErrors,
    illustrationError,
    failure,
    isChanged: isPoemFormChanged(initial, values),
    rendering: { fieldIds: focus.fieldIds, editorKey: focus.editorKey, pickerKey },
    setTitle,
    setText,
    setGenreId,
    chooseIllustration,
    removeIllustration,
    validate,
    recheckIllustration,
    showFieldErrors,
    showFailure,
    reset,
  };
}
