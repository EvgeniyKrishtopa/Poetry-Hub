import "server-only";

import type { Metadata } from "next";

import { HOME_PATH } from "@/shared/config/constants";
import { siteConfig } from "@/shared/config/site";
import { buildPageMetadata } from "@/shared/lib/seo";

// Built on the site slogan, the same words as the default share image. Not `siteConfig.description`: that
// one is also the greeting's fallback text on this page, and the two must stay free to change apart.
const HOME_PAGE_DESCRIPTION =
  "Читайте и публикуйте стихи. Поэтический Хаб — современный поэтический портал, который объединяет поэтов и любителей литературы.";

/** The home page's metadata: the site name as an absolute title and a description built on the site slogan (FR-1, FR-2). */
export function getHomePageMetadata(): Metadata {
  const metadata = buildPageMetadata({
    title: siteConfig.name,
    description: HOME_PAGE_DESCRIPTION,
    path: HOME_PATH,
    type: "website",
  });
  // The root template would append the site name to itself; `og:title` stays the plain name.
  return { ...metadata, title: { absolute: siteConfig.name } };
}
