import { AUTHOR_CONTENT_LANG } from "../../model/author.constants";
import { fullName } from "../../model/full-name";
import { AuthorAbout } from "../AuthorAbout/AuthorAbout";
import { AuthorPhoto } from "../AuthorPhoto/AuthorPhoto";

import type { AuthorProfileViewProps } from "./AuthorProfileView.types";

/** The public profile: owner link, full-name heading, photo or placeholder, about (FR-14). */
export function AuthorProfileView({ author, ownerLink }: AuthorProfileViewProps) {
  const name = fullName(author);

  return (
    <article lang={AUTHOR_CONTENT_LANG} className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        {ownerLink}
        <h1 className="text-4xl font-bold tracking-tight">{name}</h1>
      </header>
      <AuthorPhoto photoUrl={author.photoUrl} fullName={name} />
      {author.about !== null && <AuthorAbout markdown={author.about} align={author.aboutAlign} />}
    </article>
  );
}
