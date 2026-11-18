"use client";

import { callCaseAction } from "../../hooks/call-case-action";
import { CASE_RESULT_MESSAGES } from "../../model/admin-messages";
import { otherGround } from "../../model/other-ground";
import type { ViolationCase } from "../../model/violation.types";

import { runSetGround } from "./case-calls";
import type { RowShell } from "./use-row-shell";

/** «Сменить основание»: moves the case to the other ground, says so, and refreshes the list (FR-7). */
export function useSwitchGround(shell: RowShell, violationCase: ViolationCase) {
  function switchGround() {
    shell.runCall(async () => {
      const answer = await callCaseAction(() => runSetGround(violationCase.id, otherGround(violationCase.ground)));
      if (!answer.ok) {
        shell.failCase(answer.reason);
        return;
      }
      shell.setNotice({ tone: "success", text: CASE_RESULT_MESSAGES.groundChanged });
      shell.refreshList();
    });
  }

  return { switchGround };
}
