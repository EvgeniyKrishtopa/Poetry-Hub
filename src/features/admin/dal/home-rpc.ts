import "server-only";

import { z } from "zod";

import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import type { AdminFailure } from "../model/admin.types";
import { HOME_ENTRY_OPERATION } from "../model/home-entry.constants";
import {
  homeAddAnswerSchema,
  homeEntryRowSchema,
  homeMoveAnswerSchema,
  homeRemoveAnswerSchema,
  type HomeEntryRow,
} from "../model/home-entry-rpc.schema";
import type {
  AddHomeAuthorInput,
  AddHomePoemInput,
  HomeAddStatus,
  HomeEntriesResult,
  HomeEntry,
  HomeMoveStatus,
  HomeRemoveStatus,
  HomeWriteResult,
  MoveHomeEntryInput,
  RemoveHomeEntryInput,
} from "../model/home-entry.types";

import { toAdminFailure, withStatus } from "./rpc-failure";

// Every call runs with the cookie client as the signed-in admin; the database checks the admin right itself and a
// caller who is not one fails with 42501, which is `forbidden`. Each answer is parsed against the function's own
// contract; a failure is a value, and a log line holds the operation and the failure kind only (NFR-6).

type RpcOutcome<Answer> =
  { readonly ok: true; readonly answer: Answer } | { readonly ok: false; readonly failure: AdminFailure };

/** One RPC, its answer parsed against the function's own contract. */
async function callRpc<Answer>(
  operation: string,
  rpcName: string,
  args: Record<string, unknown>,
  answerSchema: z.ZodType<Answer>,
): Promise<RpcOutcome<Answer>> {
  try {
    const supabase = await createSupabaseServerClient();
    const response = await supabase.rpc(rpcName, args);
    if (response.error) {
      return { ok: false, failure: toAdminFailure(operation, withStatus(response.error, response.status)) };
    }

    const parsed = answerSchema.safeParse(response.data);
    if (!parsed.success) return { ok: false, failure: toAdminFailure(operation, parsed.error) };
    return { ok: true, answer: parsed.data };
  } catch (error) {
    // A config error, or an unexpected throw (a network failure): still a value.
    return { ok: false, failure: toAdminFailure(operation, error) };
  }
}

async function callWrite<Status extends string>(
  operation: string,
  rpcName: string,
  args: Record<string, unknown>,
  answerSchema: z.ZodType<{ readonly status: Status }>,
): Promise<HomeWriteResult<Status>> {
  const outcome = await callRpc(operation, rpcName, args, answerSchema);
  if (!outcome.ok) return outcome;
  return { ok: true, status: outcome.answer.status };
}

/** Calls `admin_add_home_poem`. */
export async function addHomePoem(input: AddHomePoemInput): Promise<HomeWriteResult<HomeAddStatus>> {
  return callWrite(HOME_ENTRY_OPERATION.addPoem, "admin_add_home_poem", { poem_id: input.poemId }, homeAddAnswerSchema);
}

/** Calls `admin_add_home_author`. */
export async function addHomeAuthor(input: AddHomeAuthorInput): Promise<HomeWriteResult<HomeAddStatus>> {
  return callWrite(
    HOME_ENTRY_OPERATION.addAuthor,
    "admin_add_home_author",
    { author_profile_id: input.authorProfileId },
    homeAddAnswerSchema,
  );
}

/** Calls `admin_move_home_entry`. */
export async function moveHomeEntry(input: MoveHomeEntryInput): Promise<HomeWriteResult<HomeMoveStatus>> {
  return callWrite(
    HOME_ENTRY_OPERATION.move,
    "admin_move_home_entry",
    { kind: input.kind, id: input.id, from_position: input.fromPosition, to_position: input.toPosition },
    homeMoveAnswerSchema,
  );
}

/** Calls `admin_remove_home_entry`. */
export async function removeHomeEntry(input: RemoveHomeEntryInput): Promise<HomeWriteResult<HomeRemoveStatus>> {
  return callWrite(
    HOME_ENTRY_OPERATION.remove,
    "admin_remove_home_entry",
    { kind: input.kind, id: input.id },
    homeRemoveAnswerSchema,
  );
}

function toHomeEntry(row: HomeEntryRow): HomeEntry {
  return {
    kind: row.kind,
    id: row.id,
    position: row.entry_position,
    shown: row.shown,
    label: row.label,
    authorName: row.author_name,
  };
}

/** Calls `admin_list_home_entries`: one row per entry, the poems and the authors each in position order. */
export async function listHomeEntries(): Promise<HomeEntriesResult> {
  const outcome = await callRpc(HOME_ENTRY_OPERATION.list, "admin_list_home_entries", {}, z.array(homeEntryRowSchema));
  if (!outcome.ok) return outcome;

  const entries = outcome.answer.map(toHomeEntry);
  const poems = entries.filter((entry) => entry.kind === "poem");
  const authors = entries.filter((entry) => entry.kind === "author");
  return { ok: true, poems, authors };
}
