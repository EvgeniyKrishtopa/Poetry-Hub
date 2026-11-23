// Public API of the home feature. Server-only: the DAL export makes client imports fail the build.
export { getHomeGreeting } from "./dal/home-greeting";
export { getFeaturedAuthors, getFeaturedWorks, getLatestWorks } from "./dal/home-sections";
export { HomeAbout } from "./components/HomeAbout/HomeAbout";
export { HomeAuthors } from "./components/HomeAuthors/HomeAuthors";
export { HomeFeaturedWorks } from "./components/HomeFeaturedWorks/HomeFeaturedWorks";
export { HomeHero } from "./components/HomeHero/HomeHero";
export { HomeJoinCta } from "./components/HomeJoinCta/HomeJoinCta";
export { HomeLatestWorks } from "./components/HomeLatestWorks/HomeLatestWorks";
export { getHomePageMetadata } from "./metadata/home-page-metadata";
export { resolveGreeting } from "./model/resolve-greeting";
