import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getSupabaseConfig } from "./config";

/**
 * Start of the error `cookies().set` throws outside a Server Action or Route Handler.
 * Matched by message: Next exports the error class only from an internal `next/dist` path.
 */
const READ_ONLY_COOKIES_MESSAGE = "Cookies can only be modified in a Server Action or Route Handler";

function isReadOnlyCookiesError(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith(READ_ONLY_COOKIES_MESSAGE);
}

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
        } catch (error) {
          // A Server Component can't write cookies; the proxy refreshes the session there instead
          // (the documented @supabase/ssr pattern, design D3). Any other failure would silently
          // drop a session write in an action, so it propagates.
          if (!isReadOnlyCookiesError(error)) throw error;
        }
      },
    },
  });
}
