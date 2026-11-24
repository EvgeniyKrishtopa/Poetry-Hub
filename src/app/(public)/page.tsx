import { Suspense } from "react";

import { AUTH_NOTICE_PARAM, AuthNotice, SignedOutOnly } from "@/features/auth";
import { HomeJoinCta, HomeSections, getHomePageMetadata } from "@/features/home";

export const metadata = getHomePageMetadata();

export default function HomePage({ searchParams }: PageProps<"/">) {
  const authNotice = searchParams.then((params) => params[AUTH_NOTICE_PARAM]);

  // The five shared sections are one cached scope inside `HomeSections`. The closing invitation is for visitors
  // who are not signed in, so it is read on the server outside that cache, in `SignedOutOnly`'s own boundary.
  // The account-exists notice reads the URL, so it waits in its own boundary and the shell renders without it.
  return (
    <main className="flex w-full flex-1 flex-col">
      <Suspense fallback={null}>
        <AuthNotice notice={authNotice} />
      </Suspense>
      <HomeSections />
      <SignedOutOnly>
        <HomeJoinCta />
      </SignedOutOnly>
    </main>
  );
}
