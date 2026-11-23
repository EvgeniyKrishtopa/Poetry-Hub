import { SECTION_HEADINGS } from "../../model/home-messages";
import { HomeSection } from "../HomeSection/HomeSection";
import { SectionHeading } from "../SectionHeading/SectionHeading";
import { WorkCard } from "../WorkCard/WorkCard";

import type { HomeFeaturedWorksProps } from "./HomeFeaturedWorks.types";

/**
 * The featured-poems section: up to four `WorkCard`s in a 4, 2 or 1 column grid. A failed or empty
 * result renders nothing, heading included.
 */
export function HomeFeaturedWorks({ result }: HomeFeaturedWorksProps) {
  if (!result.ok || result.items.length === 0) return null;

  return (
    <HomeSection>
      <SectionHeading>{SECTION_HEADINGS.featuredWorks}</SectionHeading>
      <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {result.items.map((work) => (
          <li key={work.id}>
            <WorkCard work={work} />
          </li>
        ))}
      </ul>
    </HomeSection>
  );
}
