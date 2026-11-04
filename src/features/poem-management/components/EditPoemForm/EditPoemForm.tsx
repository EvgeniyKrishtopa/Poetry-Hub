"use client";

import { Alert, Button, ButtonLink, ConnectionNotice } from "@/shared/ui";

import {
  EDIT_POEM_COPY,
  EDIT_POEM_ILLUSTRATION_LABELS,
  UPDATE_POEM_FAILURE_MESSAGES,
} from "../../model/poem-management-messages";
import { ownPoemPath } from "../../model/poem-paths";
import { LeaveBlockedDialog } from "../LeaveBlockedDialog/LeaveBlockedDialog";
import { POEM_FIELDSET_CLASS } from "../PoemForm/poem-fieldset-class";
import { PoemFormFields } from "../PoemForm/PoemFormFields";

import type { EditPoemFormProps } from "./EditPoemForm.types";
import { useEditPoemForm } from "./use-edit-poem-form";

/** The edit form's markup: the notices, the shared fields, then save and discard or the back link (design D4). */
export function EditPoemForm({ poemId, stored, genres }: EditPoemFormProps) {
  const {
    fields,
    failure,
    isChanged,
    isPending,
    connection,
    canSave,
    formRef,
    alertRef,
    backLinkRef,
    onSubmit,
    onDiscard,
    leaveDialog,
  } = useEditPoemForm({ poemId, stored, genres });

  return (
    <>
      {/* noValidate: the schema is the only validation, so its messages are what the author sees. */}
      <form ref={formRef} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <ConnectionNotice status={connection} />
        {failure !== null && (
          // Focusable by script only: focus lands here when the failure names no field (NFR-4).
          <div ref={alertRef} tabIndex={-1}>
            <Alert tone="danger">{UPDATE_POEM_FAILURE_MESSAGES[failure]}</Alert>
          </div>
        )}
        <fieldset disabled={isPending} className={POEM_FIELDSET_CLASS}>
          <PoemFormFields fields={fields} illustrationLabels={EDIT_POEM_ILLUSTRATION_LABELS} illustrationLayout="preview-first" />
          {isChanged ? (
            <div className="flex flex-wrap items-start gap-2">
              <Button type="submit" disabled={!canSave}>
                {isPending ? EDIT_POEM_COPY.submitPending : EDIT_POEM_COPY.submit}
              </Button>
              <Button variant="ghost" onClick={onDiscard}>
                {EDIT_POEM_COPY.discard}
              </Button>
            </div>
          ) : (
            <ButtonLink ref={backLinkRef} variant="ghost" href={ownPoemPath(poemId)} className="self-start">
              {EDIT_POEM_COPY.backToPoem}
            </ButtonLink>
          )}
        </fieldset>
      </form>
      {/* Outside the form: none of its buttons is ever part of a submit. */}
      <LeaveBlockedDialog {...leaveDialog} />
    </>
  );
}
