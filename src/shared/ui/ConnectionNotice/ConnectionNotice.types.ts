import type { ConnectionStatus } from "@/shared/lib/network/use-connection-status";

export interface ConnectionNoticeProps {
  /** `online` renders nothing. */
  readonly status: ConnectionStatus;
  /** The offline and slow texts; today's save-form texts when omitted (google-sign-in design D7). */
  readonly messages?: Readonly<Record<Exclude<ConnectionStatus, "online">, string>>;
}
