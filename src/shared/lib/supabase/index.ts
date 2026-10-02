// Client-safe exports only. The server-only modules are imported by subpath:
// `@/shared/lib/supabase/server` and `@/shared/lib/supabase/session` (design D1).
export { getSupabaseBrowserClient } from "./browser";
export { SupabaseConfigError } from "./errors";
