"use client";

import type { EarlyBlockNote } from "../../model/early-block-note";
import type { ViolationCase } from "../../model/violation.types";

import { useRemoveCase } from "./use-remove-case";
import { useRestriction } from "./use-restriction";
import { useRowShell } from "./use-row-shell";
import { useSwitchGround } from "./use-switch-ground";
import { useWarning } from "./use-warning";

/**
 * The controller of one case row: it builds the shared state and hands it to one hook per action, then gives the row
 * a single object to render from (design D6, D7). A ground switch, a warning and a stale answer refresh the list. A
 * block, a ban or a case that is gone does not: the row keeps its message, loses its buttons, and leaves the list the
 * next time the page loads.
 */
export function useCaseRow(violationCase: ViolationCase, earlyNote: EarlyBlockNote | null) {
  const shell = useRowShell();
  const { switchGround } = useSwitchGround(shell, violationCase);
  const { remove } = useRemoveCase(shell, violationCase);
  const restriction = useRestriction(shell, violationCase.userId, earlyNote);
  const warning = useWarning(shell);

  return {
    notice: shell.notice,
    isClosed: shell.isClosed,
    isPending: shell.isPending,
    isOnline: shell.isOnline,
    dialogRefs: {
      warn: warning.warnDialogRef,
      "early-block": restriction.earlyDialogRef,
      ban: restriction.banDialogRef,
    },
    ownFailure: restriction.ownFailure,
    dialogFailure: restriction.dialogFailure,
    openWarnDialog: warning.openWarnDialog,
    switchGround,
    remove,
    requestBlock: restriction.requestBlock,
    confirmBlock: restriction.confirmBlock,
    requestBan: restriction.requestBan,
    confirmBan: restriction.confirmBan,
    handleWarned: warning.handleWarned,
    handleDialogClose: restriction.handleDialogClose,
  };
}
