import type { HomeBannerContent } from "../../model/home-banner.types";

export interface HomeHeroProps {
  /** The hero's title, text and photo: the CMS banner's, or the static fallback `resolveBanner` gives. */
  readonly banner: HomeBannerContent;
}
