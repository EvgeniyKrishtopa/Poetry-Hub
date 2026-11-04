import type { ConnectionStatus } from "@/shared/lib/network/use-connection-status";

export interface ConnectionNoticeProps {
  /** `online` renders nothing. */
  readonly status: ConnectionStatus;
}
