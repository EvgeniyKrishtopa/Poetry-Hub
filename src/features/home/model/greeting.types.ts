import type { ContentfulErrorKind } from "@/shared/lib/contentful";

import type { Greeting } from "./greeting.schema";

export type GreetingFailureReason = ContentfulErrorKind | "validation" | "not-found";

export type GreetingResult =
  | { readonly ok: true; readonly greeting: Greeting }
  | { readonly ok: false; readonly reason: GreetingFailureReason };

/** What the page displays: the CMS greeting's text, or the static fallback (which has no `key`). */
export type GreetingContent = Pick<Greeting, "title" | "message">;
