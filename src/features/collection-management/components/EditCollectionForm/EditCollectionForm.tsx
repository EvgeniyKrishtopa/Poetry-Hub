"use client";

import { Alert, Button, ButtonLink, ConnectionNotice } from "@/shared/ui";

import { EDIT_COLLECTION_COPY, UPDATE_COLLECTION_FAILURE_MESSAGES } from "../../model/collection-management-messages";
import { collectionPath } from "../../model/collection-paths";
import { CollectionLeaveDialog } from "../CollectionLeaveDialog/CollectionLeaveDialog";
import { COLLECTION_FIELDSET_CLASS } from "../CollectionFormFields/collection-fieldset-class";
import { CollectionFormFields } from "../CollectionFormFields/CollectionFormFields";

import type { EditCollectionFormProps } from "./EditCollectionForm.types";
import { useEditCollectionForm } from "./use-edit-collection-form";

/** The edit form: fields, save or back link, the outcomes, the connection notice, the leave guard (design D6). */
export function EditCollectionForm({ collectionId, stored }: EditCollectionFormProps) {
  const { form, failure, isPending, connection, canSave, formRef, alertRef, backLinkRef, onSubmit, onDiscard, leaveDialog } =
    useEditCollectionForm({ collectionId, stored });

  return (
    <>
      {/* Both above the form, under the heading, at the page's own gap (artboard 33). */}
      <ConnectionNotice status={connection} />
      {failure !== null && (
        // Focusable by script only: focus lands here when the failure names no field (NFR-4).
        <div ref={alertRef} tabIndex={-1}>
          <Alert tone="danger">{UPDATE_COLLECTION_FAILURE_MESSAGES[failure]}</Alert>
        </div>
      )}
      {/* noValidate: the schema is the only validation, so its messages are what the author sees. */}
      <form ref={formRef} onSubmit={onSubmit} noValidate>
        <fieldset disabled={isPending} className={COLLECTION_FIELDSET_CLASS}>
          <CollectionFormFields form={form} />
          {form.isChanged ? (
            <div className="flex flex-wrap items-start gap-2">
              <Button type="submit" disabled={!canSave}>
                {isPending ? EDIT_COLLECTION_COPY.submitPending : EDIT_COLLECTION_COPY.submit}
              </Button>
              <Button variant="ghost" onClick={onDiscard}>
                {EDIT_COLLECTION_COPY.discard}
              </Button>
            </div>
          ) : (
            <ButtonLink ref={backLinkRef} variant="ghost" href={collectionPath(collectionId)} className="self-start">
              {EDIT_COLLECTION_COPY.backToCollection}
            </ButtonLink>
          )}
        </fieldset>
      </form>
      {/* Outside the form: none of its buttons is ever part of a submit. */}
      <CollectionLeaveDialog {...leaveDialog} />
    </>
  );
}
