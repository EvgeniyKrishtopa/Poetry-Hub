"use client";

import { useState } from "react";

import { useConnectionStatus } from "@/shared/lib/network/use-connection-status";
import { Alert, ConnectionNotice } from "@/shared/ui";

import { MANAGE_COLLECTION_POEMS_ERRORS } from "../../model/collection-management-messages";
import type { ManageCollectionPoemsError } from "../../model/collection-management.types";
import { ManageCollectionPoemsButton } from "../ManageCollectionPoemsButton/ManageCollectionPoemsButton";

import type { CollectionActionsProps } from "./CollectionActions.types";

/**
 * The connection notice, the button row (edit, manage, delete), and the manage button's alert below the whole
 * row: the button sits mid-row, so the row owns its error and DOM order matches visual order (design D4, D9).
 */
export function CollectionActions({ editButton, deleteButton, manageCollectionId }: CollectionActionsProps) {
  const connection = useConnectionStatus();
  const [manageError, setManageError] = useState<ManageCollectionPoemsError | null>(null);

  return (
    <>
      {/* Between the description and the buttons, at the page's own gap (artboard 32). */}
      <ConnectionNotice status={connection} />
      <div className="flex flex-wrap items-start gap-2">
        {editButton}
        {manageCollectionId !== undefined && (
          <ManageCollectionPoemsButton collectionId={manageCollectionId} onError={setManageError} />
        )}
        {deleteButton}
      </div>
      {manageError !== null && (
        <Alert tone="danger" className="self-stretch">
          {MANAGE_COLLECTION_POEMS_ERRORS[manageError]}
        </Alert>
      )}
    </>
  );
}
