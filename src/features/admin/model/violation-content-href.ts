import { VIOLATION_CONTENT_KIND } from "./violation.constants";
import type { ViolationContentKind } from "./violation.types";

const AUTHORS_ROUTE = "/authors";

/** The segment under an author page for each kind of content; `poems` and `collections` own the pages. */
const CONTENT_SEGMENT = {
  [VIOLATION_CONTENT_KIND.poem]: "poems",
  [VIOLATION_CONTENT_KIND.collection]: "collections",
} as const satisfies Record<ViolationContentKind, string>;

/**
 * The public page of the poem or collection that prompted a case. `admin` may not import the pages' own path helpers
 * (it takes nothing from `authors` or `collections`), so a test pins this to them.
 */
export function violationContentHref(authorProfileId: string, kind: ViolationContentKind, contentId: string): string {
  return `${AUTHORS_ROUTE}/${authorProfileId}/${CONTENT_SEGMENT[kind]}/${contentId}`;
}
