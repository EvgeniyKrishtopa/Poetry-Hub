import type { ContentfulErrorKind } from "@/shared/lib/contentful";

import type { CONTENT_PAGE_KEYS } from "./content-page.constants";
import type { ContentPageEntry } from "./content-page.schema";

export type ContentPageFailureReason = ContentfulErrorKind | "validation" | "not-found";

export type ContentPageResult =
  | { readonly ok: true; readonly entry: ContentPageEntry }
  | { readonly ok: false; readonly reason: ContentPageFailureReason };

/** A known content page's entry key; a route can pass only one of `CONTENT_PAGE_KEYS`. */
export type ContentPageKey = (typeof CONTENT_PAGE_KEYS)[keyof typeof CONTENT_PAGE_KEYS];
