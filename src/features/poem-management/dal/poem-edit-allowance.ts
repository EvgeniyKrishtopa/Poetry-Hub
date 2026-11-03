import "server-only";

import type { PoemEditAllowance } from "../model/poem-management.types";

/** Counts one save attempt against the caller's `poem_edit` limit; never throws (edit-poem design D3). */
export async function consumePoemEditAllowance(): Promise<PoemEditAllowance> {
  throw new Error("not implemented");
}
