import { listAuthorPoems } from "../../dal/author-poems";
import { AuthorPoemList } from "../AuthorPoemList/AuthorPoemList";

import type { AuthorPoemsEntryProps } from "./AuthorPoemsEntry.types";

/**
 * The author page's last block: the author's poems section. It reads no session, so every visitor
 * sees the same list; an unavailable read shows its text in the section and the page still renders.
 */
export async function AuthorPoemsEntry({ authorId }: AuthorPoemsEntryProps) {
  const id = await authorId;

  return <AuthorPoemList authorId={id} result={await listAuthorPoems(id)} />;
}
