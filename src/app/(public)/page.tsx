import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { cacheLife, cacheTag } from "next/cache";

import { HomeGreeting, getHomeGreeting, resolveGreeting } from "@/features/home";
import { PoemList, PoemSearch, poemsListQueryOptions } from "@/features/poems";
import { CONTENTFUL_CACHE_TAG } from "@/shared/lib/contentful";
import { getQueryClient } from "@/shared/lib/query-client";

export default async function HomePage() {
  "use cache";
  // implements FR-4 of migrate-to-cache-components: Cache Components rejects the `revalidate` segment
  // config, so the page body is its own cache scope (prefetch/dehydrate read Date.now(), which needs one).
  // "minutes" revalidates every 60 s, matching the Contentful client's default.
  cacheLife("minutes");
  // implements FR-5 of migrate-to-cache-components: tag the page itself so the publish webhook's
  // revalidateTag expires it directly, without relying on nested-tag propagation.
  cacheTag(CONTENTFUL_CACHE_TAG);

  const queryClient = getQueryClient();

  // The two fetches are independent, so run them in parallel.
  // implements FR-6, FR-7 of add-contentful-home-greeting: CMS greeting, falling back to siteConfig on any failure
  // Prefetch on the server; the client list hydrates from this cache instead of refetching.
  const [greetingResult] = await Promise.all([
    getHomeGreeting(),
    queryClient.prefetchQuery(poemsListQueryOptions),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
      <HomeGreeting greeting={resolveGreeting(greetingResult)} />

      <HydrationBoundary state={dehydrate(queryClient)}>
        <PoemSearch />
        <PoemList />
      </HydrationBoundary>
    </main>
  );
}
