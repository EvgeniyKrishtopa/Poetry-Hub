"use client";

import { Alert, Button, ButtonLink, ConnectionNotice } from "@/shared/ui";

import {
  COLLECTION_POEMS_PAGE_COPY,
  SAVE_COLLECTION_POEMS_FAILURE_MESSAGES,
} from "../../model/collection-management-messages";
import { collectionPath } from "../../model/collection-paths";
import { CollectionPoemsLeaveDialog } from "../CollectionPoemsLeaveDialog/CollectionPoemsLeaveDialog";

import type { CollectionPoemsFormProps } from "./CollectionPoemsForm.types";
import { type CollectionPoemsAlert, useCollectionPoemsForm } from "./use-collection-poems-form";

// Native 18 px boxes in the accent colour, the keyboard focus as a 2 px accent outline (artboard 35).
const CHECKBOX_CLASS = "size-4.5 shrink-0 accent-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function alertMessage(alert: CollectionPoemsAlert): string {
  return alert === "stale" ? COLLECTION_POEMS_PAGE_COPY.stale : SAVE_COLLECTION_POEMS_FAILURE_MESSAGES[alert];
}

/** The checkbox group, the save button, the notices, and the leave dialog (add-poems-to-collections D5 – D8). */
export function CollectionPoemsForm({ collectionId, choices }: CollectionPoemsFormProps) {
  const {
    checked,
    isChanged,
    isPending,
    connection,
    canEdit,
    canSave,
    hasSaved,
    showSavedNotice,
    alert,
    alertRef,
    toggle,
    save,
    leaveDialog,
  } = useCollectionPoemsForm({ collectionId, choices });
  const backLink = (
    <ButtonLink variant="ghost" href={collectionPath(collectionId)}>
      {COLLECTION_POEMS_PAGE_COPY.backToCollection}
    </ButtonLink>
  );

  return (
    <>
      {/* Above the list, under the hint, at the page's own gap (artboard 35). */}
      <ConnectionNotice status={connection} />
      {alert !== null && (
        // Focusable by script only: focus lands here after a failed save (NFR-4).
        <div ref={alertRef} tabIndex={-1}>
          <Alert tone="danger">{alertMessage(alert)}</Alert>
        </div>
      )}
      {showSavedNotice && <Alert tone="success">{COLLECTION_POEMS_PAGE_COPY.saved}</Alert>}
      {choices.length === 0 ? (
        // Rendered here, not by the page: a stale save that empties the list keeps its alert above this (FR-8).
        <div className="flex flex-col items-start gap-6">
          <p className="text-muted">{COLLECTION_POEMS_PAGE_COPY.empty}</p>
          {backLink}
        </div>
      ) : (
        <div className="flex flex-col items-start gap-6">
          {/* Native `disabled` freezes every box at once while offline, slow, or sending (FR-6, FR-9). */}
          <fieldset disabled={!canEdit} className="flex flex-col gap-3 disabled:opacity-50">
            <legend className="sr-only">{COLLECTION_POEMS_PAGE_COPY.legend}</legend>
            {choices.map((choice) => (
              <label key={choice.id} className="flex items-center gap-3 text-lg">
                <input
                  type="checkbox"
                  checked={checked.has(choice.id)}
                  onChange={() => toggle(choice.id)}
                  className={CHECKBOX_CLASS}
                />
                {choice.title}
              </label>
            ))}
          </fieldset>
          {(isChanged || hasSaved) && (
            <Button disabled={!canSave} onClick={() => void save()}>
              {isPending ? COLLECTION_POEMS_PAGE_COPY.savePending : COLLECTION_POEMS_PAGE_COPY.save}
            </Button>
          )}
          {hasSaved && !isChanged && backLink}
        </div>
      )}
      <CollectionPoemsLeaveDialog {...leaveDialog} />
    </>
  );
}
