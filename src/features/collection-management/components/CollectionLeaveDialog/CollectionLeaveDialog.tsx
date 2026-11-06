import { Button, Dialog } from "@/shared/ui";

import { LEAVE_DIALOG_COPY } from "../../model/collection-management-messages";
import { LEAVE_DIALOG_REASON } from "../../model/collection-management.constants";

import type { CollectionLeaveDialogProps } from "./CollectionLeaveDialog.types";

// Below 600 px the sign-out form's two buttons stack full width, in the same order (artboard 27).
const SIGN_OUT_ACTIONS_CLASS = "flex flex-wrap justify-end gap-2 max-[600px]:flex-col max-[600px]:items-stretch";

/** The unsaved-changes `Dialog` in its link or sign-out form (design D12, a copy of poem-management's). */
export function CollectionLeaveDialog({ ref, stayRef, reason, onStay, onLeave, onClose }: CollectionLeaveDialogProps) {
  const isSignOut = reason === LEAVE_DIALOG_REASON.signOut;
  const stayButton = (
    <Button ref={stayRef} onClick={onStay}>
      {LEAVE_DIALOG_COPY.stay}
    </Button>
  );

  return (
    <Dialog
      ref={ref}
      title={LEAVE_DIALOG_COPY.title}
      description={isSignOut ? LEAVE_DIALOG_COPY.signOutBody : LEAVE_DIALOG_COPY.linkBody}
      closeLabel={LEAVE_DIALOG_COPY.close}
      onClose={onClose}
    >
      {isSignOut ? (
        <div className={SIGN_OUT_ACTIONS_CLASS}>
          <Button variant="danger" onClick={onLeave}>
            {LEAVE_DIALOG_COPY.leave}
          </Button>
          {stayButton}
        </div>
      ) : (
        <div className="flex justify-end">{stayButton}</div>
      )}
    </Dialog>
  );
}
