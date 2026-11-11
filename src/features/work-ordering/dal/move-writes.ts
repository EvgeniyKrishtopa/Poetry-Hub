import "server-only";

import type { MovePoemInput, MoveCollectionInput } from "../model/move.schema";
import type { MoveWriteResult } from "../model/work-ordering.types";

/** Calls `move_my_poem`; the owner comes from the session, never from an argument (design D2). */
export async function moveOwnPoem(input: MovePoemInput): Promise<MoveWriteResult> {
  void input;
  throw new Error("not implemented");
}

/** Calls `move_my_collection`; the owner comes from the session, never from an argument (design D2). */
export async function moveOwnCollection(input: MoveCollectionInput): Promise<MoveWriteResult> {
  void input;
  throw new Error("not implemented");
}
