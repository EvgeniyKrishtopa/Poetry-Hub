import type { ContentfulErrorKind } from "@/shared/lib/contentful";

import type { AboutPageEntry } from "./about-page.schema";

export type AboutPageFailureReason = ContentfulErrorKind | "validation" | "not-found";

export type AboutPageResult =
  | { readonly ok: true; readonly entry: AboutPageEntry }
  | { readonly ok: false; readonly reason: AboutPageFailureReason };
