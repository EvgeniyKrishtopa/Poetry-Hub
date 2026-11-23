import type { ContentfulErrorKind } from "@/shared/lib/contentful";

import type { HomeBanner } from "./home-banner.schema";

export type HomeBannerFailureReason = ContentfulErrorKind | "validation" | "not-found";

export type HomeBannerResult =
  | { readonly ok: true; readonly banner: HomeBanner }
  | { readonly ok: false; readonly reason: HomeBannerFailureReason };

/** What the hero displays: the CMS banner or the static fallback, both with an image `next/image` may load. */
export interface HomeBannerContent {
  readonly title: string;
  readonly text: string;
  readonly imageSrc: string;
}
