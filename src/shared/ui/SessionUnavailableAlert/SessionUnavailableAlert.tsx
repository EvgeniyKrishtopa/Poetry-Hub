import { CONTENT_LANG } from "@/shared/config/constants";

import { Alert } from "../Alert/Alert";
import { SESSION_UNAVAILABLE_MESSAGE } from "../ui-messages";

import { RetryButton } from "./RetryButton";

/**
 * The account pages' answer when the session can't be checked: say so instead of treating the reader as
 * signed out. A full-width danger alert with the retry button below it (the approved mockup). Shared by
 * the author pages and the poem management pages.
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
