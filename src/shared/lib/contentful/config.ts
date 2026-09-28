import "server-only";

export interface ContentfulConfig {
  readonly spaceId: string;
  readonly accessToken: string;
  /** `master` when `CONTENTFUL_ENVIRONMENT` is unset or empty. */
  readonly environment: string;
}

/**
 * Reads and validates the Contentful env vars on every call (never at module load).
 * Throws `ContentfulError` with `kind: "config"` naming the offending variables, never their values.
 */
export function getContentfulConfig(): ContentfulConfig {
  throw new Error("not implemented");
}
