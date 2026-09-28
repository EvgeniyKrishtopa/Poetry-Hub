import "server-only";

import { z } from "zod";

import { ContentfulError } from "./errors";

export interface ContentfulConfig {
  readonly spaceId: string;
  readonly accessToken: string;
  /** `master` when `CONTENTFUL_ENVIRONMENT` is unset or empty. */
  readonly environment: string;
}

const DEFAULT_ENVIRONMENT = "master";

// implements FR-2 of add-contentful-home-greeting
const contentfulEnvSchema = z.object({
  CONTENTFUL_SPACE_ID: z.string().regex(/^[a-z0-9]+$/),
  CONTENTFUL_ACCESS_TOKEN: z.string().regex(/^\S+$/),
  // An empty value (e.g. copied from .env.example) must not produce `…/environments/`.
  CONTENTFUL_ENVIRONMENT: z
    .string()
    .optional()
    .transform((value) => value || DEFAULT_ENVIRONMENT)
    .pipe(z.string().regex(/^[a-zA-Z0-9_.-]+$/)),
});

/**
 * Reads and validates the Contentful env vars on every call (never at module load).
 * Throws `ContentfulError` with `kind: "config"` naming the offending variables, never their values.
 */
export function getContentfulConfig(): ContentfulConfig {
  const parsed = contentfulEnvSchema.safeParse({
    CONTENTFUL_SPACE_ID: process.env.CONTENTFUL_SPACE_ID,
    CONTENTFUL_ACCESS_TOKEN: process.env.CONTENTFUL_ACCESS_TOKEN,
    CONTENTFUL_ENVIRONMENT: process.env.CONTENTFUL_ENVIRONMENT,
  });

  if (!parsed.success) {
    // Only variable names go into the message; the Zod error is not attached as a cause
    // (implements NFR-1 of add-contentful-home-greeting).
    const names = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))];
    throw new ContentfulError("config", `Invalid Contentful configuration: ${names.join(", ")}`);
  }

  return {
    spaceId: parsed.data.CONTENTFUL_SPACE_ID,
    accessToken: parsed.data.CONTENTFUL_ACCESS_TOKEN,
    environment: parsed.data.CONTENTFUL_ENVIRONMENT,
  };
}
