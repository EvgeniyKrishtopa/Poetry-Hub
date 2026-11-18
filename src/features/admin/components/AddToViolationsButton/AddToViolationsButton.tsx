"use client";

import { useRef, useState } from "react";

import { CONTENT_LANG } from "@/shared/config/constants";
import { Alert, Button } from "@/shared/ui";

import { useAddViolationCase } from "../../hooks/use-add-violation-case";
import { ADD_TO_VIOLATIONS_COPY } from "../../model/admin-messages";
import { describeAuthorAddResult } from "../../model/case-notices";
import type { ViolationGround } from "../../model/violation.types";
import { GroundChoiceDialog } from "../GroundChoiceDialog/GroundChoiceDialog";

import type { AddToViolationsButtonProps } from "./AddToViolationsButton.types";

/**
 * The button, its ground dialog and its result line, shared by the three public pages (FR-2). The result shows above
 * the button once the dialog is closed; while it is open a failure shows inside it, as on `/admin`.
 */
export function AddToViolationsButton({ authorProfileId, authorName, content }: AddToViolationsButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { isPending, result, add, clearResult, connectionStatus } = useAddViolationCase();
  const [dialogOpen, setDialogOpen] = useState(false);
  const contentKind = content === undefined ? null : content.kind;

  function openDialog() {
    clearResult();
    setDialogOpen(true);
    dialogRef.current?.showModal();
  }

  async function handleConfirm(ground: ViolationGround) {
    const recorded = content === undefined ? undefined : { kind: content.kind, id: content.id };
    const outcome = await add({ target: { by: "author", authorProfileId }, ground, content: recorded });
    if (outcome.ok) dialogRef.current?.close();
  }

  function handleDialogClose() {
    setDialogOpen(false);
  }

  const notice = !dialogOpen && result !== null ? describeAuthorAddResult(result, contentKind) : null;
  const dialogFailure = dialogOpen && result !== null && !result.ok ? result.reason : null;

  return (
    <div lang={CONTENT_LANG} className="flex flex-col items-start gap-3">
      {notice !== null && <Alert tone={notice.tone}>{notice.text}</Alert>}
      <Button variant="ghost" aria-haspopup="dialog" onClick={openDialog}>
        {ADD_TO_VIOLATIONS_COPY.button}
      </Button>
      <GroundChoiceDialog
        dialogRef={dialogRef}
        subject={authorName}
        isPending={isPending}
        connectionStatus={connectionStatus}
        failure={dialogFailure}
        content={content ?? null}
        onConfirm={handleConfirm}
        onClose={handleDialogClose}
      />
    </div>
  );
}
