import { CONNECTION_STATUS } from "./network.constants";
import { type ConnectionStatus, useConnectionStatus } from "./use-connection-status";

interface UseConnection {
  readonly status: ConnectionStatus;
  /** True on a normal connection only: a slow or lost one is not online, since a write could not be trusted to finish. */
  readonly isOnline: boolean;
}

/** The live connection status together with the one question every writer asks of it: may a request be sent now? */
export function useConnection(): UseConnection {
  const status = useConnectionStatus();
  return { status, isOnline: status === CONNECTION_STATUS.online };
}
