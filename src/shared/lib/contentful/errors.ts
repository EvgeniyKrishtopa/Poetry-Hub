import "server-only";

// implements FR-3 of add-contentful-home-greeting
export type ContentfulErrorKind = "config" | "network" | "auth" | "graphql" | "http";

interface ContentfulErrorOptions {
  /** HTTP status, present for `auth` and `http`. */
  status?: number;
  cause?: unknown;
}

/**
 * Every Contentful failure, discriminated by `kind`. Messages never carry secret values
 * (implements NFR-1 of add-contentful-home-greeting): callers pass only variable names,
 * statuses and GraphQL messages.
 */
export class ContentfulError extends Error {
  readonly kind: ContentfulErrorKind;
  readonly status?: number;

  constructor(kind: ContentfulErrorKind, message: string, options?: ContentfulErrorOptions) {
    super(message, { cause: options?.cause });
    this.name = "ContentfulError";
    this.kind = kind;
    this.status = options?.status;
  }
}
