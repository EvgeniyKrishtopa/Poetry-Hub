import { notFound } from "next/navigation";

import { requireSession } from "@/features/auth";
import { PoemArticle } from "@/features/poems";

import { getOwnPoem } from "../../dal/own-poem";
import { CreatedPoemNotice } from "../CreatedPoemNotice/CreatedPoemNotice";

import type { OwnPoemContentProps } from "./OwnPoemContent.types";

/** `getOwnPoem` → the notice and `PoemArticle`, `notFound()`, or a throw (design D4). */
export async function OwnPoemContent({ poemId }: OwnPoemContentProps) {
  // Redirects a signed-out reader to /login before any read (FR-7). A session that can't be checked fails
  // the profile read below, which shows the error screen.
  await requireSession();

  const id = await poemId;
  const result = await getOwnPoem(id);
  if (!result.ok) {
    // Another author's poem, a malformed id, or a non-public own profile: a soft 404 inside the boundary.
    if (result.reason === "not-found") notFound();
    // The route's error.tsx shows the generic error screen; the DAL already logged the cause.
    throw new Error("Own poem page unavailable");
  }

  return (
    <div className="flex flex-col gap-8">
      <CreatedPoemNotice poemId={id} />
      <PoemArticle poem={result.poem} />
    </div>
  );
}
