import "server-only";

import type { Metadata } from "next";

import { buildPageMetadata } from "@/shared/lib/seo";

import { AUTHORS_PATH } from "../model/author.constants";
import { AUTHORS_PAGE_DESCRIPTION, PAGE_TITLES } from "../model/author-messages";

/** The authors directory's metadata: its own title and fixed description (FR-1, FR-2). */
export function getAuthorsPageMetadata(): Metadata {
  return buildPageMetadata({
    title: PAGE_TITLES.authors,
    description: AUTHORS_PAGE_DESCRIPTION,
    path: AUTHORS_PATH,
    type: "website",
  });
}
