import { SignedOutOnly } from "@/features/auth";
import { HomeJoinCta, HomeSections, getHomePageMetadata } from "@/features/home";

export const metadata = getHomePageMetadata();

export default function HomePage() {
  // The five shared sections are one cached scope inside `HomeSections`. The closing invitation is for visitors
  // who are not signed in, so it is read on the server outside that cache, in `SignedOutOnly`'s own boundary.
  return (
    <main className="flex w-full flex-1 flex-col">
      <HomeSections />
      <SignedOutOnly>
        <HomeJoinCta />
      </SignedOutOnly>
    </main>
  );
}
