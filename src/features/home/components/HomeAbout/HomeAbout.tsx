import { ABOUT_PATH } from "@/shared/config/constants";
import { ButtonLink } from "@/shared/ui";

import { ABOUT_COPY } from "../../model/home-messages";
import { HomeSection } from "../HomeSection/HomeSection";
import { SectionHeading } from "../SectionHeading/SectionHeading";

/** The about section: heading, short text and the link to `/about`; always shown. */
export function HomeAbout() {
  return (
    <HomeSection tone="surface" width="text">
      <SectionHeading>{ABOUT_COPY.heading}</SectionHeading>
      <p className="text-lg/7">{ABOUT_COPY.text}</p>
      <div>
        <ButtonLink href={ABOUT_PATH} variant="ghost">
          {ABOUT_COPY.link}
        </ButtonLink>
      </div>
    </HomeSection>
  );
}
