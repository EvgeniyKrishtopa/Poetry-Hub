"use client";

import { useRef, useState } from "react";

import { Alert, Button } from "@/shared/ui";

import {
  ADMIN_ACTION_LABELS,
  ADMIN_LIST_COPY,
  MODERATION_FAILURE_MESSAGES,
  MODERATION_RESULT_MESSAGES,
} from "../../model/admin-messages";
import { formatAdminDate } from "../../model/format-admin-date";
import { availableActions, userStateOf } from "../../model/user-state";
import { BanUserDialog } from "../BanUserDialog/BanUserDialog";
import { UserStateBadge } from "../UserStateBadge/UserStateBadge";

import type { AdminUserRowProps } from "./AdminUserRow.types";
import { useModeration } from "./use-moderation";

/** One user: the state badge, the dates and the actions their state allows (FR-3). Admins are never listed. */
export function AdminUserRow({ user }: AdminUserRowProps) {
  const { run, isPending, outcome, clearOutcome } = useModeration(user.id);
  // While the ban dialog is open its failure shows there, not in the row behind it.
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const state = userStateOf(user);
  const actions = availableActions(state);

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

  function handleBanConfirm() {
    run("ban");
  }

  function handleBanDialogClose() {
    setBanDialogOpen(false);
  }

  const failure = outcome !== null && !outcome.ok ? outcome.reason : null;

  return (
    <li className="flex flex-col gap-2 border-t border-border py-4">
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
          <Button
            key={kind}
            variant={kind === "ban" ? "danger" : "ghost"}
            aria-haspopup={kind === "ban" ? "dialog" : undefined}
            disabled={isPending}
            onClick={createClickHandler(kind)}
          >
            {ADMIN_ACTION_LABELS[kind]}
          </Button>
        ))}
      </div>
      {!banDialogOpen && outcome !== null && outcome.ok && (
        <Alert tone={outcome.status === "no-sessions" ? "neutral" : "success"}>
          {MODERATION_RESULT_MESSAGES[outcome.status]}
        </Alert>
      )}
      {!banDialogOpen && failure !== null && <Alert tone="danger">{MODERATION_FAILURE_MESSAGES[failure]}</Alert>}
      <BanUserDialog
        dialogRef={dialogRef}
        email={user.email}
        isPending={isPending}
        failure={banDialogOpen ? failure : null}
        onConfirm={handleBanConfirm}
        onClose={handleBanDialogClose}
      />
    </li>
  );
}
