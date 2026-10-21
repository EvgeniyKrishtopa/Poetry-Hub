import type { ContentfulErrorKind } from "@/shared/lib/contentful";

import type { CONTENT_PAGE_KEYS } from "./content-page.constants";
import type { ContentPageEntry } from "./content-page.schema";

export type ContentPageFailureReason = ContentfulErrorKind | "validation" | "not-found";

export type ContentPageResult =
  | { readonly ok: true; readonly entry: ContentPageEntry }
  | { readonly ok: false; readonly reason: ContentPageFailureReason };

/** One block of a content page's text: a numbered section or subsection heading, or a paragraph. */
export type ContentBlock =
  | { readonly kind: "section"; readonly text: string }
  | { readonly kind: "subsection"; readonly text: string }
  | { readonly kind: "paragraph"; readonly text: string };

/** A known content page's entry key; a route can pass only one of `CONTENT_PAGE_KEYS`. */
export type ContentPageKey = (typeof CONTENT_PAGE_KEYS)[keyof typeof CONTENT_PAGE_KEYS];
