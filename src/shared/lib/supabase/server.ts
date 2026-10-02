import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getSupabaseConfig } from "./config";

/**
 * A per-request server client for Server Actions and route handlers, with the session
 * read from and written to `cookies()`. Rejects with `SupabaseConfigError` on invalid config.
 */
// implements FR-8 of add-supabase-auth
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const { url, publishableKey } = getSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // A Server Component can't write cookies; the proxy refreshes the session there instead
          // (the documented @supabase/ssr pattern, design D3).
        }
      },
    },
  });
}
