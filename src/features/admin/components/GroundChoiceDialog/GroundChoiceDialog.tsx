"use client";

import { useId, useState } from "react";

import { CONNECTION_STATUS } from "@/shared/lib/network/network.constants";
import { Alert, Button, ConnectionNotice, Dialog } from "@/shared/ui";

import { GROUND_CHOICE_COPY, GROUND_COPY } from "../../model/admin-messages";
import { caseFailureMessage } from "../../model/case-notices";
import { VIOLATION_GROUND } from "../../model/violation.constants";
import type { ViolationGround } from "../../model/violation.types";

import type { GroundChoiceDialogProps } from "./GroundChoiceDialog.types";

const GROUNDS: readonly ViolationGround[] = Object.values(VIOLATION_GROUND);

const CARD_CLASS =
  "flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 has-checked:border-accent has-checked:bg-accent/8 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent has-disabled:cursor-default has-disabled:opacity-50";

/** The ground choice before a user is added to the review list, `harmful-content` preselected (FR-1). */
export function GroundChoiceDialog({
  dialogRef,
  subject,
  isPending,
  connectionStatus,
  failure,
  content,
  onConfirm,
  onClose,
}: GroundChoiceDialogProps) {
  const groupName = useId();
  const [ground, setGround] = useState<ViolationGround>(VIOLATION_GROUND.harmfulContent);
  const isOnline = connectionStatus === CONNECTION_STATUS.online;
  const contentTitle = content !== null && content.title !== null ? content.title : null;

  function createChangeHandler(next: ViolationGround) {
    return function handleChange() {
      setGround(next);
    };
  }

  // Closing by any means starts the next opening from the default choice.
  function handleClose() {
    setGround(VIOLATION_GROUND.harmfulContent);
    onClose();
  }

  function handleConfirm() {
    onConfirm(ground);
  }

  return (
    <Dialog
      ref={dialogRef}
      title={GROUND_CHOICE_COPY.title}
      description={GROUND_CHOICE_COPY.description(subject)}
      closeLabel={GROUND_CHOICE_COPY.close}
      closable={!isPending}
      onClose={handleClose}
    >
      {content !== null && contentTitle !== null && (
        <p className="text-sm text-muted">{GROUND_CHOICE_COPY.contentNote[content.kind](contentTitle)}</p>
      )}
      <fieldset disabled={isPending} className="flex min-w-0 flex-col gap-2 border-0 p-0">
        <legend className="sr-only">{GROUND_CHOICE_COPY.groupLabel}</legend>
        {GROUNDS.map((option) => (
          <label key={option} className={CARD_CLASS}>
            <input
              type="radio"
              name={groupName}
              value={option}
              checked={ground === option}
              onChange={createChangeHandler(option)}
              className="mt-0.5 size-4 flex-none accent-accent"
            />
            <span className="flex flex-col text-sm">
              <span className="font-medium">{GROUND_COPY[option].label}</span>
              <span className="text-muted">{GROUND_COPY[option].description}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <ConnectionNotice status={connectionStatus} />
      {failure !== null && <Alert tone="danger">{caseFailureMessage(failure, content?.kind ?? null)}</Alert>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" disabled={isPending} onClick={() => dialogRef.current?.close()}>
          {GROUND_CHOICE_COPY.cancel}
        </Button>
        <Button disabled={isPending || !isOnline} aria-busy={isPending} onClick={handleConfirm}>
          {GROUND_CHOICE_COPY.confirm}
        </Button>
      </div>
    </Dialog>
  );
}
