import type { ConnectionStatus } from "@/shared/lib/network/use-connection-status";

import type { HomeActionResult, HomeAddStatus } from "../model/home-entry.types";

export interface UseAddToHomeResult {
  readonly isPending: boolean;
  /** The last answer, shown above the button; null before the first press. */
  readonly result: HomeActionResult<HomeAddStatus> | null;
  /** A second press while one call runs does nothing: the first call's answer is the one shown. */
  readonly add: () => Promise<void>;
  /** The connection the control reads: the notice shows when it is not online, and the button is disabled. */
  readonly connectionStatus: ConnectionStatus;
  readonly isOnline: boolean;
}
