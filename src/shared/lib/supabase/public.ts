import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * A cookie-less client for public reads inside `"use cache"`: it reads no request data and runs
 * as the anon role, so RLS returns only public rows. Throws `SupabaseConfigError` on invalid config.
 */
export function createSupabasePublicClient(): SupabaseClient {
  throw new Error("not implemented");
}
