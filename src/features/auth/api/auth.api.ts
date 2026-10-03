import { getSupabaseBrowserClient } from "@/shared/lib/supabase";

/**
 * The signed-in reader's email from the session cookies, or `null` when signed out.
 * Never throws (an error or a missing config reads as signed out), so the session
 * query never enters an error state (design D6).
 */
// implements FR-7 of add-supabase-auth
// implements FR-8 of add-supabase-auth
export async function getSignedInEmail(): Promise<string | null> {
  try {
    const { data, error } = await getSupabaseBrowserClient().auth.getClaims();
    if (error) return null;
    return data?.claims.email ?? null;
  } catch {
    return null;
  }
}
