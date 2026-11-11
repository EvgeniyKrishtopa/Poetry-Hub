import "server-only";

import { z } from "zod";

import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import type { MoveCollectionInput, MovePoemInput } from "../model/move.schema";
import { MOVE_DB_STATUS } from "../model/work-ordering.constants";
import type { MoveWriteResult } from "../model/work-ordering.types";

import { toServiceFailure, withStatus } from "./write-log";

const MOVE_POEM_OPERATION = "move poem";
const MOVE_COLLECTION_OPERATION = "move collection";

/**
 * A move function's answer; any other shape fails the parse and is `unknown`, never a guessed move. Only `moved`
 * carries the author the public tag is expired for (design D2).
 */
const moveAnswerSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal(MOVE_DB_STATUS.moved), author_id: z.string() }),
  z.object({ status: z.literal(MOVE_DB_STATUS.stale) }),
  z.object({ status: z.literal(MOVE_DB_STATUS.notFound) }),
]);

interface MoveCall {
  readonly operation: string;
  readonly fn: string;
  readonly args: Record<string, string | number | null>;
}

/** One RPC call as the signed-in owner; never throws. The database resolves the owner from the session. */
async function callMove({ operation, fn, args }: MoveCall): Promise<MoveWriteResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const response = await supabase.rpc(fn, args);
    if (response.error) {
      return { ok: false, failure: toServiceFailure(operation, withStatus(response.error, response.status)) };
    }

    const answer = moveAnswerSchema.safeParse(response.data);
    if (!answer.success) return { ok: false, failure: toServiceFailure(operation, answer.error) };
    if (answer.data.status === MOVE_DB_STATUS.moved) {
      return { ok: true, status: MOVE_DB_STATUS.moved, authorId: answer.data.author_id };
    }
    return { ok: true, status: answer.data.status };
  } catch (error) {
    // A config error, or an unexpected throw (a network failure): still a value.
    return { ok: false, failure: toServiceFailure(operation, error) };
  }
}

/** The collection id a list names, or null for the free poems (the database's own encoding). */
function collectionIdOf(list: MovePoemInput["from"]): string | null {
  return list.kind === "collection" ? list.collectionId : null;
}

/** Calls `move_my_poem`; the owner comes from the session, never from an argument (design D2). */
export async function moveOwnPoem(input: MovePoemInput): Promise<MoveWriteResult> {
  return callMove({
    operation: MOVE_POEM_OPERATION,
    fn: "move_my_poem",
    args: {
      poem_id: input.poemId,
      from_collection_id: collectionIdOf(input.from),
      to_collection_id: collectionIdOf(input.to),
      to_index: input.toIndex,
    },
  });
}

/** Calls `move_my_collection`; the owner comes from the session, never from an argument (design D2). */
export async function moveOwnCollection(input: MoveCollectionInput): Promise<MoveWriteResult> {
  return callMove({
    operation: MOVE_COLLECTION_OPERATION,
    fn: "move_my_collection",
    args: { collection_id: input.collectionId, to_index: input.toIndex },
  });
}
