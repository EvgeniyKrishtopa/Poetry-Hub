// Client-safe exports only. The server-only modules are imported by subpath:
// `@/shared/lib/supabase/server` and `@/shared/lib/supabase/session` (design D1).
// implements FR-5 of remove-browser-session-read
export { SupabaseConfigError } from "./errors";
