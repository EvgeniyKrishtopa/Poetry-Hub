import "server-only";

import type { Metadata } from "next";

/** The authors directory's metadata: its own title and fixed description (FR-1, FR-2). */
export function getAuthorsPageMetadata(): Metadata {
  throw new Error("not implemented");
}
