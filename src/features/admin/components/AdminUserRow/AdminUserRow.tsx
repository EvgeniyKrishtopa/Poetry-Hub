"use client";

import { GripVertical } from "lucide-react";
import { Fragment, useRef, useState } from "react";

import { Alert, Button } from "@/shared/ui";

import {
  ADMIN_ACTION_LABELS,
  ADMIN_LIST_COPY,
  ADMIN_VIOLATION_COPY,
  MODERATION_FAILURE_MESSAGES,
} from "../../model/admin-messages";
import { USER_STATE } from "../../model/admin.constants";
import { describeModerationSuccess } from "../../model/case-notices";
import { formatAdminDate } from "../../model/format-admin-date";
import { availableActions, userStateOf } from "../../model/user-state";
import { BanUserDialog } from "../BanUserDialog/BanUserDialog";
import { UserStateBadge } from "../UserStateBadge/UserStateBadge";
import { useViolationAdd } from "../ViolationDndArea/violation-add-context";

import styles from "./AdminUserRow.module.css";
import type { AdminUserRowProps } from "./AdminUserRow.types";
import { useModeration } from "./use-moderation";
import { useUserRowDrag } from "./use-user-row-drag";

const ROW_CLASS = "flex items-start gap-1 border-t border-border py-4";
// The row lifted by a drag: filled, framed in the accent colour, a pixel less padding to make room for the frame.
const LIFTED_ROW_CLASS = "relative z-10 -mx-[9px] flex items-start gap-1 rounded-md border border-accent bg-surface px-2 py-[15px]";

/**
 * One user: the state badge, the dates and the actions their state allows (FR-3). Admins are never listed. Inside
 * `ViolationDndArea` an active user also has a drag handle and the «add to the review list» button (FR-3).
 */
export function AdminUserRow({ user }: AdminUserRowProps) {
  const { run, isPending, outcome, clearOutcome } = useModeration(user.id);
  const violationAdd = useViolationAdd();
  // While the ban dialog is open its failure shows there, not in the row behind it.
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const state = userStateOf(user);
  const actions = availableActions(state);
  // A restricted user is refused by the add function, so only an active row offers it.
  const canAdd = violationAdd !== null && state === USER_STATE.active;
  const addDisabled = violationAdd === null || violationAdd.disabled || isPending;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, style, isDragging } = useUserRowDrag(
    { userId: user.id, email: user.email },
    !canAdd || addDisabled,
  );

  function openBanDialog() {
    clearOutcome();
    setBanDialogOpen(true);
    dialogRef.current?.showModal();
  }

  function createClickHandler(kind: (typeof actions)[number]) {
    return function handleClick() {
      if (kind === "ban") openBanDialog();
      else run(kind);
    };
  }

  function handleAddClick() {
    violationAdd?.requestAdd({ userId: user.id, email: user.email });
  }

  function handleBanConfirm() {
    run("ban");
  }

  function handleBanDialogClose() {
    setBanDialogOpen(false);
  }

  const failure = outcome !== null && !outcome.ok ? outcome.reason : null;
  const success = outcome !== null && outcome.ok ? describeModerationSuccess(outcome) : null;

  return (
    <li ref={setNodeRef} style={style} className={isDragging ? LIFTED_ROW_CLASS : ROW_CLASS}>
      {violationAdd !== null && canAdd && (
        <button
          type="button"
          ref={setActivatorNodeRef}
          aria-label={ADMIN_VIOLATION_COPY.grabLabel(user.email)}
          disabled={addDisabled}
          className={styles.grip}
          {...attributes}
          {...listeners}
        >
          <GripVertical aria-hidden="true" className="size-4" />
        </button>
      )}
      {violationAdd !== null && !canAdd && <span aria-hidden="true" className={styles.gripSpacer} />}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 text-lg font-medium [overflow-wrap:anywhere]">{user.email}</span>
          <UserStateBadge state={state} />
        </div>
        <p className="flex flex-wrap gap-x-4 text-sm text-muted">
          {user.authorName !== null && <span>{user.authorName}</span>}
          <span>
            {ADMIN_LIST_COPY.joinedLabel} {formatAdminDate(user.createdAt)}
          </span>
          <span>
            {ADMIN_LIST_COPY.lastSignInLabel}{" "}
            {user.lastSignInAt === null ? ADMIN_LIST_COPY.noDate : formatAdminDate(user.lastSignInAt)}
          </span>
        </p>
        <div className="-ml-3 flex flex-wrap gap-2">
          {actions.map((kind) => (
            <Fragment key={kind}>
              {kind === "ban" && canAdd && (
                <Button variant="ghost" aria-haspopup="dialog" disabled={addDisabled} onClick={handleAddClick}>
                  {ADMIN_VIOLATION_COPY.addButton}
                </Button>
              )}
              <Button
                variant={kind === "ban" ? "danger" : "ghost"}
                aria-haspopup={kind === "ban" ? "dialog" : undefined}
                disabled={isPending}
                onClick={createClickHandler(kind)}
              >
                {ADMIN_ACTION_LABELS[kind]}
              </Button>
            </Fragment>
          ))}
        </div>
        {!banDialogOpen && success !== null && <Alert tone={success.tone}>{success.text}</Alert>}
        {!banDialogOpen && failure !== null && <Alert tone="danger">{MODERATION_FAILURE_MESSAGES[failure]}</Alert>}
        <BanUserDialog
          dialogRef={dialogRef}
          email={user.email}
          isPending={isPending}
          failure={banDialogOpen ? failure : null}
          onConfirm={handleBanConfirm}
          onClose={handleBanDialogClose}
        />
      </div>
    </li>
  );
}
