import "server-only";

export type ContentfulErrorKind = "config" | "network" | "auth" | "graphql" | "http";

interface ContentfulErrorOptions {
  /** HTTP status, present for `auth` and `http`. */
  status?: number;
  cause?: unknown;
}

/** Every Contentful failure, discriminated by `kind`. Messages never carry secret values. */
export class ContentfulError extends Error {
  readonly kind: ContentfulErrorKind;
  readonly status?: number;

  constructor(kind: ContentfulErrorKind, message: string, options?: ContentfulErrorOptions) {
    super(message);
    this.kind = kind;
    throw new Error("not implemented");
  }
}
