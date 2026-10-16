import { CONTENT_LANG } from "@/shared/config/constants";
import { Alert } from "@/shared/ui";

import { SESSION_UNAVAILABLE_MESSAGE } from "../../model/author-messages";
import { RetryButton } from "../RetryButton/RetryButton";

/**
 * The account pages' answer when the session can't be checked (FR-20): say so instead of treating the
 * reader as signed out. A full-width danger alert with «Повторить» below it (the approved mockup).
 */
export function SessionUnavailableAlert() {
  return (
    <div lang={CONTENT_LANG} className="flex flex-col items-start gap-4">
      <Alert tone="danger" className="self-stretch">
        {SESSION_UNAVAILABLE_MESSAGE}
      </Alert>
      <RetryButton />
    </div>
  );
}
