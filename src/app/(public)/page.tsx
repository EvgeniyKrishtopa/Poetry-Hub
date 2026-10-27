import { cacheLife, cacheTag } from "next/cache";

import { HomeGreeting, getHomeGreeting, resolveGreeting } from "@/features/home";
import { CONTENTFUL_CACHE_TAG } from "@/shared/lib/contentful";

export default async function HomePage() {
  "use cache";
  // Cache Components rejects the `revalidate` segment config, so the page body is its own cache
  // scope. "minutes" revalidates every 60 s, matching the Contentful client's default.
  cacheLife("minutes");
  // Tag the page itself so the publish webhook's revalidateTag expires it directly, without relying
  // on nested-tag propagation.
  cacheTag(CONTENTFUL_CACHE_TAG);

  const greetingResult = await getHomeGreeting();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
      <HomeGreeting greeting={resolveGreeting(greetingResult)} />
    </main>
  );
}
