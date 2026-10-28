/**
 * The public-bucket paths `next/image` may load from Supabase: the author photos and the poem
 * illustrations, the two buckets the authors and poem-management features upload to.
 */
const PUBLIC_IMAGE_PATHS = [
  "/storage/v1/object/public/author-photos/**",
  "/storage/v1/object/public/poem-illustrations/**",
] as const;

/**
 * `images.remotePatterns` for the public image buckets, derived from the Supabase URL.
 * An unset URL (a CI build) gives an empty list, so the build still succeeds.
 */
export function buildSupabaseImagePatterns(supabaseUrl: string | undefined): URL[] {
  if (supabaseUrl === undefined || supabaseUrl === "" || !URL.canParse(supabaseUrl)) return [];
  return PUBLIC_IMAGE_PATHS.map((path) => new URL(path, supabaseUrl));
}
