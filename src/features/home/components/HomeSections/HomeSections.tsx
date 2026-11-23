import { cacheLife, cacheTag } from "next/cache";

import { HOME_FEATURED_TAG } from "@/shared/config/cache-tags";
import { CONTENTFUL_CACHE_TAG } from "@/shared/lib/contentful";

import { getHomeBanner } from "../../dal/home-banner";
import { getGreetingByKey } from "../../dal/home-greeting";
import { getFeaturedAuthors, getFeaturedWorks, getLatestWorks } from "../../dal/home-sections";
import { ABOUT_GREETING_KEY } from "../../model/home.constants";
import { ABOUT_COPY } from "../../model/home-messages";
import { resolveBanner, resolveSectionCopy } from "../../model/resolve-home-content";
import { HomeAbout } from "../HomeAbout/HomeAbout";
import { HomeAuthors } from "../HomeAuthors/HomeAuthors";
import { HomeFeaturedWorks } from "../HomeFeaturedWorks/HomeFeaturedWorks";
import { HomeHero } from "../HomeHero/HomeHero";
import { HomeLatestWorks } from "../HomeLatestWorks/HomeLatestWorks";

/**
 * The five sections every visitor sees alike: hero, featured poems, about, project authors and latest poems, as
 * one cache scope. The closing invitation is not part of it: it depends on the session, which a shared cache
 * must never read.
 */
export async function HomeSections() {
  "use cache";
  // Cache Components rejects the `revalidate` segment config, so the body is its own cache scope. "minutes"
  // revalidates every 60 s, matching the Contentful client's default.
  cacheLife("minutes");
  // Tag the scope itself so the publish webhook's revalidateTag expires it directly, without relying on
  // nested-tag propagation. The admin's choice is tagged too (the nested read tags it already, the group 1
  // spike verified that; both are kept so neither depends on the other).
  cacheTag(CONTENTFUL_CACHE_TAG, HOME_FEATURED_TAG);

  // Nothing here reads cookies, headers or the session. Each data read answers with a value, never a throw, so a
  // failed section is left out and the others still render.
  const [bannerResult, aboutResult, featuredWorks, featuredAuthors, latestWorks] = await Promise.all([
    getHomeBanner(),
    getGreetingByKey(ABOUT_GREETING_KEY),
    getFeaturedWorks(),
    getFeaturedAuthors(),
    getLatestWorks(),
  ]);
  const banner = resolveBanner(bannerResult);
  const aboutCopy = resolveSectionCopy(aboutResult, ABOUT_COPY);

  return (
    <>
      <HomeHero banner={banner} />
      <HomeFeaturedWorks result={featuredWorks} />
      <HomeAbout copy={aboutCopy} />
      <HomeAuthors result={featuredAuthors} />
      <HomeLatestWorks result={latestWorks} />
    </>
  );
}
