import { notFound } from "next/navigation";

import { getPublicAuthorName } from "@/features/authors";

import { getAuthorPoem } from "../../dal/author-poems";
import { PoemView } from "../PoemView/PoemView";

import type { PoemPageContentProps } from "./PoemPageContent.types";

/** Checks the author, then reads the poem, inside `PoemPage`'s Suspense boundary. */
export async function PoemPageContent({ authorId, poemId }: PoemPageContentProps) {
  const id = await authorId;
  const author = await getPublicAuthorName(id);

  if (!author.ok) {
    // Inside a streamed boundary this is a soft 404: the not-found UI with status 200.
    if (author.reason === "not-found") notFound();
    // The route's error.tsx shows the generic error screen; the authors DAL already logged the cause.
    throw new Error("Poem page unavailable");
  }

  const result = await getAuthorPoem(id, await poemId);
  if (!result.ok) notFound();

  return <PoemView poem={result.poem} />;
}
