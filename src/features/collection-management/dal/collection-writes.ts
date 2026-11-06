import "server-only";

import { z } from "zod";

import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import type {
  CreateOwnCollectionResult,
  DeleteOwnCollectionResult,
  UpdateOwnCollectionInput,
  UpdateOwnCollectionResult,
} from "../model/collection-management.types";

import { toServiceFailure, withStatus } from "./write-log";

// Every write runs with the cookie client as the signed-in owner; the database functions resolve the owner
// from the session, so none of these takes an author id, and another author's collection and an unknown id
// are both `not-found` (design D2). Each returns a failure as a value, never throws; a rejected JWT classifies
// as `unauthenticated`. Log lines carry the operation and the failure kind only (NFR-5, `write-log.ts`).

const CREATE_OPERATION = "create collection";
const UPDATE_OPERATION = "update collection";
const DELETE_OPERATION = "delete collection";

/** `create_my_collection()`'s answer; any other shape fails the parse and is `unknown`, never a guessed success. */
const createStatusSchema = z.union([
  z.object({ status: z.literal("created"), id: z.uuid() }),
  z.object({ status: z.enum(["not-public", "over-limit"]) }),
]);

/** `update_my_collection()`'s answer. */
const updateStatusSchema = z.object({ status: z.enum(["updated", "not-found"]) });

/** `delete_my_collection()`'s answer: the stored title, never one from the browser (design D7). */
const deleteStatusSchema = z.union([
  z.object({ status: z.literal("deleted"), title: z.string().min(1) }),
  z.object({ status: z.literal("not-found") }),
]);

/** `create_my_collection(title, description)` as the signed-in owner; a failure is a value (design D2, D5). */
export async function createOwnCollection(title: string, description: string | null): Promise<CreateOwnCollectionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const response = await supabase.rpc("create_my_collection", { title, description });
    if (response.error) {
      return { ok: false, failure: toServiceFailure(CREATE_OPERATION, withStatus(response.error, response.status)) };
    }

    const parsed = createStatusSchema.safeParse(response.data);
    if (!parsed.success) return { ok: false, failure: toServiceFailure(CREATE_OPERATION, parsed.error) };
    if (parsed.data.status === "created") return { ok: true, status: "created", id: parsed.data.id };
    // Expected, not an error, but worth seeing if one account keeps hitting it.
    if (parsed.data.status === "over-limit") console.warn("[collection-management] collection limit reached");
    return { ok: true, status: parsed.data.status };
  } catch (error) {
    // A config error, or an unexpected throw (a network failure): still a value.
    return { ok: false, failure: toServiceFailure(CREATE_OPERATION, error) };
  }
}

/** `update_my_collection(...)` as the signed-in owner (design D2, D6). */
export async function updateOwnCollection(input: UpdateOwnCollectionInput): Promise<UpdateOwnCollectionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const response = await supabase.rpc("update_my_collection", {
      collection_id: input.collectionId,
      title: input.title,
      description: input.description,
    });
    if (response.error) {
      return { ok: false, failure: toServiceFailure(UPDATE_OPERATION, withStatus(response.error, response.status)) };
    }

    const parsed = updateStatusSchema.safeParse(response.data);
    if (!parsed.success) return { ok: false, failure: toServiceFailure(UPDATE_OPERATION, parsed.error) };
    return { ok: true, status: parsed.data.status };
  } catch (error) {
    return { ok: false, failure: toServiceFailure(UPDATE_OPERATION, error) };
  }
}

/** `delete_my_collection(collectionId)` as the signed-in owner; answers the stored title (design D2, D7). */
export async function deleteOwnCollection(collectionId: string): Promise<DeleteOwnCollectionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const response = await supabase.rpc("delete_my_collection", { collection_id: collectionId });
    if (response.error) {
      return { ok: false, failure: toServiceFailure(DELETE_OPERATION, withStatus(response.error, response.status)) };
    }

    const parsed = deleteStatusSchema.safeParse(response.data);
    if (!parsed.success) return { ok: false, failure: toServiceFailure(DELETE_OPERATION, parsed.error) };
    if (parsed.data.status === "not-found") return { ok: true, status: "not-found" };
    return { ok: true, status: "deleted", title: parsed.data.title };
  } catch (error) {
    return { ok: false, failure: toServiceFailure(DELETE_OPERATION, error) };
  }
}
