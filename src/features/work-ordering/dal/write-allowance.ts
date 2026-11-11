import "server-only";

import type { WriteAllowance } from "../model/work-ordering.types";

/** One write limit: its scope in `write_rate_limits` and what the log calls it. */
export interface WriteLimit {
  readonly scope: string;
  readonly operation: string;
  readonly name: string;
}

/** Counts one attempt against the caller's limit for `limit.scope`; never throws (ADR 0007). The feature's own copy. */
export async function consumeWriteAllowance(limit: WriteLimit): Promise<WriteAllowance> {
  void limit;
  throw new Error("not implemented");
}
