"use client";

import { type FormEvent, useRef, useTransition } from "react";

import { CONNECTION_STATUS } from "@/shared/lib/network/network.constants";
import { useConnectionStatus } from "@/shared/lib/network/use-connection-status";
import { Alert, Button, ButtonLink, ConnectionNotice } from "@/shared/ui";

import {
  EDIT_POEM_COPY,
  EDIT_POEM_ILLUSTRATION_LABELS,
  UPDATE_POEM_FAILURE_MESSAGES,
} from "../../model/poem-management-messages";
import type { SaveAlertFailure } from "../../model/poem-management.types";
import { ownPoemPath } from "../../model/poem-paths";
import { POEM_FIELDSET_CLASS } from "../PoemForm/poem-fieldset-class";
import { PoemFormFields } from "../PoemForm/PoemFormFields";
import { usePoemForm } from "../PoemForm/use-poem-form";

import type { EditPoemFormProps } from "./EditPoemForm.types";
import { useSavePoem } from "./use-save-poem";

/** The edit form: shared fields, save or back link, the outcomes, the connection notice (design D4, D5, D8). */
export function EditPoemForm({ poemId, stored, genres }: EditPoemFormProps) {
  const [isPending, startTransition] = useTransition();
  const connection = useConnectionStatus();
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  // Set by the discard button: the back link it brings back takes focus as it mounts (FR-3).
  const focusBackLinkRef = useRef(false);
  const form = usePoemForm<SaveAlertFailure>(stored, genres, { isPending, formRef, alertRef });
  const { submit } = useSavePoem({ poemId, form, startTransition, connection });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Enter in a field submits too, even while the save button is hidden or disabled.
    if (form.isChanged && connection === CONNECTION_STATUS.online) submit();
  }

  function discard() {
    focusBackLinkRef.current = true;
    form.reset();
  }

  function focusIfDiscarded(link: HTMLAnchorElement | null) {
    if (link === null || !focusBackLinkRef.current) return;
    focusBackLinkRef.current = false;
    link.focus();
  }

  return (
    // noValidate: the schema is the only validation, so its messages are what the author sees.
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <ConnectionNotice status={connection} />
      {form.failure !== null && (
        // Focusable by script only: focus lands here when the failure names no field (NFR-4).
        <div ref={alertRef} tabIndex={-1}>
          <Alert tone="danger">{UPDATE_POEM_FAILURE_MESSAGES[form.failure]}</Alert>
        </div>
      )}
      <fieldset disabled={isPending} className={POEM_FIELDSET_CLASS}>
        <PoemFormFields form={form} illustrationLabels={EDIT_POEM_ILLUSTRATION_LABELS} illustrationLayout="preview-first" />
        {form.isChanged ? (
          <div className="flex flex-wrap items-start gap-2">
            <Button type="submit" disabled={connection !== CONNECTION_STATUS.online}>
              {isPending ? EDIT_POEM_COPY.submitPending : EDIT_POEM_COPY.submit}
            </Button>
            <Button variant="ghost" onClick={discard}>
              {EDIT_POEM_COPY.discard}
            </Button>
          </div>
        ) : (
          <ButtonLink ref={focusIfDiscarded} variant="ghost" href={ownPoemPath(poemId)} className="self-start">
            {EDIT_POEM_COPY.backToPoem}
          </ButtonLink>
        )}
      </fieldset>
    </form>
  );
}
