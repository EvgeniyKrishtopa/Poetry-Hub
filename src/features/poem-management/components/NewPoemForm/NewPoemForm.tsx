"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useTransition } from "react";

import { CONNECTION_STATUS } from "@/shared/lib/network/network.constants";
import { useConnectionStatus } from "@/shared/lib/network/use-connection-status";
import { Alert, Button, ConnectionNotice } from "@/shared/ui";

import { createPoemAction } from "../../actions/create-poem.actions";
import { useCreatedPoemNotice } from "../../model/created-poem-notice-ui.store";
import type { PoemFormValues } from "../../model/poem-form-values";
import {
  CREATE_POEM_FAILURE_MESSAGES,
  NEW_POEM_ILLUSTRATION_LABELS,
  POEM_MANAGEMENT_COPY,
} from "../../model/poem-management-messages";
import { CREATE_POEM_STATUS, GENRE_PLACEHOLDER } from "../../model/poem-management.constants";
import type { CreatePoemFailure, CreatePoemResult } from "../../model/poem-management.types";
import { ownPoemPath } from "../../model/poem-paths";
import { POEM_FIELDSET_CLASS } from "../PoemForm/poem-fieldset-class";
import { PoemFormFields } from "../PoemForm/PoemFormFields";
import { usePoemForm } from "../../hooks/use-poem-form";

import type { NewPoemFormProps } from "./NewPoemForm.types";

const EMPTY_VALUES: PoemFormValues = { title: "", text: "", genreId: GENRE_PLACEHOLDER, illustration: { kind: "none" } };

/** The add form: the shared fields, the create call and its outcomes (add-poem-creation design D8, edit-poem D4). */
export function NewPoemForm({ genres }: NewPoemFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const fields = usePoemForm<CreatePoemFailure>(EMPTY_VALUES, genres, { isPending, formRef, alertRef });
  const { values, failure, validate, recheckIllustration, showFieldErrors, showFailure, reset } = fields;
  // Set synchronously on submit: a second click can arrive before the pending state disables the form.
  const submittingRef = useRef(false);
  const connection = useConnectionStatus();
  // The transition's closure holds the status of the render that started it; the rejection reads the latest.
  const connectionRef = useRef(connection);
  useEffect(() => {
    connectionRef.current = connection;
  });
  const isOnline = connection === CONNECTION_STATUS.online;

  function handleResult(result: CreatePoemResult | undefined) {
    // No data: a malformed request or a rejected body, which the form never sends on purpose (design D7).
    if (result === undefined) {
      showFailure("unknown");
      return;
    }
    if (result.status === CREATE_POEM_STATUS.created) {
      // Cleared first, so Back to the form shows it empty (FR-5).
      reset();
      // Only written, after the answer: `getState()`, no subscription.
      useCreatedPoemNotice.getState().setPoemNotice({ poemId: result.poemId, kind: "created" });
      router.push(ownPoemPath(result.poemId));
      return;
    }
    if (result.status === CREATE_POEM_STATUS.invalid) {
      showFieldErrors(result.fieldErrors);
      return;
    }
    showFailure(result.failure);
  }

  async function send() {
    if (!(await recheckIllustration())) return;
    const { title, text, genreId, illustration } = values;
    let result: CreatePoemResult | undefined;
    try {
      const file = illustration.kind === "new" ? illustration.draft.file : undefined;
      result = (await createPoemAction({ title, text, genreId, illustration: file })).data;
    } catch (error) {
      // The error's type only: never the poem's content (edit-poem NFR-10).
      console.error(`[poem-management] create call rejected: ${error instanceof Error ? error.name : typeof error}`);
      // Offline: the live notice already says why, so no alert is kept (edit-poem FR-11).
      if (connectionRef.current !== CONNECTION_STATUS.offline) showFailure("unknown");
      return;
    }
    handleResult(result);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Checked here as well as by the disabled button, like the edit form (design D8).
    if (!isOnline || submittingRef.current || !validate()) return;

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
    <>
      {/* Between the heading and the form, at the page's own gap (artboard 28). */}
      <ConnectionNotice status={connection} />
      {/* noValidate: the schema is the only validation, so its messages are what the author sees. */}
      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        <fieldset disabled={isPending} className={POEM_FIELDSET_CLASS}>
          <PoemFormFields fields={fields} illustrationLabels={NEW_POEM_ILLUSTRATION_LABELS} illustrationLayout="picker-first" />
          {failure !== null && (
            // Focusable by script only: focus lands here when the failure names no field (NFR-7).
            <div ref={alertRef} tabIndex={-1}>
              <Alert tone="danger">{CREATE_POEM_FAILURE_MESSAGES[failure]}</Alert>
            </div>
          )}
          <Button type="submit" disabled={!isOnline} className="self-start">
            {isPending ? POEM_MANAGEMENT_COPY.submitPending : POEM_MANAGEMENT_COPY.submit}
          </Button>
        </fieldset>
      </form>
    </>
  );
}
