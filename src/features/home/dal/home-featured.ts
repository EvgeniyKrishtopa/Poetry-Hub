import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { HOME_FEATURED_TAG } from "@/shared/config/cache-tags";
import { SupabaseConfigError } from "@/shared/lib/supabase";
import { classifySupabaseError } from "@/shared/lib/supabase/classify-error";
import { createSupabasePublicClient } from "@/shared/lib/supabase/public";

import { homeFeaturedIdsResponseSchema } from "../model/home-featured-ids.schema";
import type { HomeFeaturedIdsResult } from "../model/home-section.types";

const IDS_FUNCTION = "home_featured_ids";

const UNAVAILABLE: HomeFeaturedIdsResult = { ok: false };

const INVALID_ANSWER_KIND = "invalid answer";

/** Logs `[home] read featured ids failed: <kind>`, the kind only, never a message or an id (FR-7), and returns the failure. */
function fail(kind: string): HomeFeaturedIdsResult {
  console.error(`[home] read featured ids failed: ${kind}`);
  return UNAVAILABLE;
}

async function readHomeFeaturedIds(): Promise<HomeFeaturedIdsResult> {
  try {
    const supabase = createSupabasePublicClient();
    const { data, error, status } = await supabase.rpc(IDS_FUNCTION);
    // postgrest-js keeps the status on the response; only the code and status are classified.
    if (error) return fail(classifySupabaseError({ code: error.code, status }));

    const parsed = homeFeaturedIdsResponseSchema.safeParse(data);
    if (!parsed.success) return fail(INVALID_ANSWER_KIND);

    return { ok: true, ids: parsed.data };
  } catch (error) {
    // The proxy already logs a missing config on every request.
    if (error instanceof SupabaseConfigError) return UNAVAILABLE;
    return fail(classifySupabaseError(error));
  }
}

/**
 * The chosen poem and author ids in position order, from the `home_featured_ids` function through the public
 * client in its own cache scope: `hours` on success, `seconds` on failure, tagged `HOME_FEATURED_TAG`. A failure is
 * `{ ok: false }`, logged by kind only, never thrown (FR-7, FR-12, FR-13).
 */
export async function getHomeFeaturedIds(): Promise<HomeFeaturedIdsResult> {
  "use cache";
  cacheTag(HOME_FEATURED_TAG);

  const result = await readHomeFeaturedIds();
  // Separate calls: cacheLife's typed overloads take each profile name as a literal.
  if (result.ok) cacheLife("hours");
  else cacheLife("seconds");
  return result;
}
