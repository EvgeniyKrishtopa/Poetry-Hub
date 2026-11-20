import "server-only";

import type { Metadata } from "next";

import { siteConfig } from "@/shared/config/site";

import { DEFAULT_SHARE_IMAGE_PATH, OG_LOCALE } from "./seo.constants";
import type { NoIndexMetadataInput, PageMetadataInput } from "./seo.types";
import { getSiteUrl } from "./site-url";

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
  const queryOrHashStart = path.search(/[?#]/);
  const pathname = queryOrHashStart === -1 ? path : path.slice(0, queryOrHashStart);
  return pathname.toLowerCase();
}

function toAbsoluteUrl(path: string): string {
  return `${getSiteUrl()}${toCanonicalPath(path)}`;
}

/**
 * A public page's complete metadata: title, description, canonical, Open Graph and Twitter card, with the
 * share image chosen per FR-5 (FR-1 to FR-5).
 */
export function buildPageMetadata({ title, description, path, type, image }: PageMetadataInput): Metadata {
  const canonicalUrl = toAbsoluteUrl(path);
  const shareImage = image ?? `${getSiteUrl()}${DEFAULT_SHARE_IMAGE_PATH}`;
  // The Open Graph block is set whole: a child page's `openGraph` replaces its parent's rather than merging.
  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type,
      title,
      description,
      url: canonicalUrl,
      siteName: siteConfig.name,
      locale: OG_LOCALE,
      images: [shareImage],
    },
    twitter: { card: "summary_large_image", title, description, images: [shareImage] },
  };
}

/** Only a title and the robots rule, plus a canonical when asked: no description, no card (FR-6, FR-7). */
export function buildNoIndexMetadata({ title, follow, canonicalPath }: NoIndexMetadataInput): Metadata {
  const metadata: Metadata = { title, robots: { index: false, follow } };
  if (canonicalPath === undefined) return metadata;
  return { ...metadata, alternates: { canonical: toAbsoluteUrl(canonicalPath) } };
}
