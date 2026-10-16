import Link from "next/link";

import { Alert } from "@/shared/ui";

import { DIRECTORY_MESSAGES } from "../../model/author-messages";
import { fullName } from "../../model/full-name";

import type { AuthorListContentProps } from "./AuthorListContent.types";

/** The directory's body under its heading: the unavailable alert, the empty text, or the links in order (FR-13). */
export function AuthorListContent({ result }: AuthorListContentProps) {
  if (!result.ok) return <Alert tone="danger">{DIRECTORY_MESSAGES.unavailable}</Alert>;

  if (result.authors.length === 0) return <p className="text-muted">{DIRECTORY_MESSAGES.empty}</p>;

  return (
    <ul className="flex flex-col gap-3">
      {result.authors.map((author) => (
        <li key={author.id}>
          <Link href={`/authors/${author.id}`} className="text-lg text-foreground hover:text-accent">
            {fullName(author)}
          </Link>
        </li>
      ))}
    </ul>
  );
}
