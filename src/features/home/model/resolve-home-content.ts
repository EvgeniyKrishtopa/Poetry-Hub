import { siteConfig } from "@/shared/config/site";

import type { GreetingResult, SectionCopy } from "./greeting.types";
import type { HomeBannerContent, HomeBannerResult } from "./home-banner.types";
import { HERO_IMAGE_PATH } from "./home.constants";

/** The CMS banner on success; the site name, the site description and the shipped photo for any failure. */
export function resolveBanner(result: HomeBannerResult): HomeBannerContent {
  if (result.ok) {
    return { title: result.banner.title, text: result.banner.description, imageSrc: result.banner.bannerImage };
  }
  return { title: siteConfig.name, text: siteConfig.description, imageSrc: HERO_IMAGE_PATH };
}

/** The CMS greeting's title and message on success; the section's own static copy for any failure. */
export function resolveSectionCopy(result: GreetingResult, fallback: SectionCopy): SectionCopy {
  if (result.ok) {
    return { heading: result.greeting.title, text: result.greeting.message };
  }
  return { heading: fallback.heading, text: fallback.text };
}
