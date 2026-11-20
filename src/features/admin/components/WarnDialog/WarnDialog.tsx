"use client";

import { Alert, Button, ConnectionNotice, Dialog, TextAreaField, TextField } from "@/shared/ui";

import { WARN_DIALOG_COPY } from "../../model/admin-messages";

import styles from "./WarnDialog.module.css";
import type { WarnDialogProps } from "./WarnDialog.types";
import { useWarnForm } from "./use-warn-form";

const FIELD_ERROR_TEXT = {
  empty: WARN_DIALOG_COPY.emptyError,
  "too-long": WARN_DIALOG_COPY.tooLongError,
} as const;

/** The warning dialog: the message field, its limits, and the read-only lock after an unknown outcome (FR-6, FR-11). */
export function WarnDialog(props: WarnDialogProps) {
  const { dialogRef, email } = props;
  const form = useWarnForm(props);
  const fieldErrorText = form.fieldError === null ? undefined : FIELD_ERROR_TEXT[form.fieldError];

  return (
    <Dialog
      ref={dialogRef}
      title={WARN_DIALOG_COPY.title}
      description={WARN_DIALOG_COPY.description}
      closeLabel={WARN_DIALOG_COPY.close}
      closable={!form.isPending}
      onClose={form.handleClose}
    >
      <div className={`${styles.fields} flex flex-col gap-4`}>
        <TextField label={WARN_DIALOG_COPY.toLabel} type="email" readOnly value={email} />
        <div className="flex flex-col gap-1.5">
          <TextAreaField
            label={WARN_DIALOG_COPY.messageLabel}
            rows={4}
            value={form.message}
            onChange={form.handleChange}
            readOnly={form.locked}
            disabled={form.isPending}
            error={fieldErrorText}
          />
          {fieldErrorText === undefined && <p className="text-sm text-muted">{WARN_DIALOG_COPY.hint}</p>}
        </div>
      </div>
      <ConnectionNotice status={form.connectionStatus} />
      {form.notice !== null && <Alert tone={form.notice.tone}>{form.notice.text}</Alert>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" disabled={form.isPending} onClick={() => dialogRef.current?.close()}>
          {WARN_DIALOG_COPY.cancel}
        </Button>
        <Button disabled={form.isPending || !form.isOnline} aria-busy={form.isPending} onClick={form.submit}>
          {WARN_DIALOG_COPY.send}
        </Button>
      </div>
    </Dialog>
  );
}
