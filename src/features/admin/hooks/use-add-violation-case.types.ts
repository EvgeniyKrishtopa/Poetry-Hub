import type { ConnectionStatus } from "@/shared/lib/network/use-connection-status";

import type { AddCaseActionResult, ViolationContent, ViolationGround } from "../model/violation.types";

/** Who to add: a user known by id (the `/admin` list) or an author known by profile id (the public pages). */
type AddViolationTarget =
  | { readonly by: "user"; readonly userId: string }
  | { readonly by: "author"; readonly authorProfileId: string };

/** One add: the target, the ground the admin chose, and the poem or collection that prompted it, when there is one. */
export interface AddViolationRequest {
  readonly target: AddViolationTarget;
  readonly ground: ViolationGround;
  readonly content?: Pick<ViolationContent, "kind" | "id">;
}

export interface UseAddViolationCaseResult {
  readonly isPending: boolean;
  /** The last answer, shown above the control; null before the first call and after `clearResult`. */
  readonly result: AddCaseActionResult | null;
  /** A second call while one is running joins it and gets the same answer. */
  readonly add: (request: AddViolationRequest) => Promise<AddCaseActionResult>;
  readonly clearResult: () => void;
  /** The connection the controls read: the notice shows when it is not online, and sending is disabled. */
  readonly connectionStatus: ConnectionStatus;
  readonly isOnline: boolean;
}
