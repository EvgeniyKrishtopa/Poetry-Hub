import { CONTENT_LANG } from "@/shared/config/constants";
import { MarkdownText } from "@/shared/ui";

import { fullName } from "../../model/full-name";
import { AuthorPhoto } from "../AuthorPhoto/AuthorPhoto";

import type { AuthorProfileViewProps } from "./AuthorProfileView.types";

/** The public profile: owner link, full-name heading, photo or placeholder, about, poems entry. */
export function AuthorProfileView({ author, ownerLink, poems }: AuthorProfileViewProps) {
  const name = fullName(author);

  return (
    <article lang={CONTENT_LANG} className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        {ownerLink}
        <h1 className="text-4xl font-bold tracking-tight">{name}</h1>
      </header>
      <AuthorPhoto photoUrl={author.photoUrl} fullName={name} />
      {author.about !== null && <MarkdownText markdown={author.about} />}
      {poems}
    </article>
  );
}
