import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getPublicAuthor } from "../../dal/public-authors";
import { AuthorOwnerLink } from "../AuthorOwnerLink/AuthorOwnerLink";
import { AuthorProfileView } from "../AuthorProfileView/AuthorProfileView";

import type { AuthorPageContentProps } from "./AuthorPageContent.types";

/** Reads the cached public profile inside `AuthorPage`'s Suspense boundary (FR-14). */
export async function AuthorPageContent({ id, poems }: AuthorPageContentProps) {
  const result = await getPublicAuthor(await id);

  if (!result.ok) {
    // Inside a streamed boundary this is a soft 404: the not-found UI with status 200 (design D5).
    if (result.reason === "not-found") notFound();
    // The route's error.tsx shows the generic error screen; the DAL already logged the cause.
    throw new Error("Author page unavailable");
  }

  return (
    <AuthorProfileView
      author={result.author}
      ownerLink={
        // Its own boundary: the owner check reads the session per request, the profile stays cached.
        // No placeholder while it resolves: most visitors aren't the owner, and a skeleton would
        // flash and vanish for them on every visit.
        <Suspense fallback={null}>
          <AuthorOwnerLink profileId={result.author.id} />
        </Suspense>
      }
      poems={poems}
    />
  );
}
