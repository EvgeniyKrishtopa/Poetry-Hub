import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { POEM_ILLUSTRATIONS_BUCKET } from "@/features/poems";
import { IMAGE_FORMATS } from "@/shared/lib/image-file/image-file.constants";
import { SupabaseConfigError } from "@/shared/lib/supabase";
import { classifySupabaseError } from "@/shared/lib/supabase/classify-error";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import type {
  CanCreatePoemResult,
  CreateOwnPoemInput,
  CreateOwnPoemResult,
  PoemIllustration,
  ServiceFailure,
} from "../model/poem-management.types";

// Every write runs with the cookie client as the signed-in owner; the database functions resolve the
// caller from the session, so none of these takes a user id (design D2). Each returns a failure as a
// value, never throws. Log lines carry the operation and the failure kind only (NFR-10).

const CHECK_OPERATION = "check poem limit";
const CREATE_OPERATION = "create poem";
const UPLOAD_OPERATION = "upload illustration";
const CLEANUP_OPERATION = "remove illustration";

/** `can_create_poem()`'s answer; any other shape fails the parse, so a changed function keeps the check closed. */
const canCreateStatusSchema = z.object({ status: z.enum(["allowed", "not-public", "over-limit"]) });

/** `create_my_poem()`'s answer. */
const createStatusSchema = z.union([
  z.object({ status: z.literal("created"), id: z.uuid() }),
  z.object({ status: z.enum(["not-public", "over-limit"]) }),
]);

/** A loggable label: the error class name, or the PostgREST code. Never a message: it can quote row values. */
function describeError(error: unknown): string {
  if (error instanceof Error) return error.name;
  // A plain Storage error object carries its class name.
  if (typeof error === "object" && error !== null && "name" in error && typeof error.name === "string") {
    return error.name;
  }
  if (typeof error === "object" && error !== null && "code" in error) {
    return typeof error.code === "string" && error.code !== "" ? `PostgrestError ${error.code}` : "PostgrestError";
  }
  return typeof error;
}

/** Logs `[poem-management] <operation> failed: <kind>` and classifies the error. */
function toServiceFailure(operation: string, error: unknown): ServiceFailure {
  // The proxy already logs a missing config on every request.
  if (!(error instanceof SupabaseConfigError)) {
    console.error(`[poem-management] ${operation} failed: ${describeError(error)}`);
  }
  return classifySupabaseError(error);
}

/**
 * A PostgREST error with the response status merged in: postgrest-js keeps the status on the response, so
 * without it a 401, a 5xx, or a network failure (status 0) would classify as `unknown`. Only the code is
 * kept: the message and details can quote the poem.
 */
function withStatus(error: { readonly code?: string }, status: number): { readonly code?: string; readonly status: number } {
  return { code: error.code, status };
}

function logLimitReached(): void {
  // Expected, not an error, but worth seeing if one account keeps hitting it.
  console.warn("[poem-management] poem limit reached");
}

/** `can_create_poem()`: the limit and public-profile check before any upload (design D2, D7 step 3). */
export async function checkCanCreatePoem(): Promise<CanCreatePoemResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const response = await supabase.rpc("can_create_poem");
    if (response.error) {
      return { ok: false, failure: toServiceFailure(CHECK_OPERATION, withStatus(response.error, response.status)) };
    }

    const parsed = canCreateStatusSchema.safeParse(response.data);
    if (!parsed.success) return { ok: false, failure: toServiceFailure(CHECK_OPERATION, parsed.error) };
    if (parsed.data.status === "over-limit") logLimitReached();
    return { ok: true, status: parsed.data.status };
  } catch (error) {
    // A config error, or an unexpected throw: still a value, never an exception.
    return { ok: false, failure: toServiceFailure(CHECK_OPERATION, error) };
  }
}

type UploadResult = { readonly ok: true; readonly path: string } | { readonly ok: false; readonly failure: ServiceFailure };

/**
 * Uploads into the author's own folder under a fresh name. The extension and content type come from the
 * sniffed type, never from the browser-supplied `file.type` (FR-4).
 */
async function uploadIllustration(
  supabase: SupabaseClient,
  authorId: string,
  illustration: PoemIllustration,
): Promise<UploadResult> {
  const { extension, contentType } = IMAGE_FORMATS[illustration.type];
  const path = `${authorId}/${crypto.randomUUID()}.${extension}`;
  // Re-wrapped: for a File/Blob body Storage stores the body's own type and ignores `contentType`.
  const body = new Blob([illustration.file], { type: contentType });
  try {
    const { error } = await supabase.storage.from(POEM_ILLUSTRATIONS_BUCKET).upload(path, body, {
      contentType,
      upsert: false,
    });
    if (error) return { ok: false, failure: toServiceFailure(UPLOAD_OPERATION, error) };
    return { ok: true, path };
  } catch (error) {
    return { ok: false, failure: toServiceFailure(UPLOAD_OPERATION, error) };
  }
}

/** Removes an upload no poem points at; a failure is only logged, an orphan is a known risk (design Risks). */
async function removeIllustrationBestEffort(supabase: SupabaseClient, path: string): Promise<void> {
  try {
    const { error } = await supabase.storage.from(POEM_ILLUSTRATIONS_BUCKET).remove([path]);
    if (error) toServiceFailure(CLEANUP_OPERATION, error);
  } catch (error) {
    toServiceFailure(CLEANUP_OPERATION, error);
  }
}

/** `create_my_poem()`; the database checks the limit again, under a per-author lock (design D2). */
async function insertPoem(
  supabase: SupabaseClient,
  input: CreateOwnPoemInput,
  illustrationPath: string | null,
): Promise<CreateOwnPoemResult> {
  try {
    const response = await supabase.rpc("create_my_poem", {
      title: input.title,
      text: input.text,
      genre_id: input.genreId,
      illustration_path: illustrationPath,
    });
    if (response.error) {
      return { ok: false, failure: toServiceFailure(CREATE_OPERATION, withStatus(response.error, response.status)) };
    }

    const parsed = createStatusSchema.safeParse(response.data);
    if (!parsed.success) return { ok: false, failure: toServiceFailure(CREATE_OPERATION, parsed.error) };
    if (parsed.data.status === "created") return { ok: true, poemId: parsed.data.id };
    if (parsed.data.status === "over-limit") {
      // A concurrent create of the same author won the race after the app's pre-check.
      logLimitReached();
      return { ok: false, failure: "too-many-poems" };
    }
    // The app checked the profile first, so the profile went non-public meanwhile.
    console.error(`[poem-management] ${CREATE_OPERATION} failed: not-public`);
    return { ok: false, failure: "unknown" };
  } catch (error) {
    return { ok: false, failure: toServiceFailure(CREATE_OPERATION, error) };
  }
}

/**
 * Uploads the illustration (if any), then calls `create_my_poem`; removes the upload best-effort on
 * anything but `created` (design D7 steps 6-7). An upload failure inserts nothing: a poem is never stored
 * without the illustration its author chose.
 */
export async function createOwnPoem(input: CreateOwnPoemInput): Promise<CreateOwnPoemResult> {
  let supabase: SupabaseClient;
  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    return { ok: false, failure: toServiceFailure(CREATE_OPERATION, error) };
  }

  let illustrationPath: string | null = null;
  if (input.illustration !== null) {
    const upload = await uploadIllustration(supabase, input.authorId, input.illustration);
    if (!upload.ok) return upload;
    illustrationPath = upload.path;
  }

  const result = await insertPoem(supabase, input, illustrationPath);
  if (!result.ok && illustrationPath !== null) await removeIllustrationBestEffort(supabase, illustrationPath);
  return result;
}
