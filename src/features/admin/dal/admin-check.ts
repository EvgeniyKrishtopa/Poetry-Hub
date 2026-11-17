import "server-only";

import { z } from "zod";

import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import type { AdminCheckResult, ModerateCheckResult } from "../model/admin.types";

import { toAdminFailure, withStatus } from "./rpc-failure";

// Both checks run as the signed-in caller through the cookie client. An unreadable answer is a failure value, never
// "not an admin" and never a thrown error, so an outage can't pass for a 404 (FR-2).

const IS_ADMIN_OPERATION = "check admin";
const MODERATE_OPERATION = "check moderation right";

/** Both functions answer one boolean; any other shape fails the parse and is `unknown`. */
const booleanAnswerSchema = z.boolean();

/** Calls `is_admin()` for the signed-in caller; an unreadable answer is a failure, never "not an admin" (design D1). */
export async function checkIsAdmin(): Promise<AdminCheckResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const response = await supabase.rpc("is_admin");
    if (response.error) {
      return { ok: false, failure: toAdminFailure(IS_ADMIN_OPERATION, withStatus(response.error, response.status)) };
    }

    const parsed = booleanAnswerSchema.safeParse(response.data);
    if (!parsed.success) return { ok: false, failure: toAdminFailure(IS_ADMIN_OPERATION, parsed.error) };
    return { ok: true, isAdmin: parsed.data };
  } catch (error) {
    return { ok: false, failure: toAdminFailure(IS_ADMIN_OPERATION, error) };
  }
}

/** Calls `may_moderate_author(author_profile_id)`: an admin who is not the profile's owner (design D8, FR-10). */
export async function checkMayModerateAuthor(authorProfileId: string): Promise<ModerateCheckResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const response = await supabase.rpc("may_moderate_author", { author_profile_id: authorProfileId });
    if (response.error) {
      return { ok: false, failure: toAdminFailure(MODERATE_OPERATION, withStatus(response.error, response.status)) };
    }

    const parsed = booleanAnswerSchema.safeParse(response.data);
    if (!parsed.success) return { ok: false, failure: toAdminFailure(MODERATE_OPERATION, parsed.error) };
    return { ok: true, mayModerate: parsed.data };
  } catch (error) {
    return { ok: false, failure: toAdminFailure(MODERATE_OPERATION, error) };
  }
}
