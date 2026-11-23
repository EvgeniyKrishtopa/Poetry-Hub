import { SECTION_HEADINGS } from "../../model/home-messages";
import { AuthorCard } from "../AuthorCard/AuthorCard";
import { HomeSection } from "../HomeSection/HomeSection";
import { SectionHeading } from "../SectionHeading/SectionHeading";

import type { HomeAuthorsProps } from "./HomeAuthors.types";

/**
 * The project-authors section: up to four `AuthorCard`s. A failed or empty result renders nothing, heading
 * included.
 */
export function HomeAuthors({ result }: HomeAuthorsProps) {
  if (!result.ok || result.items.length === 0) return null;

  return (
    <HomeSection>
      <SectionHeading>{SECTION_HEADINGS.authors}</SectionHeading>
      <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {result.items.map((author) => (
          <li key={author.id}>
            <AuthorCard author={author} />
          </li>
        ))}
      </ul>
    </HomeSection>
  );
}
