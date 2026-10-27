import Link from "next/link";

import { listAuthorPoems } from "../../dal/author-poems";
import { authorPoemsPath } from "../../model/poem-paths";
import { AUTHOR_POEMS_LINK_LABEL, NO_POEMS_TEXT } from "../../model/poems-messages";

import type { AuthorPoemsEntryProps } from "./AuthorPoemsEntry.types";

/**
 * The author page's last block: a link to the poem list, or the empty text. It reads no session,
 * so every visitor sees the same entry.
 */
export async function AuthorPoemsEntry({ authorId }: AuthorPoemsEntryProps) {
  const id = await authorId;
  const poems = await listAuthorPoems(id);

  if (poems.length === 0) return <p className="text-muted">{NO_POEMS_TEXT}</p>;

  return (
    <Link href={authorPoemsPath(id)} className="self-start text-lg font-medium text-accent underline-offset-4 hover:underline">
      {AUTHOR_POEMS_LINK_LABEL}
    </Link>
  );
}
