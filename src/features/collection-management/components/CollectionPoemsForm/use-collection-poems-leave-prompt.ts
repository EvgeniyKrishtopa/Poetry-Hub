import type { LeaveAnswer } from "@/shared/lib/leave-guard/leave-guard.constants";

import type { SaveCollectionPoemsOutcome } from "../../model/collection-management.types";
import type { CollectionPoemsLeaveDialogProps } from "../CollectionPoemsLeaveDialog/CollectionPoemsLeaveDialog.types";

export interface CollectionPoemsLeavePromptHost {
  /** The form's save; the dialog continues on `saved`. */
  readonly save: () => Promise<SaveCollectionPoemsOutcome>;
  /** A save already sending: the dialog waits for it instead of offering a choice. */
  readonly isPending: boolean;
  /** Turns the guard off before the dialog follows a link. */
  readonly releaseGuard: () => void;
}

/** The leave dialog's props, and the three callbacks the guard takes. */
export interface CollectionPoemsLeavePrompt {
  readonly dialog: CollectionPoemsLeaveDialogProps;
  /** The guard's `onBlocked`: opens the link form with where the link led. */
  readonly openForLink: (href: string) => void;
  /** The guard's `askToLeave`: answers `leave` before the draft resets after a save (Gate 1 C1). */
  readonly askToLeave: () => Promise<LeaveAnswer>;
  readonly closePrompt: () => void;
}

/** Opens the dialog, runs or waits for the save, and answers or navigates (add-poems-to-collections D7). */
export function useCollectionPoemsLeavePrompt(host: CollectionPoemsLeavePromptHost): CollectionPoemsLeavePrompt {
  void host;
  throw new Error("not implemented");
}
