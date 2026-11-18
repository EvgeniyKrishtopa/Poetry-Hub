"use client";

import { callCaseAction } from "../../hooks/call-case-action";
import type { ViolationCase } from "../../model/violation.types";

import { runRemoveCase } from "./case-calls";
import type { RowShell } from "./use-row-shell";

/** «Убрать из списка»: removes the case and refreshes, so the row leaves the list (FR-7). */
export function useRemoveCase(shell: RowShell, violationCase: ViolationCase) {
  function remove() {
    shell.runCall(async () => {
      const answer = await callCaseAction(() => runRemoveCase(violationCase.id));
      if (!answer.ok) {
        shell.failCase(answer.reason);
        return;
      }
      shell.refreshList();
    });
  }

  return { remove };
}
