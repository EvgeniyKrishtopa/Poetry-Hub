import type { RefObject } from "react";

import type { LeaveAnswer } from "@/shared/lib/leave-guard/leave-guard.constants";

import type { CollectionLeaveDialogProps } from "../CollectionLeaveDialog/CollectionLeaveDialog.types";

interface LeavePromptHost {
  /** Whether the failure alert shows now: one that appears while the dialog is open takes focus on close. */
  readonly hasFailure: boolean;
  readonly alertRef: RefObject<HTMLDivElement | null>;
}

/** The leave dialog's props, and the three callbacks `useLeaveGuard` takes. */
interface LeavePrompt {
  readonly dialog: CollectionLeaveDialogProps;
  readonly openForLink: () => void;
  readonly askToLeave: () => Promise<LeaveAnswer>;
  readonly closePrompt: () => void;
}

/** Opens and closes the leave dialog and picks where focus goes after it (design D12, a copy). */
export function useLeavePrompt(host: LeavePromptHost): LeavePrompt {
  void host;
  throw new Error("not implemented");
}
