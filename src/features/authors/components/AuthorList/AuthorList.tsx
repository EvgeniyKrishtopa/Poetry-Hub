import Link from "next/link";

import { Alert } from "@/shared/ui";

import { DIRECTORY_MESSAGES, PAGE_TITLES } from "../../model/author-messages";
import { fullName } from "../../model/full-name";

import type { AuthorListProps } from "./AuthorList.types";

/** The directory: links in order, the empty text, or the unavailable alert (FR-13). */
export function AuthorList({ result }: AuthorListProps) {
  let content;
  if (!result.ok) {
    content = <Alert tone="danger">{DIRECTORY_MESSAGES.unavailable}</Alert>;
  } else if (result.authors.length === 0) {
    content = <p className="text-muted">{DIRECTORY_MESSAGES.empty}</p>;
  } else {
    content = (
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

  return (
    <section lang="ru" className="flex flex-col gap-8">
      <h1 className="text-4xl font-bold tracking-tight">{PAGE_TITLES.authors}</h1>
      {content}
    </section>
  );
}
