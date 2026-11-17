import type { AddCaseActionResult, ViolationContent, ViolationGround } from "../model/violation.types";

/** Who to add: a user known by id (the `/admin` list) or an author known by profile id (the public pages). */
export type AddViolationTarget =
  | { readonly by: "user"; readonly userId: string }
  | { readonly by: "author"; readonly authorProfileId: string };

export interface UseAddViolationCaseOptions {
  readonly target: AddViolationTarget;
  /** The poem or collection that prompted the case, when the control sits on one. */
  readonly content?: Pick<ViolationContent, "kind" | "id">;
}

export interface UseAddViolationCaseResult {
  readonly isPending: boolean;
  /** The last answer, shown above the control; null before the first call. */
  readonly result: AddCaseActionResult | null;
  readonly add: (ground: ViolationGround) => Promise<AddCaseActionResult>;
}
