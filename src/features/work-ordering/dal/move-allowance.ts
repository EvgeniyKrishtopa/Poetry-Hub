import "server-only";

import { MOVE_LIMIT_SCOPE } from "../model/work-ordering.constants";
import type { WriteAllowance } from "../model/work-ordering.types";

import { consumeWriteAllowance } from "./write-allowance";

const MOVE_LIMIT = {
  scope: MOVE_LIMIT_SCOPE,
  operation: "check move limit",
  name: "move limit",
} as const;

/** Counts one move attempt against the caller's `order_move` limit, 30 per minute per account; never throws (NFR-2). */
export async function consumeMoveAllowance(): Promise<WriteAllowance> {
  return consumeWriteAllowance(MOVE_LIMIT);
}
