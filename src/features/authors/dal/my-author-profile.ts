import "server-only";

import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { OWNER_PROFILE_COLUMNS } from "../model/author.constants";
import type { MyProfileResult } from "../model/author.types";

import { toProfileFailure } from "./profile-failure";
import { findOwnProfileId, toMyProfileResult } from "./profile-queries";

const OPERATION = "read own profile";

/**
 * The signed-in owner's own row, per request with the cookie client: the database resolves the caller
 * (`my_author_profile_id()`), so no user id is passed (design D3). Never throws for an expected failure.
 */
export async function getMyAuthorProfile(): Promise<MyProfileResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const own = await findOwnProfileId(supabase, OPERATION);
    if (!own.ok) return own;
    if (own.id === null) return { ok: true, profile: null };

    const response = await supabase.from("author_profiles").select(OWNER_PROFILE_COLUMNS).eq("id", own.id).single();
    return toMyProfileResult(supabase, OPERATION, response);
  } catch (error) {
    // A config error, or an unexpected throw: still a value, never an exception.
    return { ok: false, failure: toProfileFailure(OPERATION, error) };
  }
}
