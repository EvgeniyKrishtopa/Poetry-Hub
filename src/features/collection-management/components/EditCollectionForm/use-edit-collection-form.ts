import type { FormEvent, RefObject } from "react";

import type { ConnectionStatus } from "@/shared/lib/network/use-connection-status";

import type { CollectionFormState } from "../../hooks/use-collection-form.types";
import type { UpdateCollectionFailure } from "../../model/collection-management.types";
import type { CollectionLeaveDialogProps } from "../CollectionLeaveDialog/CollectionLeaveDialog.types";

import type { EditCollectionFormProps } from "./EditCollectionForm.types";

/** A failure the alert above the form shows; the session-expired one navigates instead (design D6). */
export type CollectionSaveAlertFailure = Exclude<UpdateCollectionFailure, "unauthenticated">;

/** Everything `EditCollectionForm` renders from (design D6). */
export interface EditCollectionFormModel {
  readonly form: CollectionFormState;
  readonly failure: CollectionSaveAlertFailure | null;
  readonly isPending: boolean;
  /** The live connection status, for the notice above the form (design D9). */
  readonly connection: ConnectionStatus;
  /** Online and not saved yet: the save button's enabled state. */
  readonly canSave: boolean;
  readonly alertRef: RefObject<HTMLDivElement | null>;
  /** The back link's ref: it takes focus as it mounts after a discard (FR-8). */
  readonly backLinkRef: (link: HTMLAnchorElement | null) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly onDiscard: () => void;
  /** The leave dialog, open while the guard holds the author on the page (design D12). */
  readonly leaveDialog: CollectionLeaveDialogProps;
}

/** The edit form's logic: the shared fields, the update call and every outcome, discard, and the guard (design D6). */
export function useEditCollectionForm({ collectionId, stored }: EditCollectionFormProps): EditCollectionFormModel {
  void collectionId;
  void stored;
  throw new Error("not implemented");
}
