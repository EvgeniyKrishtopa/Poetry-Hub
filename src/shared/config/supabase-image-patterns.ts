/** The public-bucket path of the author photos; `author-photos` is the bucket the authors feature uploads to. */
const AUTHOR_PHOTOS_PUBLIC_PATH = "/storage/v1/object/public/author-photos/**";

/**
 * `images.remotePatterns` for the public author-photo bucket, derived from the Supabase URL.
 * An unset URL (a CI build) gives an empty list, so the build still succeeds.
 */
export function buildSupabaseImagePatterns(supabaseUrl: string | undefined): URL[] {
  if (supabaseUrl === undefined || supabaseUrl === "" || !URL.canParse(supabaseUrl)) return [];
  return [new URL(AUTHOR_PHOTOS_PUBLIC_PATH, supabaseUrl)];
}
