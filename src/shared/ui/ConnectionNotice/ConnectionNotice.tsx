import { CONNECTION_STATUS } from "@/shared/lib/network/network.constants";

import { Alert } from "../Alert/Alert";
import { CONNECTION_NOTICE_MESSAGES } from "../ui-messages";
import type { ConnectionNoticeProps } from "./ConnectionNotice.types";

/**
 * The neutral notice above a save form while the connection is offline or slow (edit-poem design D8). A caller
 * that does not save, such as the Google button, passes its own texts (google-sign-in design D7).
 */
export function ConnectionNotice({ status, messages = CONNECTION_NOTICE_MESSAGES }: ConnectionNoticeProps) {
  if (status === CONNECTION_STATUS.online) return null;

  return <Alert tone="neutral">{messages[status]}</Alert>;
}
