import "server-only";

import { LOCAL_SITE_URL, SITE_URL_ENV, VERCEL_PRODUCTION_HOST_ENV } from "./seo.constants";

/** Set after the first invalid value, so a bad setting costs one log line per server process, not one per request. */
let hasLoggedInvalidValue = false;

function logInvalidValueOnce(variable: string): void {
  if (hasLoggedInvalidValue) return;
  hasLoggedInvalidValue = true;
  // The name only, never the value.
  console.error(`[seo] ${variable} is not an absolute http(s) URL, using the next fallback`);
}

/** The origin of an absolute http(s) URL; `null` for anything else. */
function toOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    const isHttp = url.protocol === "http:" || url.protocol === "https:";
    return isHttp ? url.origin : null;
  } catch {
    return null;
  }
}

/** The origin a variable's value gives; `null` when the value is unset or empty (silent) or invalid (logged once). */
function resolveOrigin(variable: string, value: string | undefined): string | null {
  if (value === undefined || value === "") return null;
  const origin = toOrigin(value);
  if (origin === null) logInvalidValueOnce(variable);
  return origin;
}

/**
 * The site's public origin (FR-11): `SITE_URL`, else `https://` + `VERCEL_PROJECT_PRODUCTION_URL`, else
 * `http://localhost:3000`. Any absolute http(s) value is reduced to its origin; an invalid one is logged
 * once per process and skipped. Read at use, never at import.
 */
export function getSiteUrl(): string {
  const explicitOrigin = resolveOrigin(SITE_URL_ENV, process.env[SITE_URL_ENV]);
  if (explicitOrigin !== null) return explicitOrigin;

  const vercelHost = process.env[VERCEL_PRODUCTION_HOST_ENV];
  const vercelValue = vercelHost === undefined || vercelHost === "" ? undefined : `https://${vercelHost}`;
  const vercelOrigin = resolveOrigin(VERCEL_PRODUCTION_HOST_ENV, vercelValue);
  if (vercelOrigin !== null) return vercelOrigin;

  return LOCAL_SITE_URL;
}
