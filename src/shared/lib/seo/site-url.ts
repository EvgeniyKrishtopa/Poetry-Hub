import "server-only";

/**
 * The site's public origin (FR-11): `SITE_URL`, else `https://` + `VERCEL_PROJECT_PRODUCTION_URL`, else
 * `http://localhost:3000`. Any absolute http(s) value is reduced to its origin; an invalid one is logged
 * once per process and skipped. Read at use, never at import.
 */
export function getSiteUrl(): string {
  throw new Error("not implemented");
}
