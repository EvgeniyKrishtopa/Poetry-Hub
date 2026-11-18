"use client";

import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { useId, useRef, useState } from "react";

import { ADMIN_VIOLATIONS_PATH } from "@/shared/config/account-paths";
import { Alert, ConnectionNotice } from "@/shared/ui";

import { useAddViolationCase } from "../../hooks/use-add-violation-case";
import { describeAddResult } from "../../model/case-notices";
import { draggedUserOf } from "../../model/dragged-user";
import {
  VIOLATION_DROP_TARGET_ID,
  VIOLATION_MOUSE_DRAG_DISTANCE_PX,
  VIOLATION_TOUCH_HOLD_MS,
  VIOLATION_TOUCH_HOLD_TOLERANCE_PX,
} from "../../model/violation.constants";
import type { DraggedUser, ViolationGround } from "../../model/violation.types";
import { GroundChoiceDialog } from "../GroundChoiceDialog/GroundChoiceDialog";
import { ViolationDropLink } from "../ViolationDropLink/ViolationDropLink";

import type { ViolationDndAreaProps } from "./ViolationDndArea.types";
import { VIOLATION_DND_ACCESSIBILITY } from "./violation-dnd-config";
import { ViolationAddContext } from "./violation-add-context";

/**
 * The `DndContext` island on `/admin`: the review-list link is the drop target, the rows of the user list are the
 * draggables, and a drop or a row's button opens the one ground choice for that user (FR-3). The result shows above
 * the link once the dialog is closed; while it is open a failure shows inside it, as the ban dialog does.
 */
export function ViolationDndArea({ children }: ViolationDndAreaProps) {
  const dndId = useId();
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: VIOLATION_MOUSE_DRAG_DISTANCE_PX } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: VIOLATION_TOUCH_HOLD_MS, tolerance: VIOLATION_TOUCH_HOLD_TOLERANCE_PX },
    }),
  );
  const { isPending, result, add, clearResult, connectionStatus, isOnline } = useAddViolationCase();
  const [user, setUser] = useState<DraggedUser | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  function requestAdd(target: DraggedUser) {
    if (!isOnline) return;
    clearResult();
    setUser(target);
    setDialogOpen(true);
    dialogRef.current?.showModal();
  }

  function handleDragEnd(event: DragEndEvent) {
    if (event.over?.id !== VIOLATION_DROP_TARGET_ID) return;
    const dragged = draggedUserOf(event.active.data.current);
    if (dragged === null) return;
    requestAdd(dragged);
  }

  async function handleConfirm(ground: ViolationGround) {
    if (user === null) return;
    const outcome = await add({ target: { by: "user", userId: user.userId }, ground });
    if (outcome.ok) dialogRef.current?.close();
  }

  function handleDialogClose() {
    setDialogOpen(false);
  }

  const notice = !dialogOpen && result !== null ? describeAddResult(result, null) : null;
  const dialogFailure = dialogOpen && result !== null && !result.ok ? result.reason : null;

  return (
    <ViolationAddContext value={{ requestAdd, disabled: !isOnline }}>
      <div className="flex flex-col gap-8 self-stretch">
        <DndContext
          id={dndId}
          sensors={sensors}
          accessibility={VIOLATION_DND_ACCESSIBILITY}
          onDragEnd={handleDragEnd}
        >
          <ConnectionNotice status={connectionStatus} />
          {notice !== null && <Alert tone={notice.tone}>{notice.text}</Alert>}
          <ViolationDropLink href={ADMIN_VIOLATIONS_PATH} disabled={!isOnline} />
          {children}
        </DndContext>
      </div>
      <GroundChoiceDialog
        dialogRef={dialogRef}
        subject={user === null ? "" : user.email}
        isPending={isPending}
        connectionStatus={connectionStatus}
        failure={dialogFailure}
        content={null}
        onConfirm={handleConfirm}
        onClose={handleDialogClose}
      />
    </ViolationAddContext>
  );
}
