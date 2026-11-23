"use client";

import { CONTENT_LANG } from "@/shared/config/constants";
import { Alert, Button, ConnectionNotice } from "@/shared/ui";

import { useAddToHome } from "../../hooks/use-add-to-home";
import { ADD_TO_HOME_COPY } from "../../model/admin-messages";
import { describeAddToHomeResult } from "../../model/home-entry-notices";

import type { AddToHomeButtonProps } from "./AddToHomeButton.types";

/** The button and its result line, shared by the poem and the author page (FR-8); offline it is disabled. */
export function AddToHomeButton({ id, kind }: AddToHomeButtonProps) {
  const { isPending, result, add, connectionStatus, isOnline } = useAddToHome(kind, id);
  const notice = result === null ? null : describeAddToHomeResult(result, kind);

  return (
    <div lang={CONTENT_LANG} className="flex flex-col items-start gap-3">
      <ConnectionNotice status={connectionStatus} />
      {notice !== null && <Alert tone={notice.tone}>{notice.text}</Alert>}
      <Button variant="ghost" disabled={isPending || !isOnline} aria-busy={isPending} onClick={add}>
        {ADD_TO_HOME_COPY.button}
      </Button>
    </div>
  );
}
