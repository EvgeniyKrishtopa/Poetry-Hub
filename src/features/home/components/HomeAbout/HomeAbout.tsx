import { ABOUT_PATH } from "@/shared/config/constants";
import { splitParagraphs } from "@/shared/lib/split-paragraphs";
import { ButtonLink } from "@/shared/ui";

import { ABOUT_COPY } from "../../model/home-messages";
import { HomeSection } from "../HomeSection/HomeSection";
import { SectionHeading } from "../SectionHeading/SectionHeading";

import type { HomeAboutProps } from "./HomeAbout.types";

/**
 * The about section: heading and text as plain-text paragraphs (line breaks kept, nothing parsed as Markdown),
 * and the link to `/about`, which stays in code; always shown.
 */
export function HomeAbout({ copy }: HomeAboutProps) {
  const paragraphs = splitParagraphs(copy.text);

  return (
    <HomeSection tone="surface" width="text">
      <SectionHeading>{copy.heading}</SectionHeading>
      <div className="flex flex-col gap-4">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="text-lg/7 whitespace-pre-line">
            {paragraph}
          </p>
        ))}
      </div>
      <div>
        <ButtonLink href={ABOUT_PATH} variant="ghost">
          {ABOUT_COPY.link}
        </ButtonLink>
      </div>
    </HomeSection>
  );
}
