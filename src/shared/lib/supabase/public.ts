import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "./config";

/**
 * A cookie-less client for public reads inside `"use cache"`: it reads no request data and runs
 * as the anon role, so RLS returns only public rows. Throws `SupabaseConfigError` on invalid config.
 */
export function createSupabasePublicClient(): SupabaseClient {
  const { url, publishableKey } = getSupabaseConfig();

  // No session to keep or refresh: a cached read must never depend on, or write, a reader's session.
  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
