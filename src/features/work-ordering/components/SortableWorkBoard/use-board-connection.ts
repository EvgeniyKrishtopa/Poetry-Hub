"use client";

import { CONNECTION_STATUS } from "@/shared/lib/network/network.constants";
import { type ConnectionStatus, useConnectionStatus } from "@/shared/lib/network/use-connection-status";

interface UseBoardConnection {
  readonly status: ConnectionStatus;
  /** Moves are sent only on a normal connection: a slow or lost one disables the handles (FR-11). */
  readonly isOnline: boolean;
}

export function useBoardConnection(): UseBoardConnection {
  const status = useConnectionStatus();
  return { status, isOnline: status === CONNECTION_STATUS.online };
}
