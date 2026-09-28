import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

import { HomeGreeting, getHomeGreeting, resolveGreeting } from "@/features/home";
import { PoemList, PoemSearch, poemsListQueryOptions } from "@/features/poems";
import { getQueryClient } from "@/shared/lib/query-client";

// implements NFR-2 of add-contentful-home-greeting: ISR safety net — the page re-renders at most every 60 s.
// Must stay a literal: Next.js reads segment config statically and fails the build on a named constant.
// Mirrors the Contentful client's DEFAULT_REVALIDATE_SECONDS so the page and its fetch expire together.
export const revalidate = 60;

export default async function HomePage() {
  // implements FR-6, FR-7 of add-contentful-home-greeting: CMS greeting, falling back to siteConfig on any failure
  const greetingResult = await getHomeGreeting();

  // Prefetch on the server; the client list hydrates from this cache instead of refetching.
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(poemsListQueryOptions);

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
