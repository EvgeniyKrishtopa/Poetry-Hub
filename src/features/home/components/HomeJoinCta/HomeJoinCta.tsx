import { SIGN_UP_PATH } from "@/shared/config/account-paths";
import { ButtonLink } from "@/shared/ui";

import { JOIN_COPY } from "../../model/home-messages";
import { HomeSection } from "../HomeSection/HomeSection";
import { SectionHeading } from "../SectionHeading/SectionHeading";

/** The closing invitation: a framed block with the heading, one line and the button to `/signup`; always shown. */
export function HomeJoinCta() {
  return (
    <HomeSection width="text">
      <div className="flex flex-col items-center gap-6 rounded-card border border-card-border bg-surface p-8 text-center md:p-12">
        <SectionHeading size="large">{JOIN_COPY.heading}</SectionHeading>
        <p className="text-lg/7">{JOIN_COPY.text}</p>
        <ButtonLink href={SIGN_UP_PATH} size="lg">
          {JOIN_COPY.button}
        </ButtonLink>
      </div>
    </HomeSection>
  );
}
