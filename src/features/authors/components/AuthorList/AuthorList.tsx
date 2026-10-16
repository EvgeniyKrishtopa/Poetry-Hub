import { CONTENT_LANG } from "@/shared/config/constants";

import { PAGE_TITLES } from "../../model/author-messages";
import { AuthorListContent } from "../AuthorListContent/AuthorListContent";

import type { AuthorListProps } from "./AuthorList.types";

/** The directory: the heading over its links, empty text, or unavailable alert (FR-13). */
export function AuthorList({ result }: AuthorListProps) {
  return (
    <section lang={CONTENT_LANG} className="flex flex-col gap-8">
      <h1 className="text-4xl font-bold tracking-tight">{PAGE_TITLES.authors}</h1>
      <AuthorListContent result={result} />
    </section>
  );
}
