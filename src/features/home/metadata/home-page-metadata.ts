import "server-only";

import type { Metadata } from "next";

/** The home page's metadata: the site name as an absolute title and a description built on the site slogan (FR-1, FR-2). */
export function getHomePageMetadata(): Metadata {
  throw new Error("not implemented");
}
