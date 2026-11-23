import { cacheLife, cacheTag } from "next/cache";

import {
  HomeAbout,
  HomeAuthors,
  HomeFeaturedWorks,
  HomeHero,
  HomeJoinCta,
  HomeLatestWorks,
  getFeaturedAuthors,
  getFeaturedWorks,
  getHomePageMetadata,
  getHomeGreeting,
  getLatestWorks,
  resolveGreeting,
} from "@/features/home";
import { HOME_FEATURED_TAG } from "@/shared/config/cache-tags";
import { CONTENTFUL_CACHE_TAG } from "@/shared/lib/contentful";

export const metadata = getHomePageMetadata();

export default async function HomePage() {
  "use cache";
  // Cache Components rejects the `revalidate` segment config, so the page body is its own cache
  // scope. "minutes" revalidates every 60 s, matching the Contentful client's default.
  cacheLife("minutes");
  // Tag the page itself so the publish webhook's revalidateTag expires it directly, without relying
  // on nested-tag propagation. The admin's choice is tagged too (the nested read tags it already, the
  // group 1 spike verified that; the page keeps both so neither depends on the other).
  cacheTag(CONTENTFUL_CACHE_TAG, HOME_FEATURED_TAG);

  // Nothing here reads cookies, headers or the session: every visitor gets the same cached page. Each data
  // read answers with a value, never a throw, so a failed section is left out and the others still render.
  const [greetingResult, featuredWorks, featuredAuthors, latestWorks] = await Promise.all([
    getHomeGreeting(),
    getFeaturedWorks(),
    getFeaturedAuthors(),
    getLatestWorks(),
  ]);
  const greeting = resolveGreeting(greetingResult);

  return (
    <main className="flex w-full flex-1 flex-col">
      <HomeHero greeting={greeting} />
      <HomeFeaturedWorks result={featuredWorks} />
      <HomeAbout />
      <HomeAuthors result={featuredAuthors} />
      <HomeLatestWorks result={latestWorks} />
      <HomeJoinCta />
    </main>
  );
}
