"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useId, useRef, useState, useTransition } from "react";

import { useImageDraft } from "@/shared/lib/image-file/use-image-draft";
import { Alert, Button, MarkdownEditor, TextField } from "@/shared/ui";

import { createPoemAction } from "../../actions/create-poem.actions";
import { useCreatedPoemNotice } from "../../model/created-poem-notice-ui.store";
import { poemFormSchema, poemTextLength, toPoemFieldErrors } from "../../model/poem-form.schema";
import {
  CREATE_POEM_FAILURE_MESSAGES,
  ILLUSTRATION_ERROR_MESSAGES,
  POEM_FIELD_ERRORS,
  POEM_MANAGEMENT_COPY,
} from "../../model/poem-management-messages";
import {
  CREATE_POEM_STATUS,
  GENRE_PLACEHOLDER,
  POEM_FORM_FIELDS,
  POEM_MARKDOWN_FORMATS,
  TEXT_MAX_LENGTH,
} from "../../model/poem-management.constants";
import type { CreatePoemFailure, CreatePoemResult, PoemFieldErrors, PoemFormField } from "../../model/poem-management.types";
import { ownPoemPath } from "../../model/poem-paths";

import { GenreSelect } from "./GenreSelect";
import { IllustrationField } from "./IllustrationField";
import type { FocusRequest, NewPoemFormProps } from "./NewPoemForm.types";

const NO_FIELD_ERRORS: PoemFieldErrors = {};

const TITLE_FIELD_NAME = "title";

// The disabled fieldset dims the whole form; its buttons would dim a second time on their own `:disabled` style.
const FIELDSET_CLASS = "flex min-w-0 flex-col gap-6 disabled:opacity-50 [&_button:disabled]:opacity-100";

/** The add form: local drafts, the same checks as the action, focus on the first error (design D8). */
export function NewPoemForm({ genres }: NewPoemFormProps) {
  const router = useRouter();
  const setCreatedPoemId = useCreatedPoemNotice((state) => state.setCreatedPoemId);
  const illustration = useImageDraft();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [genreId, setGenreId] = useState(GENRE_PLACEHOLDER);
  // A genre the server reports as removed leaves the list for the rest of the visit.
  const [genreOptions, setGenreOptions] = useState(genres);
  const [fieldErrors, setFieldErrors] = useState<PoemFieldErrors>(NO_FIELD_ERRORS);
  const [failure, setFailure] = useState<CreatePoemFailure | null>(null);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  // A new key remounts the editor on its editor tab, so an invalid text can take focus.
  const [editorKey, setEditorKey] = useState(0);
  // A new key remounts the file input, so a removed file is forgotten by the browser too.
  const [pickerKey, setPickerKey] = useState(0);
  const [isPending, startTransition] = useTransition();
  // Set synchronously on submit: a second click can arrive before the pending state disables the form.
  const submittingRef = useRef(false);
  const handledFocusRef = useRef<FocusRequest | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const textId = useId();
  const genreFieldId = useId();
  const illustrationId = useId();

  const illustrationError =
    illustration.fileError === null ? fieldErrors.illustration : ILLUSTRATION_ERROR_MESSAGES[illustration.fileError];

  // Focus waits for the fieldset to be enabled again: a disabled control can't take it.
  useEffect(() => {
    if (isPending || focusRequest === null || handledFocusRef.current === focusRequest) return;
    handledFocusRef.current = focusRequest;

    const { target } = focusRequest;
    if (target === "alert") {
      alertRef.current?.focus();
      return;
    }
    // The title input's id is TextField's own, so it is found by name.
    const fieldIds = { text: textId, genreId: genreFieldId, illustration: illustrationId };
    const element =
      target === TITLE_FIELD_NAME
        ? formRef.current?.elements.namedItem(TITLE_FIELD_NAME)
        : document.getElementById(fieldIds[target]);
    if (element instanceof HTMLElement) element.focus();
  }, [focusRequest, isPending, textId, genreFieldId, illustrationId]);

  function requestFocus(target: FocusRequest["target"]) {
    if (target === "text") setEditorKey((key) => key + 1);
    setFocusRequest({ target });
  }

  function showFieldErrors(errors: PoemFieldErrors) {
    setFieldErrors(errors);
    const first = POEM_FORM_FIELDS.find((field) => isInvalid(field, errors));
    if (first !== undefined) requestFocus(first);
  }

  function isInvalid(field: PoemFormField, errors: PoemFieldErrors): boolean {
    if (field === "illustration" && illustration.fileError !== null) return true;
    return errors[field] !== undefined;
  }

  function handleFileChange(input: HTMLInputElement) {
    // The illustration's error follows the pick, not the next submit (FR-4).
    setFieldErrors((errors) => ({ ...errors, illustration: undefined }));
    void illustration.choose(input);
  }

  function removeIllustration() {
    setFieldErrors((errors) => ({ ...errors, illustration: undefined }));
    illustration.reset();
    setPickerKey((key) => key + 1);
  }

  function clearDrafts() {
    setTitle("");
    setText("");
    setGenreId(GENRE_PLACEHOLDER);
    removeIllustration();
  }

  function handleResult(result: CreatePoemResult | undefined, sentGenreId: string) {
    // No data: a malformed request or a rejected body, which the form never sends on purpose (design D7).
    if (result === undefined) {
      setFailure("unknown");
      requestFocus("alert");
      return;
    }
    if (result.status === CREATE_POEM_STATUS.created) {
      // Cleared first, so Back to the form shows it empty (FR-5).
      clearDrafts();
      setCreatedPoemId(result.poemId);
      router.push(ownPoemPath(result.poemId));
      return;
    }
    if (result.status === CREATE_POEM_STATUS.invalid) {
      if (result.fieldErrors.genreId === POEM_FIELD_ERRORS.genreUnavailable) {
        setGenreOptions((options) => options.filter((genre) => genre.id !== sentGenreId));
        setGenreId(GENRE_PLACEHOLDER);
      }
      showFieldErrors(result.fieldErrors);
      return;
    }
    setFailure(result.failure);
    requestFocus("alert");
  }

  async function send() {
    const chosen = illustration.draft;
    // The file is read again right before sending: it may have changed on disk since the pick.
    if (chosen !== null && !(await illustration.recheck(chosen))) {
      requestFocus("illustration");
      return;
    }
    let result: CreatePoemResult | undefined;
    try {
      result = (await createPoemAction({ title, text, genreId, illustration: chosen?.file })).data;
    } catch {
      result = undefined;
    }
    handleResult(result, genreId);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    // The next submit hides the previous outcome (FR-5).
    setFailure(null);
    const check = poemFormSchema.safeParse({ title, text, genreId });
    if (!check.success || illustration.fileError !== null) {
      showFieldErrors(check.success ? NO_FIELD_ERRORS : toPoemFieldErrors(check.error));
      return;
    }

    setFieldErrors(NO_FIELD_ERRORS);
    submittingRef.current = true;
    startTransition(async () => {
      try {
        await send();
      } finally {
        submittingRef.current = false;
      }
    });
  }

  return (
    // noValidate: the schema is the only validation, so its messages are what the author sees.
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      <fieldset disabled={isPending} className={FIELDSET_CLASS}>
        <TextField
          label={POEM_MANAGEMENT_COPY.titleLabel}
          name={TITLE_FIELD_NAME}
          type="text"
          autoComplete="off"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          error={fieldErrors.title}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor={textId} className="text-sm font-medium">
            {POEM_MANAGEMENT_COPY.textLabel}
          </label>
          <MarkdownEditor
            key={editorKey}
            id={textId}
            value={text}
            onChange={setText}
            error={fieldErrors.text}
            length={poemTextLength(text)}
            maxLength={TEXT_MAX_LENGTH}
            formats={POEM_MARKDOWN_FORMATS}
            variant="poem"
          />
        </div>
        <GenreSelect
          id={genreFieldId}
          value={genreId}
          genres={genreOptions}
          error={fieldErrors.genreId}
          onChange={setGenreId}
        />
        <IllustrationField
          id={illustrationId}
          pickerKey={pickerKey}
          draft={illustration.draft}
          error={illustrationError}
          onFileChange={handleFileChange}
          onRemove={removeIllustration}
        />
        {failure !== null && (
          // Focusable by script only: focus lands here when the failure names no field (NFR-7).
          <div ref={alertRef} tabIndex={-1}>
            <Alert tone="danger">{CREATE_POEM_FAILURE_MESSAGES[failure]}</Alert>
          </div>
        )}
        <Button type="submit" className="self-start">
          {isPending ? POEM_MANAGEMENT_COPY.submitPending : POEM_MANAGEMENT_COPY.submit}
        </Button>
      </fieldset>
    </form>
  );
}
