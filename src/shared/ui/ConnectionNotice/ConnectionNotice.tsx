import type { ConnectionNoticeProps } from "./ConnectionNotice.types";

/** The neutral notice above a save form while the connection is offline or slow (edit-poem design D8). */
export function ConnectionNotice({ status }: ConnectionNoticeProps) {
  void status;
  return null;
}
