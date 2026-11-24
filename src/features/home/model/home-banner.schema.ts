import { z } from "zod";

import { isAllowedContentfulImageUrl } from "@/shared/config/contentful-image-patterns";

// Every text non-empty after trimming; the trimmed values are what reach the page.
const nonBlankString = z.string().trim().min(1);

/**
 * The Home banner response, built per call because the image rule depends on the project's space id: an
 * address on another host or in another space is refused here, since `next/image` would refuse it later and
 * leave a hero with white text on a white page. A missing image (`null`) fails the same way.
 */
export function createHomeBannerCollectionResponseSchema(spaceId: string) {
  const imageUrl = z.string().refine((url) => isAllowedContentfulImageUrl(url, spaceId));

  const bannerSchema = z.object({
    title: nonBlankString,
    description: nonBlankString,
    bannerImage: z.object({ url: imageUrl }).transform((image) => image.url),
  });

  return z.object({
    homeBannerCollection: z.object({
      items: z.array(bannerSchema),
    }),
  });
}

export interface HomeBanner {
  readonly title: string;
  readonly description: string;
  /** An `https` address on Contentful's image host, inside the project's space. */
  readonly bannerImage: string;
}
