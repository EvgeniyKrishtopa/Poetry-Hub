import Link from "next/link";

import { SECTION_HEADINGS } from "../../model/home-messages";
import { HomeSection } from "../HomeSection/HomeSection";
import { SectionHeading } from "../SectionHeading/SectionHeading";

import type { HomeLatestWorksProps } from "./HomeLatestWorks.types";

/**
 * The latest-publications section: one row per poem, the title as the link and the author's name beside it
 * (under it on narrow screens), no cover. A failed or empty result renders nothing, heading included.
 */
export function HomeLatestWorks({ result }: HomeLatestWorksProps) {
  if (!result.ok || result.items.length === 0) return null;

  return (
    <HomeSection tone="surface" width="text">
      <SectionHeading>{SECTION_HEADINGS.latestWorks}</SectionHeading>
      <ul className="flex flex-col">
        {result.items.map((work) => (
          <li
            key={work.id}
            className="flex flex-col gap-1 border-t border-border py-4 first:border-t-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
          >
            <Link href={work.href} className="text-lg/7 font-medium hover:text-accent">
              {work.title}
            </Link>
            <span className="text-sm/5 text-muted">{work.authorName}</span>
          </li>
        ))}
      </ul>
    </HomeSection>
  );
}
