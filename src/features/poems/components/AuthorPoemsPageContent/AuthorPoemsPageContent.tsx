import { notFound } from "next/navigation";

import { getPublicAuthorName } from "@/features/authors";

import { listAuthorPoems } from "../../dal/author-poems";
import { AuthorPoemList } from "../AuthorPoemList/AuthorPoemList";

import type { AuthorPoemsPageContentProps } from "./AuthorPoemsPageContent.types";

/** Checks the author, then lists their poems, inside `AuthorPoemsPage`'s Suspense boundary. */
export async function AuthorPoemsPageContent({ authorId }: AuthorPoemsPageContentProps) {
  const id = await authorId;
  const author = await getPublicAuthorName(id);

  if (!author.ok) {
    // Inside a streamed boundary this is a soft 404: the not-found UI with status 200.
    if (author.reason === "not-found") notFound();
    // The route's error.tsx shows the generic error screen; the authors DAL already logged the cause.
    throw new Error("Author poems page unavailable");
  }

  return <AuthorPoemList authorId={id} poems={await listAuthorPoems(id)} />;
}
