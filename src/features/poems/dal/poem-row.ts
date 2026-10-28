import "server-only";

import type { PoemRow } from "../model/poem-row.schema";
import type { Poem } from "../model/poem.types";

/** A checked row → `Poem`: the illustration's public-bucket URL and `created_at`'s UTC date (design D3). */
export function toPoem(row: PoemRow): Poem {
  void row;
  throw new Error("not implemented");
}
