import "server-only";

import type { Metadata } from "next";

import { siteConfig } from "@/shared/config/site";

import type { NoIndexMetadataInput, PageMetadataInput } from "./seo.types";

/**
 * What a page falls back to when the metadata code itself fails: the site's name and description. The title is
 * absolute, so the root template does not repeat the site name after it.
 */
export const FALLBACK_METADATA: Metadata = {
  title: { absolute: siteConfig.name },
  description: siteConfig.description,
};

/** A page's canonical path: lowercase ids, no query, no hash (FR-3). */
export function toCanonicalPath(path: string): string {
  void path;
  throw new Error("not implemented");
}

/**
 * A public page's complete metadata: title, description, canonical, Open Graph and Twitter card, with the
 * share image chosen per FR-5 (FR-1 to FR-5).
 */
export function buildPageMetadata(input: PageMetadataInput): Metadata {
  void input;
  throw new Error("not implemented");
}

/** Only a title and the robots rule, plus a canonical when asked: no description, no card (FR-6, FR-7). */
export function buildNoIndexMetadata(input: NoIndexMetadataInput): Metadata {
  void input;
  throw new Error("not implemented");
}
