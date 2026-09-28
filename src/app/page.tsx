import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

import { PoemList, PoemSearch, poemsListQueryOptions } from "@/features/poems";
import { getQueryClient } from "@/shared/lib/query-client";
import { siteConfig } from "@/shared/config/site";

export default async function HomePage() {
  // Prefetch on the server; the client list hydrates from this cache instead of refetching.
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(poemsListQueryOptions);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight">{siteConfig.name}</h1>
        <p className="text-muted">{siteConfig.description}</p>
      </header>

      <HydrationBoundary state={dehydrate(queryClient)}>
        <PoemSearch />
        <PoemList />
      </HydrationBoundary>
    </main>
  );
}
