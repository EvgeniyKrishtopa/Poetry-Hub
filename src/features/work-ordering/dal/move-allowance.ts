import "server-only";

import type { WriteAllowance } from "../model/work-ordering.types";

/** Counts one move attempt against the caller's `order_move` limit, 30 per minute per account; never throws (NFR-2). */
export async function consumeMoveAllowance(): Promise<WriteAllowance> {
  throw new Error("not implemented");
}
