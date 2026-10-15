/**
 * `images.remotePatterns` for the public author-photo bucket, derived from the Supabase URL.
 * An unset URL (a CI build) gives an empty list, so the build still succeeds.
 */
export function buildSupabaseImagePatterns(supabaseUrl: string | undefined): URL[] {
  void supabaseUrl;
  throw new Error("not implemented");
}
