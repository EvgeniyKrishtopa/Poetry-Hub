import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "./config";

let browserClient: SupabaseClient | undefined;

/**
 * The browser client, created once. It only reads the session; the proxy is the only token
 * refresher, so two refreshers never race on refresh-token rotation (design D6).
 * A `SupabaseConfigError` propagates and nothing is cached, so the next call re-validates.
 */
// implements FR-8 of add-supabase-auth
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) {
    const { url, publishableKey } = getSupabaseConfig();
    browserClient = createBrowserClient(url, publishableKey, {
      auth: { autoRefreshToken: false },
    });
  }
  return browserClient;
}
