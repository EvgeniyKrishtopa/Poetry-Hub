"use client";

import Link from "next/link";

import { Alert, Button } from "@/shared/ui";

import {
  CASE_ACTION_LABELS,
  CASE_STATUS_LABELS,
  GROUND_COPY,
  MODERATION_FAILURE_MESSAGES,
  VIOLATIONS_PAGE_COPY,
} from "../../model/admin-messages";
import { deriveCaseDeadline, deriveCaseStatus } from "../../model/case-status";
import { earlyBlockNoteOf, earlyBlockNoteText } from "../../model/early-block-note";
import { formatAdminDate, formatAdminDateTime } from "../../model/format-admin-date";
import { CASE_STATUS, VIOLATION_GROUND } from "../../model/violation.constants";
import { violationContentHref } from "../../model/violation-content-href";
import { BanUserDialog } from "../BanUserDialog/BanUserDialog";
import { EarlyBlockDialog } from "../EarlyBlockDialog/EarlyBlockDialog";
import { WarnDialog } from "../WarnDialog/WarnDialog";

import { GROUND_PILL_CLASS, PILL_CLASS, STATUS_PILL_CLASS } from "./case-pill-classes";
import type { ViolationCaseRowProps } from "./ViolationCaseRow.types";
import { useCaseRow } from "./use-case-row";

/** One open case: address, pills, deadline, the prompting content, and the actions its status allows (FR-5, FR-7). */
export function ViolationCaseRow({ violationCase, renderedAt }: ViolationCaseRowProps) {
  const { id, email, authorName, authorProfileId, ground, content, createdAt, warnedAt } = violationCase;
  const status = deriveCaseStatus(warnedAt, new Date(renderedAt));
  const earlyNote = earlyBlockNoteOf(ground, status, warnedAt);
  const row = useCaseRow(violationCase, earlyNote);
  // One warning per case, and only for the ground that has a warning step (FR-6).
  const canWarn = ground === VIOLATION_GROUND.harmfulContent && status === CASE_STATUS.waiting;
  const buttonsDisabled = row.isPending || !row.isOnline;
  const contentHref =
    content !== null && authorProfileId !== null ? violationContentHref(authorProfileId, content.kind, content.id) : null;

  return (
    <li className="flex flex-col gap-2 border-t border-border py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 text-lg font-medium [overflow-wrap:anywhere]">{email}</span>
        <span className={`${PILL_CLASS} ${STATUS_PILL_CLASS[status]}`}>{CASE_STATUS_LABELS[status]}</span>
        <span className={`${PILL_CLASS} ${GROUND_PILL_CLASS}`}>{GROUND_COPY[ground].label}</span>
      </div>
      <p className="flex flex-wrap gap-x-4 text-sm text-muted">
        {authorName !== null && <span>{authorName}</span>}
        <span>{VIOLATIONS_PAGE_COPY.addedOn(formatAdminDate(createdAt))}</span>
        {warnedAt !== null && (
          <span>{VIOLATIONS_PAGE_COPY.deadline(formatAdminDateTime(deriveCaseDeadline(warnedAt)))}</span>
        )}
        {content !== null && content.title === null && <span>{VIOLATIONS_PAGE_COPY.contentGone[content.kind]}</span>}
        {content !== null && content.title !== null && (
          <span>
            {VIOLATIONS_PAGE_COPY.contentLabel[content.kind]} «
            {contentHref === null ? (
              content.title
            ) : (
              <Link href={contentHref} className="text-accent hover:underline">
                {content.title}
              </Link>
            )}
            »
          </span>
        )}
      </p>
      {!row.isClosed && (
        <div className="-ml-3 flex flex-wrap gap-2">
          {canWarn && (
            <Button variant="ghost" aria-haspopup="dialog" disabled={buttonsDisabled} onClick={row.openWarnDialog}>
              {CASE_ACTION_LABELS.warn}
            </Button>
          )}
          <Button variant="ghost" disabled={buttonsDisabled} onClick={row.switchGround}>
            {CASE_ACTION_LABELS.switchGround}
          </Button>
          <Button
            variant="ghost"
            aria-haspopup={earlyNote === null ? undefined : "dialog"}
            disabled={buttonsDisabled}
            onClick={row.requestBlock}
          >
            {CASE_ACTION_LABELS.block}
          </Button>
          <Button variant="danger" aria-haspopup="dialog" disabled={buttonsDisabled} onClick={row.requestBan}>
            {CASE_ACTION_LABELS.ban}
          </Button>
          <Button variant="ghost" disabled={buttonsDisabled} onClick={row.remove}>
            {CASE_ACTION_LABELS.remove}
          </Button>
        </div>
      )}
      {row.notice !== null && <Alert tone={row.notice.tone}>{row.notice.text}</Alert>}
      {row.ownFailure !== null && <Alert tone="danger">{MODERATION_FAILURE_MESSAGES[row.ownFailure]}</Alert>}
      {ground === VIOLATION_GROUND.harmfulContent && (
        <WarnDialog
          dialogRef={row.dialogRefs.warn}
          caseId={id}
          email={email}
          onSettled={row.handleWarned}
          onClose={row.handleDialogClose}
        />
      )}
      {earlyNote !== null && (
        <EarlyBlockDialog
          dialogRef={row.dialogRefs["early-block"]}
          note={earlyNote}
          isPending={row.isPending}
          failure={row.dialogFailure}
          onConfirm={row.confirmBlock}
          onClose={row.handleDialogClose}
        />
      )}
      <BanUserDialog
        dialogRef={row.dialogRefs.ban}
        email={email}
        earlyNote={earlyNote === null ? undefined : earlyBlockNoteText(earlyNote)}
        isPending={row.isPending}
        failure={row.dialogFailure}
        onConfirm={row.confirmBan}
        onClose={row.handleDialogClose}
      />
    </li>
  );
}
