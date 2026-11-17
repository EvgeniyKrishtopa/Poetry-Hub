import { deleteCollectionAction } from "../../actions/delete-collection.actions";
import { deletePoemAction } from "../../actions/delete-poem.actions";
import type { AdminDeleteKind, DeleteActionResult } from "../../model/admin.types";

const ACTIONS = {
  poem: deletePoemAction,
  collection: deleteCollectionAction,
} as const satisfies Record<AdminDeleteKind, (input: { id: string }) => Promise<{ data?: DeleteActionResult }>>;

/** A server answer that never arrived (a thrown error, a rejected input) reads as an outage: nothing changed. */
const NO_ANSWER: DeleteActionResult = { ok: false, reason: "unavailable" };

/** Calls one delete Server Action and always answers with a result, never a throw. */
export async function callDelete(kind: AdminDeleteKind, id: string): Promise<DeleteActionResult> {
  try {
    return (await ACTIONS[kind]({ id })).data ?? NO_ANSWER;
  } catch {
    return NO_ANSWER;
  }
}
