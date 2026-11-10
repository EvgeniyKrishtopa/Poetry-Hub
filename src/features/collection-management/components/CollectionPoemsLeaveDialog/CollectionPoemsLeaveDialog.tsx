import { CONNECTION_STATUS } from "@/shared/lib/network/network.constants";
import { Button, ConnectionNotice, Dialog } from "@/shared/ui";

import { COLLECTION_POEMS_LEAVE_COPY } from "../../model/collection-management-messages";

import type { CollectionPoemsLeaveDialogProps } from "./CollectionPoemsLeaveDialog.types";

// Right-aligned and wrapping; below 600 px the three buttons stack full width, in the same order (artboard 36).
const ACTIONS_CLASS = "flex flex-wrap justify-end gap-2 max-[600px]:flex-col max-[600px]:items-stretch";

/** The save / leave / stay dialog over the shared `Dialog`, link and sign-out forms (add-poems-to-collections D7). */
export function CollectionPoemsLeaveDialog({
  dialogRef,
  saveRef,
  stayRef,
  reason,
  isSaving,
  connection,
  onSave,
  onLeave,
  onStay,
  onClosed,
}: CollectionPoemsLeaveDialogProps) {
  const isSignOut = reason.kind === "sign-out";
  const canSave = connection === CONNECTION_STATUS.online;

  return (
    <Dialog
      ref={dialogRef}
      title={COLLECTION_POEMS_LEAVE_COPY.title}
      description={isSignOut ? COLLECTION_POEMS_LEAVE_COPY.signOutBody : COLLECTION_POEMS_LEAVE_COPY.linkBody}
      closeLabel={COLLECTION_POEMS_LEAVE_COPY.close}
      closable={!isSaving}
      onClose={onClosed}
    >
      {/* Above the buttons, inside the dialog (FR-9). */}
      <ConnectionNotice status={connection} />
      <div className={ACTIONS_CLASS}>
        <Button ref={saveRef} disabled={isSaving || !canSave} onClick={onSave}>
          {isSaving ? COLLECTION_POEMS_LEAVE_COPY.savePending : COLLECTION_POEMS_LEAVE_COPY.save}
        </Button>
        <Button variant="danger" disabled={isSaving} onClick={onLeave}>
          {isSignOut ? COLLECTION_POEMS_LEAVE_COPY.leaveSignOut : COLLECTION_POEMS_LEAVE_COPY.leaveLink}
        </Button>
        <Button ref={stayRef} variant="ghost" disabled={isSaving} onClick={onStay}>
          {COLLECTION_POEMS_LEAVE_COPY.stay}
        </Button>
      </div>
    </Dialog>
  );
}
