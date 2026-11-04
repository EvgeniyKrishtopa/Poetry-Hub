import { CONNECTION_STATUS } from "@/shared/lib/network/network.constants";
import { useConnectionStatus } from "@/shared/lib/network/use-connection-status";
import { Button } from "@/shared/ui";

import { FIELD_ACTION_LABELS } from "../../model/author-messages";

import type { FieldEditActionsProps } from "./FieldEditActions.types";

/**
 * A field's edit-mode buttons: Save submits the field's form, Cancel discards the draft (FR-6). Save is
 * disabled while offline or slow; Cancel sends nothing, so it stays (edit-poem design D8).
 */
export function FieldEditActions({ onCancel, canSave = true }: FieldEditActionsProps) {
  const isOnline = useConnectionStatus() === CONNECTION_STATUS.online;

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="submit" disabled={!canSave || !isOnline}>
        {FIELD_ACTION_LABELS.save}
      </Button>
      <Button variant="ghost" onClick={onCancel}>
        {FIELD_ACTION_LABELS.cancel}
      </Button>
    </div>
  );
}
