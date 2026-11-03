import { Alert } from "../Alert/Alert";
import { CONNECTION_NOTICE_MESSAGES } from "../ui-messages";
import type { ConnectionNoticeProps } from "./ConnectionNotice.types";

/** The neutral notice above a save form while the connection is offline or slow (edit-poem design D8). */
export function ConnectionNotice({ status }: ConnectionNoticeProps) {
  if (status === "online") return null;

  return <Alert tone="neutral">{CONNECTION_NOTICE_MESSAGES[status]}</Alert>;
}
