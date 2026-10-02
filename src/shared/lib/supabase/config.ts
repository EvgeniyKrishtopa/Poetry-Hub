// Not server-only: the browser client needs the same values, and both are public by design.
import { z } from "zod";

import { SupabaseConfigError } from "./errors";

export interface SupabaseConfig {
  readonly url: string;
  readonly publishableKey: string;
}

/** Plain `http:` is allowed only for a local Supabase CLI instance. */
const LOCAL_HTTP_HOSTNAMES: ReadonlySet<string> = new Set(["localhost", "127.0.0.1"]);

function isAllowedSupabaseUrl(value: string): boolean {
  if (!URL.canParse(value)) return false;
  const { protocol, hostname } = new URL(value);
  return protocol === "https:" || (protocol === "http:" && LOCAL_HTTP_HOSTNAMES.has(hostname));
}

// implements FR-8 of add-supabase-auth
const supabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().refine(isAllowedSupabaseUrl),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().regex(/^\S+$/),
});

/**
 * Reads and validates the Supabase env vars on every call (never at module load).
 * Throws `SupabaseConfigError` naming the offending variables, never their values.
 */
export function getSupabaseConfig(): SupabaseConfig {
  // Literal `process.env.NEXT_PUBLIC_*` accesses: Next inlines only these into the browser bundle.
  const parsed = supabaseEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });

  if (!parsed.success) {
    // Only variable names leave this function; the Zod error is not attached as a cause.
    const names = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))];
    throw new SupabaseConfigError(names);
  }

  return {
    url: parsed.data.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: parsed.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}
