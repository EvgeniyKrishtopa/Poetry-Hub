import { CONTENT_LANG } from "@/shared/config/constants";

import { Alert } from "../Alert/Alert";
import { Button } from "../Button/Button";
import { RETRY_LABEL, SESSION_UNAVAILABLE_MESSAGE } from "../ui-messages";

import { RetryButton } from "./RetryButton";
import type { SessionUnavailableAlertProps } from "./SessionUnavailableAlert.types";

/**
 * The account pages' answer when the session can't be checked: say so instead of treating the reader as
 * signed out. A full-width danger alert with the retry button below it (the approved mockup). Shared by
 * the author pages and the poem management pages.
 */
export function SessionUnavailableAlert({ onRetry }: SessionUnavailableAlertProps) {
  return (
    <div lang={CONTENT_LANG} className="flex flex-col items-start gap-4">
      <Alert tone="danger" className="self-stretch">
        {SESSION_UNAVAILABLE_MESSAGE}
      </Alert>
      {onRetry ? <Button onClick={onRetry}>{RETRY_LABEL}</Button> : <RetryButton />}
    </div>
  );
}
